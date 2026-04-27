// 1. Inisialisasi Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0c29);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true;

// 2. State & Geometri
let currentMode = 'fold'; 
const segments = 100;
let geometry, material, paper, canvas, ctx, texture;
let foldHistory = [];
let layerStack = 0;

function initTexture() {
    canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function initKertas() {
    geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
    material = new THREE.MeshStandardMaterial({ 
        map: initTexture(), 
        side: THREE.DoubleSide, 
        roughness: 0.6 
    });
    paper = new THREE.Mesh(geometry, material);
    paper.rotation.x = -Math.PI / 4;
    scene.add(paper);
    foldHistory = [geometry.attributes.position.array.slice()];
    layerStack = 0;
}
initKertas();
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// 3. Marker
const markerA = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
const markerB = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0x2ed573 }));
markerA.visible = markerB.visible = false;
scene.add(markerA, markerB);

camera.position.set(0, 1, 6);

// 4. Mode Switcher
window.setMode = function(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + mode).classList.add('active');
    
    const descriptions = {
        'fold': 'Mode: MELIPAT (Pilih 2 Titik)',
        'pocket': 'Mode: BUAT KANTONG (Klik untuk Melubangi)',
        'lock': 'Mode: KUNCI UJUNG (Masukkan ke Sela)'
    };
    document.getElementById('mode-desc').innerText = descriptions[mode];
    resetSelection();
};

function resetSelection() {
    pointA = null;
    markerA.visible = markerB.visible = false;
    document.getElementById('status').innerText = "Siap...";
}

// 5. Interaksi Berdasarkan Mode
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return; // Hiraukan klik kanan
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(paper);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // PENGHUBUNG MODE
        if (currentMode === 'fold') {
            handleFold(point);
        } else if (currentMode === 'pocket') {
            handlePocket(point);
        } else if (currentMode === 'lock') {
            handleLock(point);
        }
    }
});

function handleFold(point) {
    if (!pointA) {
        pointA = point.clone();
        markerA.position.copy(pointA);
        markerA.visible = true;
        document.getElementById('status').innerText = "Pilih Titik Tujuan...";
    } else {
        const pointB = point.clone();
        markerB.position.copy(pointB);
        markerB.visible = true;
        jalankanLipatan(pointA, pointB, 1.0); // Lipatan Standar
        resetSelection();
    }
}

function handlePocket(point) {
    // Pocket: Membuat sedikit celah dengan membalikkan normal secara mikro
    const dir = new THREE.Vector3(0, 0.05, 0); 
    const pTarget = point.clone().add(dir);
    jalankanLipatan(point, pTarget, 0.15); // Intensitas rendah untuk kantong
    document.getElementById('status').innerText = "Kantong Berhasil Dibuat";
}

function handleLock(point) {
    // Lock: Menaikkan layer secara signifikan agar ujung "menembus" lapisan bawah
    layerStack += 3; 
    const dir = new THREE.Vector3(0, -0.1, 0);
    const pTarget = point.clone().add(dir);
    jalankanLipatan(point, pTarget, 1.2); 
    document.getElementById('status').innerText = "Ujung Berhasil Terkunci";
}

function jalankanLipatan(A, B, intensity) {
    foldHistory.push(paper.geometry.attributes.position.array.slice());
    layerStack++;

    const pos = paper.geometry.attributes.position;
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    const normal = new THREE.Vector3().subVectors(B, A).normalize();

    paper.updateMatrixWorld();
    const invMat = new THREE.Matrix4().copy(paper.matrixWorld).invert();

    gambarJejakDiTekstur(mid, normal);

    for (let i = 0; i < pos.count; i++) {
        let vWorld = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(paper.matrixWorld);
        const dist = new THREE.Vector3().subVectors(vWorld, mid).dot(normal);

        if (dist < 0) {
            const reflection = normal.clone().multiplyScalar(2 * dist * intensity);
            vWorld.sub(reflection);
            let vLocal = vWorld.applyMatrix4(invMat);
            // Offset dinamis sesuai tumpukan (layering)
            pos.setXYZ(i, vLocal.x, vLocal.y, vLocal.z + (0.012 * layerStack));
        }
    }
    pos.needsUpdate = true;
}

function gambarJejakDiTekstur(midWorld, normalWorld) {
    const invMat = new THREE.Matrix4().copy(paper.matrixWorld).invert();
    const localMid = midWorld.clone().applyMatrix4(invMat);
    const localNormal = normalWorld.clone().transformDirection(invMat);

    const centerX = (localMid.x + 2) / 4 * 1024;
    const centerY = (1 - (localMid.y + 2) / 4) * 1024;
    const dirX = -localNormal.y; const dirY = localNormal.x;

    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]); // Visualisasi Bekas Lipatan (Crease Line)
    ctx.beginPath();
    ctx.moveTo(centerX + dirX * 2000, centerY - dirY * 2000);
    ctx.lineTo(centerX - dirX * 2000, centerY + dirY * 2000);
    ctx.stroke();
    texture.needsUpdate = true;
}

window.bukaLipatan = function() {
    if (foldHistory.length > 1) {
        const prevState = foldHistory.pop();
        const pos = paper.geometry.attributes.position;
        for (let i = 0; i < pos.array.length; i++) { pos.array[i] = prevState[i]; }
        pos.needsUpdate = true;
        if(layerStack > 0) layerStack--;
    }
};

window.resetKertas = function() {
    scene.remove(paper);
    initKertas();
    resetSelection();
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
