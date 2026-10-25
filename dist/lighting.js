import * as THREE from './vendor/three.module.js';

export const lightingDefaults={timeOfDay:'day',neonGlow:1,neonColor:'cyan'};
export const dayOptions=[['morning','Morning'],['day','Daylight'],['sunset','Sunset'],['night','Night']];
export const neonColors=[['cyan','Electric blue'],['pink','Hot pink'],['lime','Acid green']];
const presets={
  morning:{sun:'#ffe1b0',intensity:2.4,position:[-12,7,8],sky:'#d2ebeb',ground:'#819c88',ambient:1.8,light:'#d5e5db',dark:'#203d45'},
  day:{sun:'#fff1cf',intensity:3.1,position:[-7,15,8],sky:'#e6fff4',ground:'#6d9286',ambient:2.6,light:'#c8e5df',dark:'#17333e'},
  sunset:{sun:'#ff9a5f',intensity:2.5,position:[12,5,3],sky:'#b9bde0',ground:'#897077',ambient:1.25,light:'#e6d1c8',dark:'#3b293d'},
  night:{sun:'#8ebcff',intensity:.55,position:[-5,12,-8],sky:'#7499d4',ground:'#324963',ambient:.85,light:'#c1cede',dark:'#101f34'}
};
const colors={cyan:'#40e9ff',pink:'#ff63dc',lime:'#b7ff46'};

export function createLighting({scene,sun,ambient,renderer,fishMaterials,getSettings}){
  let interfaceDark=false;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(.22,'rgba(255,255,255,.35)');gradient.addColorStop(.55,'rgba(255,255,255,.08)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const glowTexture=new THREE.CanvasTexture(canvas);
  const glowMaterial=new THREE.SpriteMaterial({map:glowTexture,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const stripeMaterial=new THREE.MeshStandardMaterial({color:'#40e9ff',emissive:'#40e9ff',roughness:.25});
  const redMaterial=new THREE.MeshStandardMaterial({color:'#f46986',emissive:'#f03867',roughness:.4});
  function addNeon(group,realistic=false){
    if(!realistic){
    const stripe=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),stripeMaterial);stripe.scale.set(.30,.025,.093);stripe.position.y=.025;group.add(stripe);
    const red=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),redMaterial);red.scale.set(.18,.028,.088);red.position.set(-.1,-.04,0);group.add(red);
    }
    const glow=new THREE.Sprite(glowMaterial);glow.scale.set(1.15,.7,1);group.add(glow);
  }
  function apply(){
    const settings=getSettings(),preset=presets[settings.timeOfDay],color=colors[settings.neonColor],night=settings.timeOfDay==='night',strength=settings.neonGlow;
    sun.color.set(preset.sun);sun.intensity=preset.intensity;sun.position.set(...preset.position);
    ambient.color.set(preset.sky);ambient.groundColor.set(preset.ground);ambient.intensity=preset.ambient;
    scene.background.set(interfaceDark?preset.dark:preset.light);scene.fog.color.copy(scene.background);
    renderer.toneMappingExposure=night?1.15:1.05;
    const [body,fin]=fishMaterials[3];body.color.set(color);body.emissive.set(color);body.emissiveIntensity=strength*(night?.65:.22);fin.emissive.set('#f03867');fin.emissiveIntensity=strength*.2;
    stripeMaterial.color.set(color);stripeMaterial.emissive.set(color);stripeMaterial.emissiveIntensity=strength*(night?3:1.7);
    redMaterial.emissiveIntensity=strength*(night?1.8:.65);
    glowMaterial.color.set(color);glowMaterial.opacity=strength*(night?.36:.13);
  }
  function setInterfaceDark(dark){interfaceDark=dark;apply();}
  function snapshot(){return {timeOfDay:getSettings().timeOfDay,sun:sun.color.getHexString(),intensity:sun.intensity,position:sun.position.toArray(),ambient:ambient.intensity,neonColor:stripeMaterial.color.getHexString(),neonEmission:stripeMaterial.emissiveIntensity,glowOpacity:glowMaterial.opacity};}
  apply();return {apply,addNeon,setInterfaceDark,snapshot};
}
