import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class ThreeJSEditor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.objects = new THREE.Group();
    this.selected = null;
    this.history = [];
    this.historyIndex = -1;

    this.init();
  }

  init() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x111118);
    this.camera.position.set(12,10,12);

    this.scene.add(new THREE.AmbientLight(0xffffff,0.6));
    this.scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(15,20,15));
    this.scene.add(new THREE.GridHelper(30,30,0x444444,0x222222));
    this.scene.add(new THREE.AxesHelper(6));
    this.scene.add(this.objects);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setTranslationSnap(1);
    this.gizmo.setRotationSnap(Math.PI/12);
    this.gizmo.setScaleSnap(0.25);
    this.scene.add(this.gizmo);
    this.gizmo.addEventListener('dragging-changed', e => this.orbit.enabled = !e.value);
    this.gizmo.addEventListener('objectChange', () => this.updateInfo());

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.highlight = new THREE.MeshStandardMaterial({color:0x00ff88, emissive:0x00ff88, emissiveIntensity:0.5});

    window.addEventListener('click', e => this.onClick(e));
    this.bindUI();
    this.saveState();
    this.animate();
  }

  onClick(e) {
    this.mouse.x = (e.clientX/innerWidth)*2-1;
    this.mouse.y = -(e.clientY/innerHeight)*2+1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.objects.children, true);
    this.select(hits[0]?.object);
  }

  select(obj) {
    if (this.selected === obj) return;
    this.saveState();
    if (this.selected) { this.selected.material = this.selected.origMat; this.gizmo.detach(); }
    this.selected = obj;
    if (obj) {
      obj.origMat = obj.material;
      obj.material = this.highlight;
      this.gizmo.attach(obj);
      this.updateInfo();
    } else document.getElementById('info').textContent = 'Click an object to select it';
  }

  updateInfo() {
    if (!this.selected) return;
    const p = this.selected.position, s = this.selected.scale, g = this.selected.geometry.parameters||{};
    const t = this.selected.userData.type||'object';
    let dim = '';
    if (t==='box') dim = `Size: ${(g.width*s.x).toFixed(2)}×${(g.height*s.y).toFixed(2)}×${(g.depth*s.z).toFixed(2)}`;
    if (t==='sphere') dim = `Radius: ${(g.radius*Math.max(s.x,s.y,s.z)).toFixed(2)}`;
    if (t==='cylinder') dim = `R: ${(g.radiusTop*Math.max(s.x,s.z)).toFixed(2)}, H: ${(g.height*s.y).toFixed(2)}`;
    document.getElementById('info').innerHTML = `<b>${t.toUpperCase()}</b><br>Pos: X:${p.x.toFixed(2)} Y:${p.y.toFixed(2)} Z:${p.z.toFixed(2)}<br>Scale: ${s.x.toFixed(2)},${s.y.toFixed(2)},${s.z.toFixed(2)}<br>${dim}`;
  }

  addShape(type, hex) {
    this.saveState();
    const geo = type==='box'? new THREE.BoxGeometry(1.5,1.5,1.5)
             : type==='sphere'? new THREE.SphereGeometry(0.9,32,24)
             : new THREE.CylinderGeometry(0.8,0.8,1.8,32);
    const mat = new THREE.MeshStandardMaterial({color: parseInt(hex.slice(1),16)});
    const m = new THREE.Mesh(geo, mat);
    m.position.set((Math.random()-0.5)*20, Math.random()*8+1, (Math.random()-0.5)*20);
    m.userData.type = type;
    this.objects.add(m);
  }

  deleteSelected() { if(this.selected){ this.saveState(); this.objects.remove(this.selected); this.gizmo.detach(); this.selected=null; this.updateInfo(); }}

  capture() {
    const s = this.selected;
    if(s){ s.material = s.origMat; this.gizmo.detach(); }
    const state = JSON.parse(JSON.stringify(this.objects.toJSON()));
    if(s){ s.material = this.highlight; this.gizmo.attach(s); }
    return state;
  }

  saveState() {
    const st = this.capture();
    this.history = this.history.slice(0, this.historyIndex+1);
    this.history.push(st);
    this.historyIndex++;
  }

  undo() { if(this.historyIndex>0){ this.historyIndex--; this.load(this.history[this.historyIndex]); }}
  redo() { if(this.historyIndex<this.history.length-1){ this.historyIndex++; this.load(this.history[this.historyIndex]); }}

  load(json) {
    const l = new THREE.ObjectLoader();
    const g = l.parse(json);
    this.objects.clear();
    g.children.forEach(c=>this.objects.add(c));
    this.selected = null; this.gizmo.detach(); this.updateInfo();
  }

  saveScene() {
    const d = JSON.stringify(this.capture(),null,2);
    const b = new Blob([d],{type:'application/json'});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href=u; a.download='scene.json'; a.click();
  }

  loadScene(f) {
    const r=new FileReader();
    r.onload=e=> { this.load(JSON.parse(e.target.result)); this.saveState(); };
    r.readAsText(f);
  }

  bindUI() {
    document.getElementById('addBtn').onclick = () => this.addShape(
      document.getElementById('shapeSelect').value,
      document.getElementById('colorPicker').value
    );
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>this.gizmo.setMode(b.dataset.mode));
    document.getElementById('zoomInBtn').onclick=()=>this.camera.position.sub(this.orbit.target).multiplyScalar(0.9).add(this.orbit.target);
    document.getElementById('zoomOutBtn').onclick=()=>this.camera.position.sub(this.orbit.target).multiplyScalar(1.1).add(this.orbit.target);
    document.getElementById('deleteBtn').onclick=()=>this.deleteSelected();
    document.getElementById('undoBtn').onclick=()=>this.undo();
    document.getElementById('redoBtn').onclick=()=>this.redo();
    document.getElementById('themeBtn').onclick=()=>{
      document.body.classList.toggle('light');
      this.scene.background.set(document.body.classList.contains('light')?0xf8f9fa:0x111118);
    };
    document.getElementById('saveBtn').onclick=()=>this.saveScene();
    document.getElementById('loadBtn').onclick=()=>document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange=e=>e.target.files[0]&&this.loadScene(e.target.files[0]);
    window.onresize=()=>{ this.camera.aspect=innerWidth/innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth,innerHeight); };
  }

  animate() {
    requestAnimationFrame(()=>this.animate());
    this.orbit.update();
    this.renderer.render(this.scene,this.camera);
  }
}

new ThreeJSEditor();