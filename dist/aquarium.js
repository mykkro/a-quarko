import * as THREE from './vendor/three.module.js';
import {createCameraControls} from './camera-controls.js';
import {createMicrofauna} from './microfauna.js';
import {castleDefaults,masonryOptions,roofOptions} from './castle-materials.js';
import {createFishModels} from './fish-models.js';
import {createWaterAtmosphere,atmosphereDefaults} from './water.js';
import {createPresentation} from './presentation.js';
import {createRibbonPlants} from './ribbon-plants.js';
import {createLighting,lightingDefaults,dayOptions,neonColors} from './lighting.js';
import {createTextureLibrary,applyTexturePack,setPlantSurface,leafSphereGeometry} from './materials.js';
import {initPreferences,translate} from './preferences.js';
import {sections,countItems,defaults,movementDefaults,createExtras} from './ecosystem.js';
import {createTerrain,createLandmarks,terrainDefaults,terrainTypes} from './terrain.js';

const host=document.querySelector('#aquarium');
const scene=new THREE.Scene();scene.background=new THREE.Color('#c8e5df');scene.fog=new THREE.Fog('#c8e5df',23,56);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(e){host.innerHTML='<p style="padding:40px">'+translate('This aquarium needs WebGL. Please enable hardware acceleration in your browser.')+'</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(38,1,.02,120);
const ambient=new THREE.HemisphereLight(0xe6fff4,0x6d9286,2.6);scene.add(ambient);const sun=new THREE.DirectionalLight(0xfff1cf,3.1);sun.position.set(-7,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sun.shadow.bias=-.001;scene.add(sun);
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});const sand=mat('#e5d7ae');const green=[mat('#478766'),mat('#76a76b'),mat('#326e58'),mat('#99b96b')];
function mesh(geo,material,parent=scene){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// A rounded, floating miniature world.
const base=mesh(new THREE.CylinderGeometry(8.8,8.2,.65,96),mat('#acb69b'));base.position.y=-.45;base.scale.z=.70;
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}const range=(a,b)=>a+rand()*(b-a);
const pebbles=[];
for(let i=0;i<600;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*8.5;const pebble=mesh(new THREE.IcosahedronGeometry(range(.015,.055),0),mat(['#d3c49d','#f5e8c5','#b6b28f'][i%3]));pebble.position.set(Math.cos(a)*r,.10,Math.sin(a)*r*.7);pebble.scale.y=.4;pebble.castShadow=false;pebbles.push(pebble);}
// Small seamless procedural maps keep the scene self-contained and work offline.
function surfaceTexture(kind) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const grain=rand(),wave=Math.sin(x*.12+Math.sin(y*.045)*3)*Math.sin(y*.09);
    let rgb;
    if(kind==='stone') {const v=115+grain*38+wave*18;rgb=[v*.93,v,v*.96];}
    else if(kind==='moss') {const v=grain*55+wave*14;rgb=[37+v*.55,76+v,33+v*.4];}
    else {const scale=Math.pow(Math.max(0,Math.cos(x*.4+(Math.floor(y/9)%2)*Math.PI)*Math.sin(y*Math.PI/9)),8);const v=205+grain*20+scale*30;rgb=[v,v,v];}
    const i=(y*256+x)*4;image.data.set([...rgb,255],i);
  }
  ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
}
const stoneMap=surfaceTexture('stone'),mossMap=surfaceTexture('moss'),scaleMap=surfaceTexture('scales');
const stoneMaterials=['#a7b5a7','#657d82'].map(color=>new THREE.MeshStandardMaterial({color,map:stoneMap,bumpMap:stoneMap,bumpScale:.12,roughness:.95}));
const mossMaterial=new THREE.MeshStandardMaterial({color:'#a5c87e',map:mossMap,bumpMap:mossMap,bumpScale:.09,roughness:1});
// Textures stream in after the first frame; see createTextureLibrary.
const textureLibrary=createTextureLibrary(renderer),generatedTextures=textureLibrary.packs;
applyTexturePack(sand,generatedTextures.sand,{tint:'#e7e3d8',bump:.045});
stoneMaterials.forEach((material,i)=>applyTexturePack(material,generatedTextures.stone,{tint:i?'#a4b5c0':'#e3e5da',bump:.065}));
applyTexturePack(mossMaterial,generatedTextures.moss,{tint:'#d9e6ca',bump:.028});
const palettes=[['#f6a15f','#ffc786'],['#56bfb9','#a6eadb'],['#b6a0de','#ded0f5'],['#55cfdf','#ee6c7b'],['#ead9a0','#fff0c5'],['#9f72c7','#dbacd9'],['#d4bd69','#e7db9c']];
const fishMaterials=palettes.map(c=>[new THREE.MeshStandardMaterial({color:c[0],map:scaleMap,bumpMap:scaleMap,bumpScale:.012,roughness:.4}),mat(c[1],.5)]),eyeMat=mat('#173c3a');
let settings={...defaults,...movementDefaults,...terrainDefaults,...lightingDefaults,...atmosphereDefaults,...castleDefaults};
try{const saved=JSON.parse(localStorage.getItem('a-quarko-settings'));for(const [key,,max] of countItems)if(Number.isInteger(saved?.[key]))settings[key]=Math.max(0,Math.min(max,saved[key]));if(masonryOptions.some(([key])=>key===saved?.castleMasonry))settings.castleMasonry=saved.castleMasonry;if(roofOptions.some(([key])=>key===saved?.castleRoof))settings.castleRoof=saved.castleRoof;if(['auto','playful','realistic'].includes(saved?.fishAppearance))settings.fishAppearance=saved.fishAppearance;if(['auto','smooth','textured'].includes(saved?.plantSurface))settings.plantSurface=saved.plantSurface;if(['miniature','planted'].includes(saved?.visualStyle))settings.visualStyle=saved.visualStyle;for(const key of ['waterAtmosphere','specks'])if(Number.isFinite(saved?.[key]))settings[key]=THREE.MathUtils.clamp(saved[key],0,1);if(dayOptions.some(([key])=>key===saved?.timeOfDay))settings.timeOfDay=saved.timeOfDay;if(neonColors.some(([key])=>key===saved?.neonColor))settings.neonColor=saved.neonColor;if(Number.isFinite(saved?.neonGlow))settings.neonGlow=THREE.MathUtils.clamp(saved.neonGlow,0,2);if(terrainTypes.some(([key])=>key===saved?.terrainType))settings.terrainType=saved.terrainType;if(Number.isFinite(saved?.relief))settings.relief=THREE.MathUtils.clamp(saved.relief,0,1.8);if(['cruise','wander','dart'].includes(saved?.schoolMotion))settings.schoolMotion=saved.schoolMotion;if(Number.isFinite(saved?.activity))settings.activity=THREE.MathUtils.clamp(saved.activity,.25,2);}catch{}
const navigation=createCameraControls({host,camera,getStyle:()=>settings.visualStyle});
function syncPresentationCamera(){navigation.setStyle(settings.visualStyle);}
syncPresentationCamera();
const naturalFish=createFishModels({scalePack:generatedTextures.fish,getSettings:()=>settings});
const lighting=createLighting({scene,sun,ambient,renderer,fishMaterials,getSettings:()=>settings});
const habitat=new THREE.Group();scene.add(habitat);const plants=[],fish=[];
const terrain=createTerrain({mesh,sand,getSettings:()=>settings});
const water=createWaterAtmosphere({scene,getSettings:()=>settings});
const presentation=createPresentation({scene,mesh,mat,stonePack:generatedTextures.stone,fishMaterials,green,base,terrain,getSettings:()=>settings});
const ribbons=createRibbonPlants({habitat,mesh,ground:terrain.heightAt,range,rand,leafPack:generatedTextures.leaf});
const microfauna=createMicrofauna({habitat,mesh,ground:terrain.heightAt,rand,range,textures:generatedTextures});
const extras=createExtras({habitat,mesh,mat,green,mossMaterial,stoneMap,rand,range,ground:terrain.heightAt,stonePack:generatedTextures.stone,leafPack:generatedTextures.leaf,texturePacks:generatedTextures});
const landmarks=createLandmarks({habitat,mesh,mat,stoneMap,mossMaterial,ground:terrain.heightAt,stonePack:generatedTextures.stone,texturePacks:generatedTextures});
function applyPlantSurfaces(){const textured=settings.plantSurface==='textured'||(settings.plantSurface==='auto'&&settings.visualStyle==='planted');for(const material of green)setPlantSurface(material,generatedTextures.leaf,textured);ribbons.setSurface(textured);extras.setSurface(textured);}
function plant(x,z,height,type){
 if(type==='fern'){plants.push({group:ribbons.create(x,z,height,'fern'),type:'fern',phase:rand()*6});return;}
 if(type==='broad'&&settings.visualStyle==='planted'){plants.push({group:ribbons.create(x,z,height*1.8,'sword'),type:'sword',phase:rand()*6});return;}
 const group=new THREE.Group();group.position.set(x,terrain.heightAt(x,z)-.01,z);habitat.add(group);
 const leaves=[[],[],[],[]],dummy=new THREE.Object3D();
 for(let k=0;k<(type==='grass'?5:7);k++){
  const h=height*range(.55,1.1),a=k*2.4;
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*.3,h*.6,Math.sin(a)*.3),new THREE.Vector3(Math.cos(a)*.6,h,Math.sin(a)*.6));
  mesh(new THREE.TubeGeometry(curve,8,type==='grass'?.035:.025,4,false),green[2],group);
  if(type==='grass')continue;
  for(let n=1;n<(type==='fern'?9:5);n++){
   const p=curve.getPoint(n/(type==='fern'?9:5));
   for(let side=0;side<(type==='fern'?2:1);side++){
    dummy.position.copy(p);dummy.position.x+=Math.cos(a)*.15*(side?-1:1);
    dummy.scale.set(type==='fern'?.28:.23,type==='fern'?.065:h*.14,.045);dummy.rotation.set(.3,a,-Math.cos(a)*.6);dummy.updateMatrix();leaves[(k+n)%4].push(dummy.matrix.clone());
   }
  }
 }
 for(let i=0;i<4;i++)if(leaves[i].length){const instances=new THREE.InstancedMesh(leafSphereGeometry(type==='fern'?'x':'y'),green[i],leaves[i].length);leaves[i].forEach((matrix,j)=>instances.setMatrixAt(j,matrix));instances.receiveShadow=true;group.add(instances);}
 plants.push({group,phase:rand()*6});
}
function rebuild(){
 // Materials and their textures are shared; only replaced geometry is disposed.
 habitat.traverse(o=>{if(o.isMesh||o.isLine)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});habitat.clear();plants.length=0;fish.length=0;extras.crawlers.length=0;seed=42;
 terrain.update();for(const p of pebbles)p.position.y=terrain.heightAt(p.position.x,p.position.z)+.025;
 const anchors=[];
 for(const [type,key] of [[0,'river'],[1,'slate']])for(let i=0;i<settings[key];i++){
  const preset=[[-3,-1,1.7],[-1.5,-1.8,1.15],[4,0,1.35],[5,1,.7],[-5,2,.65]][anchors.length];
  const [x,z,size]=preset||[range(-6,6),range(-2.8,2.8),range(.45,1.15)];
  const r=mesh(new THREE.DodecahedronGeometry(size, type?0:2),stoneMaterials[type],habitat);r.position.set(x,terrain.heightAt(x,z)+size*(type?.22:.43)-.04,z);r.scale.set(1,type?.38:.7,.8);r.rotation.y=rand()*3;
  anchors.push({x,z,size,top:terrain.heightAt(x,z)+size*(type?.60:1.12)-.04});
 }
 for(let i=0;i<settings.cushion;i++){
  const anchor=anchors.length?anchors[i%anchors.length]:null;
  const x=anchor?anchor.x:Math.cos(i*2.4)*range(2,7),z=anchor?anchor.z:Math.sin(i*2.4)*range(2,4);
  const a=rand()*6.28,rr=anchor?rand()*anchor.size*.63:0;
  const m=mesh(new THREE.IcosahedronGeometry(range(.12,.29),2),mossMaterial,habitat);m.castShadow=false;m.position.set(x+Math.cos(a)*rr,anchor?anchor.top-.11:terrain.heightAt(x,z)+.10,z+Math.sin(a)*rr*.65);m.scale.y=.6;
 }
 for(let i=0;i<settings.carpet;i++){
  const a=rand()*6.28,r=range(2,7.5),g=mesh(new THREE.SphereGeometry(range(.25,.65),12,8),mossMaterial,habitat);g.position.set(Math.cos(a)*r,terrain.heightAt(Math.cos(a)*r,Math.sin(a)*r*.65)+.04,Math.sin(a)*r*.65);g.scale.set(1,.16,.75);
 }
 for(const type of ['broad','fern','grass'])for(let i=0;i<settings[type];i++){
  const a=rand()*6.28,r=range(5.4,7.9),x=Math.cos(a)*r,z=Math.sin(a)*r*.65;if(type==='grass')plants.push({group:ribbons.create(x,z,range(.55,1.2),'grass'),type:'grass',phase:rand()*6});else plant(x,z,range(1.3,3.5)*(settings.visualStyle==='planted'&&type==='fern'?1.4:1),type);
 }
 for(let i=0;i<settings.kelp;i++){const a=Math.PI*1.13+(i/Math.max(1,settings.kelp-1))*Math.PI*.74,r=range(5.4,7.4);plants.push({group:ribbons.create(Math.cos(a)*r,Math.sin(a)*r*.65,range(3.8,5.1)*(settings.visualStyle==='planted'?1.32:1),'kelp'),type:'kelp',phase:rand()*6});}
 for(const type of ['rotala','lotus','corkscrew'])for(let i=0;i<settings[type];i++){const a=rand()*6.28,r=range(4.5,7.5);plants.push({group:extras.specialPlant(Math.cos(a)*r,Math.sin(a)*r*.65,type==='lotus'?range(.5,1.2):range(1.2,2.6),type),phase:rand()*6});}
 for(const type of ['lava','quartz'])for(let i=0;i<settings[type];i++)extras.specialRock(range(-5.5,5.5),range(-2,1.7),range(.45,.9),type);
 for(const type of ['marimo','java'])for(let i=0;i<settings[type];i++){const a=rand()*6.28,r=range(2.8,7);extras.specialMoss(Math.cos(a)*r,Math.sin(a)*r*.65,type);}
 ['sun','lagoon','moon','neon','angel','betta','puffer'].forEach((key,school)=>{const [bodyMat,finMat]=fishMaterials[school];for(let i=0;i<settings[key];i++){
  const g=new THREE.Group();habitat.add(g);g.scale.setScalar(range(.75,1.15));
  let model=null;const realistic=settings.fishAppearance==='realistic'||(settings.fishAppearance==='auto'&&settings.visualStyle==='planted');
  if(realistic){model=naturalFish.create(key,g);if(key==='neon')lighting.addNeon(g,true);}
  let flowingFin,tail;if(!realistic){const body=mesh(new THREE.SphereGeometry(1,20,12),bodyMat,g);body.scale.set(.33,.17,.125);
  tail=mesh(new THREE.ConeGeometry(.19,.28,3),finMat,g);tail.rotation.z=-Math.PI/2;tail.position.x=-.38;tail.scale.z=.55;
  const fin=mesh(new THREE.ConeGeometry(.12,.20,3),finMat,g);fin.position.set(-.06,.17,0);fin.rotation.z=.3;
  if(key==='neon'){body.scale.set(.34,.105,.085);lighting.addNeon(g);}
  if(key==='angel'){body.scale.set(.28,.38,.09);fin.scale.set(1,2.5,.6);fin.position.y=.37;const lower=mesh(new THREE.ConeGeometry(.15,.55,3),finMat,g);lower.rotation.z=Math.PI;lower.position.set(-.04,-.39,0);for(const side of [-1,1]){const feeler=mesh(new THREE.CylinderGeometry(.008,.004,.5,4),finMat,g);feeler.position.set(.1,-.5,side*.04);}g.scale.multiplyScalar(1.15);}
  if(key==='betta'){body.scale.set(.36,.20,.12);const fan=mesh(new THREE.SphereGeometry(1,16,10),finMat,g);flowingFin=fan;fan.position.x=-.46;fan.scale.set(.25,.36,.055);tail.visible=false;fin.scale.set(2,1.4,1);}
  if(key==='puffer'){body.scale.set(.29,.27,.25);tail.scale.multiplyScalar(.65);tail.position.x=-.32;fin.scale.multiplyScalar(.6);for(let n=0;n<22;n++){const a=n*2.4,y=range(-.17,.19),r=Math.sqrt(Math.max(0,.26**2-y*y));const spot=mesh(new THREE.SphereGeometry(.026,5,4),eyeMat,g);spot.position.set(Math.cos(a)*r,y,Math.sin(a)*r*.94);}}
  for(const side of [-1,1]){const eye=mesh(new THREE.SphereGeometry(key==='puffer'?.045:.034,8,6),eyeMat,g);eye.scale.setScalar(settings.visualStyle==='planted'?.8:1);eye.position.set(.21,.045,side*(key==='puffer'?.18:key==='angel'?.085:.105));}
  }else tail=model.tail;
  const offset=new THREE.Vector3(range(-1.4,1.4),range(-.6,.6),range(-1,1));
  const f={g,tail,model,realistic,flowingFin,school,key,phase:rand()*6.28,offset,speed:range(.9,1.1)};g.position.copy(fishDestination(f,time));fish.push(f);
 }});
 landmarks.build(settings);
 for(const type of ['crab','snail'])for(let i=0;i<settings[type];i++)extras.crawler(type,i);
 microfauna.build(settings);
 presentation.apply();applyPlantSurfaces();syncPresentationCamera();
 document.querySelector('.edition').textContent=`${fish.length+extras.crawlers.length+microfauna.shrimp.length+microfauna.plankton.length} little lives. One tiny ecosystem.`;
 const legend=document.querySelector('.legend');legend.innerHTML='<span class="eyebrow">MEET THE NEIGHBORS</span>'+[['#ffac65','Sunburst school',settings.sun],['#66dcd2','Lagoon school',settings.lagoon],['#c3b1ff','Moonbeam school',settings.moon],['#55cfdf','Neon tetras',settings.neon],['#e4cc94','Individual fish',settings.angel+settings.betta+settings.puffer],['#c38b6d','Bottom dwellers',settings.crab+settings.snail+microfauna.shrimp.length],['#bacb8c','Plankton',microfauna.plankton.length]].map(([color,label,count])=>`<div><i style="--c:${color}"></i>${label}<b>${count}</b></div>`).join('');
 try{localStorage.setItem('a-quarko-settings',JSON.stringify(settings));}catch{}
}
const bubbles=[];const bubbleMat=new THREE.MeshPhysicalMaterial({color:'#e0fff7',transparent:true,opacity:.25,roughness:.08,metalness:.1});for(let i=0;i<45;i++){const b=mesh(new THREE.SphereGeometry(range(.025,.07),8,6),bubbleMat);b.position.set(range(-7,7),range(.3,8),range(-4,4));b.castShadow=false;bubbles.push(b);}
const food=[];let feeding=0,paused=false,time=0;
rebuild();
setupEditor();
document.querySelector('#feed').onclick=()=>{feeding=10;for(let i=0;i<24;i++){const f=mesh(new THREE.SphereGeometry(.035,6,4),mat('#bf8151'));f.position.set(range(-1.5,1.5),range(5.8,7),range(-.8,.8));food.push(f);}const n=document.querySelector('#notice');n.textContent='A little snack. Here they come!';n.style.opacity=1;setTimeout(()=>n.style.opacity=0,3000);};
document.querySelector('#pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'▶':'Ⅱ';e.currentTarget.setAttribute('aria-label',paused?'Resume animation':'Pause animation');};
document.querySelector('#declutter').onclick=e=>{const hidden=document.body.classList.toggle('declutter');const editor=document.querySelector('#reef-editor');if(hidden&&editor?.open)editor.close();e.currentTarget.textContent=hidden?'←':'⛶';e.currentTarget.setAttribute('aria-label',hidden?'Show overlay':'Hide overlay');e.currentTarget.title=hidden?'Show overlay':'Hide overlay';};
initPreferences(dark=>{lighting.setInterfaceDark(dark);presentation.apply();});
document.querySelector('#reset-view').onclick=()=>navigation.reset();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
function fishDestination(f,t){
 const solo=f.school>=4;
 const phase=solo?f.phase:f.school*2.1;
 let u=t*(solo?.14:.18)*(solo?f.speed:1)+phase;
 if(!solo&&settings.schoolMotion==='dart')u+=Math.sin(t*.8+phase)*.15;
 const a=u+f.offset.x*.11,r=feeding?1.6:4.5;
 let x=Math.cos(a)*r+f.offset.x,y=(feeding?4.8:2.4+(f.school%4)*.55)+Math.sin(u*2+f.phase)*.2+f.offset.y,z=Math.sin(a)*r*.58+f.offset.z;
 if(!feeding){
  if(!solo&&settings.schoolMotion==='wander'){x+=Math.sin(t*.21+phase)*1.1;z+=Math.sin(t*.3+phase)*.6;y+=Math.sin(t*.25+phase)*.35;}
  if(f.key==='angel'){x=Math.sin(u)*4+f.offset.x;z=Math.cos(u*.65)*2+f.offset.z;y=3.6+Math.sin(u)*.6+f.offset.y;}
  if(f.key==='betta'){x=Math.sin(u*.85)*3.8+f.offset.x;z=Math.sin(u*1.6)*2+f.offset.z;y=2.5+Math.cos(u*.7)*.8+f.offset.y;}
  if(f.key==='puffer'){const step=Math.floor(t/6+f.phase),progress=THREE.MathUtils.smoothstep((t/6+f.phase)%1,.65,1),from=step*.9+f.phase,to=from+.9;const q=THREE.MathUtils.lerp(from,to,progress);x=Math.cos(q)*3.8+f.offset.x;z=Math.sin(q)*2.1+f.offset.z;y=1.7+f.offset.y+Math.sin(t*2+f.phase)*.08;}
 }
 return new THREE.Vector3(x,Math.max(y,terrain.heightAt(x,z)+.65),z);
}
const clock=new THREE.Clock();
// Download texture packs once something visible uses them, checked twice a second.
let nextTextureCheck=0;
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
 if(!paused){
  time+=dt*settings.activity;feeding=Math.max(0,feeding-dt);
  for(const f of fish){const next=fishDestination(f,time),direction=next.clone().sub(f.g.position);f.g.position.lerp(next,Math.min(1,dt*2));
   if(direction.lengthSq()>.00001){const angle=Math.atan2(-direction.z,direction.x),delta=Math.atan2(Math.sin(angle-f.g.rotation.y),Math.cos(angle-f.g.rotation.y));f.g.rotation.y+=delta*Math.min(1,dt*4);f.g.rotation.z=THREE.MathUtils.clamp(direction.y*.15,-.2,.2);}
   if(f.realistic)naturalFish.update(f.model,time,f.phase);else{f.tail.rotation.y=Math.sin(time*(f.key==='angel'?5:10)+f.phase)*.55;if(f.flowingFin)f.flowingFin.rotation.y=Math.sin(time*3+f.phase)*.3;}f.g.rotation.z+=Math.sin(time*4+f.phase)*.018;
  }
  extras.update(time);ribbons.update(time);microfauna.update(time);
  for(const p of plants){p.group.rotation.z=Math.sin(time*.8+p.phase)*.035;p.group.rotation.x=Math.cos(time*.6+p.phase)*.025;}
  for(const b of bubbles){b.position.y+=dt*.32;b.position.x+=Math.sin(time+b.position.y)*dt*.025;if(b.position.y>8)b.position.y=.2;}
  for(let i=food.length-1;i>=0;i--){food[i].position.y-=dt*.30;if(food[i].position.y<3.8){scene.remove(food[i]);food[i].geometry.dispose();food[i].material.dispose();food.splice(i,1);}}
 }
 navigation.update();naturalFish.syncLighting();water.update(time);if(clock.elapsedTime>=nextTextureCheck){nextTextureCheck=clock.elapsedTime+.5;textureLibrary.requestUsed(scene);}
 renderer.render(scene,camera);
}
animate();
// Population state also supports browser verification of live scene changes.
export function populationSnapshot(){return {camera:navigation.snapshot(),fish:fish.map(f=>({type:f.key,realistic:f.realistic,position:f.g.position.toArray()})),crawlers:extras.crawlers.map(c=>({type:c.type,position:c.g.position.toArray()})),microfauna:microfauna.snapshot(),fishModels:naturalFish.snapshot(),plants:plants.length,plantSurfaces:{standard:green.map(m=>!!m.map),...extras.surfaceSnapshot()},ribbons:{...ribbons.snapshot(),clumps:plants.filter(p=>p.type==='kelp'||p.type==='grass'||p.type==='fern').map(p=>({type:p.type,root:p.group.position.toArray(),vertices:p.group.getObjectByName('flat-ribbon-leaves').geometry.attributes.position.count}))},meshes:habitat.children.length,water:water.snapshot(),presentation:presentation.snapshot(),lighting:lighting.snapshot(),terrain:terrain.snapshot(),landmarks:landmarks.landmarks.map(l=>({type:l.type,masonry:l.masonry,roof:l.roof,roofMaterials:l.g.children.filter(c=>c.name==='textured-castle-roof').map(c=>c.material.name),position:l.g.position.toArray()})),paused,settings:{...settings}};}

function setupEditor(){
 const opener=document.createElement('button');opener.id='customize';opener.textContent='\u2637  Shape your reef';opener.setAttribute('aria-haspopup','dialog');document.body.append(opener);
 const panel=document.createElement('dialog');panel.id='reef-editor';panel.setAttribute('aria-labelledby','editor-title');
 panel.innerHTML=`<div class="editor-head"><div><span class="eyebrow">MAKE IT YOUR OWN</span><h2 id="editor-title">Shape your reef</h2></div><button id="close-editor" aria-label="Close reef controls">&times;</button></div><p class="editor-intro">A few small changes. A whole new little world.</p><div id="editor-fields"></div><div class="editor-bottom"><span>Changes appear live &middot; Saved on this browser</span><button id="reset-reef">Restore original reef</button></div>`;document.body.append(panel);
 const styleFields=document.createElement('fieldset');styleFields.innerHTML=`<legend>Look &amp; atmosphere</legend><label class="select-label" for="visual-style">Visual style</label><select id="visual-style"><option value="miniature">Playful miniature</option><option value="planted">Natural planted tank</option></select><label class="select-label" for="plant-surface">Plant surfaces</label><select id="plant-surface"><option value="auto">Match scene style</option><option value="smooth">Smooth &amp; playful</option><option value="textured">Veined &amp; natural</option></select><label class="select-label" for="fish-appearance">Fish appearance</label><select id="fish-appearance"><option value="realistic">Natural aquarium fish</option><option value="playful">Playful fish</option><option value="auto">Match scene style</option></select><p class="movement-note">Species-specific scales, gills and translucent fins. Your fish counts stay the same.</p><div class="setting-row"><label for="water-atmosphere">Water atmosphere</label><output id="water-atmosphere-value" for="water-atmosphere"></output><input id="water-atmosphere" type="range" min="0" max="1" step="0.05"></div><div class="setting-row"><label for="water-specks">Suspended specks</label><output id="water-specks-value" for="water-specks"></output><input id="water-specks" type="range" min="0" max="1" step="0.05"></div><p class="movement-note">A glass tank, dark backing, mixed gravel and driftwood bring the planted style closer to a home aquarium. Both styles keep your fish and plant counts.</p>`;panel.querySelector('#editor-fields').append(styleFields);
 function syncAtmosphere(){panel.querySelector('#visual-style').value=settings.visualStyle;panel.querySelector('#plant-surface').value=settings.plantSurface;panel.querySelector('#fish-appearance').value=settings.fishAppearance;for(const [id,key] of [['water-atmosphere','waterAtmosphere'],['water-specks','specks']]){panel.querySelector('#'+id).value=settings[key];panel.querySelector('#'+id+'-value').value=Math.round(settings[key]*100)+'%';}}
 syncAtmosphere();panel.querySelector('#fish-appearance').onchange=e=>{settings.fishAppearance=e.target.value;saveMovement();clearTimeout(pending);rebuild();};panel.querySelector('#plant-surface').onchange=e=>{settings.plantSurface=e.target.value;applyPlantSurfaces();saveMovement();};panel.querySelector('#visual-style').onchange=e=>{settings.visualStyle=e.target.value;syncAtmosphere();saveMovement();clearTimeout(pending);rebuild();};
 for(const [id,key] of [['water-atmosphere','waterAtmosphere'],['water-specks','specks']])panel.querySelector('#'+id).oninput=e=>{settings[key]=Number(e.target.value);syncAtmosphere();water.update(time);saveMovement();};
 const terrainFields=document.createElement('fieldset');terrainFields.innerHTML=`<legend>Landscape</legend><label class="select-label" for="terrain-type">Ground relief</label><select id="terrain-type">${terrainTypes.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><div class="setting-row"><label for="relief">Relief height</label><output id="relief-value" for="relief"></output><input id="relief" type="range" min="0" max="1.8" step="0.05"></div><p class="movement-note">Shape the sand beneath your reef. Plants and little crawlers follow the ground.</p>`;panel.querySelector('#editor-fields').append(terrainFields);
 function syncTerrain(){panel.querySelector('#terrain-type').value=settings.terrainType;panel.querySelector('#relief').value=settings.relief;panel.querySelector('#relief-value').value=settings.relief.toFixed(2)+'x';}
 syncTerrain();panel.querySelector('#terrain-type').onchange=e=>{settings.terrainType=e.target.value;scheduleRebuild();};panel.querySelector('#relief').oninput=e=>{settings.relief=Number(e.target.value);syncTerrain();scheduleRebuild();};
 const lightFields=document.createElement('fieldset');lightFields.innerHTML=`<legend>Aquarium lighting</legend><label class="select-label" for="time-of-day">Time of day</label><select id="time-of-day">${dayOptions.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><label class="select-label" for="neon-color">Neon fish color</label><select id="neon-color">${neonColors.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><div class="setting-row"><label for="neon-glow">Neon glow</label><output for="neon-glow" id="neon-glow-value"></output><input id="neon-glow" type="range" min="0" max="2" step="0.1"></div><p class="movement-note">Neon tetras shine brightest at night. Adjust their number under Fish schools. Interface dark mode is independent of aquarium lighting.</p>`;panel.querySelector('#editor-fields').append(lightFields);
 function syncLighting(){panel.querySelector('#time-of-day').value=settings.timeOfDay;panel.querySelector('#neon-color').value=settings.neonColor;panel.querySelector('#neon-glow').value=settings.neonGlow;panel.querySelector('#neon-glow-value').value=settings.neonGlow.toFixed(1)+'x';}
 syncLighting();for(const [id,key] of [['time-of-day','timeOfDay'],['neon-color','neonColor'],['neon-glow','neonGlow']]){const input=panel.querySelector('#'+id);input.addEventListener(id==='neon-glow'?'input':'change',()=>{settings[key]=id==='neon-glow'?Number(input.value):input.value;syncLighting();lighting.apply();presentation.apply();saveMovement();});}
 const castleFields=document.createElement('fieldset');castleFields.innerHTML=`<legend>Castle finishes</legend><label class="select-label" for="castle-masonry">Castle walls</label><select id="castle-masonry">${masonryOptions.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><label class="select-label" for="castle-roof">Tower roofs</label><select id="castle-roof">${roofOptions.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><p class="movement-note">Weathered masonry, recessed joints and overlapping roof tiles. Add castles under Underwater treasures.</p>`;panel.querySelector('#editor-fields').append(castleFields);
 function syncCastle(){panel.querySelector('#castle-masonry').value=settings.castleMasonry;panel.querySelector('#castle-roof').value=settings.castleRoof;}
 syncCastle();for(const [id,key] of [['castle-masonry','castleMasonry'],['castle-roof','castleRoof']])panel.querySelector('#'+id).onchange=e=>{settings[key]=e.target.value;saveMovement();clearTimeout(pending);rebuild();};
 for(const [title,items] of sections){const fieldset=document.createElement('fieldset');fieldset.innerHTML=`<legend>${title}</legend>`;for(const [key,label,max] of items){settings[key]=Math.min(settings[key],max);const row=document.createElement('div');row.className='setting-row';row.innerHTML=`<label for="count-${key}">${label}</label><output id="value-${key}" for="count-${key}">${settings[key]}</output><input type="range" id="count-${key}" min="0" max="${max}" value="${settings[key]}" aria-describedby="value-${key}">`;row.querySelector('input').oninput=e=>{settings[key]=Number(e.target.value);row.querySelector('output').value=settings[key];scheduleRebuild();};fieldset.append(row);}panel.querySelector('#editor-fields').append(fieldset);}
 const behavior=document.createElement('fieldset');behavior.innerHTML=`<legend>Movement</legend><label class="select-label" for="school-motion">School swimming style</label><select id="school-motion"><option value="cruise">Gentle cruise</option><option value="wander">Meandering schools</option><option value="dart">Playful bursts</option></select><div class="setting-row"><label for="activity">Activity level</label><output id="activity-value" for="activity"></output><input id="activity" type="range" min="0.25" max="2" step="0.25"></div><p class="movement-note">Angelfish glide, bettas wander, and puffers hover then dart. Crabs scuttle; snails take their time.</p>`;panel.querySelector('#editor-fields').append(behavior);
 function syncMovement(){panel.querySelector('#school-motion').value=settings.schoolMotion;panel.querySelector('#activity').value=settings.activity;panel.querySelector('#activity-value').value=settings.activity+'x';}
 function saveMovement(){try{localStorage.setItem('a-quarko-settings',JSON.stringify(settings));}catch{}}
 syncMovement();panel.querySelector('#school-motion').onchange=e=>{settings.schoolMotion=e.target.value;saveMovement();};panel.querySelector('#activity').oninput=e=>{settings.activity=Number(e.target.value);syncMovement();saveMovement();};
 let pending;function scheduleRebuild(){saveMovement();clearTimeout(pending);pending=setTimeout(rebuild,80);}
 opener.onclick=()=>{panel.showModal();opener.setAttribute('aria-expanded','true');};panel.querySelector('#close-editor').onclick=()=>panel.close();panel.addEventListener('close',()=>{opener.setAttribute('aria-expanded','false');opener.focus();});panel.addEventListener('click',e=>{if(e.target===panel&&e.clientX<panel.getBoundingClientRect().left)panel.close();});
 panel.querySelector('#reset-reef').onclick=()=>{clearTimeout(pending);settings={...defaults,...movementDefaults,...terrainDefaults,...lightingDefaults,...atmosphereDefaults,...castleDefaults};syncMovement();syncTerrain();syncLighting();syncAtmosphere();syncCastle();lighting.apply();for(const key in defaults){panel.querySelector(`#count-${key}`).value=settings[key];panel.querySelector(`#value-${key}`).value=settings[key];}rebuild();};
}

// Resolves when the named packs have loaded, without requesting them.
export function whenTexturesLoaded(names){return Promise.all(names.map(name=>generatedTextures[name].ready));}
export function materialSnapshot(){return Object.fromEntries(Object.entries(generatedTextures).map(([name,pack])=>[name,pack.loaded?{loaded:true,url:pack.url,width:pack.width,height:pack.heightPixels,colorSpace:pack.color.colorSpace,dataColorSpace:pack.height.colorSpace,hasHeight:!!pack.height.image,hasRoughness:!!pack.roughness.image}: {loaded:false}]));}
