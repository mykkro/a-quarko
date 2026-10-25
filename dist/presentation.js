import * as THREE from './vendor/three.module.js';
import {applyTexturePack} from './materials.js';

export function createPresentation({scene,mesh,mat,stonePack,fishMaterials,green,base,terrain,getSettings}){
  const tank=new THREE.Group();scene.add(tank);
  const charcoal=mat('#17241f'),frame=mat('#101d19'),wood=mat('#654632');
  applyTexturePack(charcoal,stonePack,{tint:'#3c4940',bump:.1});applyTexturePack(wood,stonePack,{tint:'#765239',bump:.08});
  function box(x,y,z,w,h,d,material){const m=mesh(new THREE.BoxGeometry(w,h,d),material,tank);m.position.set(x,y,z);return m;}
  box(0,3.75,-6.42,18.1,8.1,.16,charcoal);
  box(0,-.22,0,18.2,.48,12.9,frame);
  for(const z of [-6.48,6.48]){box(0,7.85,z,18.35,.18,.16,frame);box(0,-.08,z,18.35,.18,.16,frame);}
  for(const x of [-9.1,9.1])for(const z of [-6.48,6.48])box(x,3.85,z,.12,8,.12,frame);
  const glass=new THREE.MeshPhysicalMaterial({color:'#91c1aa',transparent:true,opacity:.055,roughness:.12,side:THREE.DoubleSide,depthWrite:false});
  for(const x of [-9.1,9.1]){const pane=mesh(new THREE.PlaneGeometry(12.8,7.8),glass,tank);pane.rotation.y=Math.PI/2;pane.position.set(x,3.85,0);pane.castShadow=false;}
  const waterline=mesh(new THREE.PlaneGeometry(18.1,12.8),new THREE.MeshBasicMaterial({color:'#9bc8b0',transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}),tank);waterline.rotation.x=-Math.PI/2;waterline.position.y=7.4;
  const lamp=box(0,7.7,-1.7,14,.04,.35,new THREE.MeshStandardMaterial({color:'#d7edba',emissive:'#cbe7a1',emissiveIntensity:.35}));
  // Crooked branching wood and fine mixed gravel echo a planted home aquarium.
  const branches=[[[ -3,.4,1],[-1.5,.9,.5],[.4,1.3,-.4],[2.8,.55,-1.7]],[[0,.9,-.2],[1.4,1.9,-1.2],[1.8,2.8,-2]],[[ -2,.6,.7],[-3.3,1.1,-.6],[-4,1.7,-1.5]],[[.5,1,-.6],[2,1.1,1],[3.3,.4,1.6]]];
  branches.forEach((points,i)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const branch=mesh(new THREE.TubeGeometry(curve,24,i?.11:.28,7,false),wood,tank);});
  let seed=24;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const gravel=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:.95}),1600),dummy=new THREE.Object3D();const gravelRoots=[];
  for(let i=0;i<1600;i++){const x=(random()-.5)*17.5,z=(random()-.5)*12.25,s=.035+random()*.06;gravelRoots.push({x,z,s});gravel.setColorAt(i,new THREE.Color(['#677063','#c5bc98','#807762','#d7cfae','#4c594d'][i%5]));}
  gravel.receiveShadow=true;tank.add(gravel);
  const toyColors=['#478766','#76a76b','#326e58','#99b96b'],naturalColors=['#3c793d','#79a745','#2c643c','#94ad54'];
  const toyFish=['#f6a15f','#56bfb9','#b6a0de',null,'#ead9a0','#9f72c7','#d4bd69'],naturalFish=['#c38e5f','#92afa0','#9eabbc',null,'#c7c6a0','#98769b','#b6ac72'];
  function apply(){
    const planted=getSettings().visualStyle==='planted';tank.visible=planted;base.visible=!planted;terrain.setPresentation(planted);
    green.forEach((m,i)=>m.color.set((planted?naturalColors:toyColors)[i]));
    fishMaterials.forEach(([body,fin],i)=>{if(i!==3)body.color.set((planted?naturalFish:toyFish)[i]);fin.transparent=planted;fin.opacity=planted?.78:1;fin.needsUpdate=true;});
    const palettes={darksoil:['#514438','#655746','#766451','#37332d','#8b7862'],quartzsand:['#e8e1cd','#c6c6b9','#f0ebda','#d9d8ca','#b7b9b4']},gravelColors=palettes[getSettings().groundMaterial]||['#677063','#c5bc98','#807762','#d7cfae','#4c594d'];
    gravelRoots.forEach(({x,z,s},i)=>{gravel.setColorAt(i,new THREE.Color(gravelColors[i%5]));dummy.position.set(x,terrain.heightAt(x,z)+s*.25,z);dummy.rotation.set(i*.7,i*1.3,0);dummy.scale.set(s,s*.5,s*.8);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);});gravel.instanceMatrix.needsUpdate=true;gravel.instanceColor.needsUpdate=true;
    document.documentElement.dataset.style=planted?'planted':'miniature';
    lamp.material.emissiveIntensity=getSettings().timeOfDay==='night'?.025:.35;
  }
  return {apply,snapshot:()=>({style:getSettings().visualStyle,tankVisible:tank.visible,baseVisible:base.visible})};
}
