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
const MIN_CAMERA_FRUSTUM_HEIGHT = 96;
const CAMERA_FRUSTUM_RADIUS_SCALE = 1.72;
const WALL_OPACITY = 0.3;
const VIEWER_WALL_OPACITY = 0.07;
const FLOOR_OPACITY = 0.18;

const BACKGROUND_DEBUG_COLORS = {
    arch: 0xfacc15,
    'tree-arch': 0x22c55e,
    portcullis: 0x38bdf8,
    'wall-preset': 0x94a3b8,
    'tree-room': 0x16a34a,
    'tree-filler': 0x84cc16,
    'fixed-background': 0xf97316,
    'high-arch': 0xf59e0b,
    'high-arch-base': 0xd97706,
    'unknown-background': 0xf472b6,
};

const CARDINAL_SIDES = ['north', 'east', 'south', 'west'];

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

const RENDER_MODES = [
    {id: 'schematic', label: 'Schematic'},
    {id: 'full-3d', label: 'Full 3D', disabled: true},
];

function formatHex(value, digits = 2) {
    if (value === null || value === undefined) return '--';
    return '0x' + value.toString(16).toUpperCase().padStart(digits, '0');
}

function formatBackgroundIds(ids) {
    if (!ids || ids.length === 0) return 'none';
    return ids.map(id => formatHex(id, 2)).join(' ');
}

function staticLocationForRoom(room) {
    if (!room || !room.staticLocation || room.staticLocation.error) return null;
    return room.staticLocation;
}

function summarizeBackgroundCategories(backgrounds) {
    if (!backgrounds || backgrounds.length === 0) return 'none';
    const counts = new Map();
    backgrounds.forEach(background => {
        const category = background.category || 'unknown-background';
        counts.set(category, (counts.get(category) || 0) + 1);
    });

    return [...counts.entries()]
        .map(([category, count]) => category + ':' + count)
        .join(', ');
}

function countBackgroundRecords(backgrounds) {
    if (!backgrounds) return 0;
    return backgrounds.reduce((total, background) => (
        total + (background.records ? background.records.length : 0)
    ), 0);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

function formatRecordAddress(value) {
    return formatHex(value, 4);
}

function formatVisualRecord(record) {
    if (!record) return '--';
    return [
        formatHex(record.spriteId, 2),
        formatRoomSize(record.position),
        formatRoomSize(record.dimensions),
        formatHex(record.flags, 2),
    ].join(' | ');
}

function formatStaticSource(source) {
    if (!source) return '--';
    return [
        formatHex(source.backgroundId, 2),
        source.category || 'unknown',
        source.side || '',
        '#' + source.recordIndex,
    ].filter(Boolean).join(' ');
}

function formatMismatchList(mismatches) {
    if (!mismatches || mismatches.length === 0) return '';
    const fields = mismatches.map(item => item.field).join(',');
    return ' (' + fields + ')';
}

function summarizeBackgroundComparison(comparison) {
    if (!comparison) return 'unavailable';
    if (!comparison.anchorsTrusted) {
        return [
            'untrusted anchors',
            comparison.staticRecordCount + ' static',
            comparison.dynamicRecordCount + ' dynamic',
        ].join(', ');
    }
    return [
        comparison.prefixStatus,
        comparison.exactCount + '/' + comparison.staticRecordCount + ' exact',
        comparison.mismatchCount + ' mismatched',
        comparison.missingDynamicCount + ' missing',
        comparison.extraDynamicCount + ' extra dynamic',
    ].join(', ');
}

function dimensionOrDefault(value, fallback) {
    if (!Number.isFinite(value) || value < 16) return fallback;
    return value;
}

function hasUsableRoomFloorSize(size) {
    return Boolean(
        size
        && Number.isFinite(size.x)
        && Number.isFinite(size.y)
        && size.x >= 16
        && size.y >= 16
    );
}

function roomDimensionSource(room) {
    if (hasUsableRoomFloorSize(room ? room.size : null)) return 'work memory';
    if (staticLocationForRoom(room) && staticLocationForRoom(room).dimensions) return 'static location fallback';
    return 'default fallback';
}

function roomDimensionsFromRoom(room) {
    const size = hasUsableRoomFloorSize(room ? room.size : null)
        ? room.size
        : (staticLocationForRoom(room) ? staticLocationForRoom(room).dimensions : null);
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

function createBackgroundMaterial(color, opacity = 0.78) {
    return new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

function backgroundDebugColor(background) {
    return BACKGROUND_DEBUG_COLORS[background.category] || BACKGROUND_DEBUG_COLORS['unknown-background'];
}

export class KnightLoreStage0Renderer {
    constructor(container, opts = {}) {
        this.container = container;
        this.diagnosticsContainer = opts.diagnosticsContainer || null;
        this.latestFrame = null;
        this.frameCounter = 0;
        this.staticMemory = null;
        this.lastRoomSignature = '';
        this.lastStaticBackgroundSignature = '';
        this.roomDimensions = {...DEFAULT_ROOM_DIMENSIONS};
        this.activeViewPreset = 'game';
        this.activeRenderMode = 'schematic';
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

        this.renderModeElement = document.createElement('div');
        this.renderModeElement.className = 'knight-lore-render-mode-toggle';
        this.renderModeElement.setAttribute('role', 'radiogroup');
        this.renderModeElement.setAttribute('aria-label', 'Render mode');
        this.renderModeButtons = new Map();
        RENDER_MODES.forEach(mode => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = mode.label;
            button.dataset.renderMode = mode.id;
            button.setAttribute('role', 'radio');
            button.title = mode.disabled
                ? 'Full 3D render will be enabled after the detailed renderer exists'
                : mode.label + ' render mode';
            if (mode.disabled) {
                button.disabled = true;
                button.setAttribute('aria-disabled', 'true');
            }
            button.addEventListener('click', () => {
                if (!mode.disabled) this.setRenderMode(mode.id);
            });
            this.renderModeButtons.set(mode.id, button);
            this.renderModeElement.appendChild(button);
        });
        this.controlsElement.appendChild(this.renderModeElement);

        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'knight-lore-stage0-canvas';
        this.summaryElement = document.createElement('div');
        this.summaryElement.className = 'knight-lore-stage0-summary';
        this.summaryElement.textContent = 'Waiting for semantic frame...';
        this.comparisonElement = document.createElement('div');
        this.comparisonElement.className = 'knight-lore-stage2-comparison';
        this.comparisonElement.textContent = 'Waiting for background comparison...';
        const diagnosticsHost = this.diagnosticsContainer || this.container;
        diagnosticsHost.classList.add('knight-lore-stage2-diagnostics');
        this.container.appendChild(this.controlsElement);
        this.container.appendChild(this.canvasHost);
        diagnosticsHost.appendChild(this.summaryElement);
        diagnosticsHost.appendChild(this.comparisonElement);

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

        this.staticBackgroundGroup = new THREE.Group();
        this.scene.add(this.staticBackgroundGroup);

        window.addEventListener('resize', this.handleResize);
        this.setRenderMode(this.activeRenderMode);
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
        this.updateStaticBackgroundGeometry();
        this.updateSummary();
        this.updateComparisonDiagnostics();
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

        const dimensions = roomDimensionsFromRoom(room);
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

    updateStaticBackgroundGeometry() {
        const room = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene.room
            : null;
        const location = staticLocationForRoom(room);
        const signature = location
            ? [
                room.id,
                this.roomDimensions.width,
                this.roomDimensions.height,
                this.roomDimensions.depth,
                location.backgroundIds.join(','),
            ].join(':')
            : 'none';
        if (signature === this.lastStaticBackgroundSignature) return;
        this.lastStaticBackgroundSignature = signature;

        this.clearStaticBackgroundGeometry();
        if (!location) return;

        location.backgrounds.forEach((background, index) => {
            this.addStaticBackground(background, index);
        });
    }

    clearStaticBackgroundGeometry() {
        while (this.staticBackgroundGroup.children.length > 0) {
            const child = this.staticBackgroundGroup.children[0];
            this.staticBackgroundGroup.remove(child);
            child.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    const materials = Array.isArray(object.material)
                        ? object.material
                        : [object.material];
                    materials.forEach(material => material.dispose());
                }
            });
        }
    }

    createDebugBox(width, height, depth, color, opacity) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            createBackgroundMaterial(color, opacity)
        );
        mesh.scale.set(width, height, depth);
        return mesh;
    }

    createSideGroup(side, layer = 0) {
        const group = new THREE.Group();
        const offset = 0.75 + layer * 0.12;
        const dimensions = this.roomDimensions;

        switch (side) {
            case 'north':
                group.position.set(0, 0, -dimensions.depth / 2 - offset);
                group.rotation.y = Math.PI;
                break;
            case 'south':
                group.position.set(0, 0, dimensions.depth / 2 + offset);
                break;
            case 'east':
                group.position.set(dimensions.width / 2 + offset, 0, 0);
                group.rotation.y = Math.PI / 2;
                break;
            case 'west':
                group.position.set(-dimensions.width / 2 - offset, 0, 0);
                group.rotation.y = -Math.PI / 2;
                break;
        }

        group.userData.side = side;
        return group;
    }

    sideLength(side) {
        return (side === 'east' || side === 'west')
            ? this.roomDimensions.depth
            : this.roomDimensions.width;
    }

    addSideBand(side, color, layer, y, thickness = 2.5, opacity = 0.48) {
        const group = this.createSideGroup(side, layer);
        const band = this.createDebugBox(
            Math.max(12, this.sideLength(side) - 4),
            thickness,
            1.5,
            color,
            opacity
        );
        band.position.y = y;
        group.add(band);
        this.staticBackgroundGroup.add(group);
    }

    addWallPreset(background, index) {
        const color = backgroundDebugColor(background);
        CARDINAL_SIDES.forEach((side, sideIndex) => {
            this.addSideBand(
                side,
                color,
                index + sideIndex * 0.1,
                Math.max(4, this.roomDimensions.height - 5),
                2,
                background.category === 'tree-room' ? 0.62 : 0.38
            );
        });
    }

    addSidePatch(background, index) {
        if (!background.side) return;
        const color = backgroundDebugColor(background);
        const group = this.createSideGroup(background.side, index);
        const patch = this.createDebugBox(
            Math.max(12, this.sideLength(background.side) * 0.42),
            Math.max(16, this.roomDimensions.height * 0.58),
            1.6,
            color,
            0.45
        );
        patch.position.y = Math.max(10, this.roomDimensions.height * 0.42);
        group.add(patch);
        this.staticBackgroundGroup.add(group);
    }

    addOpeningFrame(background, index, withBars = false) {
        if (!background.side) return;
        const color = backgroundDebugColor(background);
        const group = this.createSideGroup(background.side, index);
        const length = this.sideLength(background.side);
        const highArch = background.category === 'high-arch' || background.category === 'high-arch-base';
        const openingWidth = Math.max(16, Math.min(length * 0.55, highArch ? 34 : 28));
        const openingHeight = Math.max(24, Math.min(this.roomDimensions.height * (highArch ? 0.86 : 0.7), highArch ? 54 : 44));
        const thickness = 2.4;
        const depth = 2.2;

        const left = this.createDebugBox(thickness, openingHeight, depth, color, 0.82);
        left.position.set(-openingWidth / 2, openingHeight / 2, 0);
        group.add(left);

        const right = this.createDebugBox(thickness, openingHeight, depth, color, 0.82);
        right.position.set(openingWidth / 2, openingHeight / 2, 0);
        group.add(right);

        const top = this.createDebugBox(openingWidth + thickness, thickness, depth, color, 0.82);
        top.position.set(0, openingHeight, 0);
        group.add(top);

        if (background.category === 'high-arch-base') {
            const base = this.createDebugBox(openingWidth + thickness, thickness, depth, color, 0.74);
            base.position.set(0, thickness / 2, 0);
            group.add(base);
        }

        if (withBars) {
            const barCount = 5;
            for (let i = 0; i < barCount; i++) {
                const x = -openingWidth * 0.36 + (openingWidth * 0.72) * (i / (barCount - 1));
                const bar = this.createDebugBox(0.9, openingHeight * 0.86, depth + 0.7, color, 0.9);
                bar.position.set(x, openingHeight * 0.43, 0.4);
                group.add(bar);
            }
        }

        this.staticBackgroundGroup.add(group);
    }

    addFixedBackgroundMarker(background, index) {
        const color = backgroundDebugColor(background);
        const group = new THREE.Group();
        const marker = this.createDebugBox(9, 12, 9, color, 0.82);
        marker.position.set(
            (index % 3 - 1) * 11,
            6,
            (Math.floor(index / 3) % 3 - 1) * 11
        );
        group.add(marker);
        this.staticBackgroundGroup.add(group);
    }

    addStaticBackground(background, index) {
        switch (background.category) {
            case 'wall-preset':
            case 'tree-room':
                this.addWallPreset(background, index);
                break;
            case 'arch':
            case 'tree-arch':
            case 'high-arch':
            case 'high-arch-base':
                this.addOpeningFrame(background, index, false);
                break;
            case 'portcullis':
                this.addOpeningFrame(background, index, true);
                break;
            case 'tree-filler':
                this.addSidePatch(background, index);
                break;
            case 'fixed-background':
                this.addFixedBackgroundMarker(background, index);
                break;
            default:
                this.addSidePatch(background, index);
                break;
        }
    }

    updateSummary() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const room = scene ? scene.room : null;
        const cache = (room && room.staticCache) || this.staticMemory;
        const staticLocation = room ? room.staticLocation : null;
        const decodedLocation = staticLocationForRoom(room);
        const dynamicRecords = room && room.dynamicVisualRecords
            ? room.dynamicVisualRecords
            : (room && room.sprites ? room.sprites : []);
        const backgroundComparison = room ? room.backgroundComparison : null;
        const staticLine = !staticLocation
            ? 'Static location: not decoded'
            : staticLocation.error
                ? 'Static location: ' + staticLocation.error
                : (
                    'Static location: ' + formatHex(staticLocation.address, 4)
                    + ', selector ' + staticLocation.sizeSelector
                    + ', attr ' + formatHex(staticLocation.attr, 2)
                );
        const comparisonLine = decodedLocation
            ? (
                'Static/work checks: size '
                + (decodedLocation.comparisons.sizeMatchesWorkMemory ? 'ok' : 'diff')
                + ', attr '
                + (decodedLocation.comparisons.attrMatchesWorkMemory ? 'ok' : 'diff')
            )
            : 'Static/work checks: unavailable';
        this.summaryElement.textContent = [
            'Frame: ' + this.frameCounter,
            'Room id: ' + formatHex(room ? room.id : null, 2),
            'Colour/attribute: ' + formatHex(room ? room.colourAttribute : null, 2),
            'Size XYZ: ' + formatRoomSize(room ? room.size : null),
            'Display box XYZ: ' + [
                this.roomDimensions.width,
                this.roomDimensions.height,
                this.roomDimensions.depth,
            ].join(', '),
            'Render mode: ' + this.activeRenderMode,
            'Geometry size source: ' + roomDimensionSource(room),
            'Static cache: ' + (cache && cache.byteLength ? cache.byteLength + ' bytes' : 'not loaded'),
            staticLine,
            comparisonLine,
            'Background ids: ' + formatBackgroundIds(decodedLocation ? decodedLocation.backgroundIds : []),
            'Background types: ' + summarizeBackgroundCategories(decodedLocation ? decodedLocation.backgrounds : []),
            'Static background sprites: ' + countBackgroundRecords(decodedLocation ? decodedLocation.backgrounds : []),
            'Dynamic visual slots: ' + dynamicRecords.length + ' @ ' + formatHex(room ? room.dynamicStart : null, 4)
                + ' step ' + formatHex(room ? room.dynamicSlotSize : null, 2),
            'Static/dynamic prefix: ' + summarizeBackgroundComparison(backgroundComparison),
        ].join('\n');
    }

    updateComparisonDiagnostics() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const room = scene ? scene.room : null;
        const comparison = room ? room.backgroundComparison : null;
        const staticLocation = room ? room.staticLocation : null;

        if (!comparison || !staticLocation || staticLocation.error) {
            this.comparisonElement.textContent = 'Background comparison unavailable.';
            return;
        }

        const rows = comparison.rows || [];
        const maxRows = 12;
        const startIndex = comparison.firstIssueIndex === null || comparison.firstIssueIndex < 6
            ? 0
            : Math.max(0, comparison.firstIssueIndex - 4);
        const visibleRows = rows.slice(startIndex, startIndex + maxRows);
        const skippedPrefix = startIndex > 0
            ? '<p class="knight-lore-stage2-note">Showing rows around first issue; skipped '
                + startIndex
                + ' earlier exact rows.</p>'
            : '';
        const trustNote = comparison.anchorsTrusted
            ? ''
            : '<p class="knight-lore-stage2-note is-warning">'
                + 'Dynamic-prefix comparison is untrusted until room size and attribute anchors match static data.'
                + '</p>';

        this.comparisonElement.innerHTML = [
            '<div class="knight-lore-stage2-comparison-heading">',
            '<strong>Static background vs dynamic slots</strong>',
            '<span>'
                + escapeHtml(summarizeBackgroundComparison(comparison))
                + '</span>',
            '</div>',
            trustNote,
            skippedPrefix,
            '<table>',
            '<thead><tr>',
            '<th>#</th>',
            '<th>Static source</th>',
            '<th>Static sprite | pos | dim | flags</th>',
            '<th>Dynamic sprite | pos | dim | flags</th>',
            '<th>Status</th>',
            '</tr></thead>',
            '<tbody>',
            visibleRows.map(row => (
                '<tr class="is-' + escapeHtml(row.status) + '">' +
                '<td class="mono">' + row.index + '</td>' +
                '<td class="mono">' + escapeHtml(formatStaticSource(row.staticSource)) + '</td>' +
                '<td class="mono" title="' + escapeHtml(formatRecordAddress(row.staticRecord ? row.staticRecord.address : null)) + '">'
                    + escapeHtml(formatVisualRecord(row.staticRecord))
                    + '</td>' +
                '<td class="mono" title="' + escapeHtml(formatRecordAddress(row.dynamicRecord ? row.dynamicRecord.address : null)) + '">'
                    + escapeHtml(formatVisualRecord(row.dynamicRecord))
                    + '</td>' +
                '<td>' + escapeHtml(row.status + formatMismatchList(row.mismatches)) + '</td>' +
                '</tr>'
            )).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    setRenderMode(id) {
        const mode = RENDER_MODES.find(item => item.id === id && !item.disabled) || RENDER_MODES[0];
        this.activeRenderMode = mode.id;
        this.renderModeButtons.forEach((button, buttonMode) => {
            const isActive = buttonMode === this.activeRenderMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-checked', isActive ? 'true' : 'false');
        });
        this.render();
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
        const frustumHeight = Math.max(MIN_CAMERA_FRUSTUM_HEIGHT, radius * CAMERA_FRUSTUM_RADIUS_SCALE);

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
        this.clearStaticBackgroundGeometry();
        this.roomEdges.geometry.dispose();
        this.roomEdges.material.dispose();
        this.renderer.dispose();
        if (this.diagnosticsContainer) {
            this.summaryElement.remove();
            this.comparisonElement.remove();
        }
        this.container.innerHTML = '';
    }
}
