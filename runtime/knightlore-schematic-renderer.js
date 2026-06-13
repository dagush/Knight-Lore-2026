import * as THREE from 'three';
import { blockUnitsToSceneSize } from './knightlore-full3d-objects.js';

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
const SCHEMATIC_DOOR_SIZE = blockUnitsToSceneSize({x: 1.82, y: 0.1, z: 3});
const PORTCULLIS_PANEL_SIZE = blockUnitsToSceneSize({x: 2, y: 0.1, z: 2});
const PORTCULLIS_BAR_WIDTH = blockUnitsToSceneSize({x: 0.1, y: 0.1, z: 0.1}).width;

const FIXED_BACKGROUND_MARKERS = {
    0x12: {
        label: 'wizard',
        color: 0xa855f7,
        opacity: 0.76,
        fallbackSize: {width: 8, height: 18, depth: 8},
    },
    0x13: {
        label: 'cauldron',
        color: 0x14b8a6,
        opacity: 0.82,
        fallbackSize: {width: 12, height: 10, depth: 12},
    },
};
const LIVE_FIXED_BACKGROUND_IDS = new Set([0x12]);

function backgroundDebugColor(background) {
    return BACKGROUND_DEBUG_COLORS[background.category] || BACKGROUND_DEBUG_COLORS['unknown-background'];
}

function createBackgroundMaterial(color, opacity = 0.78) {
    return new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: opacity < 1,
        side: THREE.DoubleSide,
        depthWrite: opacity >= 1,
    });
}

function fixedBackgroundMarker(background) {
    return FIXED_BACKGROUND_MARKERS[background.id] || {
        label: background.label || 'fixed background',
        color: backgroundDebugColor(background),
        opacity: 0.72,
        fallbackSize: {width: 9, height: 12, depth: 9},
    };
}

export class KnightLoreSchematicBackgroundRenderer {
    constructor(group) {
        this.group = group;
        this.roomDimensions = {width: 64, depth: 64, height: 64};
        this.roomColor = 0x7dd3fc;
        this.mapPosition = null;
    }

    render(backgrounds, opts = {}) {
        this.roomDimensions = opts.roomDimensions || this.roomDimensions;
        this.roomColor = Number.isFinite(opts.roomColor) ? opts.roomColor : this.roomColor;
        this.mapPosition = opts.mapPosition || null;

        (backgrounds || []).forEach((background, index) => {
            this.addStaticBackground(background, index);
        });
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
        this.group.add(group);
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
        this.group.add(group);
    }

    addOpeningFrame(background, index, withBars = false) {
        if (withBars && this.addMappedPortcullisRecords(background)) {
            return;
        }

        if (!background.side) return;

        const color = withBars ? backgroundDebugColor(background) : this.roomColor;
        const group = this.createSideGroup(background.side, index);
        if (background.category === 'high-arch') {
            group.position.y += this.highArchVerticalOffset(background);
            group.userData.highArchVerticalOffset = group.position.y;
        }

        const openingSize = withBars ? PORTCULLIS_PANEL_SIZE : SCHEMATIC_DOOR_SIZE;
        this.addSchematicOpeningPanel(group, {
            width: openingSize.width,
            height: openingSize.height,
            depth: openingSize.depth,
            color,
            opacity: withBars ? 0.82 : 1,
            withBars,
            withBase: background.category === 'high-arch-base',
        });

        group.userData.backgroundId = background.id;
        group.userData.backgroundCategory = background.category;
        this.group.add(group);
    }

    highArchVerticalOffset(background) {
        const records = Array.isArray(background.records) ? background.records : [];
        const sceneYs = records
            .map(record => (this.mapPosition ? this.mapPosition(record.position) : null))
            .filter(position => position && position.vector && Number.isFinite(position.vector.y))
            .map(position => position.vector.y);

        return sceneYs.length > 0 ? Math.min(...sceneYs) : 0;
    }

    addSchematicOpeningPanel(group, {
        width,
        height,
        depth,
        color,
        opacity = 0.82,
        withBars = false,
        withBase = false,
    }) {
        const thickness = PORTCULLIS_BAR_WIDTH;

        const left = this.createDebugBox(thickness, height, depth, color, opacity);
        left.position.set(-width / 2, height / 2, 0);
        group.add(left);

        const right = this.createDebugBox(thickness, height, depth, color, opacity);
        right.position.set(width / 2, height / 2, 0);
        group.add(right);

        const top = this.createDebugBox(width + thickness, thickness, depth, color, opacity);
        top.position.set(0, height, 0);
        group.add(top);

        if (withBase) {
            const base = this.createDebugBox(width + thickness, thickness, depth, color, Math.min(opacity, 0.74));
            base.position.set(0, thickness / 2, 0);
            group.add(base);
        }

        if (!withBars) return;

        const barCount = 5;
        for (let i = 0; i < barCount; i++) {
            const x = -width * 0.38 + (width * 0.76) * (i / (barCount - 1));
            const bar = this.createDebugBox(PORTCULLIS_BAR_WIDTH, height * 0.94, depth + 0.2, color, 0.9);
            bar.position.set(x, height * 0.47, 0.35);
            group.add(bar);
        }
        [0.22, 0.78].forEach(heightFactor => {
            const rail = this.createDebugBox(width, PORTCULLIS_BAR_WIDTH, depth + 0.25, color, 0.9);
            rail.position.set(0, height * heightFactor, 0.38);
            group.add(rail);
        });
    }

    addMappedPortcullisRecords(background) {
        if (!this.mapPosition || !Array.isArray(background.records) || background.records.length === 0) {
            return false;
        }

        const color = backgroundDebugColor(background);
        const group = new THREE.Group();

        background.records.forEach((record, recordIndex) => {
            const position = this.mapPosition(record.position);
            if (!position) return;

            const thinX = record.dimensions
                && Number.isFinite(record.dimensions.x)
                && Number.isFinite(record.dimensions.y)
                && record.dimensions.x < record.dimensions.y;
            const width = thinX ? PORTCULLIS_PANEL_SIZE.depth : PORTCULLIS_PANEL_SIZE.width;
            const depth = thinX ? PORTCULLIS_PANEL_SIZE.width : PORTCULLIS_PANEL_SIZE.depth;
            const panel = new THREE.Group();
            this.addSchematicOpeningPanel(panel, {
                width,
                height: PORTCULLIS_PANEL_SIZE.height,
                depth,
                color,
                opacity: 0.86,
                withBars: true,
                withBase: false,
            });
            panel.position.copy(position.vector);
            panel.userData.backgroundId = background.id;
            panel.userData.backgroundCategory = background.category;
            panel.userData.backgroundRecordIndex = recordIndex;
            panel.userData.liveDynamicSource = Boolean(record.liveDynamicSource);
            group.add(panel);
        });

        if (group.children.length === 0) return false;

        group.userData.backgroundId = background.id;
        group.userData.backgroundCategory = background.category;
        this.group.add(group);
        return true;
    }

    addMappedStaticRecordBoxes(background) {
        if (!this.mapPosition || !Array.isArray(background.records) || background.records.length === 0) {
            return false;
        }

        const color = backgroundDebugColor(background);
        const group = new THREE.Group();

        background.records.forEach((record, recordIndex) => {
            const position = this.mapPosition(record.position);
            if (!position) return;

            const width = Math.max(1, (record.dimensions.x || 8) / 2);
            const depth = Math.max(1, (record.dimensions.y || 8) / 2);
            const height = Math.max(1, (record.dimensions.z || 6) / 2);
            const box = this.createDebugBox(width, height, depth, color, 0.74);
            box.position.copy(position.vector);
            box.position.y += height / 2;
            box.userData.backgroundId = background.id;
            box.userData.backgroundCategory = background.category;
            box.userData.backgroundRecordIndex = recordIndex;
            box.userData.spriteId = record.spriteId;
            group.add(box);
        });

        if (group.children.length === 0) return false;

        group.userData.backgroundId = background.id;
        group.userData.backgroundCategory = background.category;
        this.group.add(group);
        return true;
    }

    addFixedBackgroundMarker(background, index) {
        const markerInfo = fixedBackgroundMarker(background);
        const group = new THREE.Group();
        const records = Array.isArray(background.records) ? background.records : [];
        const fallbackSize = markerInfo.fallbackSize;
        const forceRoomCenter = background.id === 0x13;

        records.forEach((record, recordIndex) => {
            const position = forceRoomCenter
                ? {vector: new THREE.Vector3(0, 0, 0)}
                : (this.mapPosition ? this.mapPosition(record.position) : null);
            if (!position) return;

            const width = Math.max(3, (record.dimensions.x || record.dimensions.width || fallbackSize.width) / 2);
            const depth = Math.max(3, (record.dimensions.y || record.dimensions.depth || fallbackSize.depth) / 2);
            const height = Math.max(3, (record.dimensions.z || record.dimensions.height || fallbackSize.height) / 2);
            const recordMesh = this.createDebugBox(width, height, depth, markerInfo.color, markerInfo.opacity);
            recordMesh.position.copy(position.vector);
            recordMesh.position.y += height / 2;
            recordMesh.userData.backgroundId = background.id;
            recordMesh.userData.backgroundLabel = markerInfo.label;
            recordMesh.userData.backgroundRecordIndex = recordIndex;
            if (forceRoomCenter) recordMesh.userData.cauldronPlacement = 'room-center';
            group.add(recordMesh);
        });

        if (group.children.length === 0) {
            const fallbackMarker = this.createDebugBox(
                fallbackSize.width,
                fallbackSize.height,
                fallbackSize.depth,
                markerInfo.color,
                markerInfo.opacity
            );
            fallbackMarker.position.set(
                forceRoomCenter ? 0 : (index % 3 - 1) * 11,
                fallbackSize.height / 2,
                forceRoomCenter ? 0 : (Math.floor(index / 3) % 3 - 1) * 11
            );
            fallbackMarker.userData.backgroundId = background.id;
            fallbackMarker.userData.backgroundLabel = markerInfo.label;
            if (forceRoomCenter) fallbackMarker.userData.cauldronPlacement = 'room-center';
            group.add(fallbackMarker);
        }

        group.userData.backgroundId = background.id;
        group.userData.backgroundLabel = markerInfo.label;
        this.group.add(group);
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
                this.addOpeningFrame(background, index, false);
                break;
            case 'high-arch-base':
                if (!this.addMappedStaticRecordBoxes(background)) {
                    this.addSidePatch(background, index);
                }
                break;
            case 'portcullis':
                this.addOpeningFrame(background, index, true);
                break;
            case 'tree-filler':
                this.addSidePatch(background, index);
                break;
            case 'fixed-background':
                if (!LIVE_FIXED_BACKGROUND_IDS.has(background.id)) {
                    this.addFixedBackgroundMarker(background, index);
                }
                break;
            default:
                this.addSidePatch(background, index);
                break;
        }
    }
}
