import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class ThreeJSEditor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.objects = new THREE.Group();
    this.selected = null;
    this.history = [];
    this.historyIndex = -1;

    this._init();
  }

  _init() {
    this._setupRenderer();
    this._setupCamera();
    this._setupLightsAndHelpers();
    this._setupControls();
    this._setupSelection();
    this._bindUI();
    this._saveInitialState();
    this.animate();
  }

  _setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x111118);
  }

  _setupCamera() {
    this.camera.position.set(12, 10, 12);
  }

  _setupLightsAndHelpers() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(15, 20, 15);
    this.scene.add(dirLight);

    this.grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    this.scene.add(this.grid);
    this.scene.add(new THREE.AxesHelper(6));
    this.scene.add(this.objects);
  }

  _setupControls() {
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.minDistance = 3;
    this.orbit.maxDistance = 150;

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setTranslationSnap(1);
    this.gizmo.setRotationSnap(Math.PI / 12);
    this.gizmo.setScaleSnap(0.25);
    this.scene.add(this.gizmo);

    this.gizmo.addEventListener('dragging-changed', e => this.orbit.enabled = !e.value);
    this.gizmo.addEventListener('objectChange', () => this.updateInfo());
  }

  _setupSelection() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });
    window.addEventListener('click', e => this._onClick(e));
  }

  _onClick(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.objects.children, true);
    this.selectObject(hits.length ? hits[0].object : null);
  }

  selectObject(obj) {
    if (this.selected === obj) return;
    this.saveState();

    if (this.selected) {
      this.selected.material = this.selected.originalMaterial;
      this.gizmo.detach();
    }

    this.selected = obj;
    if (obj) {
      obj.originalMaterial = obj.material;
      obj.material = this.highlightMaterial;
      this.gizmo.attach(obj);
      this.updateInfo();
    } else {
      document.getElementById('info').textContent = 'Click an object to select it';
    }
  }

  updateInfo() {
    if (!this.selected) {
      document.getElementById('info').textContent = 'Click an object to select it';
      return;
    }
    const p = this.selected.position;
    const s = this.selected.scale;
    const g = this.selected.geometry.parameters || {};
    const type = this.selected.userData.type || 'object';

    let size = '';
    if (type === 'box') size = `Size: ${(g.width*s.x).toFixed(2)}×${(g.height*s.y).toFixed(2)}×${(g.depth*s.z).toFixed(2)}`;
    if (type === 'sphere') size = `Radius: ${(g.radius * Math.max(s.x,s.y,s.z)).toFixed(2)}`;
    if (type === 'cylinder') size = `R: ${(g.radiusTop*Math.max(s.x,s.z)).toFixed(2)}, H: ${(g.height*s.y).toFixed(2)}`;

    document.getElementById('info').innerHTML = `
      <b>${type.toUpperCase()}</b><br>
      Position: X:${p.x.toFixed(2)} Y:${p.y.toFixed(2)} Z:${p.z.toFixed(2)}<br>
      Scale: X:${s.x.toFixed(2)} Y:${s.y.toFixed(2)} Z:${s.z.toFixed(2)}<br>
      ${size}
    `;
  }

  addShape(type, hex) {
    this.saveState();
    const geo = type==='box' ? new THREE.BoxGeometry(1.5,1.5,1.5)
             : type==='sphere' ? new THREE.SphereGeometry(0.9,32,24)
             : new THREE.CylinderGeometry(0.8,0.8,1.8,32);

    const mat = new THREE.MeshStandardMaterial({ color: parseInt(hex.slice(1),16) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random()-0.5)*20, Math.random()*8+1, (Math.random()-0.5)*20);
    mesh.userData.type = type;
    this.objects.add(mesh);
  }

  deleteSelected() {
    if (!this.selected) return;
    this.saveState();
    this.objects.remove(this.selected);
    this.gizmo.detach();
    this.selected = null;
    this.updateInfo();
  }

  captureState() {
    const was = this.selected;
    if (was) { was.material = was.originalMaterial; this.gizmo.detach(); }
    const state = JSON.parse(JSON.stringify(this.objects.toJSON()));
    if (was) { was.material = this.highlightMaterial; this.gizmo.attach(was); }
    return state;
  }

  saveState() {
    const state = this.captureState();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex++;
  }

  _saveInitialState() { this.history.push(this.captureState()); this.historyIndex = 0; }

  undo() { if (this.historyIndex > 0) { this.historyIndex--; this._load(this.history[this.historyIndex]); } }
  redo() { if (this.historyIndex < this.history.length-1) { this.historyIndex++; this._load(this.history[this.historyIndex]); } }

  _load(json) {
    const loader = new THREE.ObjectLoader();
    const group = loader.parse(json);
    this.objects.clear();
    group.children.forEach(c => this.objects.add(c));
    this.selected = null; this.gizmo.detach(); this.updateInfo();
  }

  saveScene() {
    const data = JSON.stringify(this.captureState(), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'scene.json'; a.click();
    URL.revokeObjectURL(url);
  }

  loadScene(file) {
    const r = new FileReader();
    r.onload = e => { this._load(JSON.parse(e.target.result)); this.saveState(); };
    r.readAsText(file);
  }

  setTransformMode(m) { this.gizmo.setMode(m); }
  zoomIn() { this.camera.position.sub(this.orbit.target).multiplyScalar(0.9).add(this.orbit.target); }
  zoomOut() { this.camera.position.sub(this.orbit.target).multiplyScalar(1.1).add(this.orbit.target); }

  toggleTheme() {
    document.body.classList.toggle('light');
    const light = document.body.classList.contains('light');
    this.scene.background = new THREE.Color(light ? 0xf8f9fa : 0x111118);
    this.grid.material.color.set(light ? 0xcccccc : 0x444444);
  }

  _bindUI() {
    document.getElementById('addBtn').onclick = () => this.addShape(
      document.getElementById('shapeSelect').value,
      document.getElementById('colorPicker').value
    );
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => this.setTransformMode(b.dataset.mode));
    document.getElementById('zoomInBtn').onclick = () => this.zoomIn();
    document.getElementById('zoomOutBtn').onclick = () => this.zoomOut();
    document.getElementById('deleteBtn').onclick = () => this.deleteSelected();
    document.getElementById('undoBtn').onclick = () => this.undo();
    document.getElementById('redoBtn').onclick = () => this.redo();
    document.getElementById('themeBtn').onclick = () => this.toggleTheme();
    document.getElementById('saveBtn').onclick = () => this.saveScene();
    document.getElementById('loadBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = e => e.target.files[0] && this.loadScene(e.target.files[0]);

    window.onresize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new ThreeJSEditor();