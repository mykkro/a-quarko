import * as THREE from './vendor/three.module.js';

export const atmosphereDefaults={visualStyle:'miniature',waterAtmosphere:.65,specks:.55,plantSurface:'auto',fishAppearance:'realistic'};

export function createWaterAtmosphere({scene,getSettings}){
  const uniforms={uTime:{value:0},uAmount:{value:.65},uBackground:{value:new THREE.Color()}};
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
    uniforms,depthWrite:false,depthTest:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.999,1.0);}',
    fragmentShader:`varying vec2 vUv; uniform float uTime; uniform float uAmount; uniform vec3 uBackground;
      void main(){
        vec2 uv=vUv;
        float wave=sin(uv.y*4.0+uTime*.13)*.28;
        float beams=pow(max(0.0,sin(uv.x*29.0+uv.y*1.8+wave+uTime*.07)),18.0);
        float second=pow(max(0.0,sin(uv.x*17.0-uv.y*1.2+uTime*.05)),28.0);
        float edge=pow(abs(uv.x-.5)*1.4,2.0);
        float shimmer=sin(uv.x*19.0+sin(uv.y*13.0+uTime*.2))*sin(uv.y*12.0-uTime*.12);
        vec3 color=uBackground*(1.0+uAmount*((uv.y-.5)*.24-edge*.16+shimmer*.012));
        color+=vec3(.10,.18,.15)*(beams+second*.4)*pow(uv.y,1.8)*.20*uAmount;
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`
  }));backdrop.frustumCulled=false;backdrop.renderOrder=-1000;scene.add(backdrop);

  let seed=931;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=650,positions=new Float32Array(count*3),initial=new Float32Array(count*3);
  for(let i=0;i<count;i++){initial[i*3]=(random()-.5)*62;initial[i*3+1]=random()*30-9;initial[i*3+2]=random()*48-21;}
  positions.set(initial);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const dot=document.createElement('canvas');dot.width=dot.height=32;const ctx=dot.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.25,'#ffffffb0');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  const material=new THREE.PointsMaterial({map:new THREE.CanvasTexture(dot),color:'#cbece0',size:.065,transparent:true,opacity:.5,depthWrite:false,sizeAttenuation:true});
  const particles=new THREE.Points(geometry,material);particles.frustumCulled=false;scene.add(particles);
  function update(time){
    const settings=getSettings();uniforms.uTime.value=time;uniforms.uAmount.value=settings.waterAtmosphere;uniforms.uBackground.value.copy(scene.background);
    geometry.setDrawRange(0,Math.round(count*settings.specks));particles.visible=settings.specks>0;
    material.opacity=.28+settings.waterAtmosphere*.25;
    for(let i=0;i<count;i++){
      const k=i*3;positions[k]=initial[k]+Math.sin(time*.09+i*1.7)*.42;positions[k+1]=((initial[k+1]+9+time*(.018+(i%5)*.005))%30)-9;positions[k+2]=initial[k+2]+Math.cos(time*.07+i)*.25;
    }
    geometry.attributes.position.needsUpdate=true;
    scene.fog.near=23-settings.waterAtmosphere*3;scene.fog.far=64-settings.waterAtmosphere*8;
  }
  function snapshot(){return {amount:uniforms.uAmount.value,specks:geometry.drawRange.count,time:uniforms.uTime.value,firstParticle:Array.from(positions.slice(0,3))};}
  return {update,snapshot};
}
