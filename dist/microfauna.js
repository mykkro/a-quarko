import * as THREE from './vendor/three.module.js';
import {applyTexturePack} from './materials.js';

export function createMicrofauna({habitat,mesh,ground,rand,range,textures}){
  const shrimp=[],plankton=[],shells=[];
  function surface(color,pack,bump=.008){return applyTexturePack(new THREE.MeshPhysicalMaterial({color,roughness:.55,clearcoat:.3}),pack,{tint:color,bump,roughness:.75});}
  const shrimpMaterials={cherry:surface('#db5147',textures.shrimp),amano:surface('#c5d0bb',textures.shrimp),blue:surface('#4f94bf',textures.shrimp)};
  shrimpMaterials.amano.transparent=true;shrimpMaterials.amano.opacity=.7;shrimpMaterials.amano.depthWrite=false;
  const shellMaterial=surface('#eee2cd',textures.shell,.014);shellMaterial.iridescence=.18;
  const interior=new THREE.MeshStandardMaterial({color:'#8d7560',roughness:.7});
  const planktonMaterials={algae:surface('#a8c887',textures.plankton,.002),diatom:surface('#ddc58d',textures.plankton,.002),copepod:surface('#e3c6a0',textures.plankton,.002)};
  const antennaMaterial=new THREE.LineBasicMaterial({color:'#d4ceab',transparent:true,opacity:.65});
  const dark=new THREE.MeshStandardMaterial({color:'#1b3434',roughness:.3});
  function tube(points,r,material,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,4,false),material,parent);}
  function group(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);habitat.add(g);return g;}
  function addShrimp(type){
    const x=range(-6,6),z=range(1.3,4.0),g=group(x,ground(x,z)+.02,z),material=shrimpMaterials[type],legs=[];
    g.scale.setScalar(range(.75,1.05));
    for(let i=0;i<6;i++){const r=.075-i*.008,m=mesh(new THREE.SphereGeometry(r,12,8),material,g);m.position.set(0,.10-Math.sin(i*.35)*.03,.12-i*.058);m.scale.set(1,.9,1.12);}
    const tail=new THREE.Group();tail.position.set(0,.06,-.23);g.add(tail);
    for(let i=-1;i<=1;i++){const petal=mesh(new THREE.SphereGeometry(1,10,6),material,tail);petal.scale.set(.042,.008,.075);petal.position.set(i*.038,0,-.04);petal.rotation.y=i*.45;}
    const rostrum=mesh(new THREE.ConeGeometry(.016,.14,5),material,g);rostrum.rotation.x=Math.PI/2;rostrum.position.set(0,.15,.235);
    for(const side of [-1,1]){
      const eye=mesh(new THREE.SphereGeometry(.013,8,6),dark,g);eye.position.set(side*.05,.155,.17);
      tube([[side*.035,.16,.18],[side*.12,.22,.38],[side*.20,.20,.58]],.003,material,g);
      tube([[side*.025,.15,.18],[side*.08,.17,.3],[side*.09,.13,.39]],.0025,material,g);
      for(let i=0;i<5;i++){const leg=new THREE.Group();leg.position.set(side*.035,.06,.10-i*.04);g.add(leg);tube([[0,0,0],[side*.045,-.015,.01],[side*.075,-.06,.04]],.005,material,leg);legs.push({g:leg,side,index:i});}
    }
    g.traverse(o=>{if(o.isMesh)o.castShadow=false;});
    shrimp.push({type,g,legs,tail,origin:g.position.clone(),phase:rand()*6.28});
  }
  function shellGeometry(type,radius){
    if(type==='clam'){
      const geo=new THREE.SphereGeometry(1,32,14,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),r=1+.035*Math.cos(a*22);p.setXYZ(i,p.getX(i)*radius*r,p.getY(i)*radius*.38,p.getZ(i)*radius*.75*r);}geo.computeVertexNormals();return geo;
    }
    const vertices=[],uvs=[],indices=[];
    if(type==='scallop'){
      const rings=20,segments=40;
      for(let r=0;r<=rings;r++)for(let a=0;a<=segments;a++){
        const t=r/rings,angle=(a/segments-.5)*2.5,rib=Math.cos(angle*22),rr=t*radius*(1+.025*rib);
        vertices.push(Math.sin(angle)*rr,.11*Math.sin(t*Math.PI)+rib*.012*t,Math.cos(angle)*rr-radius*.3);uvs.push(a/segments,t);
      }
      for(let r=0;r<rings;r++)for(let a=0;a<segments;a++){const p=r*(segments+1)+a,q=p+segments+1;indices.push(p,p+1,q,p+1,q+1,q);}
    }else{
      const rings=90,sides=12;
      for(let n=0;n<=rings;n++)for(let a=0;a<=sides;a++){
        const theta=n/rings*13,rr=.022*Math.exp(theta*.17),angle=a/sides*Math.PI*2,tubeR=rr*.40;
        vertices.push(Math.cos(theta)*(rr+Math.cos(angle)*tubeR),.22+Math.sin(theta)*(rr+Math.cos(angle)*tubeR),Math.sin(angle)*tubeR+n/rings*.025);uvs.push(a/sides,n/rings*3);
      }
      for(let n=0;n<rings;n++)for(let a=0;a<sides;a++){const p=n*(sides+1)+a,q=p+sides+1;indices.push(p,q,p+1,p+1,q,q+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  function addShell(type){
    const x=range(-6.7,6.7),z=range(-1.5,4.2),g=group(x,ground(x,z)+.035,z),r=range(.25,.43);
    const shell=mesh(shellGeometry(type,r),shellMaterial,g);shell.material.side=THREE.DoubleSide;g.rotation.y=rand()*6.28;
    if(type==='spiral'){const theta=13,rr=.022*Math.exp(theta*.17),opening=mesh(new THREE.SphereGeometry(1,16,8),interior,g);opening.position.set(Math.cos(theta)*rr,.22+Math.sin(theta)*rr,rr*.35+.025);opening.scale.set(rr*.31,rr*.32,.012);}
    shells.push({type,g});
  }
  function addPlankton(type){
    const x=range(-7,7),z=range(-4,4),g=group(x,range(Math.max(.8,ground(x,z)+.5),6.4),z),material=planktonMaterials[type];
    if(type==='algae')for(let i=0;i<3;i++){const cell=mesh(new THREE.SphereGeometry(.028,8,6),material,g);cell.position.set(Math.cos(i*2.4)*.026,Math.sin(i*2.4)*.022,0);}
    else if(type==='diatom'){const cell=mesh(new THREE.SphereGeometry(1,12,8),material,g);cell.scale.set(.07,.024,.035);}
    else{
      const cell=mesh(new THREE.SphereGeometry(1,10,8),material,g);cell.scale.set(.024,.065,.025);
      for(let i=0;i<3;i++){const segment=mesh(new THREE.SphereGeometry(.016-i*.003,6,5),material,g);segment.position.y=-.065-i*.022;}
      const linePositions=[];for(const side of [-1,1]){linePositions.push(0,.035,0,side*.09,.10,0);for(let i=0;i<3;i++)linePositions.push(side*.02,-i*.026,0,side*.075,-i*.026-.025,0);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));g.add(new THREE.LineSegments(geo,antennaMaterial));
    }
    g.traverse(o=>{if(o.isMesh)o.castShadow=false;});plankton.push({type,g,origin:g.position.clone(),phase:rand()*6.28});
  }
  function build(settings){
    shrimp.length=0;plankton.length=0;shells.length=0;
    for(const [key,type] of [['cherryShrimp','cherry'],['amanoShrimp','amano'],['blueShrimp','blue']])for(let i=0;i<settings[key];i++)addShrimp(type);
    for(const [key,type] of [['clamShell','clam'],['scallopShell','scallop'],['spiralShell','spiral']])for(let i=0;i<settings[key];i++)addShell(type);
    for(const [key,type] of [['greenPlankton','algae'],['diatoms','diatom'],['copepods','copepod']])for(let i=0;i<settings[key];i++)addPlankton(type);
  }
  function update(time){
    for(const s of shrimp){const t=time*.16+s.phase,hop=Math.pow(Math.max(0,Math.sin(time*.35+s.phase)),12)*.42;
      s.g.position.x=s.origin.x+Math.sin(t)*.45;s.g.position.z=s.origin.z+Math.cos(t*.8)*.25;s.g.position.y=ground(s.g.position.x,s.g.position.z)+.025+hop;s.g.rotation.y=Math.atan2(Math.cos(t),-.44*Math.sin(t*.8));s.tail.rotation.x=hop*.7;
      for(const leg of s.legs)leg.g.rotation.z=Math.sin(time*9+leg.index+leg.side)*.22;
    }
    for(const p of plankton){const t=time*.12+p.phase,jump=p.type==='copepod'?Math.pow(Math.max(0,Math.sin(time*.8+p.phase)),14)*.18:0;
      p.g.position.set(p.origin.x+Math.sin(t)*.25,p.origin.y+Math.sin(t*.7)*.12+jump,p.origin.z+Math.cos(t*.8)*.2);p.g.rotation.set(Math.sin(t)*.25,t*.4,Math.cos(t*.6)*.35);
    }
  }
  const describe=items=>items.map(item=>({type:item.type,position:item.g.position.toArray()}));
  return {build,update,shrimp,plankton,shells,snapshot:()=>({shrimp:describe(shrimp),plankton:describe(plankton),shells:describe(shells),textures:{shrimp:!!shrimpMaterials.cherry.map,plankton:!!planktonMaterials.algae.map,shells:!!shellMaterial.map}})};
}
