import * as THREE from 'three';

const ROOM_DEBUG_COLORS = [
    0x263238,
    0x2563eb,
    0xbe123c,
    0x7c3aed,
    0x16a34a,
    0x0d9488,
    0xca8a04,
    0xe5e7eb,
];

const DEFAULT_ROOM_DIMENSIONS = {
    width: 64,
    depth: 64,
    height: 64,
};
const DISPLAY_ROOM_HEIGHT = 64;
const CAD_CAMERA_DISTANCE = 500;
const WALL_OPACITY = 0.3;
const VIEWER_WALL_OPACITY = 0.07;
const FLOOR_OPACITY = 0.18;

const VIEW_PRESETS = [
    {id: 'game', label: 'Upper front right (game)', direction: [1, 0.72, 1], up: [0, 1, 0]},
    {id: 'top', label: 'Top', direction: [0, 1, 0], up: [0, 0, -1]},
    {id: 'bottom', label: 'Bottom', direction: [0, -1, 0], up: [0, 0, 1]},
    {id: 'right', label: 'Right', direction: [1, 0, 0], up: [0, 1, 0]},
    {id: 'left', label: 'Left', direction: [-1, 0, 0], up: [0, 1, 0]},
    {id: 'front', label: 'Front', direction: [0, 0, 1], up: [0, 1, 0]},
    {id: 'back', label: 'Back', direction: [0, 0, -1], up: [0, 1, 0]},
    {id: 'upper-front-left', label: 'Upper front left', direction: [-1, 0.72, 1], up: [0, 1, 0]},
    {id: 'upper-back-right', label: 'Upper back right', direction: [1, 0.72, -1], up: [0, 1, 0]},
    {id: 'upper-back-left', label: 'Upper back left', direction: [-1, 0.72, -1], up: [0, 1, 0]},
];

function formatHex(value, digits = 2) {
    if (value === null || value === undefined) return '--';
    return '0x' + value.toString(16).toUpperCase().padStart(digits, '0');
}

function formatRoomSize(size) {
    if (!size) return '--, --, --';
    return [
        size.x === null || size.x === undefined ? '--' : size.x,
        size.y === null || size.y === undefined ? '--' : size.y,
        size.z === null || size.z === undefined ? '--' : size.z,
    ].join(', ');
}

function roomColorFromAttribute(value) {
    if (value === null || value === undefined) return 0x7dd3fc;
    return ROOM_DEBUG_COLORS[value & 0x07];
}

function dimensionOrDefault(value, fallback) {
    if (!Number.isFinite(value) || value < 16) return fallback;
    return value;
}

function roomDimensionsFromBytes(size) {
    if (!size) return {...DEFAULT_ROOM_DIMENSIONS};

    return {
        width: dimensionOrDefault(size.x, DEFAULT_ROOM_DIMENSIONS.width),
        depth: dimensionOrDefault(size.y, DEFAULT_ROOM_DIMENSIONS.depth),
        height: DISPLAY_ROOM_HEIGHT,
    };
}

function createMaterial(color, opacity) {
    return new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

export class KnightLoreStage0Renderer {
    constructor(container) {
        this.container = container;
        this.latestFrame = null;
        this.frameCounter = 0;
        this.staticMemory = null;
        this.lastRoomSignature = '';
        this.roomDimensions = {...DEFAULT_ROOM_DIMENSIONS};
        this.activeViewPreset = 'game';
        this.handleResize = () => {
            this.resize();
            this.render();
        };

        this.container.classList.add('knight-lore-stage0');
        this.container.innerHTML = '';

        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'knight-lore-stage0-controls';
        this.viewSelect = document.createElement('select');
        this.viewSelect.title = 'Camera view';
        this.viewSelect.setAttribute('aria-label', 'Camera view');
        VIEW_PRESETS.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.label;
            this.viewSelect.appendChild(option);
        });
        this.viewSelect.value = this.activeViewPreset;
        this.viewSelect.addEventListener('change', () => {
            this.setViewPreset(this.viewSelect.value);
        });
        this.controlsElement.appendChild(this.viewSelect);
        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'knight-lore-stage0-canvas';
        this.summaryElement = document.createElement('div');
        this.summaryElement.className = 'knight-lore-stage0-summary';
        this.summaryElement.textContent = 'Waiting for semantic frame...';
        this.container.appendChild(this.controlsElement);
        this.container.appendChild(this.canvasHost);
        this.container.appendChild(this.summaryElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1b2026);

        this.camera = new THREE.OrthographicCamera(-5, 5, 3.75, -3.75, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setClearColor(0x1b2026, 1);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.canvasHost.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.GridHelper(200, 10, 0x6b7280, 0x374151));
        this.scene.add(new THREE.AxesHelper(72));

        this.floorMaterial = createMaterial(0x7dd3fc, FLOOR_OPACITY);
        this.wallMaterial = createMaterial(0x7dd3fc, WALL_OPACITY);
        this.viewerWallMaterial = createMaterial(0x7dd3fc, VIEWER_WALL_OPACITY);
        const edgeMaterial = new THREE.LineBasicMaterial({color: 0x7dd3fc});

        this.floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.floorMesh);

        this.wallMeshes = [
            this.createWall('front', new THREE.Vector3(0, 0, 1)),
            this.createWall('back', new THREE.Vector3(0, 0, -1)),
            this.createWall('right', new THREE.Vector3(1, 0, 0)),
            this.createWall('left', new THREE.Vector3(-1, 0, 0)),
        ];
        this.wallMeshes.forEach(wall => {
            this.scene.add(wall);
        });

        this.roomEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
            edgeMaterial
        );
        this.scene.add(this.roomEdges);

        window.addEventListener('resize', this.handleResize);
        this.setViewPreset(this.activeViewPreset);
        this.resize();
        this.render();
    }

    createWall(name, outwardNormal) {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.wallMaterial);
        wall.userData.name = name;
        wall.userData.outwardNormal = outwardNormal;
        return wall;
    }

    updateStaticMemory(staticMemory) {
        this.staticMemory = staticMemory;
        this.updateSummary();
    }

    update(frame) {
        this.latestFrame = frame;
        this.frameCounter += 1;
        this.updateRoomShape();
        this.updateSummary();
        this.render();
    }

    updateRoomShape() {
        const room = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene.room
            : null;
        const signature = room
            ? [room.id, room.colourAttribute, room.size.x, room.size.y, room.size.z].join(':')
            : '';
        if (signature === this.lastRoomSignature) return;
        this.lastRoomSignature = signature;

        const dimensions = roomDimensionsFromBytes(room ? room.size : null);
        this.roomDimensions = dimensions;
        const color = roomColorFromAttribute(room ? room.colourAttribute : null);
        this.floorMaterial.color.setHex(color);
        this.wallMaterial.color.setHex(color);
        this.viewerWallMaterial.color.setHex(color);
        this.roomEdges.material.color.setHex(color);

        this.floorMesh.scale.set(dimensions.width, dimensions.depth, 1);
        this.floorMesh.position.set(0, 0, 0);

        const wallY = dimensions.height / 2;
        this.wallMeshes.forEach(wall => {
            wall.scale.set(dimensions.width, dimensions.height, 1);
            wall.position.set(0, wallY, 0);
            wall.rotation.set(0, 0, 0);

            switch (wall.userData.name) {
                case 'front':
                    wall.position.z = dimensions.depth / 2;
                    break;
                case 'back':
                    wall.position.z = -dimensions.depth / 2;
                    wall.rotation.y = Math.PI;
                    break;
                case 'right':
                    wall.position.x = dimensions.width / 2;
                    wall.rotation.y = Math.PI / 2;
                    wall.scale.set(dimensions.depth, dimensions.height, 1);
                    break;
                case 'left':
                    wall.position.x = -dimensions.width / 2;
                    wall.rotation.y = -Math.PI / 2;
                    wall.scale.set(dimensions.depth, dimensions.height, 1);
                    break;
            }
        });

        this.roomEdges.scale.set(dimensions.width, dimensions.height, dimensions.depth);
        this.roomEdges.position.set(0, dimensions.height / 2, 0);
        this.setViewPreset(this.activeViewPreset);
        this.updateWallVisibility();
    }

    updateSummary() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const room = scene ? scene.room : null;
        const cache = (room && room.staticCache) || this.staticMemory;
        this.summaryElement.textContent = [
            'Frame: ' + this.frameCounter,
            'Room id: ' + formatHex(room ? room.id : null, 2),
            'Colour/attribute: ' + formatHex(room ? room.colourAttribute : null, 2),
            'Size XYZ: ' + formatRoomSize(room ? room.size : null),
            'Box XYZ: ' + [
                this.roomDimensions.width,
                this.roomDimensions.height,
                this.roomDimensions.depth,
            ].join(', '),
            'Static cache: ' + (cache && cache.byteLength ? cache.byteLength + ' bytes' : 'not loaded'),
        ].join('\n');
    }

    setViewPreset(id) {
        const preset = VIEW_PRESETS.find(item => item.id === id) || VIEW_PRESETS[0];
        this.activeViewPreset = preset.id;
        this.viewSelect.value = preset.id;

        const target = new THREE.Vector3(0, this.roomDimensions.height / 2, 0);
        const direction = new THREE.Vector3(...preset.direction).normalize();
        this.camera.position.copy(target).addScaledVector(direction, CAD_CAMERA_DISTANCE);
        this.camera.up.set(...preset.up).normalize();
        this.camera.lookAt(target);
        this.updateWallVisibility();
        this.resize();
        this.render();
    }

    updateWallVisibility() {
        if (!this.wallMeshes) return;

        const distances = this.wallMeshes.map(wall => wall.position.distanceTo(this.camera.position));
        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        const topOrBottomView = Math.abs(this.camera.position.y - this.roomDimensions.height / 2) > CAD_CAMERA_DISTANCE * 0.9;
        const nearThreshold = minDistance + Math.max(1, (maxDistance - minDistance) * 0.12);

        this.wallMeshes.forEach((wall, index) => {
            const isViewerWall = topOrBottomView || distances[index] <= nearThreshold;
            wall.material = isViewerWall ? this.viewerWallMaterial : this.wallMaterial;
        });
        this.floorMaterial.opacity = this.camera.position.y < 0 ? VIEWER_WALL_OPACITY : FLOOR_OPACITY;
    }

    resize() {
        const width = Math.max(280, this.canvasHost.clientWidth || this.container.clientWidth || 280);
        const height = Math.max(260, this.canvasHost.clientHeight || 320);
        const aspect = width / height;
        const radius = Math.sqrt(
            this.roomDimensions.width ** 2
            + this.roomDimensions.depth ** 2
            + this.roomDimensions.height ** 2
        ) / 2;
        const frustumHeight = Math.max(128, radius * 2.15);

        this.camera.left = -frustumHeight * aspect / 2;
        this.camera.right = frustumHeight * aspect / 2;
        this.camera.top = frustumHeight / 2;
        this.camera.bottom = -frustumHeight / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.handleResize);
        this.floorMesh.geometry.dispose();
        this.floorMaterial.dispose();
        this.wallMeshes.forEach(wall => {
            wall.geometry.dispose();
        });
        this.wallMaterial.dispose();
        this.viewerWallMaterial.dispose();
        this.roomEdges.geometry.dispose();
        this.roomEdges.material.dispose();
        this.renderer.dispose();
        this.container.innerHTML = '';
    }
}
