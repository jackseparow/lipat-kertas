const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0f0c29);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true;

const segments = 100;
let geometry, material, paper;
let foldHistory = []; 
let creaseLines = []; 

function initKertas() {
    geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
    material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.5 });
    paper = new THREE.Mesh(geometry, material);
    paper.rotation.x = -Math.PI / 4;
    scene.add(paper);
    
    // Simpan state awal (posisi datar)
    foldHistory = [geometry.attributes.position.array.slice()];
}
initKertas();

const markerA = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
const markerB = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0x2ed573 }));
markerA.visible = markerB.visible = false;
scene.add(markerA, markerB);

camera.position.set(0, 1, 6);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const statusLabel = document.getElementById('status');

renderer.domElement.addEventListener('pointerdown', (event) => {
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
                markerA.visible = markerB.visible = false;
            }, 500);
        }
    }
});

function jalankanLipatan(A, B) {
    // Simpan posisi SEBELUM melipat ke dalam history
    foldHistory.push(paper.geometry.attributes.position.array.slice());

    const pos = paper.geometry.attributes.position;
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    paper.updateMatrixWorld();
    const invMat = new THREE.Matrix4().copy(paper.matrixWorld).invert();

    for (let i = 0; i < pos.count; i++) {
        let vWorld = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(paper.matrixWorld);
        const dist = new THREE.Vector3().subVectors(vWorld, mid).dot(normal);

        if (dist < 0) {
            const reflection = normal.clone().multiplyScalar(2 * dist);
            vWorld.sub(reflection);
            let vLocal = vWorld.applyMatrix4(invMat);
            pos.setXYZ(i, vLocal.x, vLocal.y, vLocal.z + 0.015);
        }
    }
    pos.needsUpdate = true;
    buatGarisJejak(mid, normal);
}

function buatGarisJejak(mid, normal) {
    // Membuat garis biru yang menempel di kertas sebagai jejak simetri
    const lineDir = new THREE.Vector3(-normal.y, normal.x, 0).normalize();
    const start = mid.clone().add(lineDir.clone().multiplyScalar(4));
    const end = mid.clone().sub(lineDir.clone().multiplyScalar(4));

    const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(lineGeo, lineMat);
    
    scene.add(line);
    creaseLines.push(line);
}

// Menghubungkan fungsi ke global window agar bisa dipanggil tombol HTML
window.bukaLipatan = function() {
    if (foldHistory.length > 1) {
        // Ambil state posisi sebelumnya
        const previousState = foldHistory.pop();
        const pos = paper.geometry.attributes.position;
        
        // Update koordinat vertex secara manual
        for (let i = 0; i < pos.array.length; i++) {
            pos.array[i] = previousState[i];
        }
        pos.needsUpdate = true;
    }
};

window.resetKertas = function() {
    scene.remove(paper);
    creaseLines.forEach(line => scene.remove(line));
    creaseLines = [];
    initKertas();
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
