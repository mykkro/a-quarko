import * as THREE from './vendor/three.module.js';

export const bubbleDefaults={bubbleMode:'mixed',bubbleInterval:14,bubbleStrength:1};
export const bubbleModes=[['mixed','Mixed bursts'],['fine','Fine fizz'],['large','Larger sparse bubbles'],['off','Off']];

// One bounded particle pool and one draw call, including the reflective rims.
// Independent randomness leaves seeded aquarium layouts untouched.
export function createBubbleBursts({scene,ground,getSettings,random=Math.random}){
  const capacity=640,particles=[],positions=new Float32Array(capacity*3),sizes=new Float32Array(capacity),fades=new Float32Array(capacity);
  for(let i=0;i<capacity;i++)particles.push({active:false,x:0,y:0,z:0,age:0,delay:0,radius:0,speed:0,phase:0,originX:0,originZ:0});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('aRadius',new THREE.BufferAttribute(sizes,1).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('aFade',new THREE.BufferAttribute(fades,1).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
  const uniforms={uScale:{value:1},uWater:{value:new THREE.Color()},uFogNear:{value:23},uFogFar:{value:56}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`attribute float aRadius; attribute float aFade; uniform float uScale; varying float vFade; varying float vDepth;varying float vPixels;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aRadius*2.0*uScale/max(.1,-mv.z),2.0,96.0);vPixels=gl_PointSize;vFade=aFade;vDepth=-mv.z;}`,
    fragmentShader:`uniform vec3 uWater;uniform float uFogNear;uniform float uFogFar;varying float vFade;varying float vDepth;varying float vPixels;
      void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);if(r>1.0)discard;
        float tiny=1.0-smoothstep(3.0,6.0,vPixels);float rim=smoothstep(mix(.65,.3,tiny),.9,r)*(1.0-smoothstep(.92,1.0,r));float highlight=exp(-dot(p-vec2(-.32,-.36),p-vec2(-.32,-.36))*85.0);
        float glint=exp(-dot(p-vec2(.40,.43),p-vec2(.40,.43))*100.0)*.22;
        float alpha=(rim*mix(.38,.60,tiny)+highlight*.80+glint+.018)*vFade;
        vec3 color=mix(uWater*.30,vec3(.82,.96,1.0),clamp(highlight*2.0+glint+rim*.30,0.0,1.0));
        float fog=smoothstep(uFogNear,uFogFar,vDepth);gl_FragColor=vec4(mix(color,uWater,fog),alpha*(1.0-fog*.75));
        #include <colorspace_fragment>
      }`
  });
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.name='air-bubble-bursts';scene.add(points);
  let nextBurst=.9,elapsed=0,totalBursts=0,lastKind=null,lastInterval=getSettings().bubbleInterval;
  const range=(a,b)=>a+(b-a)*random();
  function clear(resetSchedule=false){for(const p of particles)p.active=false;geometry.setDrawRange(0,0);if(resetSchedule){nextBurst=elapsed+.9;lastInterval=getSettings().bubbleInterval;}}
  function flush(){let count=0;for(const p of particles){if(!p.active||p.delay>0)continue;const i=count++;positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;sizes[i]=p.radius*(1+Math.min(p.age*.018,.15));fades[i]=Math.min(1,p.age/.18)*Math.min(1,Math.max(0,(7.35-p.y)/.6));}geometry.setDrawRange(0,count);geometry.attributes.position.needsUpdate=true;geometry.attributes.aRadius.needsUpdate=true;geometry.attributes.aFade.needsUpdate=true;}
  function burst(){
    const settings=getSettings();if(settings.bubbleMode==='off')return false;
    const kind=settings.bubbleMode==='mixed'?(totalBursts===0||random()<.72?'fine':'large'):settings.bubbleMode;
    const count=Math.round((kind==='fine'?range(105,180):range(9,18))*settings.bubbleStrength),x=range(-2.8,2.8),z=range(2.3,3.3),floor=ground(x,z)+.10;
    let spawned=0;for(const p of particles){if(p.active)continue;if(spawned++>=count)break;
      p.active=true;p.radius=kind==='fine'?range(.009,.026):range(.05,.115);p.originX=x+range(-.1,.1);p.originZ=z+range(-.1,.1);p.y=floor;p.phase=range(0,6.28);p.age=.08;p.delay=spawned===1?0:range(0,kind==='fine'?1.1:.8);p.speed=kind==='fine'?range(.55,.95):range(.9,1.45);p.x=p.originX+Math.sin(p.age*2.2+p.phase)*(.025+p.age*.008);p.z=p.originZ+Math.sin(p.age*1.4+p.phase)*(.02+p.age*.006);
    }
    lastKind=kind;totalBursts++;nextBurst=elapsed+settings.bubbleInterval*range(.7,1.35);flush();return true;
  }
  function update(dt){
    const settings=getSettings();if(settings.bubbleMode==='off'){clear();elapsed+=dt;nextBurst=elapsed+.7;return;}
    if(dt===0)return;
    elapsed+=dt;
    if(lastInterval!==settings.bubbleInterval){lastInterval=settings.bubbleInterval;nextBurst=elapsed+lastInterval*range(.7,1.35);}
    if(dt>0&&elapsed>=nextBurst)burst();
    for(const p of particles){if(!p.active)continue;if(p.delay>0){p.delay-=dt;continue;}p.age+=dt;p.y+=p.speed*dt;p.x=p.originX+Math.sin(p.age*2.2+p.phase)*(.025+p.age*.008);p.z=p.originZ+Math.sin(p.age*1.4+p.phase)*(.02+p.age*.006);if(p.y>=7.35||p.age>15)p.active=false;}
    flush();
  }
  function render(camera,height,pixelRatio){uniforms.uScale.value=height*pixelRatio/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));uniforms.uWater.value.copy(scene.background);uniforms.uFogNear.value=scene.fog.near;uniforms.uFogFar.value=scene.fog.far;}
  function snapshot(){let active=0,fine=0,large=0,first=null;for(const p of particles)if(p.active){active++;if(p.radius<.04)fine++;else large++;if(!first)first={position:[p.x,p.y,p.z],radius:p.radius};}return {capacity,active,visible:geometry.drawRange.count,fine,large,totalBursts,lastKind,nextIn:Math.max(0,nextBurst-elapsed),first};}
  return {update,render,burst,clear,snapshot};
}
