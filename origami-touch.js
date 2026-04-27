// 1. Setup Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xf1f2f6);
document.body.appendChild(renderer.domElement);

// 2. Kontrol Kamera
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

// 3. Membuat Kertas
const geometry = new THREE.PlaneGeometry(4, 4, 100, 100);
const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const paper = new THREE.Mesh(geometry, material);
scene.add(paper);

scene.add(new THREE.GridHelper(10, 10));
camera.position.set(0, 4, 6);
camera.lookAt(0, 0, 0);

// 4. Logika Interaksi Titik ke Titik
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
let pointB = null;
const statusLabel = document.getElementById('status');

window.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const clickedPoint = intersects[0].point;

        if (!pointA) {
            pointA = clickedPoint.clone();
            statusLabel.innerText = "Pilih Titik Tujuan";
            statusLabel.style.background = "#fff3cd";
            statusLabel.style.borderColor = "#ffc107";
            statusLabel.style.color = "#856404";
        } else {
            pointB = clickedPoint.clone();
            hitungDanLipat(pointA, pointB);
            // Reset untuk lipatan berikutnya
            pointA = null;
            pointB = null;
            statusLabel.innerText = "Pilih Titik Asal";
            statusLabel.style.background = "#e8f4fd";
            statusLabel.style.borderColor = "#3498db";
            statusLabel.style.color = "#2980b9";
        }
    }
});

// 5. Algoritma Perpendicular Bisector (Garis Bagi Tegak Lurus)
function hitungDanLipat(A, B) {
    const positions = paper.geometry.attributes.position;
    
    // 1. Cari titik tengah (Midpoint) antara A dan B sebagai titik pada garis lipat
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    
    // 2. Cari vektor normal garis lipat (Vektor AB)
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    for (let i = 0; i < positions.count; i++) {
        let P = new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
        );

        // Vektor dari Midpoint ke Vertex P
        const v = new THREE.Vector3().subVectors(P, mid);
        
        // Proyeksi v ke arah normal untuk menentukan posisi relatif terhadap garis lipat
        const dot = v.dot(normal);

        // Jika dot < 0, berarti titik berada di sisi "Asal" (A) dan harus dilipat
        if (dot < 0) {
            // Rumus Refleksi: P' = P - 2 * (v ⋅ n) * n
            const reflection = normal.clone().multiplyScalar(2 * dot);
            P.sub(reflection);
            
            // Beri sedikit Z-offset agar tidak terjadi Z-fighting (tumpang tindih visual)
            positions.setX(i, P.x);
            positions.setY(i, P.y);
            positions.setZ(i, P.z + 0.02);
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
