import * as THREE from './vendor/three.module.js';

export function createCameraControls({host,camera,getStyle}){
  const presets={miniature:{az:.38,el:.40,distance:28,target:[0,1.5,0]},planted:{az:.18,el:.13,distance:30,target:[0,3.3,0]}};
  const fresh=style=>({...presets[style],target:new THREE.Vector3(...presets[style].target)});
  const views={miniature:fresh('miniature'),planted:fresh('planted')};
  let style=getStyle(),pinch=null;const pointers=new Map();const right=new THREE.Vector3(),up=new THREE.Vector3();
  const view=()=>views[style];
  function update(){const v=view();camera.position.set(Math.sin(v.az)*Math.cos(v.el)*v.distance,Math.sin(v.el)*v.distance,Math.cos(v.az)*Math.cos(v.el)*v.distance).add(v.target);camera.lookAt(v.target);camera.updateMatrixWorld();}
  function zoom(ratio){const v=view();v.distance=THREE.MathUtils.clamp(v.distance*ratio,.65,70);}
  function pan(dx,dy){
    const v=view(),scale=2*v.distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,host.clientHeight);
    right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
    v.target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);
    v.target.x=THREE.MathUtils.clamp(v.target.x,-14,14);v.target.y=THREE.MathUtils.clamp(v.target.y,-1,10);v.target.z=THREE.MathUtils.clamp(v.target.z,-14,14);
  }
  function orbit(dx,dy){const v=view();v.az-=dx*.006;if(style==='planted')v.az=THREE.MathUtils.clamp(v.az,-.65,.65);v.el=THREE.MathUtils.clamp(v.el+dy*.004,.025,style==='planted'?.75:1.4);}
  function gesture(){const p=[...pointers.values()].filter(p=>p.type==='touch').slice(0,2);if(p.length<2)return null;return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,span:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};}
  function beginPinch(){
    const g=gesture();if(!g||g.span<=4){pinch=null;return;}
    const v=view(),rect=host.getBoundingClientRect(),scale=2*v.distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,rect.height);
    const r=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),u=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    pinch={span:g.span,distance:v.distance,right:r,up:u,anchor:v.target.clone().addScaledVector(r,(g.x-rect.left-rect.width/2)*scale).addScaledVector(u,(rect.top+rect.height/2-g.y)*scale)};
  }
  function movePinch(g){
    if(!pinch)beginPinch();if(!pinch||g.span<=4)return;
    const v=view(),rect=host.getBoundingClientRect();v.distance=THREE.MathUtils.clamp(pinch.distance*pinch.span/g.span,.65,70);
    const scale=2*v.distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,rect.height);
    v.target.copy(pinch.anchor).addScaledVector(pinch.right,-(g.x-rect.left-rect.width/2)*scale).addScaledVector(pinch.up,-(rect.top+rect.height/2-g.y)*scale);
    v.target.x=THREE.MathUtils.clamp(v.target.x,-14,14);v.target.y=THREE.MathUtils.clamp(v.target.y,-1,10);v.target.z=THREE.MathUtils.clamp(v.target.z,-14,14);
  }
  function reset(){pointers.clear();pinch=null;host.classList.remove('camera-dragging');views[style]=fresh(style);update();}
  host.tabIndex=0;
  host.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button>2)return;
    e.preventDefault();host.focus({preventScroll:true});
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType,pan:e.button===1||e.button===2||e.shiftKey});
    if(!pinch)beginPinch();
    try{host.setPointerCapture(e.pointerId);}catch{}
    host.classList.add('camera-dragging');
  });
  host.addEventListener('pointermove',e=>{
    const previous=pointers.get(e.pointerId);if(!previous)return;e.preventDefault();
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    pointers.set(e.pointerId,{...previous,x:e.clientX,y:e.clientY});const after=gesture();
    if(after)movePinch(after);
    else if(previous.pan||e.shiftKey)pan(dx,dy);else orbit(dx,dy);
    update();
  });
  function release(e){pointers.delete(e.pointerId);beginPinch();if(!pointers.size)host.classList.remove('camera-dragging');}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,release);
  host.addEventListener('contextmenu',e=>e.preventDefault());
  host.addEventListener('wheel',e=>{
    e.preventDefault();const units=e.deltaMode===1?16:e.deltaMode===2?host.clientHeight:1;
    zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY*units*.0015,-1.5,1.5)));update();
  },{passive:false});
  host.addEventListener('keydown',e=>{
    if(e.key==='Home')reset();else if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      const dx=e.key==='ArrowLeft'?-24:e.key==='ArrowRight'?24:0,dy=e.key==='ArrowUp'?-24:e.key==='ArrowDown'?24:0;
      if(e.shiftKey)pan(dx,dy);else orbit(dx,dy);
    }else return;e.preventDefault();update();
  });
  update();
  return {update,reset,setStyle(next){if(next!==style){pointers.clear();pinch=null;host.classList.remove('camera-dragging');style=next;update();}},snapshot:()=>({style,...view(),target:view().target.toArray(),activePointers:pointers.size})};
}
