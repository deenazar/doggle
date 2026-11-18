import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
function starter() {
  const root = new THREE.Group(); root.name = 'Toggle';
  const white = new THREE.MeshStandardMaterial({ color: '#f5f9ff', roughness: .32, metalness: .08 });
  const blue = new THREE.MeshStandardMaterial({ color: '#246bff', roughness: .3, metalness: .15 });
  const dark = new THREE.MeshStandardMaterial({ color: '#132750', roughness: .25 });
  const glow = new THREE.MeshStandardMaterial({ color: '#8cecff', emissive: '#3ec7ff', emissiveIntensity: 1 });
  const mesh = (name, geometry, material, x,y,z, parent = root) => { const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(x,y,z); parent.add(m); return m; };
  const body = mesh('Body', new THREE.CapsuleGeometry(.38,.45,8,24), blue, 0,.95,0);
  const head = mesh('Head', new THREE.SphereGeometry(.56,32,24), white, 0,1.73,0); head.scale.set(1,.86,.85);
  const visor = mesh('Visor', new THREE.SphereGeometry(.47,32,20), dark, 0,1.73,.26); visor.scale.set(1,.62,.55);
  for (const x of [-.18,.18]) mesh('Eye' + (x < 0 ? 'L':'R'), new THREE.CapsuleGeometry(.045,.08,6,12), glow, x,1.76,.51);
  mesh('Badge', new THREE.SphereGeometry(.11,16,12), white, 0,1.03,.37).scale.z = .3;
  for (const [side,x] of [['L',-.53],['R',.53]]) {
    const arm = mesh('Arm' + side, new THREE.CapsuleGeometry(.12,.3,6,16), white, x,.92,0); arm.rotation.z = x < 0 ? -.2 : .2;
    mesh('Foot' + side, new THREE.SphereGeometry(.19,20,16), white, x * .45,.22,.08).scale.set(1, .8, 1.5);
    mesh('Ear' + side, new THREE.CylinderGeometry(.1,.1,.08,20), blue, x,1.75,0).rotation.z = Math.PI / 2;
  }
  mesh('Antenna', new THREE.CylinderGeometry(.025,.025,.2,12), dark, 0,2.25,0);
  mesh('Signal', new THREE.SphereGeometry(.07,16,12), blue, 0,2.38,0);
  const idle = new THREE.AnimationClip('Idle', 2, [new THREE.NumberKeyframeTrack('Body.position[y]', [0,1,2],[.95,1,.95])]);
  const walk = new THREE.AnimationClip('Walk', .8, [new THREE.NumberKeyframeTrack('ArmL.rotation[z]', [0,.4,.8],[-.5,.3,-.5]),new THREE.NumberKeyframeTrack('ArmR.rotation[z]', [0,.4,.8],[.5,-.3,.5])]);
  const happy = new THREE.AnimationClip('Happy', 1.2, [new THREE.NumberKeyframeTrack('Head.rotation[z]', [0,.3,.6,.9,1.2],[0,.2,0,-.2,0]),new THREE.NumberKeyframeTrack('ArmR.rotation[z]', [0,.3,.6,.9,1.2],[.2,-2,-1.5,-2,.2])]);
  return { scene: root, animations: [idle,walk,happy] };
}
class ModelView {
  constructor(canvas, { interactive = false } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); this.renderer.setClearColor(0,0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(34,1,.01,100); this.camera.position.set(0,1.25,5.7);
    this.scene.add(new THREE.HemisphereLight(0xcce8ff,0x7583a2,2.8));
    const light = new THREE.DirectionalLight(0xffffff,4);light.position.set(3,5,4);this.scene.add(light);
    const rim = new THREE.DirectionalLight(0x5599ff,3);rim.position.set(-3,2,-3);this.scene.add(rim);
    if (interactive) { this.controls = new OrbitControls(this.camera,canvas); this.controls.enablePan = false; this.controls.enableDamping = true; this.controls.minDistance = 3; this.controls.maxDistance = 9; this.controls.target.set(0,1.15,0); }
    else this.camera.lookAt(0,1.15,0);
    this.observer = new ResizeObserver(() => this.resize());this.observer.observe(canvas);this.resize();
    this.clock = new THREE.Clock();this.last = 0;this.loop = this.loop.bind(this); this.frame = requestAnimationFrame(this.loop);
  }
  resize() { const w = this.canvas.clientWidth || 300,h = this.canvas.clientHeight || 400;this.renderer.setSize(w,h,false);this.camera.aspect = w/h;this.camera.updateProjectionMatrix(); }
  clear() {
    if (!this.root) return;
    this.mixer?.stopAllAction(); this.mixer?.uncacheRoot(this.model);
    this.root.traverse(o => { o.geometry?.dispose(); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });
    this.scene.remove(this.root);this.root = null;this.action = null;
  }
  async load(bytes) {
    const generation = this.loadGeneration = (this.loadGeneration || 0) + 1;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => { if (!/^(blob:|data:)/.test(url)) throw new Error('External model resources are not allowed.'); return url; });
    const loader = new GLTFLoader(manager);
    const data = bytes ? await loader.parseAsync(new Uint8Array(bytes).buffer, '') : starter();
    if (generation !== this.loadGeneration) {
      data.scene.traverse(o => { o.geometry?.dispose(); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { for (const v of Object.values(m)) if(v?.isTexture)v.dispose(); m.dispose(); } });
      return [];
    }
    this.clear(); this.model = data.scene; this.clips = data.animations || [];
    this.root = new THREE.Group();this.root.add(this.model);this.scene.add(this.root);
    const box = new THREE.Box3().setFromObject(this.model), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || Math.max(size.x,size.y,size.z) < .0001) { this.clear(); throw new Error('Model has no visible geometry.'); }
    const scale = 2.5 / Math.max(size.x,size.y,size.z);this.root.scale.setScalar(scale);this.root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    this.mixer = new THREE.AnimationMixer(this.model);this.setMood('idle');this.resize();return this.clips.map(c=>c.name);
  }
  setMood(mood) {
    if (!this.mixer) return;
    const candidates = { run:['run','walk'], walk:['walk'], happy:['happy','wave'], held:['held','happy'], sleep:['sleep','idle'], ask:['ask','idle'], giggle:['happy','idle'] }[mood] || ['idle'];
    const clip = candidates.map(k=>this.clips.find(c=>c.name.toLowerCase().includes(k))).find(Boolean) || this.clips[0];
    if (!clip) return;
    const next = this.mixer.clipAction(clip);if (next === this.action) return;
    next.reset().fadeIn(.2).play();this.action?.fadeOut(.2);this.action = next;
  }
  play(name) {
    const clip = this.clips?.find(candidate => candidate.name === name);
    if (!clip) return;
    this.mixer.stopAllAction();
    this.action = this.mixer.clipAction(clip);
    this.action.reset().play();
  }

  seek(seconds) {
    if (!this.action) return;
    const duration = this.action.getClip().duration;
    this.action.paused = true;
    this.action.time = Math.min(seconds, Math.max(0, duration - 0.000001));
    this.mixer.update(0);
  }
  setRotation(degrees) { if (this.root) this.model.rotation.y = degrees * Math.PI/180; }
  loop(time) {
    this.frame = requestAnimationFrame(this.loop);
    if (time-this.last < 33) return;this.last = time;
    const delta = Math.min(this.clock.getDelta(),.1);
    if (document.hidden || !this.canvas.getClientRects().length) return;
    this.mixer?.update(delta);this.controls?.update();this.renderer.render(this.scene,this.camera);
    this.onFrame?.(this.action);
  }
  async exportStarter() { const data = starter();return new GLTFExporter().parseAsync(data.scene,{ binary:true, animations:data.animations }); }
  dispose() { this.loadGeneration = (this.loadGeneration || 0) + 1; cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls?.dispose();this.clear();this.renderer.dispose(); }
}
window.ToggleModelView = ModelView;
