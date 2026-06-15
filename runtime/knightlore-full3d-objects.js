import * as THREE from 'three';

export const RICARD_OPENGL_UNIT = 8;
export const BLOCK_UNIT_GAME_SIZE = Object.freeze({
    x: RICARD_OPENGL_UNIT,
    y: RICARD_OPENGL_UNIT,
    z: RICARD_OPENGL_UNIT * 0.75,
});

export function blockUnitsToGameSize(units = {}) {
    return {
        x: (units.x === undefined ? 1 : units.x) * BLOCK_UNIT_GAME_SIZE.x,
        y: (units.y === undefined ? 1 : units.y) * BLOCK_UNIT_GAME_SIZE.y,
        z: (units.z === undefined ? 1 : units.z) * BLOCK_UNIT_GAME_SIZE.z,
    };
}

export function blockUnitsToSceneSize(units = {}) {
    const gameSize = blockUnitsToGameSize(units);
    return {
        width: gameSize.x,
        height: gameSize.z,
        depth: gameSize.y,
    };
}

export const BASIC_BLOCK_GAME_SIZE = Object.freeze(blockUnitsToGameSize());
export const BASIC_BLOCK_SCENE_SIZE = Object.freeze(blockUnitsToSceneSize());

const RICARD_ARCH_X_SCALE = 0.94;
const BLOCK_SPRITE_IDS = new Set([0x07, 0x36, 0x37, 0x3e, 0x5b, 0x8f]);
const ROCK_SPRITE_IDS = new Set([0x06]);
const PORTCULLIS_SPRITE_IDS = new Set([0x08, 0x09, 0x0a, 0x0b]);
const TABLE_SPRITE_IDS = new Set([0x54]);
const CHEST_SPRITE_IDS = new Set([0x55]);
const YELLOW_RED_FIRE_SPRITE_IDS = new Set([0xb5, 0xb1, 0x57]);
const RED_YELLOW_FIRE_SPRITE_IDS = new Set([0xb4, 0xb0, 0x56]);
const ROUND_GREEN_BALL_SPRITE_IDS = new Set([0xb2, 0xb6]);
const BOUNCING_GREEN_BALL_SPRITE_IDS = new Set([0xb3, 0xb7]);
const SPELL_CYCLE_SPRITE_IDS = new Set([0xa0, 0xa1, 0xa2, 0xa3]);
const REPELLING_SPELL_SPRITE_IDS = new Set([0xa4, 0xa5, 0xa6, 0xa7]);
const SPELL_CYCLE_BUBBLE_SCALE = 1.55;
const REPELLING_SPELL_RHOMBUS_SCALE = 2.2;
const REPELLING_SPELL_DISTRIBUTIONS = new Map([
    [0xa4, [
        {x: -0.3, y: 0.18, z: -0.24, size: 0.18, rx: 0.15, ry: 0.35, rz: 0.55},
        {x: 0.12, y: 0.18, z: 0.3, size: 0.13, rx: -0.4, ry: 0.15, rz: -0.2},
        {x: 0.36, y: 0.3, z: -0.12, size: 0.16, rx: 0.3, ry: -0.55, rz: 0.8},
        {x: -0.42, y: 0.42, z: 0.18, size: 0.11, rx: -0.1, ry: 0.8, rz: -0.75},
        {x: -0.06, y: 0.48, z: -0.36, size: 0.2, rx: 0.45, ry: 0.2, rz: 0.1},
        {x: 0.3, y: 0.58, z: 0.2, size: 0.14, rx: -0.55, ry: -0.2, rz: 0.65},
        {x: -0.22, y: 0.72, z: 0.34, size: 0.17, rx: 0.25, ry: -0.65, rz: -0.35},
        {x: 0.1, y: 0.84, z: -0.02, size: 0.12, rx: -0.2, ry: 0.55, rz: 1.05},
        {x: 0.42, y: 0.86, z: -0.34, size: 0.1, rx: 0.55, ry: 0.4, rz: -0.6},
        {x: -0.02, y: 0.34, z: 0.06, size: 0.15, rx: -0.35, ry: 0.75, rz: 0.3},
        {x: -0.36, y: 0.62, z: -0.06, size: 0.13, rx: 0.7, ry: -0.1, rz: -0.95},
        {x: 0.22, y: 0.76, z: 0.36, size: 0.11, rx: -0.45, ry: 0.25, rz: 0.15},
    ]],
    [0xa5, [
        {x: -0.34, y: 0.22, z: -0.32, size: 0.12, rx: 0.2, ry: 0.1, rz: 0.15},
        {x: -0.08, y: 0.18, z: 0.28, size: 0.16, rx: -0.15, ry: 0.5, rz: 0.45},
        {x: 0.31, y: 0.25, z: -0.06, size: 0.13, rx: 0.4, ry: -0.2, rz: 0.8},
        {x: -0.26, y: 0.48, z: 0.12, size: 0.19, rx: 0.1, ry: 0.85, rz: -0.2},
        {x: 0.12, y: 0.55, z: -0.34, size: 0.15, rx: -0.5, ry: 0.15, rz: 0.2},
        {x: 0.35, y: 0.66, z: 0.3, size: 0.11, rx: 0.3, ry: 0.65, rz: -0.7},
        {x: -0.05, y: 0.82, z: 0.02, size: 0.2, rx: -0.25, ry: -0.35, rz: 0.95},
        {x: -0.43, y: 0.36, z: 0.34, size: 0.1, rx: 0.62, ry: -0.1, rz: 0.72},
        {x: 0.08, y: 0.34, z: 0.02, size: 0.14, rx: -0.25, ry: 0.75, rz: -0.55},
        {x: 0.42, y: 0.5, z: -0.34, size: 0.12, rx: 0.15, ry: -0.7, rz: 0.35},
        {x: -0.28, y: 0.72, z: -0.18, size: 0.16, rx: -0.55, ry: 0.25, rz: -0.95},
        {x: 0.22, y: 0.88, z: 0.18, size: 0.13, rx: 0.45, ry: 0.45, rz: 0.05},
    ]],
    [0xa6, [
        {x: -0.38, y: 0.26, z: 0.18, size: 0.14, rx: -0.35, ry: 0.25, rz: 0.65},
        {x: -0.14, y: 0.16, z: -0.32, size: 0.11, rx: 0.4, ry: -0.1, rz: -0.25},
        {x: 0.22, y: 0.24, z: 0.32, size: 0.2, rx: 0.1, ry: 0.7, rz: 0.35},
        {x: 0.38, y: 0.45, z: -0.18, size: 0.13, rx: -0.2, ry: -0.6, rz: 0.85},
        {x: -0.28, y: 0.62, z: -0.06, size: 0.18, rx: 0.45, ry: 0.3, rz: -0.55},
        {x: 0.02, y: 0.7, z: 0.18, size: 0.12, rx: -0.45, ry: 0.9, rz: 0.1},
        {x: 0.24, y: 0.86, z: -0.28, size: 0.16, rx: 0.25, ry: -0.35, rz: -0.85},
        {x: -0.02, y: 0.38, z: -0.02, size: 0.15, rx: 0.35, ry: -0.85, rz: 0.55},
        {x: -0.42, y: 0.5, z: -0.34, size: 0.11, rx: -0.65, ry: 0.2, rz: -0.1},
        {x: 0.42, y: 0.62, z: 0.22, size: 0.17, rx: 0.2, ry: 0.45, rz: 1.05},
        {x: -0.16, y: 0.82, z: 0.36, size: 0.13, rx: -0.15, ry: -0.4, rz: -0.65},
        {x: 0.14, y: 0.52, z: -0.36, size: 0.1, rx: 0.55, ry: 0.65, rz: 0.2},
    ]],
    [0xa7, [
        {x: -0.3, y: 0.14, z: 0.34, size: 0.15, rx: 0.15, ry: 0.55, rz: -0.4},
        {x: 0.04, y: 0.2, z: -0.18, size: 0.19, rx: -0.3, ry: -0.25, rz: 0.72},
        {x: 0.34, y: 0.32, z: 0.1, size: 0.12, rx: 0.55, ry: 0.2, rz: 0.15},
        {x: -0.4, y: 0.5, z: -0.14, size: 0.1, rx: -0.1, ry: 0.75, rz: -0.75},
        {x: -0.08, y: 0.58, z: 0.34, size: 0.14, rx: 0.35, ry: -0.65, rz: 0.3},
        {x: 0.28, y: 0.72, z: -0.34, size: 0.18, rx: -0.45, ry: 0.35, rz: 1.0},
        {x: -0.18, y: 0.88, z: 0.02, size: 0.13, rx: 0.2, ry: -0.45, rz: -0.15},
        {x: -0.42, y: 0.3, z: -0.3, size: 0.12, rx: 0.5, ry: 0.4, rz: 0.9},
        {x: 0.24, y: 0.44, z: -0.38, size: 0.15, rx: -0.55, ry: 0.15, rz: -0.35},
        {x: -0.24, y: 0.68, z: 0.18, size: 0.18, rx: 0.2, ry: 0.9, rz: 0.55},
        {x: 0.4, y: 0.78, z: 0.34, size: 0.11, rx: -0.35, ry: -0.5, rz: 0.85},
        {x: 0.04, y: 0.42, z: 0.06, size: 0.13, rx: 0.65, ry: -0.25, rz: -1.05},
    ]],
]);
function normalizedSpriteId(spriteId) {
    return Number.isFinite(spriteId) ? spriteId & 0xff : null;
}

function material(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
    });
}

function edgeMaterial(color = 0x111827, opacity = 0.72) {
    return new THREE.LineBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
    });
}

function sceneSizeFromRecordDimensions(dimensions, fallback = BASIC_BLOCK_SCENE_SIZE) {
    const width = dimensions && Number.isFinite(dimensions.x)
        ? Math.max(1, dimensions.x / 2)
        : fallback.width;
    const depth = dimensions && Number.isFinite(dimensions.y)
        ? Math.max(1, dimensions.y / 2)
        : fallback.depth;
    const height = dimensions && Number.isFinite(dimensions.z)
        ? Math.max(1, dimensions.z / 2)
        : fallback.height;

    return {width, height, depth};
}

function addBoxEdges(group, geometry, position, color = 0x111827, opacity = 0.72) {
    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        edgeMaterial(color, opacity)
    );
    edges.position.copy(position);
    group.add(edges);
}

function addBoxMesh(group, size, color, opacity, position = new THREE.Vector3()) {
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    mesh.position.copy(position);
    group.add(mesh);
    return mesh;
}

function addBoxWithEdges(group, size, color, opacity, position, edgeColor = 0x111827, edgeOpacity = 0.56) {
    const mesh = addBoxMesh(group, size, color, opacity, position);
    addBoxEdges(group, mesh.geometry, mesh.position, edgeColor, edgeOpacity);
    return mesh;
}

function transformRicardArchPoint(point, mirrored = false) {
    const sourceX = mirrored ? (2 - point.x) : point.x;
    const sourceZ = mirrored ? (-point.z - 0.5) : point.z;

    return new THREE.Vector3(
        (sourceX - 1) * RICARD_OPENGL_UNIT * RICARD_ARCH_X_SCALE,
        point.y * RICARD_OPENGL_UNIT,
        sourceZ * RICARD_OPENGL_UNIT
    );
}

function createRicardBrickGeometry(points, mirrored = false) {
    const vertices = points.map(point => transformRicardArchPoint(point, mirrored));
    const quads = [
        [0, 1, 2, 3],
        [0, 4, 7, 1],
        [3, 2, 6, 5],
        [4, 5, 6, 7],
        [1, 7, 6, 2],
        [0, 3, 5, 4],
    ];
    const positions = [];

    quads.forEach(quad => {
        const triangles = [
            [quad[0], quad[1], quad[2]],
            [quad[0], quad[2], quad[3]],
        ];
        triangles.forEach(triangle => {
            triangle.forEach(index => {
                const vertex = vertices[index];
                positions.push(vertex.x, vertex.y, vertex.z);
            });
        });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function offsetRicardBrick(points, offset) {
    return points.map(point => ({
        x: point.x + (offset.x || 0),
        y: point.y + (offset.y || 0),
        z: point.z + (offset.z || 0),
    }));
}

function ricardBrickPoints(values) {
    const points = [];
    for (let index = 0; index < values.length; index += 3) {
        points.push({
            x: values[index],
            y: values[index + 1],
            z: values[index + 2],
        });
    }
    return points;
}

const RICARD_ARCH_BRICKS = [
    {offset: {y: 0}, points: ricardBrickPoints([
        0, 0, 0, 0, 0, -0.5, 0.25, 0, -0.5, 0.25, 0, 0,
        0, 0.4, 0, 0.25, 0.4, 0, 0.25, 0.4, -0.5, 0, 0.4, -0.5,
    ])},
    {offset: {y: 0.4}, points: ricardBrickPoints([
        0, 0, 0, 0, 0, -0.5, 0.25, 0, -0.5, 0.25, 0, 0,
        0, 0.4, 0, 0.25, 0.4, 0, 0.25, 0.4, -0.5, 0, 0.4, -0.5,
    ])},
    {offset: {y: 0.8}, points: ricardBrickPoints([
        0, 0, 0, 0, 0, -0.5, 0.25, 0, -0.5, 0.25, 0, 0,
        0, 0.4, 0, 0.25, 0.4, 0, 0.25, 0.4, -0.5, 0, 0.4, -0.5,
    ])},
    {offset: {y: 1.2}, points: ricardBrickPoints([
        0, 0, 0, 0, 0, -0.5, 0.25, 0, -0.5, 0.25, 0, 0,
        0.075, 0.4, 0, 0.325, 0.3, 0, 0.325, 0.3, -0.5, 0.075, 0.4, -0.5,
    ])},
    {offset: {y: 1.6}, points: ricardBrickPoints([
        0.075, 0, 0, 0.075, 0, -0.5, 0.325, -0.1, -0.5, 0.325, -0.1, 0,
        0.2, 0.35, 0, 0.425, 0.2, 0, 0.425, 0.2, -0.5, 0.2, 0.35, -0.5,
    ])},
    {offset: {y: 1.8}, points: ricardBrickPoints([
        0.2, 0.15, 0, 0.2, 0.15, -0.5, 0.425, 0, -0.5, 0.425, 0, 0,
        0.5, 0.5, 0, 0.6, 0.3, 0, 0.6, 0.3, -0.5, 0.5, 0.5, -0.5,
    ])},
    {offset: {y: 1.8}, points: ricardBrickPoints([
        0.5, 0.5, 0, 0.5, 0.5, -0.5, 0.6, 0.3, -0.5, 0.6, 0.3, 0,
        1.0, 0.7, 0, 1.0, 0.5, 0, 1.0, 0.5, -0.5, 1.0, 0.7, -0.5,
    ])},
];

export function createRicardArchModel({
    color = 0xfacc15,
    opacity = 0.9,
    outline = true,
} = {}) {
    const group = new THREE.Group();
    const brickMaterial = material(color, opacity);
    const lineMaterial = edgeMaterial(0x111827, 0.6);

    [false, true].forEach(mirrored => {
        RICARD_ARCH_BRICKS.forEach(brick => {
            const points = offsetRicardBrick(brick.points, brick.offset);
            const geometry = createRicardBrickGeometry(points, mirrored);
            const mesh = new THREE.Mesh(geometry, brickMaterial);
            group.add(mesh);

            if (outline) {
                group.add(new THREE.LineSegments(
                    new THREE.EdgesGeometry(geometry),
                    lineMaterial
                ));
            }
        });
    });

    group.userData.full3dKind = 'ricard-arch';
    group.userData.full3dBlockSize = {
        x: 2 * RICARD_ARCH_X_SCALE,
        y: 0.5,
        z: 2.5 * RICARD_OPENGL_UNIT / BLOCK_UNIT_GAME_SIZE.z,
    };
    group.userData.full3dSource = 'Ricard dibujar_arco/ladrillo_arco brick arch';
    return group;
}

export function createBrickPrismModel({
    width = BASIC_BLOCK_SCENE_SIZE.width,
    height = BASIC_BLOCK_SCENE_SIZE.height,
    depth = BASIC_BLOCK_SCENE_SIZE.depth,
    color = 0xb8b8b8,
    opacity = 0.94,
    outline = true,
} = {}) {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    mesh.position.y = height / 2;
    group.add(mesh);

    if (outline) {
        addBoxEdges(group, geometry, mesh.position, 0x1f2937, 0.7);
    }

    group.userData.full3dKind = 'brick-prism';
    group.userData.full3dSize = {width, height, depth};
    return group;
}

function createSpikeSlabModel() {
    const group = new THREE.Group();
    const slabSize = blockUnitsToSceneSize({x: 1, y: 1, z: 0.1});
    addBoxWithEdges(
        group,
        slabSize,
        0x374151,
        0.94,
        new THREE.Vector3(0, slabSize.height / 2, 0),
        0x94a3b8,
        0.5
    );

    [
        {x: -0.32, z: -0.28, height: 0.42, radius: 0.08},
        {x: 0.18, z: -0.33, height: 0.56, radius: 0.1},
        {x: 0.36, z: 0.12, height: 0.38, radius: 0.075},
        {x: -0.1, z: 0.28, height: 0.48, radius: 0.085},
        {x: -0.36, z: 0.2, height: 0.34, radius: 0.07},
        {x: 0.06, z: 0.0, height: 0.62, radius: 0.105},
    ].forEach(spike => {
        const spikeHeight = blockUnitsToSceneSize({z: spike.height}).height;
        const spikeRadius = blockUnitsToSceneSize({x: spike.radius}).width;
        const mesh = new THREE.Mesh(
            new THREE.ConeGeometry(spikeRadius, spikeHeight, 18),
            material(0x9ca3af, 0.98)
        );
        mesh.position.set(
            spike.x * slabSize.width,
            slabSize.height + spikeHeight / 2,
            spike.z * slabSize.depth
        );
        group.add(mesh);
    });

    group.userData.full3dKind = 'spike-slab';
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 0.1};
    group.userData.full3dSource = 'spike block sprite, 1 x 1 x 0.1 slab with upward cone spikes';
    return group;
}

function createSphereModel(kind, color, radius) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 12),
        material(color, 0.96)
    );
    mesh.position.y = Math.max(radius, RICARD_OPENGL_UNIT * 0.125);
    group.add(mesh);
    group.userData.full3dKind = kind;
    return group;
}

function createBlockUnitSphereModel(kind, color, scale = {x: 1, y: 1, z: 1}) {
    const size = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
    const radius = Math.min(size.width, size.height, size.depth) / 2;
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        material(color, 0.96)
    );
    mesh.scale.set(scale.x, scale.y, scale.z);
    mesh.position.y = radius * scale.y;
    group.add(mesh);
    group.userData.full3dKind = kind;
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 1};
    group.userData.full3dSphereRadius = radius;
    group.userData.full3dSphereScale = {...scale};
    return group;
}

function createRoundedRockGeometry(width, height, depth, radius) {
    const geometry = new THREE.BoxGeometry(width, height, depth, 5, 4, 5);
    const position = geometry.attributes.position;
    const half = new THREE.Vector3(width / 2, height / 2, depth / 2);
    const inner = new THREE.Vector3(
        Math.max(0.01, half.x - radius),
        Math.max(0.01, half.y - radius),
        Math.max(0.01, half.z - radius)
    );
    const vertex = new THREE.Vector3();
    const anchor = new THREE.Vector3();
    const offset = new THREE.Vector3();

    for (let index = 0; index < position.count; index++) {
        vertex.fromBufferAttribute(position, index);
        anchor.set(
            THREE.MathUtils.clamp(vertex.x, -inner.x, inner.x),
            THREE.MathUtils.clamp(vertex.y, -inner.y, inner.y),
            THREE.MathUtils.clamp(vertex.z, -inner.z, inner.z)
        );
        offset.copy(vertex).sub(anchor);
        if (offset.lengthSq() > 0.0001) {
            offset.normalize().multiplyScalar(radius);
            vertex.copy(anchor).add(offset);
        }
        const roughness = 1 + 0.035 * Math.sin(index * 5.17);
        vertex.x *= roughness;
        vertex.y *= 1 + 0.025 * Math.sin(index * 3.41 + 0.4);
        vertex.z *= 1 + 0.035 * Math.cos(index * 4.73);
        position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function addRockCrack(group, points, color = 0x111827) {
    const positions = [];
    for (let index = 0; index < points.length - 1; index++) {
        positions.push(
            points[index].x, points[index].y, points[index].z,
            points[index + 1].x, points[index + 1].y, points[index + 1].z
        );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    group.add(new THREE.LineSegments(geometry, edgeMaterial(color, 0.82)));
}

function createRockBlockModel() {
    const size = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
    const group = new THREE.Group();
    const geometry = createRoundedRockGeometry(
        size.width * 0.94,
        size.height * 0.9,
        size.depth * 0.94,
        Math.min(size.width, size.height, size.depth) * 0.18
    );
    const mesh = new THREE.Mesh(geometry, material(0x7f858d, 0.96));
    mesh.position.y = size.height * 0.45;
    group.add(mesh);
    group.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 38),
        edgeMaterial(0x1f2937, 0.42)
    ));
    group.children[group.children.length - 1].position.copy(mesh.position);

    const bumpMaterial = material(0x9aa0a8, 0.82);
    [
        {position: [-0.28, 0.82, -0.22], scale: [0.12, 0.05, 0.1]},
        {position: [0.22, 0.7, 0.3], scale: [0.1, 0.045, 0.13]},
        {position: [-0.4, 0.42, 0.22], scale: [0.075, 0.055, 0.1]},
        {position: [0.36, 0.36, -0.3], scale: [0.08, 0.05, 0.075]},
    ].forEach(bump => {
        const meshBump = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bumpMaterial);
        meshBump.position.set(
            bump.position[0] * size.width,
            bump.position[1] * size.height,
            bump.position[2] * size.depth
        );
        meshBump.scale.set(
            bump.scale[0] * size.width,
            bump.scale[1] * size.height,
            bump.scale[2] * size.depth
        );
        group.add(meshBump);
    });

    addRockCrack(group, [
        new THREE.Vector3(-size.width * 0.28, size.height * 0.91, -size.depth * 0.18),
        new THREE.Vector3(-size.width * 0.06, size.height * 0.94, -size.depth * 0.05),
        new THREE.Vector3(size.width * 0.18, size.height * 0.9, size.depth * 0.06),
        new THREE.Vector3(size.width * 0.31, size.height * 0.88, size.depth * 0.24),
    ]);
    addRockCrack(group, [
        new THREE.Vector3(size.width * 0.47, size.height * 0.58, -size.depth * 0.2),
        new THREE.Vector3(size.width * 0.49, size.height * 0.43, -size.depth * 0.02),
        new THREE.Vector3(size.width * 0.46, size.height * 0.28, size.depth * 0.18),
    ]);

    group.userData.full3dKind = 'rock-block';
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 1};
    group.userData.full3dSource = 'rock sprite, rounded block with bumps and crack lines';
    return group;
}

function createSpikeBallModel() {
    const size = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
    const radius = Math.min(size.width, size.height, size.depth) / 2;
    const group = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = radius;
    group.add(inner);

    inner.add(new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        material(0xef4444, 0.96)
    ));

    const baseAxis = new THREE.Vector3(0, 1, 0);
    const directions = [
        [1, 0, 0],
        [-1, 0.08, 0.02],
        [0, 0.12, 1],
        [0.04, 0.02, -1],
        [0.38, 0.82, 0.34],
        [-0.5, 0.72, -0.28],
        [0.58, 0.42, -0.7],
        [-0.62, 0.32, 0.62],
        [0.26, -0.18, 0.95],
        [-0.34, -0.16, -0.92],
    ];

    directions.forEach((values, index) => {
        const direction = new THREE.Vector3(...values).normalize();
        const spikeHeight = radius * (0.32 + (index % 3) * 0.05);
        const spikeRadius = radius * (0.09 + (index % 2) * 0.02);
        const mesh = new THREE.Mesh(
            new THREE.ConeGeometry(spikeRadius, spikeHeight, 14),
            material(0xfca5a5, 0.96)
        );
        mesh.quaternion.setFromUnitVectors(baseAxis, direction);
        mesh.position.copy(direction).multiplyScalar(radius + spikeHeight / 2);
        inner.add(mesh);
    });

    group.userData.full3dKind = 'spike-ball';
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 1};
    group.userData.full3dSource = 'spike ball sprite, 1 block-unit sphere with radial cone spikes';
    return group;
}

function portcullisBlockUnitsFromRecord(dimensions) {
    if (
        dimensions
        && Number.isFinite(dimensions.x)
        && Number.isFinite(dimensions.y)
        && dimensions.x < dimensions.y
    ) {
        return {x: 0.1, y: 2, z: 2};
    }

    return {x: 2, y: 0.1, z: 2};
}

function createPortcullisModel(dimensions) {
    const blockUnits = portcullisBlockUnitsFromRecord(dimensions);
    const size = blockUnitsToSceneSize(blockUnits);
    const group = new THREE.Group();
    const color = 0x38bdf8;
    const opacity = 0.88;
    const thinX = blockUnits.x < blockUnits.y;
    const barThickness = blockUnitsToSceneSize({x: 0.1, y: 0.1, z: 0.1}).width;
    const verticalBarSize = thinX
        ? {width: size.width, height: size.height * 0.94, depth: barThickness}
        : {width: barThickness, height: size.height * 0.94, depth: size.depth};
    const railSize = thinX
        ? {width: size.width, height: barThickness, depth: size.depth}
        : {width: size.width, height: barThickness, depth: size.depth};

    for (let i = 0; i < 5; i++) {
        const t = i / 4 - 0.5;
        const position = new THREE.Vector3(
            thinX ? 0 : t * size.width * 0.76,
            verticalBarSize.height / 2,
            thinX ? t * size.depth * 0.76 : 0
        );
        addBoxMesh(group, verticalBarSize, color, opacity, position);
    }

    [0.22, 0.78].forEach(heightFactor => {
        const rail = addBoxMesh(group, railSize, color, opacity);
        rail.position.y = size.height * heightFactor;
    });

    group.userData.full3dKind = 'portcullis';
    group.userData.full3dBlockSize = blockUnits;
    return group;
}

function createPushableTableModel() {
    const group = new THREE.Group();
    const topSize = blockUnitsToSceneSize({x: 0.94, y: 1.42, z: 0.16});
    const legSize = blockUnitsToSceneSize({x: 0.12, y: 0.12, z: 0.78});
    const footSize = blockUnitsToSceneSize({x: 0.18, y: 0.18, z: 0.06});
    const topCenterY = legSize.height + topSize.height / 2;
    const legInset = blockUnitsToSceneSize({x: 0.34, y: 0.59});
    const wood = 0x8b5a2b;
    const darkWood = 0x5f3a1d;

    addBoxWithEdges(
        group,
        topSize,
        wood,
        0.96,
        new THREE.Vector3(0, topCenterY, 0)
    );

    [-1, 1].forEach(xSign => {
        [-1, 1].forEach(zSign => {
            addBoxWithEdges(
                group,
                legSize,
                darkWood,
                0.96,
                new THREE.Vector3(
                    xSign * legInset.width,
                    legSize.height / 2,
                    zSign * legInset.depth
                )
            );
            addBoxWithEdges(
                group,
                footSize,
                darkWood,
                0.9,
                new THREE.Vector3(
                    xSign * legInset.width,
                    footSize.height / 2,
                    zSign * legInset.depth
                ),
                0x111827,
                0.42
            );
        });
    });

    group.userData.full3dKind = 'pushable-table';
    group.userData.full3dBlockSize = {x: 1, y: 1.5, z: 1};
    return group;
}

function createPushableChestModel() {
    const group = new THREE.Group();
    const bodySize = blockUnitsToSceneSize({x: 1.42, y: 0.86, z: 0.72});
    const lidSize = blockUnitsToSceneSize({x: 1.48, y: 0.9, z: 0.22});
    const bandSize = blockUnitsToSceneSize({x: 0.12, y: 0.94, z: 0.22});
    const latchSize = blockUnitsToSceneSize({x: 0.2, y: 0.04, z: 0.16});
    const bodyColor = 0x9a6a35;
    const lidColor = 0x7c4a24;
    const metalColor = 0xd4af37;

    addBoxWithEdges(
        group,
        bodySize,
        bodyColor,
        0.96,
        new THREE.Vector3(0, bodySize.height / 2, 0)
    );

    addBoxWithEdges(
        group,
        lidSize,
        lidColor,
        0.96,
        new THREE.Vector3(0, bodySize.height + lidSize.height / 2, 0)
    );

    [-0.4, 0.4].forEach(xBlockOffset => {
        addBoxWithEdges(
            group,
            bandSize,
            metalColor,
            0.92,
            new THREE.Vector3(
                blockUnitsToSceneSize({x: xBlockOffset}).width,
                bodySize.height + lidSize.height * 0.45,
                0
            ),
            0x4b5563,
            0.38
        );
    });

    addBoxWithEdges(
        group,
        latchSize,
        metalColor,
        0.96,
        new THREE.Vector3(
            0,
            bodySize.height * 0.62,
            bodySize.depth / 2 + latchSize.depth / 2 + 0.04
        ),
        0x4b5563,
        0.44
    );

    group.userData.full3dKind = 'pushable-chest';
    group.userData.full3dBlockSize = {x: 1.5, y: 1, z: 1};
    return group;
}

function createFireModel(firstColor, secondColor) {
    const group = new THREE.Group();
    const radius = RICARD_OPENGL_UNIT * 0.1;
    const y = Math.max(radius, RICARD_OPENGL_UNIT * 0.125);
    const first = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 8),
        material(firstColor, 0.96)
    );
    first.position.y = y;
    group.add(first);

    const second = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 8),
        material(secondColor, 0.96)
    );
    second.position.set(0, y, RICARD_OPENGL_UNIT * 0.1);
    group.add(second);
    group.userData.full3dKind = 'fire';
    return group;
}

function createRhombusQuadGeometry(width, height) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, height / 2, 0,
        width / 2, 0, 0,
        0, -height / 2, 0,
        -width / 2, 0, 0,
    ], 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function createRepellingSpellModel(spriteId) {
    const id = normalizedSpriteId(spriteId);
    const distribution = REPELLING_SPELL_DISTRIBUTIONS.get(id)
        || REPELLING_SPELL_DISTRIBUTIONS.get(0xa5);
    const size = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
    const base = Math.min(size.width, size.height, size.depth);
    const group = new THREE.Group();
    const fillMaterial = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
    });
    const lineMaterial = edgeMaterial(0xfca5a5, 0.82);

    distribution.forEach((diamond, index) => {
        const width = base * diamond.size * REPELLING_SPELL_RHOMBUS_SCALE * (index % 2 === 0 ? 1.25 : 1.0);
        const height = base * diamond.size * REPELLING_SPELL_RHOMBUS_SCALE * (index % 3 === 0 ? 0.9 : 1.2);
        const geometry = createRhombusQuadGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, fillMaterial);
        mesh.position.set(
            diamond.x * size.width,
            diamond.y * size.height,
            diamond.z * size.depth
        );
        mesh.rotation.set(diamond.rx, diamond.ry, diamond.rz);
        group.add(mesh);

        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial);
        outline.position.copy(mesh.position);
        outline.rotation.copy(mesh.rotation);
        group.add(outline);
    });

    group.userData.full3dKind = 'repelling-spell';
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 1};
    group.userData.full3dSource = 'repelling spell sprite, fixed rhombus quad distribution selected by sprite id';
    group.userData.full3dDistributionSpriteId = id;
    return group;
}

function createSpellCycleBubbleModel(spriteId) {
    const id = normalizedSpriteId(spriteId);
    const phase = Math.max(0, Math.min(3, id - 0xa0));
    const size = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
    const base = Math.min(size.width, size.height, size.depth);
    const group = new THREE.Group();
    const bubbleMaterial = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
    });
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
    });
    const outlineMaterial = edgeMaterial(0xe0f2fe, 0.55);
    const seeds = [
        {x: -0.34, y: 0.18, z: -0.24, size: 0.22},
        {x: 0.12, y: 0.14, z: 0.28, size: 0.16},
        {x: 0.36, y: 0.25, z: -0.02, size: 0.13},
        {x: -0.12, y: 0.34, z: 0.1, size: 0.24},
        {x: 0.28, y: 0.46, z: 0.34, size: 0.15},
        {x: -0.42, y: 0.5, z: 0.28, size: 0.12},
        {x: 0.02, y: 0.58, z: -0.34, size: 0.2},
        {x: -0.24, y: 0.72, z: -0.08, size: 0.17},
        {x: 0.4, y: 0.78, z: -0.28, size: 0.11},
        {x: 0.08, y: 0.88, z: 0.18, size: 0.19},
    ];

    seeds.forEach((seed, index) => {
        const shift = ((phase + index) % 4) - 1.5;
        const radius = base * seed.size * SPELL_CYCLE_BUBBLE_SCALE * (0.78 + phase * 0.09);
        const geometry = new THREE.SphereGeometry(radius, 16, 10);
        const bubble = new THREE.Mesh(geometry, bubbleMaterial);
        bubble.position.set(
            THREE.MathUtils.clamp(seed.x + shift * 0.045, -0.45, 0.45) * size.width,
            THREE.MathUtils.clamp(seed.y + phase * 0.035 - (index % 3) * 0.018, 0.08, 0.94) * size.height,
            THREE.MathUtils.clamp(seed.z - shift * 0.04, -0.45, 0.45) * size.depth
        );
        group.add(bubble);

        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outlineMaterial);
        outline.position.copy(bubble.position);
        group.add(outline);

        if (index % 3 === phase % 3) {
            const highlight = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 0.22, 10, 6),
                highlightMaterial
            );
            highlight.position.copy(bubble.position);
            highlight.position.x -= radius * 0.32;
            highlight.position.y += radius * 0.34;
            highlight.position.z += radius * 0.18;
            group.add(highlight);
        }
    });

    group.userData.full3dKind = 'spell-cycle-bubbles';
    group.userData.full3dBlockSize = {x: 1, y: 1, z: 1};
    group.userData.full3dSource = 'spell cycle sprite, fixed translucent bubble distribution selected by sprite id';
    group.userData.full3dDistributionSpriteId = id;
    return group;
}

function createGargoyleProxyModel() {
    const group = new THREE.Group();
    const radius = RICARD_OPENGL_UNIT * 0.1;
    const offsets = [
        [0, 0, 0],
        [0, RICARD_OPENGL_UNIT * 0.1, 0],
        [0, RICARD_OPENGL_UNIT * 0.2, 0],
        [RICARD_OPENGL_UNIT * 0.1, RICARD_OPENGL_UNIT * 0.3, 0],
    ];

    offsets.forEach(offset => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 12, 8),
            material(0x86a886, 0.96)
        );
        mesh.position.set(offset[0], RICARD_OPENGL_UNIT * 0.125 + offset[1], offset[2]);
        group.add(mesh);
    });

    group.userData.full3dKind = 'gargoyle-proxy';
    return group;
}

function createFallbackOutlineModel(dimensions) {
    const size = sceneSizeFromRecordDimensions(dimensions, BASIC_BLOCK_SCENE_SIZE);
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        edgeMaterial(0xe5e7eb, 0.72)
    );
    edges.position.y = size.height / 2;
    group.add(edges);
    group.userData.full3dKind = 'fallback-outline';
    group.userData.full3dSize = size;
    return group;
}

export function createFull3DObjectModel(spriteId, opts = {}) {
    const id = normalizedSpriteId(spriteId);
    if (id === null) return null;

    if (BLOCK_SPRITE_IDS.has(id)) {
        const object = createBrickPrismModel({
            ...BASIC_BLOCK_SCENE_SIZE,
            color: 0xb8b8b8,
            opacity: 0.94,
            outline: true,
        });
        object.userData.full3dKind = 'block';
        object.userData.full3dGameSize = BASIC_BLOCK_GAME_SIZE;
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'Ricard dibujarObjeto block brick, mapped to game XYZ 8 x 8 x 6';
        return object;
    }

    if (id === 0x17) {
        const object = createSpikeSlabModel();
        object.userData.full3dRecognized = true;
        return object;
    }

    if (ROCK_SPRITE_IDS.has(id)) {
        const object = createRockBlockModel();
        object.userData.full3dRecognized = true;
        return object;
    }

    if (PORTCULLIS_SPRITE_IDS.has(id)) {
        const object = createPortcullisModel(opts.dimensions);
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'portcullis sprite, 2 x 0.1 x 2 or 0.1 x 2 x 2 block units';
        return object;
    }

    if (TABLE_SPRITE_IDS.has(id)) {
        const object = createPushableTableModel();
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'pushable table sprite, one-block footprint model';
        return object;
    }

    if (CHEST_SPRITE_IDS.has(id)) {
        const object = createPushableChestModel();
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'pushable chest sprite, one-block footprint model';
        return object;
    }

    if (id === 0x3f) {
        const object = createSpikeBallModel();
        object.userData.full3dRecognized = true;
        return object;
    }

    if (YELLOW_RED_FIRE_SPRITE_IDS.has(id)) {
        const object = createFireModel(0xfacc15, 0xef4444);
        object.userData.full3dRecognized = true;
        return object;
    }

    if (RED_YELLOW_FIRE_SPRITE_IDS.has(id)) {
        const object = createFireModel(0xef4444, 0xfacc15);
        object.userData.full3dRecognized = true;
        return object;
    }

    if (SPELL_CYCLE_SPRITE_IDS.has(id)) {
        const object = createSpellCycleBubbleModel(id);
        object.userData.full3dRecognized = true;
        return object;
    }

    if (REPELLING_SPELL_SPRITE_IDS.has(id)) {
        const object = createRepellingSpellModel(id);
        object.userData.full3dRecognized = true;
        return object;
    }

    if (ROUND_GREEN_BALL_SPRITE_IDS.has(id)) {
        const object = createBlockUnitSphereModel('green-ball', 0x22c55e);
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'ball sprite, 1 block-unit diameter sphere';
        return object;
    }

    if (BOUNCING_GREEN_BALL_SPRITE_IDS.has(id)) {
        const object = createBlockUnitSphereModel(
            'green-ball-bouncing-frame',
            0x22c55e,
            {x: 26 / 24, y: 18 / 19, z: 26 / 24}
        );
        object.userData.full3dRecognized = true;
        object.userData.full3dSource = 'ball bounce-frame sprite, static 24 x 18 model selected by sprite id';
        return object;
    }

    if (id === 0x16) {
        const object = createGargoyleProxyModel();
        object.userData.full3dRecognized = true;
        return object;
    }

    const fallback = createFallbackOutlineModel(opts.dimensions);
    fallback.userData.full3dRecognized = false;
    return fallback;
}

export function disposeFull3DObjectModel(object) {
    if (!object) return;

    const disposedMaps = new Set();
    object.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];
            materials.forEach(childMaterial => {
                if (childMaterial.map && !disposedMaps.has(childMaterial.map)) {
                    childMaterial.map.dispose();
                    disposedMaps.add(childMaterial.map);
                }
                childMaterial.dispose();
            });
        }
    });
}
