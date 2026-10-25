import * as THREE from './vendor/three.module.js';
import {setPlantSurface} from './materials.js';

// Thin tessellated surfaces: tapered tips, a shallow central fold and curled edges.
// A whole clump shares one blade mesh, keeping dense planting inexpensive.
export function ribbonGeometry(blades){
  const positions=[],colors=[],uvs=[],flex=[],phases=[],indices=[];
  for(const blade of blades){
    const rows=blade.rows||20,cols=blade.cols||4;
    const offset=positions.length/3;
    for(let row=0;row<=rows;row++){
      const t=row/rows,center=blade.point(t),width=blade.width*Math.pow(Math.sin(Math.PI*t),.7)+.003;
      for(let col=0;col<=cols;col++){
        const across=col/cols*2-1,twist=Math.sin(t*5+blade.phase)*(blade.twist??.45);
        const edge=across*width,fold=(1-Math.abs(across))*(blade.fold??.018)+Math.sin(t*14+blade.phase)*Math.abs(across)*width*.16;
        positions.push(center.x+blade.side.x*edge,center.y+fold+edge*Math.sin(twist),center.z+blade.side.z*edge);
        const vein=Math.pow(1-Math.abs(across),10)*.12,tip=t*.12;
        const color=new THREE.Color(blade.color).multiplyScalar(.75+tip+vein);colors.push(color.r,color.g,color.b);
        uvs.push(col/cols,t);flex.push(t*t*blade.flex);phases.push(blade.phase);
      }
    }
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const a=offset+row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setAttribute('aFlex',new THREE.Float32BufferAttribute(flex,1));geo.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
  // Account for animated tip displacement when culling near the screen edge.
  geo.boundingSphere.radius+=.25;return geo;
}

export function createRibbonPlants({habitat,mesh,ground,range,rand,leafPack}){
  const time={value:0};
  const material=new THREE.MeshStandardMaterial({color:'#b7d38d',vertexColors:true,side:THREE.DoubleSide,roughness:.62,emissive:'#173421',emissiveIntensity:.12});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uPlantTime=time;
    shader.vertexShader='uniform float uPlantTime;\nattribute float aFlex;\nattribute float aPhase;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.x += sin(uPlantTime * 0.85 + position.y * 1.1 + aPhase) * aFlex * 0.15;
      transformed.z += cos(uPlantTime * 0.65 + position.y * 0.8 + aPhase) * aFlex * 0.11;
    `);
  };
  material.customProgramCacheKey=()=> 'reef-ribbon-leaves-v1';
  const stemMaterial=new THREE.MeshStandardMaterial({color:'#506d37',roughness:.8});
  function create(x,z,height,type){
    const g=new THREE.Group();g.position.set(x,ground(x,z)-.01,z);g.userData.plantType=type;habitat.add(g);
    const blades=[];
    if(type==='fern'){
      // Separate arching fronds, with slender alternating pinnae. Leaflets
      // taper toward the tip and vary in size, pitch and spacing.
      for(let frond=0;frond<5;frond++){
        const angle=frond*2.4+range(-.25,.25),h=height*range(.65,1),lean=range(.35,.85);
        const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(Math.cos(angle)*lean*.15,h*.68,Math.sin(angle)*lean*.15),new THREE.Vector3(Math.cos(angle)*lean,h,Math.sin(angle)*lean));
        const rachis=mesh(new THREE.TubeGeometry(curve,16,.009,4,false),stemMaterial,g);rachis.castShadow=false;
        const pairs=10+Math.floor(rand()*5);
        for(let n=1;n<=pairs;n++)for(const side of [-1,1]){
          const t=(n+range(-.14,.14)+(side===1?.18:0))/(pairs+2),anchor=curve.getPoint(t);
          const a=angle+side*Math.PI/2+range(-.24,.24),length=(.16+.25*Math.sin(t*Math.PI))*(height/2.5)*range(.82,1.1),phase=rand()*6.28;
          blades.push({color:['#4a8059','#6d985b','#86a568'][(n+frond)%3],width:length*range(.065,.095),phase,flex:.22,fold:.003,twist:.22,rows:8,cols:2,side:new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),point:u=>new THREE.Vector3(anchor.x+Math.cos(a)*length*u,anchor.y+length*(.14*u-.24*u*u),anchor.z+Math.sin(a)*length*u+Math.sin(u*5+phase)*.018*u)});
        }
        const anchor=curve.getPoint(.88),tip=curve.getPoint(1);
        blades.push({color:'#83a56a',width:.027,phase:rand()*6.28,flex:.2,fold:.003,rows:8,cols:2,side:new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)),point:u=>anchor.clone().lerp(tip,u)});
      }
    }else if(type==='kelp'){
      const stem=t=>new THREE.Vector3(Math.sin(t*3)*.12,t*height,Math.sin(t*4)*.09);
      const curve=new THREE.CatmullRomCurve3(Array.from({length:12},(_,i)=>stem(i/11)));
      mesh(new THREE.TubeGeometry(curve,20,.022,5,false),stemMaterial,g);
      for(let i=0;i<18;i++){
        const anchor=stem(.12+i/18*.85),a=i*2.4+range(-.2,.2),length=range(.85,1.5)*(1-i*.018),phase=rand()*6.28;
        blades.push({color:i%3?'#6eab66':'#a1b766',width:range(.10,.17),phase,flex:.8,side:new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),point:t=>new THREE.Vector3(anchor.x+Math.cos(a)*length*t,anchor.y+Math.sin(t*Math.PI)*.35-length*t*t*.30,anchor.z+Math.sin(a)*length*t+Math.sin(t*6)*.08*t)});
      }
    }else{
      for(let i=0;i<(type==='sword'?9:7);i++){
        const a=i*2.4,h=height*range(.6,1.2),phase=rand()*6.28,lean=range(.3,.75);
        blades.push({color:i%2?'#5b9c70':'#8cb967',width:type==='sword'?range(.10,.17):range(.045,.085),phase,flex:1,side:new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),point:t=>new THREE.Vector3(Math.cos(a)*lean*t*t+Math.sin(t*5+phase)*.04*t,Math.sin(t*1.5)*h,Math.sin(a)*lean*t*t)});
      }
    }
    const leaves=mesh(ribbonGeometry(blades),material,g);leaves.name='flat-ribbon-leaves';leaves.castShadow=false;
    return g;
  }
  return {create,setSurface:textured=>setPlantSurface(material,leafPack,textured),update:t=>{time.value=t;},snapshot:()=>({time:time.value,doubleSided:material.side===THREE.DoubleSide,textured:!!material.map})};
}
