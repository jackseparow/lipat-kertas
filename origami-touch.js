// Konfigurasi Awal
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0f0c29);
document.body.appendChild(renderer.domElement);

// Cahaya
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

// Navigasi 3D
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true;

// Kertas
const segments = 100;
let geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
let material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide, 
    roughness: 0.5 
});
let paper = new THREE.Mesh(geometry, material);
paper.rotation.x = -Math.PI / 4;
scene.add(paper);

// Penanda Titik
const markerA = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const markerB = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
markerA.visible = markerB.visible = false;
scene.add(markerA, markerB);

camera.position.set(0, 2, 6);

// Logika Klik
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const statusLabel = document.getElementById('status');

// Perbaikan: Gunakan Event Listener pada canvas renderer secara spesifik
renderer.domElement.addEventListener('pointerdown', (event) => {
    // Hanya Klik Kiri
    if (event.button !== 0) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        if (!pointA) {
            pointA = point.clone();
            markerA.position.copy(pointA);
            markerA.visible = true;
            statusLabel.innerText = "Pilih Titik Tujuan...";
        } else {
            const pointB = point.clone();
            markerB.position.copy(pointB);
            markerB.visible = true;
            
            jalankanLipatan(pointA, pointB);
            
            pointA = null;
            setTimeout(() => {
                statusLabel.innerText = "Pilih Titik Asal...";
                markerA.visible = false;
                markerB.visible = false;
            }, 800);
        }
    }
});

function jalankanLipatan(A, B) {
    const pos = paper.geometry.attributes.position;
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    paper.updateMatrixWorld();
    const invMat = new THREE.Matrix4().copy(paper.matrixWorld).invert();

    for (let i = 0; i < pos.count; i++) {
        let vWorld = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        vWorld.applyMatrix4(paper.matrixWorld);

        const dist = new THREE.Vector3().subVectors(vWorld, mid).dot(normal);

        if (dist < 0) {
            const reflection = normal.clone().multiplyScalar(2 * dist);
            vWorld.sub(reflection);
            let vLocal = vWorld.applyMatrix4(invMat);
            pos.setXYZ(i, vLocal.x, vLocal.y, vLocal.z + 0.02);
        }
    }
    pos.needsUpdate = true;
}

window.resetKertas = function() {
    scene.remove(paper);
    geometry.dispose();
    geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
    paper = new THREE.Mesh(geometry, material);
    paper.rotation.x = -Math.PI / 4;
    scene.add(paper);
    pointA = null;
    markerA.visible = markerB.visible = false;
    statusLabel.innerText = "Pilih Titik Asal...";
};

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
