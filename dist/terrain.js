import * as THREE from './vendor/three.module.js';
import {createCastleMaterials,masonryBoxUV,masonryRoundUV} from './castle-materials.js';
import {applyTexturePack} from './materials.js';

export const terrainDefaults={terrainType:'dunes',relief:.65};
export const terrainTypes=[['flat','Quiet sand bed'],['dunes','Rippled dunes'],['hills','Rolling hills'],['basin','Rocky basin'],['terraces','Sunken terraces']];

export function createTerrain({mesh,sand,getSettings}){
  const segments=128,rings=48,vertices=[],indices=[];
  // Concentric rings preserve the rounded shoreline while adding enough
  // interior vertices for actual relief rather than a flat triangle fan.
  vertices.push(0,0,0);
  for(let r=1;r<=rings;r++)for(let a=0;a<segments;a++){const angle=a/segments*Math.PI*2;vertices.push(Math.cos(angle)*8.8*r/rings,0,Math.sin(angle)*6.16*r/rings);}
  for(let a=0;a<segments;a++)indices.push(0,1+(a+1)%segments,1+a);
  for(let r=1;r<rings;r++)for(let a=0;a<segments;a++){
    const p=1+(r-1)*segments+a,q=1+(r-1)*segments+(a+1)%segments,u=p+segments,v=q+segments;
    indices.push(p,q,u,q,v,u);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(vertices.length),3));geometry.setIndex(indices);
  const uvs=[];for(let i=0;i<vertices.length;i+=3)uvs.push(vertices[i]/4.4+.5,vertices[i+2]/4.4+.5);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  sand.vertexColors=true;const surface=mesh(geometry,sand);surface.name='terrain';surface.castShadow=false;
  const sideMaterial=sand.clone();sideMaterial.vertexColors=false;
  const skirt=mesh(new THREE.CylinderGeometry(8.8,8.8,.22,128,1,true),sideMaterial);skirt.position.y=-.05;skirt.scale.z=.7;skirt.castShadow=false;
  const sideUvs=skirt.geometry.attributes.uv;for(let i=0;i<sideUvs.count;i++)sideUvs.setXY(i,sideUvs.getX(i)*10,sideUvs.getY(i)*.05);
  const rectangularGeo=new THREE.PlaneGeometry(17.6,12.32,96,64);rectangularGeo.rotateX(-Math.PI/2);
  rectangularGeo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(rectangularGeo.attributes.position.count*3),3));
  const rectUvs=rectangularGeo.attributes.uv;for(let i=0;i<rectUvs.count;i++)rectUvs.setXY(i,rectangularGeo.attributes.position.getX(i)/4.4+.5,rectangularGeo.attributes.position.getZ(i)/4.4+.5);
  const plantedSand=sand.clone();plantedSand.color.set('#8e8d71');
  const rectangular=mesh(rectangularGeo,plantedSand);rectangular.castShadow=false;rectangular.visible=false;
  function heightAt(x,z){
    const {terrainType,relief}=getSettings(),r=Math.sqrt((x/8.8)**2+(z/6.16)**2),fade=1-THREE.MathUtils.smoothstep(r,.69,1);
    let h=0;
    if(terrainType==='dunes')h=.28+.20*Math.sin(x*1.35+Math.sin(z*.8))+.11*Math.sin(z*1.8+x*.3);
    if(terrainType==='hills')h=1.5*Math.exp(-((x+3)**2/8+(z+1)**2/5))+.95*Math.exp(-((x-3)**2/6+(z-1.5)**2/4));
    if(terrainType==='basin')h=.95*Math.exp(-(((r-.56)/.19)**2))*(1+.19*Math.sin(Math.atan2(z,x)*7))+.05*Math.sin(x*2)*Math.cos(z*2);
    if(terrainType==='terraces'){const hill=1.5*Math.exp(-(x*x/25+(z+1.5)**2/14)),step=hill/.32;h=(Math.floor(step)+THREE.MathUtils.smoothstep(step%1,.25,.8))*.32;}
    return .06+Math.max(0,h)*relief*fade;
  }
  function update(){
    for(const geo of [geometry,rectangularGeo]){
    const positions=geo.attributes.position,colors=geo.attributes.color,color=new THREE.Color();
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),h=heightAt(x,z);positions.setY(i,h);color.set('#ffffff').lerp(new THREE.Color('#b9b39a'),Math.min(.35,(h-.06)*.18));colors.setXYZ(i,color.r,color.g,color.b);}
    positions.needsUpdate=true;colors.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    }
  }
  function snapshot(){return {type:getSettings().terrainType,relief:getSettings().relief,vertices:geometry.attributes.position.count,samples:[[-3,-1],[0,0],[3,1],[5,2],[8.8,0]].map(([x,z])=>({x,z,y:heightAt(x,z)}))};}
  function setPresentation(planted){surface.visible=!planted;skirt.visible=!planted;rectangular.visible=planted;}
  update();return {heightAt,update,snapshot,setPresentation};
}

export function createLandmarks({habitat,mesh,mat,stoneMap,mossMaterial,ground,stonePack,texturePacks={}}){
  const stone=new THREE.MeshStandardMaterial({color:'#b6b8a1',map:stoneMap,bumpMap:stoneMap,bumpScale:.08,roughness:.95});
  applyTexturePack(stone,stonePack,{tint:'#dfdac8',bump:.045});
  const finishes=createCastleMaterials(texturePacks,stone),door=mat('#385e56'),finial=mat('#728b75');let activeStone=stone;const landmarks=[];
  function block(g,x,y,z,w,h,d,material=activeStone){const m=mesh(masonryBoxUV(new THREE.BoxGeometry(w,h,d),x,y,z),material,g);m.position.set(x,y,z);return m;}
  function decorate(g,seed){for(let i=0;i<8;i++){const a=i*2.4+seed,m=mesh(new THREE.IcosahedronGeometry(.12+(i%3)*.025,1),mossMaterial,g);m.position.set(Math.cos(a)*.9,.12,Math.sin(a)*.6);m.scale.y=.45;}}
  function arch(g,x,z,scale=1){
    const a=new THREE.Group();a.position.set(x,0,z);a.scale.setScalar(scale);g.add(a);
    for(const side of [-1,1]){block(a,side*.60,.57,0,.30,1.14,.42);block(a,side*.60,.10,0,.45,.20,.56);}
    for(let i=0;i<9;i++){const angle=(i+.5)/9*Math.PI,m=block(a,Math.cos(angle)*.60,1.12+Math.sin(angle)*.60,0,.27,.30,.44);m.rotation.z=angle-Math.PI/2;}
  }
  function build(settings){
    landmarks.length=0;
    for(const type of ['ruins','castle'])for(let i=0;i<settings[type];i++){
      const wallKey=settings.castleMasonry==='mixed'?(i%2?'brick':'limestone'):settings.castleMasonry;activeStone=type==='ruins'?stone:(finishes.walls[wallKey]||stone);
      const [x,z]=(type==='ruins'?[[-2,1.1],[-3.7,-2],[1,2.4]]:[[2.2,-1.2],[5,1.8]])[i];
      const g=new THREE.Group();
      g.rotation.y=type==='ruins'?-.15:.25;
      const w=type==='ruins'?2.6:2.25,d=1.7,heights=[ground(x,z)];
      for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2]){
        heights.push(ground(x+dx*Math.cos(g.rotation.y)+dz*Math.sin(g.rotation.y),z-dx*Math.sin(g.rotation.y)+dz*Math.cos(g.rotation.y)));
      }
      const top=Math.max(...heights),depth=top-Math.min(...heights)+.22;
      g.position.set(x,top-.03,z);habitat.add(g);
      // A buried foundation extends through slopes instead of floating above them.
      block(g,0,.10-depth/2,0,w,depth,d);
      if(type==='ruins'){
        arch(g,-.25,0,.85);
        for(const [cx,cz,h] of [[-1,.4,.8],[.95,.2,.6],[.8,-.5,1.1]]){const pillar=mesh(new THREE.CylinderGeometry(.15,.18,h,10),stone,g);pillar.position.set(cx,h/2+.15,cz);block(g,cx,.18,cz,.46,.18,.46);block(g,cx,h+.15,cz,.36,.12,.36);}
        const fallen=mesh(new THREE.CylinderGeometry(.16,.16,.8,10),stone,g);fallen.rotation.z=Math.PI/2;fallen.position.set(.7,.28,.65);
      }else{
        // The front wall has a true arched opening rather than a painted door.
        arch(g,0,.66,.8);block(g,0,.64,-.62,1.55,1.15,.25);block(g,-.72,.64,0,.24,1.15,1.25);block(g,.72,.64,0,.24,1.15,1.25);
        let towerIndex=0;for(const x of [-.78,.78])for(const z of [-.65,.65]){
          const tower=mesh(masonryRoundUV(new THREE.CylinderGeometry(.25,.31,1.8,24,8),.28,1.8,.1),activeStone,g);tower.position.set(x,1,z);
          const roofKey=settings.castleRoof==='mixed'?(towerIndex++%2?'terracotta':'slate'):settings.castleRoof,roof=finishes.roofs[roofKey]||finishes.roofs.slate;
          const capGeo=new THREE.CylinderGeometry(.018,.39,.68,32,8),roofUv=capGeo.attributes.uv;for(let n=0;n<roofUv.count;n++)roofUv.setXY(n,roofUv.getX(n)*2,roofUv.getY(n)*.85);
          const cap=mesh(capGeo,roof,g);cap.position.set(x,2.18,z);cap.name='textured-castle-roof';
          const eave=mesh(new THREE.CylinderGeometry(.39,.40,.045,32),roof,g);eave.position.set(x,1.855,z);
          const knob=mesh(new THREE.SphereGeometry(.029,8,6),finial,g);knob.position.set(x,2.55,z);
          block(g,x,1.55,z+.252,.07,.23,.014,door);
          for(let n=0;n<3;n++)block(g,x+(n-1)*.14,1.18,-.62,.10,.19,.23);
        }
        for(let n=0;n<5;n++){block(g,(n-2)*.25,1.35,.62,.13,.23,.25);block(g,(n-2)*.25,1.35,-.62,.13,.23,.25);}
      }
      decorate(g,i);landmarks.push({type,g,masonry:type==='castle'?wallKey:'stone',roof:type==='castle'?settings.castleRoof:null});
    }
  }
  return {build,landmarks};
}
