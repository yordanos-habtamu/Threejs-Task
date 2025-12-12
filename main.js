import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/TransformControls.js';

export class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.objects = new THREE.Group();
    this.selected = null;
    this.history = [];
    this.historyIndex = -1;

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x111118);
    this.camera.position.set(12, 10, 12);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(15, 20, 15);
    this.scene.add(dirLight);

    this.grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    this.scene.add(this.grid);
    this.scene.add(new THREE.AxesHelper(6));
    this.scene.add(this.objects);

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

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });

    window.addEventListener('click', e => this.onClick(e));
    this.bindUI();
    this.saveState();
    this.animate();
  }

  onClick(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.objects.children, true);
    this.selectObject(hits.length > 0 ? hits[0].object : null);
  }

  selectObject(obj) {
    if (this.selected === obj) return;
    this.saveState();

    if (this.selected) {
      this.selected.material = this.selected.originalMaterial;
      this.gizmo.detach();
    }

    this.selected = obj;

    if (this.selected) {
      this.selected.originalMaterial = this.selected.material;
      this.selected.material = this.highlightMaterial;
      this.gizmo.attach(this.selected);
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

    let sizeInfo = '';
    if (type === 'box') {
      sizeInfo = `Size: ${(g.width * s.x).toFixed(2)} × ${(g.height * s.y).toFixed(2)} × ${(g.depth * s.z).toFixed(2)}`;
    } else if (type === 'sphere') {
      const r = g.radius * Math.max(s.x, s.y, s.z);
      sizeInfo = `Radius: ${r.toFixed(2)}`;
    } else if (type === 'cylinder') {
      sizeInfo = `R: ${(g.radiusTop * Math.max(s.x, s.z)).toFixed(2)}, H: ${(g.height * s.y).toFixed(2)}`;
    }

    document.getElementById('info').innerHTML = `
      <b>${type.toUpperCase()}</b><br>
      Position: X:${p.x.toFixed(2)} Y:${p.y.toFixed(2)} Z:${p.z.toFixed(2)}<br>
      Scale: X:${s.x.toFixed(2)} Y:${s.y.toFixed(2)} Z:${s.z.toFixed(2)}<br>
      ${sizeInfo}
    `;
  }

  addShape(type, colorHex) {
    this.saveState();

    let geometry;
    if (type === 'box') geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    else if (type === 'sphere') geometry = new THREE.SphereGeometry(0.9, 32, 24);
    else if (type === 'cylinder') geometry = new THREE.CylinderGeometry(0.8, 0.8, 1.8, 32);

    const material = new THREE.MeshStandardMaterial({ color: parseInt(colorHex.slice(1), 16) });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
      (Math.random() - 0.5) * 20,
      Math.random() * 8 + 1,
      (Math.random() - 0.5) * 20
    );
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
    const wasSelected = this.selected;
    if (wasSelected) {
      wasSelected.material = wasSelected.originalMaterial;
      this.gizmo.detach();
    }

    const state = JSON.parse(JSON.stringify(this.objects.toJSON()));

    if (wasSelected) {
      wasSelected.material = this.highlightMaterial;
      this.gizmo.attach(wasSelected);
    }

    return state;
  }

  saveState() {
    const state = this.captureState();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex++;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.loadState(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.loadState(this.history[this.historyIndex]);
  }

  loadState(json) {
    const loader = new THREE.ObjectLoader();
    const group = loader.parse(json);

    this.objects.clear();
    group.children.forEach(child => this.objects.add(child));

    this.selected = null;
    this.gizmo.detach();
    this.updateInfo();
  }

 3

  saveScene() {
    const state = this.captureState();
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  loadScene(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        this.loadState(json);
        this.saveState();
      } catch (err) {
        alert('Invalid file');
      }
    };
    reader.readAsText(file);
  }

  bindUI() {
    document.getElementById('addBtn').onclick = () => this.addShape(
      document.getElementById('shapeSelect').value,
      document.getElementById('colorPicker').value
    );

    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => this.gizmo.setMode(btn.dataset.mode);
    });

    document.getElementById('zoomInBtn').onclick = () => {
      this.camera.position.sub(this.orbit.target).multiplyScalar(0.9).add(this.orbit.target);
    };

    document.getElementById('zoomOutBtn').onclick = () => {
      this.camera.position.sub(this.orbit.target).multiplyScalar(1.1).add(this.orbit.target);
    };

    document.getElementById('deleteBtn').onclick = () => this.deleteSelected();
    document.getElementById('undoBtn').onclick = () => this.undo();
    document.getElementById('redoBtn').onclick = () => this.redo();
    document.getElementById('themeBtn').onclick = () => {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      this.scene.background = new THREE.Color(isLight ? 0xf8f9fa : 0x111118);
      this.grid.material.color.set(isLight ? 0xcccccc : 0x444444);
    };
    document.getElementById('saveBtn').onclick = () => this.saveScene();
    document.getElementById('loadBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = e => {
      if (e.target.files[0]) this.loadScene(e.target.files[0]);
    };

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