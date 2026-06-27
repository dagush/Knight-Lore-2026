import * as THREE from 'three';
import {
    expandKnightLoreSpriteTexture,
    getKnightLoreSpriteTexture,
} from './knightlore.js';
import {
    blockUnitsToSceneSize,
    createCauldronModel,
    createFull3DObjectModel,
    createRicardArchModel,
} from './knightlore-full3d-objects.js';
import {
    RICARD_WALL_TEXTURE_DEWARP_SOURCE,
    createBinaryWallTextureCanvas,
    createIsometricSlopeCorrectedCanvas,
    isometricTextureShearSlopeForSpriteId,
    ricardWallTextureFamilyFromSpriteId,
} from './knightlore-wall-dewarp.js';

const SPECTRUM_NORMAL_COLORS = [
    0x000000,
    0x0000d7,
    0xd70000,
    0xd700d7,
    0x00d700,
    0x00d7d7,
    0xd7d700,
    0xd7d7d7,
];
const SPECTRUM_BRIGHT_COLORS = [
    0x000000,
    0x0000ff,
    0xff0000,
    0xff00ff,
    0x00ff00,
    0x00ffff,
    0xffff00,
    0xffffff,
];

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

export const SPRITE_TEXTURE_VERTICAL_FLIP_IDS = new Set([
    0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    0x04, 0x05,
    0x80, 0x81, 0x82,
]);
export const TEXTURED_WALL_SPRITE_IDS = new Set([
    0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);
export const TEXTURED_WOODEN_ENTRANCE_SPRITE_IDS = new Set([0x04, 0x05]);
export const TEXTURED_WOODEN_WALL_SPRITE_IDS = new Set([0x80, 0x81, 0x82]);
export const TEXTURED_BACKGROUND_SPRITE_IDS = new Set([
    ...TEXTURED_WALL_SPRITE_IDS,
    ...TEXTURED_WOODEN_ENTRANCE_SPRITE_IDS,
    ...TEXTURED_WOODEN_WALL_SPRITE_IDS,
]);

const PORTCULLIS_PANEL_SIZE = blockUnitsToSceneSize({x: 2, y: 0.1, z: 2});
const PORTCULLIS_BAR_WIDTH = blockUnitsToSceneSize({x: 0.1, y: 0.1, z: 0.1}).width;
const TEXTURED_BACKGROUND_WALL_OFFSET = 0.28;
const TEXTURED_BACKGROUND_QUAD_SCALE = 1.05;
const ARCH_OUTWARD_OFFSET_FALLBACK = 2;
const ARCH_EXTRA_OUTWARD_OFFSET = blockUnitsToSceneSize({x: 0.2}).width;
const WALL_TEXTURE_LEFT_REGISTRATION_OFFSET = 2;
const EXTRA_WALL_TEXTURE_LEFT_REGISTRATION_OFFSETS = new Map([
    [0x0a, WALL_TEXTURE_LEFT_REGISTRATION_OFFSET * 2],
]);
const UPPER_WALL_F_VERTICAL_OFFSET = 2;
const DEFAULT_WALL_TEXTURE_DEWARP_SCALE = 1;
const DEFAULT_WALL_TEXTURE_DEWARP_ENABLED = true;
const DEFAULT_WALL_TEXTURE_BINARY_THRESHOLD = 141;
const TALL_WALL_TEXTURE_QUAD_SCALE = 0.8;
const WOODEN_TEXTURE_ASPECT_RATIO = 16 / 48;
const WOODEN_TEXTURE_TARGET_HEIGHT = 48;
const CAULDRON_BROTH_SPRITE_ID = 0x8e;
const CAULDRON_BROTH_VERTICAL_STRETCH = 2.35;
const LIVE_FIXED_BACKGROUND_IDS = new Set([0x12]);
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

function spectrumPaletteForAttribute(value) {
    return value & 0x40 ? SPECTRUM_BRIGHT_COLORS : SPECTRUM_NORMAL_COLORS;
}

function spectrumInkColorFromAttribute(value) {
    if (value === null || value === undefined) return 0x00d7d7;
    return spectrumPaletteForAttribute(value)[value & 0x07];
}

function spectrumPaperColorFromAttribute(value) {
    if (value === null || value === undefined) return 0x000000;
    return spectrumPaletteForAttribute(value)[(value >> 3) & 0x07];
}

function rgbFromHexColor(color) {
    return {
        r: (color >> 16) & 0xff,
        g: (color >> 8) & 0xff,
        b: color & 0xff,
    };
}

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

function normalizedSpriteId(spriteId) {
    return Number.isFinite(spriteId) ? spriteId & 0xff : null;
}

function isTexturedBackgroundSprite(spriteId) {
    const id = normalizedSpriteId(spriteId);
    return id !== null && TEXTURED_BACKGROUND_SPRITE_IDS.has(id);
}

function isWoodenTextureSprite(spriteId) {
    const id = normalizedSpriteId(spriteId);
    return id !== null && (
        TEXTURED_WOODEN_ENTRANCE_SPRITE_IDS.has(id)
        || TEXTURED_WOODEN_WALL_SPRITE_IDS.has(id)
    );
}

function texturedBackgroundSpriteKind(spriteId) {
    const id = normalizedSpriteId(spriteId);
    if (TEXTURED_WALL_SPRITE_IDS.has(id)) return 'wall';
    if (TEXTURED_WOODEN_ENTRANCE_SPRITE_IDS.has(id)) return 'wooden entrance';
    if (TEXTURED_WOODEN_WALL_SPRITE_IDS.has(id)) return 'wooden wall';
    return 'unknown textured background';
}

function wallTextureAspectRatio(texture, spriteId) {
    const id = normalizedSpriteId(spriteId);
    if (isWoodenTextureSprite(id)) return WOODEN_TEXTURE_ASPECT_RATIO;
    if (
        id === null
        || !TEXTURED_WALL_SPRITE_IDS.has(id)
        || !texture
        || !Number.isFinite(texture.widthPixels)
        || !Number.isFinite(texture.heightPixels)
        || texture.heightPixels <= 0
    ) {
        return null;
    }

    return texture.widthPixels / texture.heightPixels;
}

function wallTextureQuadScale(spriteId, record = null) {
    const id = normalizedSpriteId(spriteId);
    if (isWoodenTextureSprite(id)) {
        const height = record && record.dimensions && Number.isFinite(record.dimensions.z)
            ? record.dimensions.z
            : 0;
        return height > 0 ? WOODEN_TEXTURE_TARGET_HEIGHT / height : 1;
    }
    return id >= 0x0d && id <= 0x0f ? TALL_WALL_TEXTURE_QUAD_SCALE : 1;
}

function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}

function normalizedWallTextureDewarpScale(value) {
    if (!Number.isFinite(value)) return DEFAULT_WALL_TEXTURE_DEWARP_SCALE;
    return Math.min(2.5, Math.max(0.5, value));
}

function normalizedWallTextureBinaryThreshold(value) {
    if (!Number.isFinite(value)) return DEFAULT_WALL_TEXTURE_BINARY_THRESHOLD;
    return Math.min(255, Math.max(0, Math.round(value)));
}

function wallTextureLeftRegistrationOffset(spriteId) {
    return WALL_TEXTURE_LEFT_REGISTRATION_OFFSET
        + (EXTRA_WALL_TEXTURE_LEFT_REGISTRATION_OFFSETS.get(spriteId) || 0);
}

function isRaisedWallFSprite(record, spriteId) {
    return Boolean(
        spriteId === 0x0f
        && record
        && record.position
        && Number.isFinite(record.position.z)
        && record.position.z > 0
    );
}

function wallTextureMirrorAxis(inwardNormal) {
    if (!inwardNormal) return null;
    return Math.abs(inwardNormal.x) >= Math.abs(inwardNormal.z) ? 'x' : 'z';
}

function mirrorWallTexturePoint(point, axis) {
    const mirrored = point.clone();
    if (axis === 'x') mirrored.x *= -1;
    if (axis === 'z') mirrored.z *= -1;
    return mirrored;
}

function mirroredWallTextureCorners(corners) {
    if (!corners || !corners.inwardNormal) return null;
    const axis = wallTextureMirrorAxis(corners.inwardNormal);
    if (!axis) return null;

    return {
        bottomA: mirrorWallTexturePoint(corners.bottomA, axis),
        bottomB: mirrorWallTexturePoint(corners.bottomB, axis),
        topA: mirrorWallTexturePoint(corners.topA, axis),
        topB: mirrorWallTexturePoint(corners.topB, axis),
        inwardNormal: corners.inwardNormal.clone().multiplyScalar(-1),
        outwardOffset: corners.outwardOffset,
        quadScale: corners.quadScale,
        mirrorAxis: axis,
        mirroredFromCanonicalWall: true,
    };
}

export class KnightLoreFull3DBackgroundRenderer {
    constructor(group) {
        this.group = group;
        this.roomDimensions = {width: 64, depth: 64, height: 64};
        this.colourAttribute = null;
        this.latestFrame = null;
        this.staticMemory = null;
        this.mapPosition = null;
        this.textureCache = new Map();
        this.activeTextureKeys = new Set();
        this.texturedQuadCount = 0;
        this.dewarpedQuadCount = 0;
        this.wallTextureDewarpScale = DEFAULT_WALL_TEXTURE_DEWARP_SCALE;
        this.wallTextureDewarpEnabled = DEFAULT_WALL_TEXTURE_DEWARP_ENABLED;
        this.wallTextureBinaryThreshold = DEFAULT_WALL_TEXTURE_BINARY_THRESHOLD;
    }

    render(backgrounds, opts = {}) {
        this.roomDimensions = opts.roomDimensions || this.roomDimensions;
        this.colourAttribute = opts.colourAttribute;
        this.latestFrame = opts.latestFrame || null;
        this.staticMemory = opts.staticMemory || null;
        this.mapPosition = opts.mapPosition || null;
        this.wallTextureDewarpScale = normalizedWallTextureDewarpScale(opts.wallTextureDewarpScale);
        this.wallTextureDewarpEnabled = Boolean(opts.wallTextureDewarpEnabled);
        this.wallTextureBinaryThreshold = normalizedWallTextureBinaryThreshold(opts.wallTextureBinaryThreshold);
        this.activeTextureKeys = new Set();
        this.texturedQuadCount = 0;
        this.dewarpedQuadCount = 0;

        (backgrounds || []).forEach((background, index) => {
            this.addStaticBackground(background, index);
        });

        this.pruneTextureCache(this.activeTextureKeys);
        return {
            texturedQuadCount: this.texturedQuadCount,
            dewarpedQuadCount: this.dewarpedQuadCount,
            activeTextureCount: this.activeTextureKeys.size,
        };
    }

    dispose() {
        this.pruneTextureCache(new Set());
    }

    createDebugBox(width, height, depth, color, opacity) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            createBackgroundMaterial(color, opacity)
        );
        mesh.scale.set(width, height, depth);
        return mesh;
    }

    createSpriteBitplaneCanvas(expanded, mode, flipY = false) {
        if (!expanded || typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = expanded.widthPixels;
        canvas.height = expanded.heightPixels;

        const context = canvas.getContext('2d');
        if (!context) return null;

        const imageData = context.createImageData(canvas.width, canvas.height);
        const ink = rgbFromHexColor(spectrumInkColorFromAttribute(this.colourAttribute));
        const paper = rgbFromHexColor(spectrumPaperColorFromAttribute(this.colourAttribute));

        for (let y = 0; y < expanded.heightPixels; y++) {
            const sourceY = flipY ? expanded.heightPixels - 1 - y : y;
            for (let x = 0; x < expanded.widthPixels; x++) {
                const sourceIndex = sourceY * expanded.widthPixels + x;
                const pixelIndex = (y * expanded.widthPixels + x) * 4;
                if (mode === 'mask') {
                    const value = expanded.maskPixels[sourceIndex] ? 0xf8 : 0x1e;
                    imageData.data[pixelIndex] = value;
                    imageData.data[pixelIndex + 1] = value;
                    imageData.data[pixelIndex + 2] = value;
                    imageData.data[pixelIndex + 3] = 0xff;
                    continue;
                }

                const color = expanded.imagePixels[sourceIndex] ? ink : paper;
                imageData.data[pixelIndex] = color.r;
                imageData.data[pixelIndex + 1] = color.g;
                imageData.data[pixelIndex + 2] = color.b;
                imageData.data[pixelIndex + 3] = 0xff;
            }
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
    }

    createDewarpedWallTextureCanvas(sourceCanvas, spriteId) {
        return createIsometricSlopeCorrectedCanvas(sourceCanvas, {
            slope: isometricTextureShearSlopeForSpriteId(
                spriteId,
                normalizedWallTextureDewarpScale(this.wallTextureDewarpScale)
            ),
        });
    }

    createBinaryWallTextureCanvas(sourceCanvas, spriteId) {
        return createBinaryWallTextureCanvas(
            sourceCanvas,
            rgbFromHexColor(spectrumInkColorFromAttribute(this.colourAttribute)),
            this.wallTextureBinaryThreshold,
            {transparentBackground: true}
        );
    }

    createCanvasTexture(canvas) {
        if (!canvas) return null;
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.flipY = false;
        texture.generateMipmaps = false;
        if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.needsUpdate = true;
        return texture;
    }

    createCauldronBrothCanvas(expanded) {
        if (!expanded || typeof document === 'undefined') return null;
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = expanded.widthPixels;
        sourceCanvas.height = expanded.heightPixels;

        const sourceContext = sourceCanvas.getContext('2d');
        if (!sourceContext) return null;

        const imageData = sourceContext.createImageData(sourceCanvas.width, sourceCanvas.height);
        const ink = rgbFromHexColor(spectrumInkColorFromAttribute(this.colourAttribute));
        for (let y = 0; y < expanded.heightPixels; y++) {
            for (let x = 0; x < expanded.widthPixels; x++) {
                const sourceIndex = y * expanded.widthPixels + x;
                const pixelIndex = sourceIndex * 4;
                const visible = expanded.imagePixels[sourceIndex];
                imageData.data[pixelIndex] = ink.r;
                imageData.data[pixelIndex + 1] = ink.g;
                imageData.data[pixelIndex + 2] = ink.b;
                imageData.data[pixelIndex + 3] = visible ? 0xff : 0x00;
            }
        }
        sourceContext.putImageData(imageData, 0, 0);

        const stretchedCanvas = document.createElement('canvas');
        stretchedCanvas.width = sourceCanvas.width;
        stretchedCanvas.height = Math.max(
            1,
            Math.round(sourceCanvas.height * CAULDRON_BROTH_VERTICAL_STRETCH)
        );
        const stretchedContext = stretchedCanvas.getContext('2d');
        if (!stretchedContext) return sourceCanvas;
        stretchedContext.imageSmoothingEnabled = false;
        stretchedContext.clearRect(0, 0, stretchedCanvas.width, stretchedCanvas.height);
        stretchedContext.drawImage(
            sourceCanvas,
            0,
            0,
            stretchedCanvas.width,
            stretchedCanvas.height
        );
        return stretchedCanvas;
    }

    generatedCauldronBrothTextureRecord() {
        const texture = getKnightLoreSpriteTexture(this.latestFrame, CAULDRON_BROTH_SPRITE_ID)
            || getKnightLoreSpriteTexture(this.staticMemory, CAULDRON_BROTH_SPRITE_ID);
        if (!texture || !texture.valid) return null;

        const cacheKey = [
            'cauldron-broth',
            texture.id,
            this.colourAttribute === null || this.colourAttribute === undefined ? '--' : this.colourAttribute,
            CAULDRON_BROTH_VERTICAL_STRETCH,
            texture.dataAddress,
            texture.dataEndAddress,
            texture.widthPixels,
            texture.heightPixels,
            texture.imageBitCount,
            texture.maskBitCount,
        ].join(':');

        const cached = this.textureCache.get(cacheKey);
        if (cached) return cached;

        const expanded = expandKnightLoreSpriteTexture(texture);
        if (!expanded) return null;
        const imageCanvas = this.createCauldronBrothCanvas(expanded);
        if (!imageCanvas) return null;

        const record = {
            key: cacheKey,
            spriteId: texture.id,
            texture,
            imageCanvas,
            imageTexture: this.createCanvasTexture(imageCanvas),
            verticalStretch: CAULDRON_BROTH_VERTICAL_STRETCH,
        };
        this.textureCache.set(cacheKey, record);
        return record;
    }

    generatedBackgroundTextureRecord(spriteId) {
        if (!isTexturedBackgroundSprite(spriteId)) return null;

        const texture = getKnightLoreSpriteTexture(this.latestFrame, spriteId)
            || getKnightLoreSpriteTexture(this.staticMemory, spriteId);
        if (!texture || !texture.valid) return null;

        const yFlipped = SPRITE_TEXTURE_VERTICAL_FLIP_IDS.has(texture.id);
        const dewarpFamily = this.wallTextureDewarpEnabled
            ? ricardWallTextureFamilyFromSpriteId(texture.id)
            : null;
        const binaryThreshold = normalizedWallTextureBinaryThreshold(this.wallTextureBinaryThreshold);
        const transparentPaper = true;
        const cacheKey = [
            'background',
            texture.id,
            this.colourAttribute === null || this.colourAttribute === undefined ? '--' : this.colourAttribute,
            yFlipped ? 'flip-y' : 'normal-y',
            dewarpFamily ? 'texture-dewarp-' + dewarpFamily : 'raw-texture',
            dewarpFamily ? Math.round(normalizedWallTextureDewarpScale(this.wallTextureDewarpScale) * 100) : '--',
            binaryThreshold > 0 ? 'binary-' + binaryThreshold : 'continuous',
            transparentPaper ? 'transparent-paper' : 'opaque-paper',
            texture.dataAddress,
            texture.dataEndAddress,
            texture.widthPixels,
            texture.heightPixels,
            texture.imageBitCount,
            texture.maskBitCount,
        ].join(':');

        const cached = this.textureCache.get(cacheKey);
        if (cached) return cached;

        const expanded = expandKnightLoreSpriteTexture(texture);
        if (!expanded) return null;

        const imageCanvas = this.createSpriteBitplaneCanvas(expanded, 'image', yFlipped);
        if (!imageCanvas) return null;
        const dewarpedImageCanvas = dewarpFamily
            ? this.createDewarpedWallTextureCanvas(imageCanvas, texture.id)
            : null;
        const continuousImageCanvas = dewarpedImageCanvas || imageCanvas;
        const binaryImageCanvas = binaryThreshold > 0
            ? this.createBinaryWallTextureCanvas(continuousImageCanvas, texture.id)
            : null;
        const finalImageCanvas = binaryImageCanvas || continuousImageCanvas;

        const record = {
            key: cacheKey,
            spriteId: texture.id,
            texture,
            sourceImageCanvas: imageCanvas,
            imageCanvas: finalImageCanvas,
            imageTexture: this.createCanvasTexture(finalImageCanvas),
            yFlipped,
            textureDewarped: Boolean(dewarpedImageCanvas),
            textureBinaryThresholded: Boolean(binaryImageCanvas),
            textureTransparentPaper: transparentPaper,
            binaryThreshold,
            dewarpFamily,
        };
        this.textureCache.set(cacheKey, record);
        return record;
    }

    pruneTextureCache(activeKeys) {
        for (const [key, record] of this.textureCache.entries()) {
            if (activeKeys.has(key)) continue;
            if (record.imageTexture) record.imageTexture.dispose();
            this.textureCache.delete(key);
        }
    }

    scenePointForBackgroundCorner(record, offsetX = 0, offsetY = 0, offsetZ = 0) {
        if (!record || !record.position || !this.mapPosition) return null;
        const position = this.mapPosition({
            x: record.position.x + offsetX,
            y: record.position.y + offsetY,
            z: record.position.z + offsetZ,
        });
        return position ? position.vector : null;
    }

    texturedBackgroundQuadCorners(record, textureRecord = null) {
        if (!record || !record.dimensions) return null;

        const widthX = Math.max(0, record.dimensions.x || 0);
        const widthY = Math.max(0, record.dimensions.y || 0);
        const height = Math.max(0, record.dimensions.z || 0);
        if (height <= 0 || (widthX <= 0 && widthY <= 0)) return null;

        const bottomA = this.scenePointForBackgroundCorner(record, 0, 0, 0);
        const bottomB = this.scenePointForBackgroundCorner(record, widthX, widthY, 0);
        const topA = this.scenePointForBackgroundCorner(record, 0, 0, height);
        const topB = this.scenePointForBackgroundCorner(record, widthX, widthY, height);
        if (!bottomA || !bottomB || !topA || !topB) return null;

        let horizontal = new THREE.Vector3().subVectors(bottomB, bottomA);
        const vertical = new THREE.Vector3().subVectors(topA, bottomA);
        let horizontalDirection = horizontal.lengthSq() > 0.0001 ? horizontal.clone().normalize() : null;
        const verticalDirection = vertical.lengthSq() > 0.0001 ? vertical.clone().normalize() : null;
        const aspectRatio = wallTextureAspectRatio(
            textureRecord ? textureRecord.texture : null,
            record.spriteId
        );
        const quadScale = wallTextureQuadScale(record.spriteId, record);
        if (aspectRatio !== null && horizontalDirection && verticalDirection) {
            const desiredVerticalLength = Math.max(1, vertical.length() * quadScale);
            const desiredHorizontalLength = Math.max(1, desiredVerticalLength * aspectRatio);
            const anchor = bottomA.clone();
            bottomA.copy(anchor);
            bottomB.copy(anchor).addScaledVector(horizontalDirection, desiredHorizontalLength);
            topA.copy(anchor).addScaledVector(verticalDirection, desiredVerticalLength);
            topB.copy(topA).addScaledVector(horizontalDirection, desiredHorizontalLength);
            horizontal = new THREE.Vector3().subVectors(bottomB, bottomA);
            horizontalDirection = horizontal.lengthSq() > 0.0001 ? horizontal.clone().normalize() : horizontalDirection;
        }

        const spriteId = normalizedSpriteId(record.spriteId);
        const registrationOffset = new THREE.Vector3();
        if (horizontalDirection && TEXTURED_WALL_SPRITE_IDS.has(spriteId)) {
            registrationOffset.addScaledVector(horizontalDirection, -wallTextureLeftRegistrationOffset(spriteId));
        }
        if (verticalDirection && isRaisedWallFSprite(record, spriteId)) {
            registrationOffset.addScaledVector(verticalDirection, -UPPER_WALL_F_VERTICAL_OFFSET);
        }
        if (registrationOffset.lengthSq() > 0.0001) {
            [bottomA, bottomB, topA, topB].forEach(point => {
                point.add(registrationOffset);
            });
        }

        let normal = new THREE.Vector3(-horizontal.z, 0, horizontal.x);
        if (normal.lengthSq() < 0.0001) return null;
        normal.normalize();

        const center = new THREE.Vector3()
            .add(bottomA)
            .add(bottomB)
            .add(topA)
            .add(topB)
            .multiplyScalar(0.25);
        if (TEXTURED_BACKGROUND_QUAD_SCALE !== 1) {
            [bottomA, bottomB, topA, topB].forEach(point => {
                point.sub(center).multiplyScalar(TEXTURED_BACKGROUND_QUAD_SCALE).add(center);
            });
        }

        const towardRoomCenter = center.clone().add(normal);
        const awayFromRoomCenter = center.clone().sub(normal);
        if (distanceXZ(towardRoomCenter, new THREE.Vector3()) > distanceXZ(awayFromRoomCenter, new THREE.Vector3())) {
            normal.multiplyScalar(-1);
        }

        const inwardNormal = normal.clone();
        [bottomA, bottomB, topA, topB].forEach(point => {
            point.addScaledVector(inwardNormal, -TEXTURED_BACKGROUND_WALL_OFFSET);
        });

        return {
            bottomA,
            bottomB,
            topA,
            topB,
            inwardNormal,
            outwardOffset: TEXTURED_BACKGROUND_WALL_OFFSET,
            quadScale: TEXTURED_BACKGROUND_QUAD_SCALE,
            mirrorAxis: wallTextureMirrorAxis(inwardNormal),
            mirroredFromCanonicalWall: false,
        };
    }

    texturedBackgroundUvs(record) {
        const flags = record && record.flags ? record.flags : {};
        let leftU = 0;
        let rightU = 1;
        let topV = 0;
        let bottomV = 1;

        if (flags.flipHorizontal) {
            [leftU, rightU] = [rightU, leftU];
        }
        if (flags.flipVertical) {
            [topV, bottomV] = [bottomV, topV];
        }

        return [
            leftU, bottomV,
            rightU, bottomV,
            rightU, topV,
            leftU, topV,
        ];
    }

    createTexturedBackgroundMesh(
        background,
        record,
        backgroundIndex,
        recordIndex,
        textureRecord,
        positions,
        uvs,
        cornerInfo = null,
        variant = 'canonical'
    ) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const material = new THREE.MeshBasicMaterial({
            map: textureRecord.imageTexture,
            side: THREE.DoubleSide,
            alphaTest: textureRecord.textureTransparentPaper ? 0.5 : 0,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.backgroundId = background.id;
        mesh.userData.backgroundLabel = background.label;
        mesh.userData.backgroundCategory = background.category;
        mesh.userData.backgroundIndex = backgroundIndex;
        mesh.userData.backgroundRecordIndex = recordIndex;
        mesh.userData.spriteId = record.spriteId;
        mesh.userData.spriteKind = texturedBackgroundSpriteKind(record.spriteId);
        mesh.userData.textureKey = textureRecord.key;
        mesh.userData.wallTextureVariant = variant;
        mesh.userData.wallTexturePairId = [
            backgroundIndex,
            recordIndex,
            normalizedSpriteId(record.spriteId),
        ].join(':');
        if (cornerInfo && cornerInfo.inwardNormal) {
            mesh.userData.wallTextureInwardNormal = cornerInfo.inwardNormal.clone();
        }
        if (cornerInfo && cornerInfo.mirrorAxis) {
            mesh.userData.wallTextureMirrorAxis = cornerInfo.mirrorAxis;
        }
        mesh.userData.textureYFlipped = textureRecord.yFlipped;
        if (textureRecord.textureDewarped) {
            mesh.userData.wallDewarp = true;
            mesh.userData.wallTextureDewarp = true;
            mesh.userData.wallDewarpSource = RICARD_WALL_TEXTURE_DEWARP_SOURCE;
            mesh.userData.wallDewarpFamily = textureRecord.dewarpFamily;
            mesh.userData.wallGeometryDewarp = false;
        }
        if (textureRecord.textureBinaryThresholded) {
            mesh.userData.wallTextureBinaryThreshold = textureRecord.binaryThreshold;
        }
        if (textureRecord.textureTransparentPaper) {
            mesh.userData.textureTransparentPaper = true;
        }
        if (positions && positions.length >= 12) {
            mesh.userData.wallTextureOutwardOffset = TEXTURED_BACKGROUND_WALL_OFFSET;
            mesh.userData.wallTextureQuadScale = TEXTURED_BACKGROUND_QUAD_SCALE;
        }
        if (cornerInfo && cornerInfo.mirroredFromCanonicalWall) {
            mesh.userData.mirroredFromCanonicalWall = true;
        }

        this.activeTextureKeys.add(textureRecord.key);
        this.texturedQuadCount += 1;
        if (textureRecord.textureDewarped) this.dewarpedQuadCount += 1;
        return mesh;
    }

    texturedBackgroundPositions(corners) {
        return [
            corners.bottomA.x, corners.bottomA.y, corners.bottomA.z,
            corners.bottomB.x, corners.bottomB.y, corners.bottomB.z,
            corners.topB.x, corners.topB.y, corners.topB.z,
            corners.topA.x, corners.topA.y, corners.topA.z,
        ];
    }

    createTexturedBackgroundQuad(background, record, backgroundIndex, recordIndex) {
        if (!record || !isTexturedBackgroundSprite(record.spriteId)) return null;

        const textureRecord = this.generatedBackgroundTextureRecord(record.spriteId);
        const corners = this.texturedBackgroundQuadCorners(record, textureRecord);
        if (!textureRecord || !textureRecord.imageTexture || !corners) return null;

        const uvs = this.texturedBackgroundUvs(record);
        const meshes = [
            this.createTexturedBackgroundMesh(
                background,
                record,
                backgroundIndex,
                recordIndex,
                textureRecord,
                this.texturedBackgroundPositions(corners),
                uvs,
                corners,
                'canonical'
            ),
        ];
        const oppositeCorners = mirroredWallTextureCorners(corners);
        if (oppositeCorners) {
            meshes.push(this.createTexturedBackgroundMesh(
                background,
                record,
                backgroundIndex,
                recordIndex,
                textureRecord,
                this.texturedBackgroundPositions(oppositeCorners),
                uvs,
                oppositeCorners,
                'opposite'
            ));
        }

        return meshes.filter(Boolean);
    }

    addTexturedBackgroundQuadToGroup(group, quad) {
        if (!quad) return;
        if (Array.isArray(quad)) {
            quad.forEach(child => this.addTexturedBackgroundQuadToGroup(group, child));
            return;
        }
        group.add(quad);
    }

    addTexturedBackgroundRecords(background, index) {
        const records = Array.isArray(background.records) ? background.records : [];
        const group = new THREE.Group();

        records.forEach((record, recordIndex) => {
            const quad = this.createTexturedBackgroundQuad(background, record, index, recordIndex);
            this.addTexturedBackgroundQuadToGroup(group, quad);
        });

        if (group.children.length === 0) return 0;

        group.userData.backgroundId = background.id;
        group.userData.backgroundLabel = background.label;
        group.userData.backgroundCategory = background.category;
        group.userData.texturedBackgroundQuads = group.children.length;
        group.userData.dewarpedBackgroundQuads = group.children.filter(child => child.userData.wallTextureDewarp).length;
        this.group.add(group);
        return group.children.length;
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
        if (!background.side) return;
        const color = backgroundDebugColor(background);
        const group = this.createSideGroup(background.side, index);
        if (!withBars) {
            const arch = createRicardArchModel({
                color: spectrumInkColorFromAttribute(this.colourAttribute),
                opacity: 1,
                outline: true,
            });
            arch.userData.backgroundId = background.id;
            arch.userData.backgroundCategory = background.category;
            if (background.category === 'high-arch') {
                arch.position.y = this.highArchVerticalOffset(background);
                arch.userData.highArchVerticalOffset = arch.position.y;
            }
            const archBounds = new THREE.Box3().setFromObject(arch);
            const archSize = new THREE.Vector3();
            archBounds.getSize(archSize);
            const outwardOffset = (
                archSize.z > 0 ? archSize.z * 0.5 : ARCH_OUTWARD_OFFSET_FALLBACK
            ) + ARCH_EXTRA_OUTWARD_OFFSET;
            arch.position.z += outwardOffset;
            arch.userData.outwardOffset = outwardOffset;
            group.add(arch);
            this.group.add(group);
            return;
        }

        const openingWidth = PORTCULLIS_PANEL_SIZE.width;
        const openingHeight = PORTCULLIS_PANEL_SIZE.height;
        const thickness = PORTCULLIS_BAR_WIDTH;
        const depth = PORTCULLIS_PANEL_SIZE.depth;

        const left = this.createDebugBox(thickness, openingHeight, depth, color, 0.82);
        left.position.set(-openingWidth / 2, openingHeight / 2, 0);
        group.add(left);

        const right = this.createDebugBox(thickness, openingHeight, depth, color, 0.82);
        right.position.set(openingWidth / 2, openingHeight / 2, 0);
        group.add(right);

        const top = this.createDebugBox(openingWidth + thickness, thickness, depth, color, 0.82);
        top.position.set(0, openingHeight, 0);
        group.add(top);

        const barCount = 5;
        for (let i = 0; i < barCount; i++) {
            const x = -openingWidth * 0.38 + (openingWidth * 0.76) * (i / (barCount - 1));
            const bar = this.createDebugBox(PORTCULLIS_BAR_WIDTH, openingHeight * 0.94, depth + 0.2, color, 0.9);
            bar.position.set(x, openingHeight * 0.47, 0.35);
            group.add(bar);
        }
        [0.22, 0.78].forEach(heightFactor => {
            const rail = this.createDebugBox(openingWidth, PORTCULLIS_BAR_WIDTH, depth + 0.25, color, 0.9);
            rail.position.set(0, openingHeight * heightFactor, 0.38);
            group.add(rail);
        });

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

    addStaticRecordBoxes(background, index) {
        const records = Array.isArray(background.records) ? background.records : [];
        const group = new THREE.Group();

        records.forEach((record, recordIndex) => {
            const position = this.mapPosition ? this.mapPosition(record.position) : null;
            if (!position) return;

            const object = createFull3DObjectModel(record.spriteId, {
                dimensions: record.dimensions,
                semanticCategory: 'static-background',
            });
            if (!object) return;

            object.position.copy(position.vector);
            object.userData.backgroundId = background.id;
            object.userData.backgroundCategory = background.category;
            object.userData.backgroundRecordIndex = recordIndex;
            object.userData.spriteId = record.spriteId;
            object.userData.staticBackgroundModel = true;
            group.add(object);
        });

        if (group.children.length === 0) return 0;

        group.userData.backgroundId = background.id;
        group.userData.backgroundCategory = background.category;
        group.userData.staticRecordBoxCount = group.children.length;
        this.group.add(group);
        return group.children.length;
    }

    addMappedPortcullisRecords(background, index) {
        if (!this.mapPosition || !Array.isArray(background.records) || background.records.length === 0) {
            return 0;
        }

        const group = new THREE.Group();
        background.records.forEach((record, recordIndex) => {
            const position = this.mapPosition(record.position);
            if (!position) return;

            const object = createFull3DObjectModel(record.spriteId, {
                dimensions: record.dimensions,
                semanticCategory: 'static-portcullis',
            });
            if (!object) return;

            object.position.copy(position.vector);
            object.userData.backgroundId = background.id;
            object.userData.backgroundCategory = background.category;
            object.userData.backgroundRecordIndex = recordIndex;
            object.userData.spriteId = record.spriteId;
            object.userData.staticBackgroundModel = true;
            object.userData.liveDynamicSource = Boolean(record.liveDynamicSource);
            group.add(object);
        });

        if (group.children.length === 0) return 0;

        group.userData.backgroundId = background.id;
        group.userData.backgroundCategory = background.category;
        group.userData.staticPortcullisModelCount = group.children.length;
        this.group.add(group);
        return group.children.length;
    }

    addFixedBackgroundMarker(background, index) {
        if (background.id === 0x13) {
            this.addCauldronBackground(background, index);
            return;
        }

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

    addCauldronBackground(background, index) {
        const markerInfo = fixedBackgroundMarker(background);
        const brothTextureRecord = this.generatedCauldronBrothTextureRecord();
        if (brothTextureRecord) this.activeTextureKeys.add(brothTextureRecord.key);

        const group = new THREE.Group();
        const cauldron = createCauldronModel({
            brothTexture: brothTextureRecord ? brothTextureRecord.imageTexture : null,
        });
        cauldron.position.set(0, 0, 0);
        cauldron.userData.backgroundId = background.id;
        cauldron.userData.backgroundLabel = markerInfo.label;
        cauldron.userData.backgroundRecordIndex = 0;
        cauldron.userData.cauldronPlacement = 'room-center';
        cauldron.userData.brothSpriteId = CAULDRON_BROTH_SPRITE_ID;
        cauldron.userData.brothTextureKey = brothTextureRecord ? brothTextureRecord.key : null;
        group.add(cauldron);

        group.userData.backgroundId = background.id;
        group.userData.backgroundLabel = markerInfo.label;
        group.userData.cauldronPlacement = 'room-center';
        group.userData.brothSpriteId = CAULDRON_BROTH_SPRITE_ID;
        group.userData.brothTextureGenerated = Boolean(brothTextureRecord);
        this.group.add(group);
    }

    addStaticBackground(background, index) {
        const texturedRecordCount = this.addTexturedBackgroundRecords(background, index);

        switch (background.category) {
            case 'wall-preset':
            case 'tree-room':
                break;
            case 'arch':
            case 'high-arch':
                this.addOpeningFrame(background, index, false);
                break;
            case 'tree-arch':
                break;
            case 'high-arch-base':
                if (texturedRecordCount === 0) this.addStaticRecordBoxes(background, index);
                break;
            case 'portcullis':
                if (this.addMappedPortcullisRecords(background, index) === 0) {
                    this.addOpeningFrame(background, index, true);
                }
                break;
            case 'tree-filler':
                if (texturedRecordCount === 0) this.addSidePatch(background, index);
                break;
            case 'fixed-background':
                if (!LIVE_FIXED_BACKGROUND_IDS.has(background.id)) {
                    this.addFixedBackgroundMarker(background, index);
                }
                break;
            default:
                if (texturedRecordCount === 0) this.addSidePatch(background, index);
                break;
        }
    }
}
