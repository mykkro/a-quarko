import * as THREE from './vendor/three.module.js';

const types=['sun','lagoon','moon','neon','angel','betta','puffer'];
const dimensions=[[.46,.18,.095],[.50,.20,.095],[.40,.24,.075],[.41,.095,.055],[.32,.37,.065],[.38,.17,.085],[.28,.24,.20]];
const colors=['#c7804d','#8aa9a2','#a7adb2','#a3babc','#d5d3b7','#497d9f','#b6b77b'];

export function createFishModels({scalePack,getSettings}){
  const anisotropy=scalePack?.color.anisotropy||1;
  function texture(canvas,color=true){const t=new THREE.CanvasTexture(canvas);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=anisotropy;return t;}
  function paint(ctx,key,index){
    ctx.fillStyle=colors[index];ctx.fillRect(0,0,1024,512);
    if(scalePack?.loaded&&key!=='puffer'){
      ctx.drawImage(scalePack.color.image,0,0,512,512);ctx.drawImage(scalePack.color.image,512,0,512,512);
      ctx.globalCompositeOperation='color';ctx.fillStyle=colors[index];ctx.fillRect(0,0,1024,512);ctx.globalCompositeOperation='source-over';
    }
    const shade=ctx.createLinearGradient(0,0,0,512);shade.addColorStop(0,'#14292e90');shade.addColorStop(.48,'#d9e6db08');shade.addColorStop(1,'#f0e4c7a0');ctx.fillStyle=shade;ctx.fillRect(0,0,1024,512);
    if(key==='sun'){ctx.fillStyle='#3e352a90';ctx.fillRect(70,249,710,19);ctx.fillStyle='#b0432370';ctx.fillRect(120,280,700,55);}
    if(key==='lagoon')for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#b8caa044':'#355c6f80';ctx.fillRect(90,160+i*29,690,6);}
    if(key==='moon'||key==='angel')for(const x of key==='angel'?[300,535,780]:[515,715]){ctx.fillStyle='#152b32aa';ctx.fillRect(x,30,key==='angel'?56:72,455);}
    if(key==='neon'){ctx.fillStyle='#1ee0f2';ctx.fillRect(90,220,775,24);ctx.fillStyle='#d33049';ctx.fillRect(80,267,430,66);}
    if(key==='betta')for(let i=0;i<34;i++){ctx.fillStyle=i%3?'#1b425a55':'#c64b6780';ctx.beginPath();ctx.ellipse((i*173)%810+60,(i*97)%400+55,40,14,i*.7,0,7);ctx.fill();}
    if(key==='puffer')for(let i=0;i<60;i++){ctx.fillStyle='#3e4a2eb0';ctx.beginPath();ctx.ellipse((i*173)%850+40,(i*97)%340+35,7+(i%4)*2,7+(i%4)*2,0,0,7);ctx.fill();}
    // Gill cover and lateral detail occupy the same place on both body sides.
    ctx.strokeStyle='#263e445c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(800,145);ctx.bezierCurveTo(735,205,748,295,795,347);ctx.stroke();
    ctx.strokeStyle='#e4eee85c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(810,145);ctx.bezierCurveTo(755,205,760,295,805,347);ctx.stroke();
  }
  function skin(key,index){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');paint(ctx,key,index);
    // Scale detail arrives later when the scan is still downloading.
    if(scalePack&&!scalePack.loaded&&key!=='puffer')scalePack.ready.then(()=>{paint(ctx,key,index);material.map.needsUpdate=true;});
    const material=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:texture(c),bumpMap:key==='puffer'?null:scalePack?.height,bumpScale:.007,roughnessMap:scalePack?.roughness,roughness:.50,metalness:.10,clearcoat:.35,clearcoatRoughness:.3});
    if(key==='neon'){
      const mask=document.createElement('canvas');mask.width=1024;mask.height=512;const m=mask.getContext('2d');m.fillStyle='#000';m.fillRect(0,0,1024,512);m.fillStyle='#fff';m.fillRect(90,220,775,24);material.emissiveMap=texture(mask);material.emissive.set('#40e9ff');
    }
    return material;
  }
  function finTexture(){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,256,0);gradient.addColorStop(0,'#dcece66e');gradient.addColorStop(.8,'#b5d6cf45');gradient.addColorStop(1,'#b2cbc610');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
    ctx.strokeStyle='#e9f4e59c';ctx.lineWidth=1.2;for(let i=0;i<=26;i++){ctx.beginPath();ctx.moveTo(256,128);ctx.quadraticCurveTo(100,128+(i-13)*4,0,i/26*256);ctx.stroke();}return texture(c);
  }
  const finMap=finTexture();
  const bodies=types.map(skin),finMaterials=types.map((key,i)=>new THREE.MeshStandardMaterial({color:['#c89766','#9bb4ab','#8c9b9d','#a9c2c8','#b8ba9c','#6b82ba','#b2ba8c'][i],map:finMap,transparent:true,opacity:key==='betta'?.92:.76,side:THREE.DoubleSide,depthWrite:false,roughness:.45}));
  const irisMat=new THREE.MeshPhysicalMaterial({color:'#a9aa72',roughness:.3,clearcoat:.6}),pupilMat=new THREE.MeshPhysicalMaterial({color:'#070f11',roughness:.12,clearcoat:1}),glintMat=new THREE.MeshBasicMaterial({color:'#eef8f2'}),mouthMat=new THREE.MeshStandardMaterial({color:'#455048',roughness:.7});
  function add(geometry,material,parent){const m=new THREE.Mesh(geometry,material);m.receiveShadow=true;parent.add(m);return m;}
  function fan(edge,material,parent){
    const vertices=[0,0,0],uv=[1,.5],indices=[];
    edge.forEach((p,i)=>{vertices.push(...p);uv.push(0,i/(edge.length-1));if(i)indices.push(0,i,i+1);});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return add(geo,material,parent);
  }
  function create(key,group){
    const index=types.indexOf(key),[length,height,width]=dimensions[index],bodyGeo=new THREE.SphereGeometry(1,32,20),p=bodyGeo.attributes.position,uv=bodyGeo.attributes.uv;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),taper=key==='puffer'?1:x<-.30?.28+.72*(x+1)/.70:1;
      p.setXYZ(i,x*length,y*height*taper,z*width*taper);uv.setXY(i,(x+1)/2,(y+1)/2);
    }
    bodyGeo.computeVertexNormals();const body=add(bodyGeo,bodies[index],group);body.name='natural-fish-body';body.castShadow=true;
    const tail=new THREE.Group();tail.position.x=-length*.88;group.add(tail);
    const tailSize=key==='betta'?.40:key==='angel'?.25:key==='puffer'?.12:.23;
    fan(Array.from({length:25},(_,i)=>{const t=i/24;return [-(key==='betta'?.27: .18+Math.abs(t-.5)*.24), (t-.5)*tailSize*2,Math.sin(t*18)*(key==='betta'?.025:.006)];}),finMaterials[index],tail);
    const dorsal=new THREE.Group();dorsal.position.set(-.05,height*.67,0);group.add(dorsal);
    fan(Array.from({length:17},(_,i)=>{const t=i/16;return [length*(.5-t),Math.sin(t*Math.PI)*(key==='angel'?.48:key==='betta'?.23:.14),0];}),finMaterials[index],dorsal);
    const anal=new THREE.Group();anal.position.set(-.08,-height*.68,0);group.add(anal);
    fan(Array.from({length:15},(_,i)=>{const t=i/14;return [length*(.4-t),-Math.sin(t*Math.PI)*(key==='angel'?.48:key==='betta'?.22:.11),0];}),finMaterials[index],anal);
    const fins=[];
    for(const side of [-1,1]){
      const fin=new THREE.Group();fin.position.set(length*.25,-height*.16,side*width*.82);fin.rotation.x=side*.65;group.add(fin);
      fan(Array.from({length:13},(_,i)=>{const t=i/12;return [-.02-t*.17,-Math.sin(t*Math.PI)*.10,side*Math.sin(t*Math.PI)*.08];}),finMaterials[index],fin);fins.push({g:fin,side});
      const eyeX=length*.72,eyeY=height*.20,eyeZ=width*.66,r=key==='puffer'?.030:.024;
      const iris=add(new THREE.SphereGeometry(r,12,8),irisMat,group);iris.position.set(eyeX,eyeY,side*eyeZ);iris.scale.z=.55;
      const pupil=add(new THREE.SphereGeometry(r*.56,10,8),pupilMat,group);pupil.position.set(eyeX+.003,eyeY,side*(eyeZ+r*.45));pupil.scale.z=.45;
      const glint=add(new THREE.SphereGeometry(.004,5,4),glintMat,group);glint.position.set(eyeX+.006,eyeY+.008,side*(eyeZ+r*.67));
      if(key==='angel'){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.1,-.2,side*.025),new THREE.Vector3(.05,-.55,side*.045),new THREE.Vector3(-.05,-.82,side*.06));add(new THREE.TubeGeometry(curve,12,.005,4,false),finMaterials[index],group);}
    }
    const lip=new THREE.QuadraticBezierCurve3(new THREE.Vector3(length*.985,-height*.10,-.013),new THREE.Vector3(length*1.01,-height*.16,0),new THREE.Vector3(length*.985,-height*.10,.013));add(new THREE.TubeGeometry(lip,6,.0035,4,false),mouthMat,group);
    return {tail,fins,dorsal,anal,body,key};
  }
  let lastNeon='';
  function update(model,time,phase){
    const rate=model.key==='angel'?4:model.key==='puffer'?8:7,swim=Math.sin(time*rate+phase);
    model.tail.rotation.y=swim*(model.key==='betta'?.28:.36);model.dorsal.rotation.x=Math.sin(time*2+phase)*.06;model.anal.rotation.x=-Math.sin(time*2+phase)*.06;
    for(const fin of model.fins)fin.g.rotation.y=fin.side*(.2+Math.sin(time*9+phase)*.35);
  }
  function syncLighting(){
    const settings=getSettings(),stamp=settings.timeOfDay+settings.neonColor+settings.neonGlow;
    if(stamp!==lastNeon){lastNeon=stamp;bodies[3].emissive.set({cyan:'#40e9ff',pink:'#ff63dc',lime:'#b7ff46'}[settings.neonColor]);bodies[3].emissiveIntensity=settings.neonGlow*(settings.timeOfDay==='night'?2.4:.8);}
  }
  syncLighting();
  return {create,update,syncLighting,snapshot:()=>({scaleTexture:!!scalePack?.loaded,species:bodies.map((m,i)=>({type:types[i],textured:!!m.map})),translucentFins:finMaterials.every(m=>m.transparent)})};
}
