export const RICARD_WALL_TEXTURE_DEWARP_SOURCE =
    'Ricard Galvany 2006 wall texture pass, interpreted as texture rectification only';
export const ISOMETRIC_TEXTURE_SHEAR_SLOPE = 0.5;

const WALL_TEXTURE_NEGATIVE_SHEAR_SPRITE_IDS = new Set([
    0x04,
    0x0a, 0x0b, 0x0c, 0x0d, 0x0f,
    0x80, 0x81, 0x82,
]);

const WALL_TEXTURE_FAMILY_BY_SPRITE_ID = new Map([
    [0x04, 'wood-entrance-a'],
    [0x05, 'wood-entrance-b'],
    [0x0a, 'a'],
    [0x0b, 'b'],
    [0x0c, 'c'],
    [0x0d, 'd'],
    [0x0e, 'e'],
    [0x0f, 'f'],
    [0x80, 'wood-wall-a'],
    [0x81, 'wood-wall-b'],
    [0x82, 'wood-wall-c'],
]);

export function ricardWallTextureFamilyFromSpriteId(spriteId) {
    if (!Number.isFinite(spriteId)) return null;
    return WALL_TEXTURE_FAMILY_BY_SPRITE_ID.get(spriteId & 0xff) || null;
}

export function shouldDewarpWallTexture(spriteId) {
    return ricardWallTextureFamilyFromSpriteId(spriteId) !== null;
}

export function isometricTextureShearSlopeForSpriteId(spriteId, scale = 1) {
    const id = Number.isFinite(spriteId) ? spriteId & 0xff : null;
    const sign = id !== null && WALL_TEXTURE_NEGATIVE_SHEAR_SPRITE_IDS.has(id) ? -1 : 1;
    const multiplier = Number.isFinite(scale) ? scale : 1;
    return ISOMETRIC_TEXTURE_SHEAR_SLOPE * sign * multiplier;
}

export function createIsometricSlopeCorrectedCanvas(sourceCanvas, opts = {}) {
    if (!sourceCanvas || typeof document === 'undefined') return null;
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width <= 0 || height <= 0) return null;

    const sourceContext = sourceCanvas.getContext('2d');
    if (!sourceContext) return null;

    const slope = Number.isFinite(opts.slope)
        ? opts.slope
        : ISOMETRIC_TEXTURE_SHEAR_SLOPE;
    const horizontalSmoothing = Number.isFinite(opts.horizontalSmoothing)
        ? Math.min(1, Math.max(0, opts.horizontalSmoothing))
        : 0.55;
    const centerX = (width - 1) * 0.5;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const sourceData = sourceContext.getImageData(0, 0, width, height);
    const outputData = context.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceY = y + (x - centerX) * slope;
            const targetPixel = (y * width + x) * 4;
            if (sourceY < 0 || sourceY > height - 1) {
                outputData.data[targetPixel + 3] = 0xff;
                continue;
            }

            const sourceY0 = Math.floor(sourceY);
            const sourceY1 = Math.min(height - 1, sourceY0 + 1);
            const mix = sourceY - sourceY0;
            const sourcePixel0 = (sourceY0 * width + x) * 4;
            const sourcePixel1 = (sourceY1 * width + x) * 4;
            for (let channel = 0; channel < 4; channel++) {
                outputData.data[targetPixel + channel] = Math.round(
                    sourceData.data[sourcePixel0 + channel] * (1 - mix)
                    + sourceData.data[sourcePixel1 + channel] * mix
                );
            }
        }
    }

    const finalData = horizontalSmoothing > 0
        ? context.createImageData(width, height)
        : outputData;
    if (horizontalSmoothing > 0) {
        const centerWeight = 1 - horizontalSmoothing;
        const sideWeight = horizontalSmoothing * 0.5;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = (y * width + x) * 4;
                const leftPixel = (y * width + Math.max(0, x - 1)) * 4;
                const rightPixel = (y * width + Math.min(width - 1, x + 1)) * 4;
                for (let channel = 0; channel < 3; channel++) {
                    finalData.data[pixel + channel] = Math.round(
                        outputData.data[leftPixel + channel] * sideWeight
                        + outputData.data[pixel + channel] * centerWeight
                        + outputData.data[rightPixel + channel] * sideWeight
                    );
                }
                finalData.data[pixel + 3] = outputData.data[pixel + 3];
            }
        }
    }

    context.putImageData(finalData, 0, 0);
    return canvas;
}

export function createBinaryWallTextureCanvas(sourceCanvas, wallColor, threshold) {
    if (!sourceCanvas || typeof document === 'undefined') return null;
    const thresholdValue = Number.isFinite(threshold)
        ? Math.min(255, Math.max(1, threshold))
        : 0;
    if (thresholdValue <= 0) return null;

    const wall = typeof wallColor === 'number'
        ? {
            r: (wallColor >> 16) & 0xff,
            g: (wallColor >> 8) & 0xff,
            b: wallColor & 0xff,
        }
        : wallColor;
    if (!wall) return null;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width <= 0 || height <= 0) return null;

    const sourceContext = sourceCanvas.getContext('2d');
    if (!sourceContext) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const sourceData = sourceContext.getImageData(0, 0, width, height);
    const outputData = context.createImageData(width, height);
    const wallEnergy = wall.r * wall.r + wall.g * wall.g + wall.b * wall.b;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = (y * width + x) * 4;
            const strength = wallEnergy > 0
                ? (
                    sourceData.data[pixel] * wall.r
                    + sourceData.data[pixel + 1] * wall.g
                    + sourceData.data[pixel + 2] * wall.b
                ) * 255 / wallEnergy
                : (
                    sourceData.data[pixel] * 0.299
                    + sourceData.data[pixel + 1] * 0.587
                    + sourceData.data[pixel + 2] * 0.114
                );
            const isWall = sourceData.data[pixel + 3] > 0 && strength >= thresholdValue;
            outputData.data[pixel] = isWall ? wall.r : 0;
            outputData.data[pixel + 1] = isWall ? wall.g : 0;
            outputData.data[pixel + 2] = isWall ? wall.b : 0;
            outputData.data[pixel + 3] = 0xff;
        }
    }

    context.putImageData(outputData, 0, 0);
    return canvas;
}
