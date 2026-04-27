// --- KONFIGURASI DASAR ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a2e);
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// --- KERTAS ---
// Gunakan MeshStandardMaterial agar terlihat lebih real
const geometry = new THREE.PlaneGeometry(4, 4, 128, 128);
const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    flatShading: false
});
const paper = new THREE.Mesh(geometry, material);
scene.add(paper);

// --- MARKER (PENANDA) ---
const markerA = new THREE.Mesh(new THREE.SphereGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const markerB = new THREE.Mesh(new THREE.SphereGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
markerA.visible = markerB.visible = false;
scene.add(markerA, markerB);

camera.position.z = 6;

// --- LOGIKA INTERAKSI ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const statusLabel = document.getElementById('status');

window.addEventListener('mousedown', (event) => {
    // Hanya proses klik kiri
    if (event.button !== 0) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const point = intersects[0].point;

        if (!pointA) {
            // Pilih titik pertama
            pointA = point.clone();
            markerA.position.set(pointA.x, pointA.y, 0.1);
            markerA.visible = true;
            markerB.visible = false;
            statusLabel.innerText = "Pilih Titik Tujuan...";
        } else {
            // Pilih titik kedua
            const pointB = point.clone();
            markerB.position.set(pointB.x, pointB.y, 0.1);
            markerB.visible = true;
            
            lipatGeometri(pointA, pointB);
            
            // Reset
            pointA = null;
            setTimeout(() => {
                statusLabel.innerText = "Menunggu Titik Asal...";
                markerA.visible = false;
                markerB.visible = false;
            }, 1500);
        }
    }
});

function lipatGeometri(A, B) {
    const pos = paper.geometry.attributes.position;
    
    // Titik tengah (midpoint) dan Normal (arah AB)
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    for (let i = 0; i < pos.count; i++) {
        let P = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));

        // Hitung jarak titik P ke garis lipat (midpoint)
        const v = new THREE.Vector3().subVectors(P, mid);
        const dot = v.dot(normal);

        // Jika titik P berada di sisi titik A (Asal), lakukan refleksi
        if (dot < 0) {
            // Rumus Refleksi: P' = P - 2 * (v . normal) * normal
            const reflection = normal.clone().multiplyScalar(2 * dot);
            P.sub(reflection);
            
            // Set posisi baru dengan sedikit offset Z agar tidak tumpang tindih
            pos.setXYZ(i, P.x, P.y, P.z + 0.02);
        }
    }
    pos.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);
    // Kita putar sedikit scenerio-nya agar terlihat 3D
    paper.rotation.y = Math.sin(Date.now() * 0.001) * 0.1;
    renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
