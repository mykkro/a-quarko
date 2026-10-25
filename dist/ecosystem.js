import * as THREE from './vendor/three.module.js';
import {applyTexturePack,setPlantSurface,leafSphereGeometry} from './materials.js';

export const sections = [
  ['Underwater treasures', [['ruins','Ancient arch ruins',3,1],['castle','Miniature castles',2,1]]],
  ['Plants', [['broad','Broadleaf',40,11],['fern','Water fern',40,10],['grass','Ribbon grass',40,35],['rotala','Ruby rotala',24,3],['lotus','Dwarf lotus',12,2],['corkscrew','Corkscrew stems',20,3],['kelp','Ribbon kelp',20,5]]],
  ['Rocks', [['river','River stones',20,4],['slate','Slate rocks',20,1],['lava','Lava stones',12,2],['quartz','Quartz clusters',12,1]]],
  ['Moss', [['cushion','Cushion clumps',120,65],['carpet','Carpet patches',40,12],['marimo','Marimo balls',20,4],['java','Java moss tufts',24,5]]],
  ['Fish schools', [['sun','Sunburst fish',40,12],['lagoon','Lagoon fish',40,16],['moon','Moonbeam fish',40,10],['neon','Neon tetras',40,8]]],
  ['Individual fish', [['angel','Angelfish · graceful gliders',8,1],['betta','Betta · wandering fins',8,1],['puffer','Puffers · hover & dart',8,2]]],
  ['Little bottom dwellers', [['crab','Sand crabs',12,2],['snail','Spiral snails',12,3]]]
];
export const countItems=sections.flatMap(([,items])=>items);
export const defaults=Object.fromEntries(countItems.map(([key,,,count])=>[key,count]));
export const movementDefaults={schoolMotion:'cruise',activity:1};

export function createExtras({habitat,mesh,mat,green,mossMaterial,stoneMap,rand,range,ground,stonePack,leafPack}) {
  const ruby=mat('#bd6c78'),lotus=mat('#80ad78');
  const lavaMaterial=new THREE.MeshStandardMaterial({color:'#674f46',map:stoneMap,bumpMap:stoneMap,bumpScale:.28,roughness:1});
  applyTexturePack(lavaMaterial,stonePack,{tint:'#8e7164',bump:.085});
  const crystalMaterial=new THREE.MeshPhysicalMaterial({color:'#cee9dd',roughness:.28,metalness:.05,clearcoat:.8});
  const crabMat=mat('#d38562'),shellMat=mat('#bb915f'),shellBand=mat('#725a43'),snailMat=mat('#a3ad7e'),eyes=mat('#183e38');
  const crawlers=[];
  function tube(points,r,material,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r,5,false),material,parent);}
  function groupAt(x,y,z){const g=new THREE.Group();g.position.set(x,ground(x,z)+y,z);habitat.add(g);return g;}
  function specialPlant(x,z,h,type){
    const group=groupAt(x,.08,z);
    if(type==='lotus')for(let i=0;i<5;i++){
      const a=i*2.4,end=new THREE.Vector3(Math.cos(a)*.45,h*range(.55,1),Math.sin(a)*.45);
      tube([new THREE.Vector3(),end.clone().multiplyScalar(.45),end],.018,green[2],group);
      const leaf=mesh(leafSphereGeometry('z',16,8),lotus,group);leaf.position.copy(end);leaf.scale.set(.43,.035,.34);leaf.rotation.z=range(-.3,.3);leaf.castShadow=false;
    }
    else if(type==='corkscrew')for(let i=0;i<5;i++){
      const points=[];for(let n=0;n<33;n++){const t=n/32;points.push(new THREE.Vector3(Math.cos(t*10+i)*.17+i*.055,t*h,Math.sin(t*10+i)*.17));}
      tube(points,.04,green[i%4],group);
    }
    else for(let i=0;i<5;i++){
      const a=i*2.4,tip=new THREE.Vector3(Math.cos(a)*.3,h*range(.65,1),Math.sin(a)*.3);
      tube([new THREE.Vector3(),tip.clone().multiplyScalar(.5),tip],.018,ruby,group);
      for(let n=1;n<7;n++)for(const side of [-1,1]){const leaf=mesh(leafSphereGeometry('x',8,5),ruby,group);leaf.position.copy(tip).multiplyScalar(n/7);leaf.position.x+=side*.13;leaf.scale.set(.21,.055,.08);leaf.rotation.z=side*.4;leaf.castShadow=false;}
    }
    return group;
  }
  function specialRock(x,z,s,type){
    const g=groupAt(x,.1,z);
    if(type==='lava'){
      const geometry=new THREE.IcosahedronGeometry(s,2),pos=geometry.attributes.position;
      // Position-based displacement keeps shared edges together.
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),v=.9+.12*Math.sin(x*15)*Math.sin(y*17)*Math.cos(z*11);pos.setXYZ(i,x*v,y*v,z*v);}
      geometry.computeVertexNormals();const rock=mesh(geometry,lavaMaterial,g);rock.position.y=s*.28;rock.scale.set(1,.55,.8);
    }else for(let i=0;i<6;i++){const h=s*range(.5,1.5);const crystal=mesh(new THREE.CylinderGeometry(.04,s*.23,h,5),crystalMaterial,g);crystal.position.set(range(-.35,.35)*s,h*.45,range(-.3,.3)*s);crystal.rotation.z=range(-.25,.25);}
  }
  function specialMoss(x,z,type){
    const g=groupAt(x,.14,z);
    if(type==='marimo'){const ball=mesh(new THREE.IcosahedronGeometry(range(.22,.4),3),mossMaterial,g);ball.position.y=.2;ball.scale.y=.9;}
    else {for(let i=0;i<12;i++){const a=i*2.4,h=range(.2,.55),tip=new THREE.Vector3(Math.cos(a)*.25,h,Math.sin(a)*.25);tube([new THREE.Vector3(),tip.clone().multiplyScalar(.6),tip],.022,green[i%4],g);for(const side of [-1,1])tube([tip.clone().multiplyScalar(.4),new THREE.Vector3(tip.x+side*.13,h*.65,tip.z),new THREE.Vector3(tip.x+side*.22,h*.8,tip.z)],.015,green[i%4],g);}}
  }
  function crawler(type,index){
    const g=groupAt(range(-5.5,5.5),.04,range(2.3,3.8)),legs=[];
    if(type==='crab'){
      const body=mesh(new THREE.SphereGeometry(1,12,8),crabMat,g);body.scale.set(.24,.13,.19);body.position.y=.18;
      for(const side of [-1,1]){
        for(let i=0;i<4;i++){const leg=new THREE.Group();g.add(leg);leg.position.set(side*.15,.16,(i-1.5)*.09);tube([new THREE.Vector3(),new THREE.Vector3(side*.19,.02,.07),new THREE.Vector3(side*.29,-.14,.11)],.025,crabMat,leg);legs.push({g:leg,side,phase:i});}
        const claw=mesh(new THREE.TorusGeometry(.075,.025,5,10,Math.PI*1.6),crabMat,g);claw.position.set(side*.27,.28,.27);claw.rotation.y=side*.4;
        tube([new THREE.Vector3(side*.12,.2,.1),new THREE.Vector3(side*.20,.24,.2),claw.position.clone()],.03,crabMat,g);
        const stalk=mesh(new THREE.CylinderGeometry(.018,.023,.14,5),crabMat,g);stalk.position.set(side*.10,.31,.12);const eye=mesh(new THREE.SphereGeometry(.026,6,5),eyes,g);eye.position.set(side*.10,.39,.12);
      }
    }else{
      const foot=mesh(new THREE.SphereGeometry(1,12,8),snailMat,g);foot.scale.set(.17,.07,.34);foot.position.y=.04;
      const shell=mesh(new THREE.SphereGeometry(.21,16,12),shellMat,g);shell.scale.z=.7;shell.position.set(0,.23,-.07);
      const spiral=[];for(let i=0;i<90;i++){const t=i/89,a=t*Math.PI*5,r=.012+t*.17;spiral.push(new THREE.Vector3(Math.cos(a)*r,.23+Math.sin(a)*r,.075));}tube(spiral,.018,shellBand,g);
      for(const side of [-1,1]){tube([new THREE.Vector3(side*.065,.07,.19),new THREE.Vector3(side*.09,.17,.25),new THREE.Vector3(side*.11,.23,.28)],.012,snailMat,g);const eye=mesh(new THREE.SphereGeometry(.02,6,5),eyes,g);eye.position.set(side*.11,.23,.28);}
    }
    crawlers.push({g,type,legs,phase:rand()*6.28,origin:g.position.clone(),index});
  }
  function update(time){
    for(const c of crawlers){const t=time*(c.type==='crab'?.32:.055)+c.phase,moving=c.type==='crab'?(1+Math.cos(t*.9))*.5:1,q=c.type==='crab'?t+Math.sin(t*.9)/.9:t;
      c.g.position.x=c.origin.x+Math.sin(q)*.8;c.g.position.z=c.origin.z+Math.cos(q*.7)*.25;c.g.rotation.y=Math.atan2(Math.cos(q),-.22*Math.sin(q*.7));
      c.g.position.y=ground(c.g.position.x,c.g.position.z)+.04;
      if(c.type==='crab'){for(const leg of c.legs)leg.g.rotation.z=Math.sin(time*7+leg.phase*1.8+leg.side)*.24*moving;c.g.position.y+=Math.sin(time*8)*.008*moving;}
    }
  }
  return {surfaceSnapshot:()=>({rotala:!!ruby.map,lotus:!!lotus.map}),setSurface:textured=>{setPlantSurface(ruby,leafPack,textured);setPlantSurface(lotus,leafPack,textured);},crawlers,specialPlant,specialRock,specialMoss,crawler,update};
}
