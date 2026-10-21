import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function () {
  var wrap = document.getElementById('sb-canvas-wrap');
  var playBtn = document.getElementById('sb-play');
  if (!wrap) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.appendChild(renderer.domElement);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.49;
  camera.position.set(0.5, 3.6, 7.5);
  controls.target.set(0, 0.4, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  var sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(4, 6, 3);
  scene.add(sun);

  var slopeMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  var slope = new THREE.Mesh(new THREE.PlaneGeometry(7, 15), slopeMat);
  slope.rotation.x = -Math.PI / 2 + 0.26;
  slope.position.set(0, -1.6, 0);
  scene.add(slope);

  var START = new THREE.Vector3(0, 2.0, -5.4);
  var END = new THREE.Vector3(0, -0.2, 3.6);

  var ballMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  var ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), ballMat);
  scene.add(ball);

  function applyTheme() {
    var attr = document.documentElement.getAttribute('data-theme');
    var dark = attr === 'dark' || (!attr && window.matchMedia('(prefers-color-scheme: dark)').matches);
    slopeMat.color.set(dark ? 0x262624 : 0xeef1f6);
    ballMat.color.set(dark ? 0xdfe6f5 : 0xffffff);
    var bg = dark ? 0x1a1a19 : 0xfcfcfb;
    scene.fog = new THREE.Fog(bg, 9, 20);
    renderer.setClearColor(bg, 1);
  }
  applyTheme();
  document.addEventListener('fe-theme-changed', applyTheme);

  var current = { years: 30, nominal: [10000], principal: 10000 };
  var playT = null;

  function radiusFor(nominalValue) {
    var r = 0.35 * Math.cbrt(nominalValue / current.principal);
    return Math.max(0.35, Math.min(2.6, r));
  }

  function placeBall(progress) {
    var idx = Math.round(progress * (current.nominal.length - 1));
    idx = Math.max(0, Math.min(current.nominal.length - 1, idx));
    var r = radiusFor(current.nominal[idx]);
    ball.scale.setScalar(r);
    var pos = START.clone().lerp(END, progress);
    pos.y = END.y + r * 0.92;
    ball.position.copy(pos);
    ball.rotation.x = progress * Math.PI * 10;
  }

  document.addEventListener('fe-data-changed', function (ev) {
    current = ev.detail;
    if (playT === null) placeBall(1);
  });

  playBtn.addEventListener('click', function () { playT = 0; });

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var dt = clock.getDelta();
    if (playT !== null) {
      playT += dt / 2.4;
      if (playT >= 1) {
        placeBall(1);
        playT = null;
      } else {
        placeBall(playT);
      }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  placeBall(1);
  animate();

  window.addEventListener('resize', function () {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
