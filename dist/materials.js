import * as THREE from './vendor/three.module.js';

export async function loadMaterialTextures(renderer){
  const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const manifestUrl=new URL('./assets/textures/formats.json',import.meta.url);
  const files=await fetch(manifestUrl).then(r=>{if(!r.ok)throw new Error('Texture manifest missing');return r.json();});
  function configure(texture,color=false){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=anisotropy;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return texture;
  }
  async function pack(name){
    const file=files[`${name}-albedo-v1`]||`${name}-albedo-v1.jpg`;
    const url=new URL(`./assets/textures/${file}`,import.meta.url).href;
    try{
      const color=configure(await loader.loadAsync(url),true);
      // Albedo-derived detail maps approximate surface relief; these are not
      // measured PBR scans. Keep data textures linear, unlike the color image.
      const size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(color.image,0,0,size,size);
      const source=ctx.getImageData(0,0,size,size),height=ctx.createImageData(size,size),rough=ctx.createImageData(size,size),neutral=ctx.createImageData(size,size);
      for(let i=0;i<source.data.length;i+=4){
        const luminance=(source.data[i]*.2126+source.data[i+1]*.7152+source.data[i+2]*.0722)/255;
        const h=Math.round(255*(.2+luminance*.6)),r=Math.round(255*(name==='moss'?.97:name==='leaf'?.60+.15*(1-luminance):name==='sand'?.90+.08*(1-luminance):.77+.19*(1-luminance)));
        height.data.set([h,h,h,255],i);rough.data.set([r,r,r,255],i);
        const n=Math.round(255*(.35+.65*luminance));neutral.data.set([n,n,n,255],i);
      }
      function map(pixels,isColor=false){const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').putImageData(pixels,0,0);return configure(new THREE.CanvasTexture(c),isColor);}
      return {color,height:map(height),roughness:map(rough),neutral:name==='leaf'?map(neutral,true):null,url,width:color.image.width,heightPixels:color.image.height};
    }catch(error){
      console.warn(`Generated ${name} texture could not load; using the built-in material.`,error);
      return null;
    }
  }
  const entries=await Promise.all(['sand','stone','moss','leaf','fish','limestone','brick','slate','terracotta','shell','shrimp','plankton'].map(async name=>[name,await pack(name)]));
  return Object.fromEntries(entries);
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
