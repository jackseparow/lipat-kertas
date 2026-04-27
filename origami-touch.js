// 1. Inisialisasi Dasar
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xdfe6e9);
document.body.appendChild(renderer.domElement);

// 2. Kontrol Kamera (OrbitControls)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
// Matikan klik kiri untuk Orbit agar tidak bentrok dengan fungsi lipat
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

// 3. Membuat Kertas dengan Grid Vertex yang Padat
// Kita butuh banyak segmen (64x64) agar lipatan terlihat halus
const geometry = new THREE.PlaneGeometry(4, 4, 64, 64);
const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, wireframe: false });
const paper = new THREE.Mesh(geometry, material);
scene.add(paper);

// Grid pembantu di lantai
const grid = new THREE.GridHelper(10, 10);
grid.position.y = -2;
scene.add(grid);

camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);

// 4. Logika Raycasting (Deteksi Sentuhan)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return; // Hanya respon klik kiri

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const foldPoint = intersects[0].point;
        prosesLipatan(foldPoint.y);
    }
});

// 5. Algoritma Numerasi Lipatan (Pencerminan Vertikal)
function prosesLipatan(yLimit) {
    const positions = paper.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
        let currentY = positions.getY(i);
        let currentZ = positions.getZ(i);

        // Jika posisi titik berada di atas garis klik (yLimit)
        if (currentY > yLimit) {
            // Jarak titik dari garis lipat
            let distance = currentY - yLimit;
            
            // Refleksi: Geser Y ke bawah garis sejauh jaraknya
            // Dan beri sedikit offset Z agar tumpang tindih terlihat (efek 3D)
            positions.setY(i, yLimit - distance);
            positions.setZ(i, currentZ + 0.05); 
        }
    }
    // Beritahu Three.js bahwa bentuk geometri telah berubah
    positions.needsUpdate = true;
}

// 6. Loop Animasi
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
