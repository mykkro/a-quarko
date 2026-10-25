import * as THREE from './vendor/three.module.js';
import {applyTexturePack} from './materials.js';

export const castleDefaults={castleMasonry:'limestone',castleRoof:'slate'};
export const masonryOptions=[['limestone','Limestone blocks'],['brick','Aged red brick'],['stone','Weathered stone'],['mixed','Mixed masonry']];
export const roofOptions=[['slate','Slate shingles'],['terracotta','Terracotta tiles'],['mixed','Mixed tower roofs']];

export function createCastleMaterials(packs,fallbackStone){
  const walls={stone:fallbackStone};
  for(const name of ['limestone','brick']){
    walls[name]=new THREE.MeshStandardMaterial({color:'#e7e3d7',roughness:1});
    applyTexturePack(walls[name],packs[name]||packs.stone,{tint:name==='brick'?'#dfd5c9':'#e8e5da',bump:.055});walls[name].name='castle-wall-'+name;
  }
  const roofs={};
  for(const name of ['slate','terracotta']){
    roofs[name]=new THREE.MeshStandardMaterial({color:'#d4ddd6',roughness:.9});
    applyTexturePack(roofs[name],packs[name]||packs.stone,{tint:name==='slate'?'#bdcccb':'#e7d1bc',bump:.045});roofs[name].name='castle-roof-'+name;
  }
  return {walls,roofs};
}

export function masonryBoxUV(geometry,x,y,z){
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
    const px=p.getX(i)+x,py=p.getY(i)+y,pz=p.getZ(i)+z;
    uv.setXY(i,(Math.abs(n.getX(i))>.5?pz:px)/1.8,(Math.abs(n.getY(i))>.5?pz:py)/1.8);
  }
  return geometry;
}

export function masonryRoundUV(geometry,radius,height,baseY){
  const uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2*Math.PI*radius/1.8,(uv.getY(i)*height+baseY)/1.8);
  return geometry;
}
