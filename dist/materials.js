import * as THREE from './vendor/three.module.js';

export const textureNames=['sand','stone','moss','leaf','fish','limestone','brick','slate','terracotta','shell','shrimp','plankton','darksoil','rivergravel','quartzsand'];
// Mean albedo of each scan (see tools/convert_textures.py inputs), shown until
// the image arrives.
const meanColors={sand:'#d4b590',stone:'#8a8875',moss:'#3d5712',leaf:'#7eb225',fish:'#918f8c',limestone:'#b8aa93',brick:'#91664e',slate:'#5e6260',terracotta:'#985d3e',shell:'#e0c1a6',shrimp:'#a9a198',plankton:'#c3b486',darksoil:'#51463b',rivergravel:'#aca28b',quartzsand:'#dbd3bd'};

// Every pack exists immediately with 1x1 placeholder images, so the scene can
// render before any download. A pack downloads only when ensure() asks for it
// (requestUsed() does so for textures on visible meshes); its textures then
// swap images in place, keeping material references and compiled shaders.
export function createTextureLibrary(renderer){
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const manifestUrl=new URL('./assets/textures/formats.json',import.meta.url);
  let manifest;
  const files=()=>manifest??=fetch(manifestUrl).then(r=>{if(!r.ok)throw new Error('Texture manifest missing');return r.json();}).catch(error=>{console.warn(error);return {};});
  async function loadImage(url){
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Texture request failed: ${response.status}`);
    const objectUrl=URL.createObjectURL(await response.blob()),image=new Image();
    try{image.src=objectUrl;await image.decode();return image;}
    finally{URL.revokeObjectURL(objectUrl);}
  }
  function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
  function configure(texture,color=false){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=anisotropy;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.needsUpdate=true;return texture;
  }
  // Albedo-derived detail maps approximate surface relief; these are not
  // measured PBR scans. Keep data textures linear, unlike the color image.
  function detailMaps(name,image,size){
    const ctx=canvas(size).getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);
    const source=ctx.getImageData(0,0,size,size),height=ctx.createImageData(size,size),rough=ctx.createImageData(size,size),neutral=ctx.createImageData(size,size);
    for(let i=0;i<source.data.length;i+=4){
      const luminance=(source.data[i]*.2126+source.data[i+1]*.7152+source.data[i+2]*.0722)/255;
      const h=Math.round(255*(.2+luminance*.6)),r=Math.round(255*(name==='moss'?.97:name==='leaf'?.60+.15*(1-luminance):name==='sand'?.90+.08*(1-luminance):.77+.19*(1-luminance)));
      height.data.set([h,h,h,255],i);rough.data.set([r,r,r,255],i);
      const n=Math.round(255*(.35+.65*luminance));neutral.data.set([n,n,n,255],i);
    }
    function map(pixels){const c=canvas(size);c.getContext('2d').putImageData(pixels,0,0);return c;}
    return {height:map(height),roughness:map(rough),neutral:name==='leaf'?map(neutral):null};
  }
  // A new size needs a new GPU allocation, so release the placeholder first.
  function replace(texture,image){texture.dispose();texture.source=new THREE.Source(image);texture.needsUpdate=true;}
  const packs={},owners=new Map(),started=new Map();
  for(const name of textureNames){
    const swatch=canvas(1),ctx=swatch.getContext('2d');ctx.fillStyle=meanColors[name];ctx.fillRect(0,0,1,1);
    const maps=detailMaps(name,swatch,1);
    // ready resolves once the real images are in place, for consumers that
    // paint the albedo into their own canvases.
    let resolve;const ready=new Promise(r=>resolve=r);
    packs[name]={color:configure(new THREE.Texture(swatch),true),height:configure(new THREE.Texture(maps.height)),roughness:configure(new THREE.Texture(maps.roughness)),neutral:maps.neutral&&configure(new THREE.Texture(maps.neutral),true),loaded:false,url:null,width:0,heightPixels:0,ready,resolve};
    for(const key of ['color','height','roughness','neutral'])if(packs[name][key])owners.set(packs[name][key],name);
  }
  async function load(name){
    const pack=packs[name],file=(await files())[`${name}-albedo-v1`]||`${name}-albedo-v1.jpg`;
    const url=new URL(`./assets/textures/${file}`,import.meta.url).href;
    try{
      let image;
      for(let attempt=0;attempt<3;attempt++){
        try{image=await loadImage(url);break;}
        catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,150));}
      }
      const maps=detailMaps(name,image,512);
      replace(pack.color,image);replace(pack.height,maps.height);replace(pack.roughness,maps.roughness);if(pack.neutral)replace(pack.neutral,maps.neutral);
      Object.assign(pack,{loaded:true,url,width:image.width,heightPixels:image.height});
      pack.resolve();return true;
    }catch(error){
      console.warn(`Generated ${name} texture could not load; keeping its flat placeholder.`,error);
      return false;
    }
  }
  // Resolves true once the pack's images are in place. Downloads run in
  // parallel; the browser limits connections per host itself.
  function ensure(name){if(!started.has(name))started.set(name,load(name));return started.get(name);}
  const slots=['map','bumpMap','roughnessMap','emissiveMap'];
  function requestUsed(root){
    if(started.size===textureNames.length)return;
    root.traverseVisible(object=>{
      if(!object.material)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material])
        for(const slot of slots){const name=owners.get(material[slot]);if(name)ensure(name);}
    });
  }
  return {packs,ensure,requestUsed};
}

// Loads every pack up front; for review pages that render a single still.
export async function loadMaterialTextures(renderer){
  const library=createTextureLibrary(renderer);
  await Promise.all(textureNames.map(library.ensure));
  return library.packs;
}

// Use a neutralized leaf scan so the same veins work on green and red species.
// Switching surfaces reuses GPU textures; it never reloads the source image.
export function setPlantSurface(material,pack,textured){
  const nextMap=textured&&pack?(pack.neutral||pack.color):null;
  if(material.map===nextMap)return;
  material.map=nextMap;material.bumpMap=textured&&pack?pack.height:null;material.roughnessMap=textured&&pack?pack.roughness:null;
  material.bumpScale=.012;material.roughness=textured?.95:.8;material.needsUpdate=true;
}

export function leafSphereGeometry(axis='y',segments=8,rings=6){
  const geometry=new THREE.SphereGeometry(1,segments,rings),p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
    const across=axis==='x'?p.getY(i):p.getX(i),along=axis==='x'?p.getX(i):axis==='z'?p.getZ(i):p.getY(i);
    uv.setXY(i,(across+1)/2,(along+1)/2);
  }
  return geometry;
}

export function applyTexturePack(material,pack,{tint,bump=.035,roughness=1}={}){
  if(!pack)return material;
  material.map=pack.color;material.bumpMap=pack.height;material.roughnessMap=pack.roughness;
  material.bumpScale=bump;material.roughness=roughness;if(tint)material.color.set(tint);
  material.needsUpdate=true;return material;
}
