// 1. Inisialisasi Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xdfe6e9);
document.body.appendChild(renderer.domElement);

// 2. Kontrol Kamera (Klik Kanan untuk Putar, Klik Kiri untuk Lipat)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

// 3. Membuat Kertas (Material MeshPhong agar respon terhadap lampu)
const geometry = new THREE.PlaneGeometry(4, 4, 100, 100);
const material = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide, 
    shininess: 30 
});
const paper = new THREE.Mesh(geometry, material);
// Tidurkan kertas di lantai (Sumbu XZ)
paper.rotation.x = -Math.PI / 2;
scene.add(paper);

// Pencahayaan
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

scene.add(new THREE.GridHelper(10, 10));
camera.position.set(0, 5, 5);
camera.lookAt(0, 0, 0);

// 4. Penanda Visual (Marker Bola)
const markerGeo = new THREE.SphereGeometry(0.06);
const markerA = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const markerB = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
markerA.visible = markerB.visible = false;
scene.add(markerA);
scene.add(markerB);

// 5. Logika Interaksi Titik ke Titik
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const statusLabel = document.getElementById('status');

window.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return; // Hanya respon klik kiri

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const clickedPoint = intersects[0].point;

        if (!pointA) {
            // Step 1: Ambil Titik Asal
            pointA = clickedPoint.clone();
            markerA.position.copy(pointA);
            markerA.position.y += 0.05; // Angkat dikit agar tidak tenggelam
            markerA.visible = true;
            markerB.visible = false;
            
            statusLabel.innerText = "Pilih Titik Tujuan";
            statusLabel.style.background = "#fff3cd";
            statusLabel.style.color = "#856404";
        } else {
            // Step 2: Ambil Titik Tujuan & Jalankan Lipatan
            const pointB = clickedPoint.clone();
            markerB.position.copy(pointB);
            markerB.position.y += 0.05;
            markerB.visible = true;

            hitungDanLipat(pointA, pointB);
            
            // Reset state
            pointA = null;
            setTimeout(() => {
                statusLabel.innerText = "Pilih Titik Asal";
                statusLabel.style.background = "#e8f4fd";
                statusLabel.style.color = "#2980b9";
                markerA.visible = markerB.visible = false;
            }, 1200);
        }
    }
});

// 6. Algoritma Refleksi Geometri
function hitungDanLipat(A, B) {
    const positions = paper.geometry.attributes.position;
    
    // Titik tengah antara A dan B sebagai "jangkar" garis lipat
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    // Vektor arah dari A ke B sebagai Normal garis lipat
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    for (let i = 0; i < positions.count; i++) {
        // Ambil vertex dan konversi ke koordinat dunia (karena mesh diputar)
        let localP = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
        let worldP = localP.clone().applyMatrix4(paper.matrixWorld);

        // Vektor dari Mid ke Titik P
        const v = new THREE.Vector3().subVectors(worldP, mid);
        const dot = v.dot(normal);

        // Jika dot < 0, berarti titik berada di sisi asal (A) -> Lipat/Refleksi
        if (dot < 0) {
            const reflection = normal.clone().multiplyScalar(2 * dot);
            worldP.sub(reflection);
            
            // Kembalikan ke koordinat lokal mesh
            const finalP = worldP.clone().applyMatrix4(paper.matrixWorld.clone().invert());
            
            positions.setXYZ(i, finalP.x, finalP.y, finalP.z + 0.015);
        }
    }
    positions.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
