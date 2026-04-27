// --- INITIALIZATION ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a2e);
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 7.5);
scene.add(sun);

// --- 3D NAVIGATION (OrbitControls) ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
// Klik Kiri dikosongkan agar bisa dipakai melipat, Kanan untuk rotasi
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true;

// --- KERTAS ---
const segments = 128;
let geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    roughness: 0.5
});
let paper = new THREE.Mesh(geometry, material);
// Tidurkan kertas sedikit agar perspektif 3D terasa
paper.rotation.x = -Math.PI / 4; 
scene.add(paper);

// --- MARKERS ---
const markerA = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const markerB = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
markerA.visible = markerB.visible = false;
scene.add(markerA, markerB);

camera.position.set(0, 2, 6);
scene.add(new THREE.GridHelper(10, 10, 0x444444, 0x222222));

// --- INTERACTION LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const statusLabel = document.getElementById('status');

window.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return; // Hanya respon Klik Kiri

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        if (!pointA) {
            pointA = point.clone();
            markerA.position.copy(pointA);
            markerA.position.z += 0.05; // Sedikit di depan kertas
            markerA.visible = true;
            statusLabel.innerText = "Pilih Titik Tujuan...";
        } else {
            const pointB = point.clone();
            markerB.position.copy(pointB);
            markerB.position.z += 0.05;
            markerB.visible = true;
            
            hitungLipatan(pointA, pointB);
            
            pointA = null;
            setTimeout(() => {
                statusLabel.innerText = "Pilih Titik Asal...";
                markerA.visible = false;
                markerB.visible = false;
            }, 1000);
        }
    }
});

function hitungLipatan(A, B) {
    const pos = paper.geometry.attributes.position;
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    // Matrix untuk mengubah koordinat world ke lokal (penting karena kertas diputar)
    const worldToLocal = new THREE.Matrix4().copy(paper.matrixWorld).invert();

    for (let i = 0; i < pos.count; i++) {
        let worldP = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        worldP.applyMatrix4(paper.matrixWorld);

        const v = new THREE.Vector3().subVectors(worldP, mid);
        const dot = v.dot(normal);

        if (dot < 0) {
            const reflection = normal.clone().multiplyScalar(2 * dot);
            worldP.sub(reflection);
            
            // Konversi kembali ke lokal
            let localP = worldP.applyMatrix4(worldToLocal);
            pos.setXYZ(i, localP.x, localP.y, localP.z + 0.015);
        }
    }
    pos.needsUpdate = true;
}

// --- RESET FUNCTION ---
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
