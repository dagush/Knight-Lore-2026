export const KNIGHT_LORE_MEMORY = {
    scratchStart: 0x5ba0,
    scratchEnd: 0x6108,
    staticStart: 0x6248,
    staticEnd: 0xaf6c,
    itemTableStart: 0x6ff2,
    itemTableEnd: 0x7112,
    itemRecordSize: 9,
    spritePointerTableStart: 0x7112,
    spritePointerTableEnd: 0x728a,
    spriteDataStart: 0x728a,
    spriteDataEnd: 0xaf6c,
    spritePointerEntrySize: 2,
    dynamicRoomStart: 0x5c88,
    dynamicVisualSlotSize: 0x20,
    dynamicVisualRecordSize: 8,
    room: {
        sizeX: 0x5bab,
        sizeY: 0x5bac,
        colourAttribute: 0x5bad,
        sizeZ: 0x5bae,
        id: 0x5c10,
    },
    player: {
        bodyX: 0x5c09,
        bodyY: 0x5c0a,
        bodyZ: 0x5c0b,
        bodyMirrorFlag: 0x5c0f,
        headX: 0x5c20,
        headRenderX: 0x5c29,
        headMirrorFlag: 0x5c2f,
        headY: 0x5c2a,
        headZ: 0x5c2b,
        headSprite: 0x5c41,
        bodySprite: 0x5c45,
    },
    item: {
        liveSlotStarts: [0x5c48, 0x5c68],
        inactiveSpriteId: 0x00,
        spriteOffset: 0,
        xOffset: 1,
        yOffset: 2,
        zOffset: 3,
        roomOffset: 8,
    },
};

const STATIC_TABLES = {
    roomSizesStart: 0x6248,
    roomSizeEntrySize: 3,
    locationsStart: 0x6251,
    locationsEnd: 0x6bd1,
    backgroundPointerStart: 0x6ce2,
    backgroundPointerEnd: 0x6d12,
    backgroundDataStart: 0x6d12,
    backgroundDataEnd: 0x6ff2,
    spritePointerStart: 0x7112,
    spritePointerEnd: 0x728a,
    spriteDataStart: 0x728a,
    spriteDataEnd: 0xaf6c,
};

const PLAYER_DIRECTION_AXIS_THRESHOLD = 0x4c;
const SPRITE_TEXTURE_CATALOG_CACHE = new WeakMap();
const SPRITE_TEXTURE_PREVIEW_ROWS = 8;

const BACKGROUND_TYPES = {
    0x00: {label: 'arch north', category: 'arch', side: 'north'},
    0x01: {label: 'arch east', category: 'arch', side: 'east'},
    0x02: {label: 'arch south', category: 'arch', side: 'south'},
    0x03: {label: 'arch west', category: 'arch', side: 'west'},
    0x04: {label: 'tree arch north', category: 'tree-arch', side: 'north'},
    0x05: {label: 'tree arch east', category: 'tree-arch', side: 'east'},
    0x06: {label: 'tree arch south', category: 'tree-arch', side: 'south'},
    0x07: {label: 'tree arch west', category: 'tree-arch', side: 'west'},
    0x08: {label: 'portcullis north', category: 'portcullis', side: 'north'},
    0x09: {label: 'portcullis east', category: 'portcullis', side: 'east'},
    0x0a: {label: 'portcullis south', category: 'portcullis', side: 'south'},
    0x0b: {label: 'portcullis west', category: 'portcullis', side: 'west'},
    0x0c: {label: 'wall room size 1', category: 'wall-preset'},
    0x0d: {label: 'wall room size 2', category: 'wall-preset'},
    0x0e: {label: 'wall room size 3', category: 'wall-preset'},
    0x0f: {label: 'tree room size 1', category: 'tree-room'},
    0x10: {label: 'tree filler west', category: 'tree-filler', side: 'west'},
    0x11: {label: 'tree filler north', category: 'tree-filler', side: 'north'},
    0x12: {label: 'wizard', category: 'fixed-background'},
    0x13: {label: 'cauldron', category: 'fixed-background'},
    0x14: {label: 'high arch east', category: 'high-arch', side: 'east'},
    0x15: {label: 'high arch south', category: 'high-arch', side: 'south'},
    0x16: {label: 'high arch east base', category: 'high-arch-base', side: 'east'},
    0x17: {label: 'high arch south base', category: 'high-arch-base', side: 'south'},
};

const DEFAULT_MAX_DYNAMIC_VISUAL_SLOTS = (
    KNIGHT_LORE_MEMORY.scratchEnd - KNIGHT_LORE_MEMORY.dynamicRoomStart
) / KNIGHT_LORE_MEMORY.dynamicVisualSlotSize;
const HIGH_RES_ORIGIN = 72;
const HIGH_RES_SCREEN_Z = 128;

const DEBUG_BYTE_DEFINITIONS = [
    ['player.body.x', KNIGHT_LORE_MEMORY.player.bodyX],
    ['player.body.y', KNIGHT_LORE_MEMORY.player.bodyY],
    ['player.body.z', KNIGHT_LORE_MEMORY.player.bodyZ],
    ['player.body.mirrorFlag', KNIGHT_LORE_MEMORY.player.bodyMirrorFlag],
    ['room.size.x', KNIGHT_LORE_MEMORY.room.sizeX],
    ['room.size.y', KNIGHT_LORE_MEMORY.room.sizeY],
    ['room.colourAttribute', KNIGHT_LORE_MEMORY.room.colourAttribute],
    ['room.size.z', KNIGHT_LORE_MEMORY.room.sizeZ],
    ['room.id', KNIGHT_LORE_MEMORY.room.id],
    ['player.head.x', KNIGHT_LORE_MEMORY.player.headX],
    ['player.head.renderXCandidate', KNIGHT_LORE_MEMORY.player.headRenderX],
    ['player.head.y', KNIGHT_LORE_MEMORY.player.headY],
    ['player.head.z', KNIGHT_LORE_MEMORY.player.headZ],
    ['player.head.mirrorFlag', KNIGHT_LORE_MEMORY.player.headMirrorFlag],
    ['player.head.sprite', KNIGHT_LORE_MEMORY.player.headSprite],
    ['player.body.sprite', KNIGHT_LORE_MEMORY.player.bodySprite],
    ['item0.live.sprite', KNIGHT_LORE_MEMORY.item.liveSlotStarts[0]],
    ['item0.live.x', KNIGHT_LORE_MEMORY.item.liveSlotStarts[0] + KNIGHT_LORE_MEMORY.item.xOffset],
    ['item0.live.y', KNIGHT_LORE_MEMORY.item.liveSlotStarts[0] + KNIGHT_LORE_MEMORY.item.yOffset],
    ['item0.live.z', KNIGHT_LORE_MEMORY.item.liveSlotStarts[0] + KNIGHT_LORE_MEMORY.item.zOffset],
    ['item0.live.room', KNIGHT_LORE_MEMORY.item.liveSlotStarts[0] + KNIGHT_LORE_MEMORY.item.roomOffset],
    ['item1.live.sprite', KNIGHT_LORE_MEMORY.item.liveSlotStarts[1]],
    ['item1.live.x', KNIGHT_LORE_MEMORY.item.liveSlotStarts[1] + KNIGHT_LORE_MEMORY.item.xOffset],
    ['item1.live.y', KNIGHT_LORE_MEMORY.item.liveSlotStarts[1] + KNIGHT_LORE_MEMORY.item.yOffset],
    ['item1.live.z', KNIGHT_LORE_MEMORY.item.liveSlotStarts[1] + KNIGHT_LORE_MEMORY.item.zOffset],
    ['item1.live.room', KNIGHT_LORE_MEMORY.item.liveSlotStarts[1] + KNIGHT_LORE_MEMORY.item.roomOffset],
    ['room.dynamicStart', KNIGHT_LORE_MEMORY.dynamicRoomStart],
];

function getMemoryAndStart(source, opts) {
    if (source && source.semanticMemory) {
        return {
            memory: source.semanticMemory,
            memoryStart: source.memoryStart,
            frame: source,
        };
    }
    return {
        memory: source,
        memoryStart: opts.memoryStart || KNIGHT_LORE_MEMORY.scratchStart,
        frame: null,
    };
}

export function readKnightLoreByte(memory, memoryStart, address) {
    const offset = address - memoryStart;
    if (!memory || offset < 0 || offset >= memory.length) return null;
    return memory[offset];
}

function readBytes(memory, memoryStart, startAddress, length) {
    const bytes = [];
    for (let i = 0; i < length; i++) {
        bytes.push(readKnightLoreByte(memory, memoryStart, startAddress + i));
    }
    return bytes;
}

function readPosition(memory, memoryStart, addresses) {
    return {
        x: readKnightLoreByte(memory, memoryStart, addresses.x),
        y: readKnightLoreByte(memory, memoryStart, addresses.y),
        z: readKnightLoreByte(memory, memoryStart, addresses.z),
    };
}

function toHighResolutionPosition(position, subcell = {}) {
    if (
        !position
        || position.x === null
        || position.y === null
        || position.z === null
    ) {
        return null;
    }

    return {
        x: position.x * 16 + (subcell.x || 0) * 8 + HIGH_RES_ORIGIN,
        y: position.y * 16 + (subcell.y || 0) * 8 + HIGH_RES_ORIGIN,
        z: position.z * 12 + (subcell.z || 0) * 4 + HIGH_RES_SCREEN_Z,
    };
}

function flagBits(value) {
    if (value === null) return [];
    const bits = [];
    for (let i = 0; i < 8; i++) {
        if (value & (1 << i)) bits.push(i);
    }
    return bits;
}

function normalizeStaticMemoryCache(cache) {
    if (!cache) return null;
    const memory = cache.staticMemory || cache.memory || null;
    if (!memory) return null;

    return {
        cache,
        memory,
        memoryStart: cache.memoryStart || KNIGHT_LORE_MEMORY.staticStart,
        memoryEnd: cache.memoryEnd || (
            (cache.memoryStart || KNIGHT_LORE_MEMORY.staticStart) + memory.length
        ),
    };
}

function getStaticMemory(frame) {
    if (!frame || !frame.knightLoreStaticMemory) return null;
    return normalizeStaticMemoryCache(frame.knightLoreStaticMemory);
}

function readStaticByte(staticMemory, address) {
    if (!staticMemory) return null;
    return readKnightLoreByte(staticMemory.memory, staticMemory.memoryStart, address);
}

function readStaticBytes(staticMemory, startAddress, length) {
    if (!staticMemory) return [];
    return readBytes(staticMemory.memory, staticMemory.memoryStart, startAddress, length);
}

function readStaticWord(staticMemory, address) {
    const lo = readStaticByte(staticMemory, address);
    const hi = readStaticByte(staticMemory, address + 1);
    if (lo === null || hi === null) return null;
    return lo | (hi << 8);
}

function countByteBits(value) {
    let byte = value & 0xff;
    let count = 0;
    while (byte) {
        byte &= byte - 1;
        count += 1;
    }
    return count;
}

function countBits(bytes) {
    if (!bytes) return 0;
    return bytes.reduce((total, value) => total + countByteBits(value), 0);
}

function makeSpriteTexturePreviewRows(imageBytes, maskBytes, widthBytes, heightPixels) {
    const rows = [];
    const rowCount = Math.min(heightPixels, SPRITE_TEXTURE_PREVIEW_ROWS);
    for (let y = 0; y < rowCount; y++) {
        let row = '';
        for (let byteX = 0; byteX < widthBytes; byteX++) {
            const byteIndex = y * widthBytes + byteX;
            const imageByte = imageBytes[byteIndex] || 0;
            const maskByte = maskBytes[byteIndex] || 0;
            for (let bit = 0; bit < 8; bit++) {
                const bitMask = 0x80 >> bit;
                if (imageByte & bitMask) {
                    row += '#';
                } else if (maskByte & bitMask) {
                    row += '.';
                } else {
                    row += ' ';
                }
            }
        }
        rows.push(row);
    }
    return rows;
}

function invalidSpriteTexture(spriteId, pointerAddress, warning, extra = {}) {
    return {
        id: spriteId,
        pointerAddress,
        dataAddress: null,
        dataEndAddress: null,
        valid: false,
        warning,
        ...extra,
    };
}

function decodeSpriteTexture(staticMemory, spriteId) {
    if (!Number.isInteger(spriteId) || spriteId < 0) {
        return invalidSpriteTexture(spriteId, null, 'sprite id is not a non-negative integer');
    }

    const pointerAddress = STATIC_TABLES.spritePointerStart
        + spriteId * KNIGHT_LORE_MEMORY.spritePointerEntrySize;
    if (
        pointerAddress < STATIC_TABLES.spritePointerStart
        || pointerAddress + 1 >= STATIC_TABLES.spritePointerEnd
    ) {
        return invalidSpriteTexture(spriteId, pointerAddress, 'sprite pointer is outside the documented table');
    }

    const dataAddress = readStaticWord(staticMemory, pointerAddress);
    if (
        dataAddress === null
        || dataAddress < STATIC_TABLES.spriteDataStart
        || dataAddress + 1 >= STATIC_TABLES.spriteDataEnd
    ) {
        return invalidSpriteTexture(
            spriteId,
            pointerAddress,
            'sprite data pointer is outside the documented data range',
            {dataAddress}
        );
    }

    const widthBytes = readStaticByte(staticMemory, dataAddress);
    const heightPixels = readStaticByte(staticMemory, dataAddress + 1);
    if (
        widthBytes === null
        || heightPixels === null
        || widthBytes <= 0
        || heightPixels <= 0
    ) {
        return invalidSpriteTexture(
            spriteId,
            pointerAddress,
            'sprite width/height header is empty or unreadable',
            {dataAddress, widthBytes, heightPixels}
        );
    }

    const planeByteCount = widthBytes * heightPixels;
    const dataByteLength = 2 + planeByteCount * 2;
    const dataEndAddress = dataAddress + dataByteLength;
    if (dataEndAddress > STATIC_TABLES.spriteDataEnd) {
        return invalidSpriteTexture(
            spriteId,
            pointerAddress,
            'sprite image/mask bytes overrun the documented data range',
            {dataAddress, dataEndAddress, widthBytes, heightPixels, planeByteCount}
        );
    }

    const imageBytes = new Uint8Array(planeByteCount);
    const maskBytes = new Uint8Array(planeByteCount);
    for (let index = 0; index < planeByteCount; index++) {
        const maskByte = readStaticByte(staticMemory, dataAddress + 2 + index * 2);
        const imageByte = readStaticByte(staticMemory, dataAddress + 3 + index * 2);
        if (imageByte === null || maskByte === null) {
            return invalidSpriteTexture(
                spriteId,
                pointerAddress,
                'sprite image/mask byte is unreadable',
                {dataAddress, dataEndAddress, widthBytes, heightPixels, planeByteCount}
            );
        }
        imageBytes[index] = imageByte;
        maskBytes[index] = maskByte;
    }

    return {
        id: spriteId,
        pointerAddress,
        dataAddress,
        dataEndAddress,
        valid: true,
        widthBytes,
        widthPixels: widthBytes * 8,
        heightPixels,
        planeByteCount,
        imageByteCount: planeByteCount,
        maskByteCount: planeByteCount,
        dataByteLength,
        imageBitCount: countBits(imageBytes),
        maskBitCount: countBits(maskBytes),
        bitOrder: 'msb-left',
        imageBytes,
        maskBytes,
        previewRows: makeSpriteTexturePreviewRows(
            imageBytes,
            maskBytes,
            widthBytes,
            heightPixels
        ),
    };
}

function summarizeSpriteTexture(texture) {
    if (!texture) return null;
    return {
        id: texture.id,
        pointerAddress: texture.pointerAddress,
        dataAddress: texture.dataAddress,
        dataEndAddress: texture.dataEndAddress,
        valid: Boolean(texture.valid),
        warning: texture.warning || null,
        widthBytes: texture.widthBytes || null,
        widthPixels: texture.widthPixels || null,
        heightPixels: texture.heightPixels || null,
        imageByteCount: texture.imageByteCount || 0,
        maskByteCount: texture.maskByteCount || 0,
        dataByteLength: texture.dataByteLength || 0,
        imageBitCount: texture.imageBitCount || 0,
        maskBitCount: texture.maskBitCount || 0,
        bitOrder: texture.bitOrder || 'msb-left',
        previewRows: texture.previewRows || [],
    };
}

function buildSpriteTextureCatalog(staticMemory) {
    const spriteCount = Math.floor(
        (STATIC_TABLES.spritePointerEnd - STATIC_TABLES.spritePointerStart)
        / KNIGHT_LORE_MEMORY.spritePointerEntrySize
    );
    const texturesById = new Map();
    const summaries = [];
    const invalidSummaries = [];

    for (let spriteId = 0; spriteId < spriteCount; spriteId++) {
        const texture = decodeSpriteTexture(staticMemory, spriteId);
        texturesById.set(spriteId, texture);
        const summary = summarizeSpriteTexture(texture);
        if (texture.valid) {
            summaries.push(summary);
        } else {
            invalidSummaries.push(summary);
        }
    }

    return {
        pointerTableStart: STATIC_TABLES.spritePointerStart,
        pointerTableEnd: STATIC_TABLES.spritePointerEnd,
        spriteDataStart: STATIC_TABLES.spriteDataStart,
        spriteDataEnd: STATIC_TABLES.spriteDataEnd,
        spriteCount,
        decodedCount: summaries.length,
        invalidCount: invalidSummaries.length,
        texturesById,
        summaries,
        invalidSummaries,
        source: 'sprite pointer table 0x7112..0x7289 and sprite data 0x728A..0xAF6B',
    };
}

function getSpriteTextureCatalog(staticMemory) {
    if (!staticMemory || !staticMemory.memory) return null;
    if (SPRITE_TEXTURE_CATALOG_CACHE.has(staticMemory.memory)) {
        return SPRITE_TEXTURE_CATALOG_CACHE.get(staticMemory.memory);
    }

    const catalog = buildSpriteTextureCatalog(staticMemory);
    SPRITE_TEXTURE_CATALOG_CACHE.set(staticMemory.memory, catalog);
    return catalog;
}

function staticMemoryFromSource(source) {
    return normalizeStaticMemoryCache(source) || getStaticMemory(source);
}

export function getKnightLoreSpriteTextureCatalog(source) {
    const staticMemory = staticMemoryFromSource(source);
    return getSpriteTextureCatalog(staticMemory);
}

export function getKnightLoreSpriteTexture(source, spriteId) {
    const catalog = getKnightLoreSpriteTextureCatalog(source);
    if (!catalog) return null;
    return catalog.texturesById.get(spriteId) || null;
}

export function expandKnightLoreSpriteTexture(texture) {
    if (!texture || !texture.valid) return null;
    const widthPixels = texture.widthPixels;
    const heightPixels = texture.heightPixels;
    const imagePixels = new Uint8Array(widthPixels * heightPixels);
    const maskPixels = new Uint8Array(widthPixels * heightPixels);

    for (let y = 0; y < heightPixels; y++) {
        for (let byteX = 0; byteX < texture.widthBytes; byteX++) {
            const byteIndex = y * texture.widthBytes + byteX;
            const imageByte = texture.imageBytes[byteIndex];
            const maskByte = texture.maskBytes[byteIndex];
            for (let bit = 0; bit < 8; bit++) {
                const bitMask = 0x80 >> bit;
                const pixelIndex = y * widthPixels + byteX * 8 + bit;
                imagePixels[pixelIndex] = (imageByte & bitMask) ? 1 : 0;
                maskPixels[pixelIndex] = (maskByte & bitMask) ? 1 : 0;
            }
        }
    }

    return {
        id: texture.id,
        widthPixels,
        heightPixels,
        bitOrder: texture.bitOrder,
        imagePixels,
        maskPixels,
    };
}

function parseOrientation(memory, memoryStart) {
    const bodyMirrorFlag = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.bodyMirrorFlag);
    const headMirrorFlag = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.headMirrorFlag);
    const headSprite = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.headSprite);
    const bodySprite = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.bodySprite);
    const documentedOrientation = classifyPlayerSprite(
        headSprite,
        bodyMirrorFlag,
        '0x5C41 sprite + 0x5C0F axis threshold'
    );
    const headOrientation = classifyPlayerSprite(
        headSprite,
        headMirrorFlag,
        '0x5C41 sprite + 0x5C2F axis threshold'
    );
    const bodyOrientation = classifyPlayerSprite(
        bodySprite,
        bodyMirrorFlag,
        '0x5C45 sprite + 0x5C0F axis threshold'
    );
    const visualOrientation = documentedOrientation || bodyOrientation;

    return {
        label: visualOrientation ? visualOrientation.axisFacing : 'unknown',
        mirrored: Boolean(visualOrientation && visualOrientation.axisPair === 'north/south'),
        mirrorMeaning: 'direction axis is selected by flag >= 0x'
            + PLAYER_DIRECTION_AXIS_THRESHOLD.toString(16).padStart(2, '0'),
        directionAxisThreshold: PLAYER_DIRECTION_AXIS_THRESHOLD,
        mirrorFlagsConsistent: bodyMirrorFlag === headMirrorFlag,
        spriteMirrorKey: [
            headSprite === null ? '--' : headSprite.toString(16).padStart(2, '0'),
            bodySprite === null ? '--' : bodySprite.toString(16).padStart(2, '0'),
            bodyMirrorFlag === null ? '--' : bodyMirrorFlag.toString(16).padStart(2, '0'),
            headMirrorFlag === null ? '--' : headMirrorFlag.toString(16).padStart(2, '0'),
        ].join(':'),
        bodyMirrorFlag,
        headMirrorFlag,
        bodyMirrorFlagBits: flagBits(bodyMirrorFlag),
        headMirrorFlagBits: flagBits(headMirrorFlag),
        headSprite,
        bodySprite,
        documentedOrientation,
        primaryOrientation: visualOrientation,
        visualFacing: visualOrientation ? visualOrientation.axisFacing : null,
        visualAxisPair: visualOrientation ? visualOrientation.axisPair : null,
        visualFacingSource: visualOrientation ? visualOrientation.source : 'unclassified sprite/mirror combination',
        bodyOrientation,
        headOrientation,
        state: {
            label: visualOrientation ? visualOrientation.state : 'unclassified',
            source: visualOrientation ? visualOrientation.source : 'sprite table pending validation',
        },
    };
}

function classifyPlayerSprite(spriteId, mirrorFlag, source) {
    if (spriteId === null || spriteId === undefined) return null;
    const directionFlag = mirrorFlag || 0;
    const usesYAxis = directionFlag >= PLAYER_DIRECTION_AXIS_THRESHOLD;
    const lowerSpriteId = spriteId & 0xff;
    const spriteGroups = {
        0x18: {state: 'human', westEastAxisFacing: '-X', northSouthAxisFacing: '+Y'},
        0x19: {state: 'human', westEastAxisFacing: '+X', northSouthAxisFacing: '-Y'},
        0x1d: {state: 'wolf', westEastAxisFacing: '-X', northSouthAxisFacing: '+Y'},
        0x1e: {state: 'wolf', westEastAxisFacing: '+X', northSouthAxisFacing: '-Y'},
        0x1f: {state: 'wolf', westEastAxisFacing: '+X', northSouthAxisFacing: '-Y'},
    };
    const group = spriteGroups[lowerSpriteId];
    if (!group) return null;

    return {
        spriteId,
        mirrorFlag,
        directionAxisThreshold: PLAYER_DIRECTION_AXIS_THRESHOLD,
        mirrored: usesYAxis,
        state: group.state,
        axisPair: usesYAxis ? 'north/south' : 'west/east',
        axisFacing: usesYAxis ? group.northSouthAxisFacing : group.westEastAxisFacing,
        source: source + ', Figure 17 threshold 0x'
            + PLAYER_DIRECTION_AXIS_THRESHOLD.toString(16).padStart(2, '0'),
    };
}

function parseDimensionTriplet(bytes) {
    return {
        x: bytes[4],
        y: bytes[5],
        z: bytes[6],
        width: bytes[4],
        depth: bytes[5],
        height: bytes[6],
    };
}

function parseDynamicVisualRecord(memory, memoryStart, address, slotIndex) {
    const bytes = readBytes(memory, memoryStart, address, KNIGHT_LORE_MEMORY.dynamicVisualRecordSize);
    if (bytes.some(byte => byte === null)) return null;
    if (bytes.every(byte => byte === 0)) return null;
    if (bytes[0] === 0) return null;

    const flags = bytes[7];
    const position = {
        x: bytes[1],
        y: bytes[2],
        z: bytes[3],
    };

    return {
        address,
        slotIndex,
        slotSize: KNIGHT_LORE_MEMORY.dynamicVisualSlotSize,
        raw: bytes,
        slotRaw: readBytes(memory, memoryStart, address, KNIGHT_LORE_MEMORY.dynamicVisualSlotSize),
        spriteId: bytes[0],
        position,
        screenPosition: position,
        dimensions: parseDimensionTriplet(bytes),
        flags: {
            raw: flags,
            bits: flagBits(flags),
        },
    };
}

function parseDynamicVisualRecords(memory, memoryStart, opts) {
    const startAddress = opts.dynamicRoomStart || KNIGHT_LORE_MEMORY.dynamicRoomStart;
    const memoryEnd = memoryStart + (memory ? memory.length : 0);
    const availableSlots = Math.floor(Math.max(0, memoryEnd - startAddress) / KNIGHT_LORE_MEMORY.dynamicVisualSlotSize);
    const maxSlots = Math.min(
        opts.maxDynamicVisualSlots || opts.maxDynamicSprites || DEFAULT_MAX_DYNAMIC_VISUAL_SLOTS,
        availableSlots
    );
    const records = [];

    for (let i = 0; i < maxSlots; i++) {
        const address = startAddress + i * KNIGHT_LORE_MEMORY.dynamicVisualSlotSize;
        const record = parseDynamicVisualRecord(memory, memoryStart, address, i);
        if (record) records.push(record);
    }

    return records;
}

function parseSelectedBytes(memory, memoryStart) {
    return DEBUG_BYTE_DEFINITIONS
        .map(([key, address]) => ({
            key,
            address,
            value: readKnightLoreByte(memory, memoryStart, address),
        }))
        .sort((a, b) => a.address - b.address);
}

function parseRoom(memory, memoryStart) {
    const colourAttribute = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.room.colourAttribute);

    return {
        id: readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.room.id),
        colourAttribute,
        color: colourAttribute,
        size: {
            x: readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.room.sizeX),
            y: readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.room.sizeY),
            z: readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.room.sizeZ),
        },
    };
}

function parseStaticRoomSize(staticMemory, selector) {
    if (!Number.isInteger(selector) || selector < 0) return null;
    const address = STATIC_TABLES.roomSizesStart + selector * STATIC_TABLES.roomSizeEntrySize;
    const bytes = readStaticBytes(staticMemory, address, STATIC_TABLES.roomSizeEntrySize);
    if (bytes.length !== STATIC_TABLES.roomSizeEntrySize || bytes.some(byte => byte === null)) {
        return null;
    }

    return {
        selector,
        address,
        x: bytes[0],
        y: bytes[1],
        z: bytes[2],
        raw: bytes,
    };
}

function classifyBackgroundType(id) {
    return BACKGROUND_TYPES[id] || {
        label: 'background ' + id,
        category: 'unknown-background',
    };
}

function parseStaticBackgroundRecord(staticMemory, address, index) {
    const bytes = readStaticBytes(staticMemory, address, KNIGHT_LORE_MEMORY.dynamicVisualRecordSize);
    if (bytes.some(byte => byte === null)) return null;
    if (bytes[0] === 0) return null;

    const flags = bytes[7];
    return {
        index,
        address,
        raw: bytes,
        spriteId: bytes[0],
        position: {
            x: bytes[1],
            y: bytes[2],
            z: bytes[3],
        },
        screenPosition: {
            x: bytes[1],
            y: bytes[2],
            z: bytes[3],
        },
        dimensions: parseDimensionTriplet(bytes),
        flags: {
            raw: flags,
            bits: flagBits(flags),
            flipVertical: Boolean(flags & 0x80),
            flipHorizontal: Boolean(flags & 0x40),
            drawInternal: Boolean(flags & 0x10),
        },
    };
}

function parseStaticBackgroundType(staticMemory, id) {
    const definition = classifyBackgroundType(id);
    const pointerAddress = STATIC_TABLES.backgroundPointerStart + id * 2;
    const result = {
        id,
        pointerAddress,
        dataAddress: null,
        records: [],
        ...definition,
    };

    if (
        pointerAddress < STATIC_TABLES.backgroundPointerStart
        || pointerAddress + 1 >= STATIC_TABLES.backgroundPointerEnd
    ) {
        return {
            ...result,
            warning: 'background pointer is outside the documented table',
        };
    }

    const dataAddress = readStaticWord(staticMemory, pointerAddress);
    result.dataAddress = dataAddress;
    if (
        dataAddress === null
        || dataAddress < STATIC_TABLES.backgroundDataStart
        || dataAddress >= STATIC_TABLES.backgroundDataEnd
    ) {
        return {
            ...result,
            warning: 'background data pointer is outside the documented data range',
        };
    }

    let address = dataAddress;
    let index = 0;
    while (address < STATIC_TABLES.backgroundDataEnd && index < 64) {
        const record = parseStaticBackgroundRecord(staticMemory, address, index);
        if (!record) break;
        result.records.push(record);
        address += KNIGHT_LORE_MEMORY.dynamicVisualRecordSize;
        index += 1;
    }

    return result;
}

function parseStaticLocation(frame, room) {
    const staticMemory = getStaticMemory(frame);
    if (!staticMemory || room.id === null || room.id === undefined) return null;

    let address = STATIC_TABLES.locationsStart;
    let locationIndex = 0;

    while (address < STATIC_TABLES.locationsEnd && locationIndex < 256) {
        const screenId = readStaticByte(staticMemory, address);
        const sizeByte = readStaticByte(staticMemory, address + 1);
        if (screenId === null || sizeByte === null || sizeByte === 0) break;

        const entryEnd = address + 1 + sizeByte;
        if (entryEnd > STATIC_TABLES.locationsEnd) {
            return {
                error: 'location entry extends past the documented location table',
                address,
                entryEnd,
            };
        }

        if (screenId === room.id) {
            const header = readStaticByte(staticMemory, address + 2);
            const sizeSelector = header === null ? null : header >> 3;
            const attr = header === null ? null : header & 0x07;
            const dimensions = parseStaticRoomSize(staticMemory, sizeSelector);
            const backgroundIds = [];
            let cursor = address + 3;
            let foundTerminator = false;

            while (cursor < entryEnd) {
                const value = readStaticByte(staticMemory, cursor);
                if (value === null) break;
                cursor += 1;
                if (value === 0xff) {
                    foundTerminator = true;
                    break;
                }
                backgroundIds.push(value);
            }

            const backgrounds = backgroundIds.map(id => parseStaticBackgroundType(staticMemory, id));
            const sizeMatchesWorkMemory = dimensions
                ? (
                    dimensions.x === room.size.x
                    && dimensions.y === room.size.y
                    && dimensions.z === room.size.z
                )
                : false;
            const attrMatchesWorkMemory = (
                attr !== null
                && room.colourAttribute !== null
                && (room.colourAttribute & 0x07) === attr
            );

            return {
                address,
                entryEnd,
                locationIndex,
                screenId,
                sizeByte,
                header,
                sizeSelector,
                attr,
                dimensions,
                backgroundIds,
                backgrounds,
                backgroundListTerminated: foundTerminator,
                blockDataStart: cursor,
                blockDataEnd: entryEnd,
                comparisons: {
                    sizeMatchesWorkMemory,
                    attrMatchesWorkMemory,
                },
            };
        }

        address = entryEnd;
        locationIndex += 1;
    }

    return {
        error: 'room id was not found in the static location table',
        roomId: room.id,
    };
}

function flattenStaticBackgroundRecords(staticLocation) {
    if (!staticLocation || !staticLocation.backgrounds) return [];

    const records = [];
    staticLocation.backgrounds.forEach((background, backgroundIndex) => {
        (background.records || []).forEach((record, recordIndex) => {
            records.push({
                ...record,
                staticIndex: records.length,
                backgroundIndex,
                backgroundId: background.id,
                backgroundLabel: background.label,
                category: background.category,
                side: background.side || null,
                recordIndex,
            });
        });
    });
    return records;
}

function compareVisualField(label, staticValue, dynamicValue, mismatches) {
    if (staticValue !== dynamicValue) {
        mismatches.push({
            field: label,
            staticValue,
            dynamicValue,
        });
    }
}

function compareStaticAndDynamicRecord(staticRecord, dynamicRecord) {
    if (!dynamicRecord) {
        return {
            status: 'missing-dynamic',
            mismatches: [],
        };
    }

    const mismatches = [];
    compareVisualField('sprite', staticRecord.spriteId, dynamicRecord.spriteId, mismatches);
    compareVisualField('x', staticRecord.position.x, dynamicRecord.position.x, mismatches);
    compareVisualField('y', staticRecord.position.y, dynamicRecord.position.y, mismatches);
    compareVisualField('z', staticRecord.position.z, dynamicRecord.position.z, mismatches);
    compareVisualField('dimX', staticRecord.dimensions.x, dynamicRecord.dimensions.x, mismatches);
    compareVisualField('dimY', staticRecord.dimensions.y, dynamicRecord.dimensions.y, mismatches);
    compareVisualField('dimZ', staticRecord.dimensions.z, dynamicRecord.dimensions.z, mismatches);
    compareVisualField('flags', staticRecord.flags.raw, dynamicRecord.flags.raw, mismatches);

    return {
        status: mismatches.length === 0 ? 'exact' : 'mismatch',
        mismatches,
    };
}

function compactRecord(record) {
    if (!record) return null;
    return {
        address: record.address,
        spriteId: record.spriteId,
        position: record.position,
        dimensions: record.dimensions,
        flags: record.flags ? record.flags.raw : null,
        raw: record.raw,
    };
}

function compareStaticBackgroundsToDynamic(staticLocation, dynamicVisualRecords) {
    const staticRecords = flattenStaticBackgroundRecords(staticLocation);
    const dynamicRecords = dynamicVisualRecords || [];
    const anchorsTrusted = Boolean(
        staticLocation
        && staticLocation.comparisons
        && staticLocation.comparisons.sizeMatchesWorkMemory
        && staticLocation.comparisons.attrMatchesWorkMemory
    );
    const rows = [];
    let exactCount = 0;
    let mismatchCount = 0;
    let missingDynamicCount = 0;
    let firstIssueIndex = null;

    staticRecords.forEach((staticRecord, index) => {
        const dynamicRecord = dynamicRecords[index] || null;
        const comparison = compareStaticAndDynamicRecord(staticRecord, dynamicRecord);
        if (comparison.status === 'exact') exactCount += 1;
        if (comparison.status === 'mismatch') mismatchCount += 1;
        if (comparison.status === 'missing-dynamic') missingDynamicCount += 1;
        if (comparison.status !== 'exact' && firstIssueIndex === null) {
            firstIssueIndex = index;
        }
        rows.push({
            index,
            status: comparison.status,
            mismatches: comparison.mismatches,
            staticRecord: compactRecord(staticRecord),
            staticSource: {
                backgroundIndex: staticRecord.backgroundIndex,
                backgroundId: staticRecord.backgroundId,
                backgroundLabel: staticRecord.backgroundLabel,
                category: staticRecord.category,
                side: staticRecord.side,
                recordIndex: staticRecord.recordIndex,
            },
            dynamicRecord: compactRecord(dynamicRecord),
        });
    });

    const extraDynamicRecords = dynamicRecords.slice(staticRecords.length);
    extraDynamicRecords.forEach((dynamicRecord, extraIndex) => {
        rows.push({
            index: staticRecords.length + extraIndex,
            status: 'extra-dynamic',
            mismatches: [],
            staticRecord: null,
            staticSource: null,
            dynamicRecord: compactRecord(dynamicRecord),
        });
    });

    return {
        strategy: 'ordered static background records vs dynamic visual prefix',
        staticRecordCount: staticRecords.length,
        dynamicRecordCount: dynamicRecords.length,
        comparedPrefixCount: Math.min(staticRecords.length, dynamicRecords.length),
        anchorsTrusted,
        exactCount,
        mismatchCount,
        missingDynamicCount,
        extraDynamicCount: extraDynamicRecords.length,
        firstIssueIndex,
        prefixStatus: !anchorsTrusted
            ? 'untrusted'
            : (
                mismatchCount === 0 && missingDynamicCount === 0
                    ? 'exact'
                    : 'diverged'
            ),
        rows,
    };
}

function parseStaticCacheSummary(frame) {
    if (!frame || !frame.knightLoreStaticMemory) return null;
    const cache = frame.knightLoreStaticMemory;

    return {
        memoryStart: cache.memoryStart,
        memoryEnd: cache.memoryEnd,
        byteLength: cache.byteLength || (
            cache.staticMemory ? cache.staticMemory.length : null
        ),
        ranges: cache.ranges || null,
    };
}

function addSpriteTextureId(ids, value) {
    if (Number.isInteger(value) && value >= 0) {
        ids.add(value);
    }
}

function collectCurrentSceneSpriteIds(staticLocation, dynamicVisualRecords, collectableItems) {
    const ids = new Set();

    if (staticLocation && Array.isArray(staticLocation.backgrounds)) {
        staticLocation.backgrounds.forEach(background => {
            (background.records || []).forEach(record => addSpriteTextureId(ids, record.spriteId));
        });
    }

    (dynamicVisualRecords || []).forEach(record => addSpriteTextureId(ids, record.spriteId));

    if (collectableItems && Array.isArray(collectableItems.currentRoomRecords)) {
        collectableItems.currentRoomRecords.forEach(record => {
            addSpriteTextureId(ids, record.spriteId);
            addSpriteTextureId(ids, record.graphicId);
        });
    }

    return [...ids].sort((a, b) => a - b);
}

function buildSpriteTextureSceneSummary(
    frame,
    staticLocation,
    dynamicVisualRecords,
    collectableItems
) {
    const staticMemory = getStaticMemory(frame);
    if (!staticMemory) {
        return {
            available: false,
            source: 'static memory not available',
            referencedSpriteIds: [],
            referencedTextures: [],
        };
    }

    const catalog = getSpriteTextureCatalog(staticMemory);
    const referencedSpriteIds = collectCurrentSceneSpriteIds(
        staticLocation,
        dynamicVisualRecords,
        collectableItems
    );
    const referencedTextures = referencedSpriteIds
        .map(spriteId => summarizeSpriteTexture(catalog.texturesById.get(spriteId)))
        .filter(Boolean);
    const invalidReferencedCount = referencedTextures
        .filter(texture => !texture.valid)
        .length;

    return {
        available: true,
        source: catalog.source,
        pointerTableStart: catalog.pointerTableStart,
        pointerTableEnd: catalog.pointerTableEnd,
        spriteDataStart: catalog.spriteDataStart,
        spriteDataEnd: catalog.spriteDataEnd,
        spriteCount: catalog.spriteCount,
        decodedCount: catalog.decodedCount,
        invalidCount: catalog.invalidCount,
        referencedCount: referencedSpriteIds.length,
        invalidReferencedCount,
        referencedSpriteIds,
        referencedTextures,
    };
}

function getLiveItemMemory(frame) {
    if (!frame || !frame.itemMemory) return null;
    return {
        memory: frame.itemMemory,
        memoryStart: frame.itemMemoryStart || KNIGHT_LORE_MEMORY.itemTableStart,
        memoryEnd: frame.itemMemoryEnd || KNIGHT_LORE_MEMORY.itemTableEnd,
    };
}

function parseLiveCollectableItemSlot(memory, memoryStart, room, slotIndex) {
    const slotAddress = KNIGHT_LORE_MEMORY.item.liveSlotStarts[slotIndex];
    const spriteId = readKnightLoreByte(
        memory,
        memoryStart,
        slotAddress + KNIGHT_LORE_MEMORY.item.spriteOffset
    );
    const position = readPosition(memory, memoryStart, {
        x: slotAddress + KNIGHT_LORE_MEMORY.item.xOffset,
        y: slotAddress + KNIGHT_LORE_MEMORY.item.yOffset,
        z: slotAddress + KNIGHT_LORE_MEMORY.item.zOffset,
    });
    const roomId = readKnightLoreByte(
        memory,
        memoryStart,
        slotAddress + KNIGHT_LORE_MEMORY.item.roomOffset
    );
    const hasValidBytes = spriteId !== null
        && roomId !== null
        && position.x !== null
        && position.y !== null
        && position.z !== null;
    const isActive = Boolean(
        hasValidBytes
        && spriteId !== KNIGHT_LORE_MEMORY.item.inactiveSpriteId
    );

    return {
        slotIndex,
        slotAddress,
        spriteId,
        graphicId: spriteId,
        position,
        roomId,
        isActive,
        inCurrentRoom: Boolean(
            isActive
            && room
            && room.id !== null
            && room.id !== undefined
            && roomId === room.id
        ),
        source: formatLiveItemSlotSource(slotAddress),
    };
}

function parseLiveCollectableItems(memory, memoryStart, room) {
    return KNIGHT_LORE_MEMORY.item.liveSlotStarts.map((slotAddress, slotIndex) => (
        parseLiveCollectableItemSlot(memory, memoryStart, room, slotIndex)
    ));
}

function formatLiveItemSlotSource(slotAddress) {
    return '0x'
        + slotAddress.toString(16).toUpperCase().padStart(4, '0')
        + '..0x'
        + (slotAddress + KNIGHT_LORE_MEMORY.item.roomOffset).toString(16).toUpperCase().padStart(4, '0')
        + ' live item slot';
}

function findStorageRecordForLiveItem(records, liveItem, usedStorageIndexes = new Set()) {
    if (
        !liveItem
        || !liveItem.isActive
        || liveItem.spriteId === null
        || liveItem.spriteId === undefined
        || liveItem.spriteId === KNIGHT_LORE_MEMORY.item.inactiveSpriteId
    ) {
        return null;
    }
    const spriteMatches = records.filter(record => (
        record.graphicId === liveItem.spriteId && !usedStorageIndexes.has(record.index)
    ));
    if (spriteMatches.length === 0) return null;
    if (spriteMatches.length === 1) return spriteMatches[0];

    return spriteMatches.find(record => record.currentScreen === liveItem.roomId)
        || spriteMatches.find(record => record.startScreen === liveItem.roomId)
        || spriteMatches[0];
}

function recordFromLiveItem(liveItem, storageRecord) {
    return {
        index: storageRecord ? storageRecord.index : null,
        address: storageRecord ? storageRecord.address : null,
        raw: storageRecord ? storageRecord.raw : [],
        graphicId: liveItem.spriteId,
        spriteId: liveItem.spriteId,
        liveSlotIndex: liveItem.slotIndex,
        liveSlotAddress: liveItem.slotAddress,
        startPosition: storageRecord ? storageRecord.startPosition : null,
        startScreen: storageRecord ? storageRecord.startScreen : null,
        currentPosition: storageRecord ? storageRecord.currentPosition : liveItem.position,
        currentScreen: storageRecord ? storageRecord.currentScreen : liveItem.roomId,
        storageRecordIndex: storageRecord ? storageRecord.index : null,
        storageRecordAddress: storageRecord ? storageRecord.address : null,
        storagePosition: storageRecord ? storageRecord.currentPosition : null,
        storageScreen: storageRecord ? storageRecord.currentScreen : null,
        livePosition: liveItem.position,
        liveRoomId: liveItem.roomId,
        livePositionSource: liveItem.source,
        liveRoomSource: liveItem.source,
        isActive: liveItem.isActive,
        inCurrentRoom: liveItem.inCurrentRoom,
    };
}

function parseCollectableItems(frame, room, memory, memoryStart) {
    const itemMemory = getLiveItemMemory(frame);
    const liveItems = parseLiveCollectableItems(memory, memoryStart, room);
    if (!itemMemory) {
        return {
            tableStart: KNIGHT_LORE_MEMORY.itemTableStart,
            tableEnd: KNIGHT_LORE_MEMORY.itemTableEnd,
            recordSize: KNIGHT_LORE_MEMORY.itemRecordSize,
            records: [],
            currentRoomRecords: [],
            liveItems,
            source: 'live item table unavailable',
        };
    }

    const records = [];
    const recordCount = Math.floor(
        (itemMemory.memoryEnd - itemMemory.memoryStart) / KNIGHT_LORE_MEMORY.itemRecordSize
    );
    for (let index = 0; index < recordCount; index++) {
        const address = itemMemory.memoryStart + index * KNIGHT_LORE_MEMORY.itemRecordSize;
        const raw = readBytes(
            itemMemory.memory,
            itemMemory.memoryStart,
            address,
            KNIGHT_LORE_MEMORY.itemRecordSize
        );
        if (raw.some(byte => byte === null)) continue;

        records.push({
            index,
            address,
            raw,
            graphicId: raw[0],
            startPosition: {x: raw[1], y: raw[2], z: raw[3]},
            startScreen: raw[4],
            currentPosition: {x: raw[5], y: raw[6], z: raw[7]},
            currentScreen: raw[8],
            inCurrentRoom: room && room.id !== null && room.id !== undefined && raw[8] === room.id,
        });
    }

    const usedStorageIndexes = new Set();
    const currentRoomRecords = liveItems
        .filter(liveItem => liveItem.inCurrentRoom)
        .map(liveItem => {
            const storageRecord = findStorageRecordForLiveItem(records, liveItem, usedStorageIndexes);
            if (storageRecord) usedStorageIndexes.add(storageRecord.index);
            return recordFromLiveItem(liveItem, storageRecord);
        });

    return {
        tableStart: itemMemory.memoryStart,
        tableEnd: itemMemory.memoryEnd,
        recordSize: KNIGHT_LORE_MEMORY.itemRecordSize,
        records,
        currentRoomRecords,
        liveItems,
        source: 'live slots at 0x5C48 and 0x5C68 with 0x6FF2 storage table',
    };
}

export function extractKnightLoreScene(source, opts = {}) {
    const {memory, memoryStart, frame} = getMemoryAndStart(source, opts);
    const room = parseRoom(memory, memoryStart);
    const staticLocation = parseStaticLocation(frame, room);
    const body = readPosition(memory, memoryStart, {
        x: KNIGHT_LORE_MEMORY.player.bodyX,
        y: KNIGHT_LORE_MEMORY.player.bodyY,
        z: KNIGHT_LORE_MEMORY.player.bodyZ,
    });
    const head = readPosition(memory, memoryStart, {
        x: KNIGHT_LORE_MEMORY.player.headX,
        y: KNIGHT_LORE_MEMORY.player.headY,
        z: KNIGHT_LORE_MEMORY.player.headZ,
    });
    const headOverlayPosition = readPosition(memory, memoryStart, {
        x: KNIGHT_LORE_MEMORY.player.headRenderX,
        y: KNIGHT_LORE_MEMORY.player.headY,
        z: KNIGHT_LORE_MEMORY.player.headZ,
    });
    const orientation = parseOrientation(memory, memoryStart);
    const dynamicVisualRecords = parseDynamicVisualRecords(memory, memoryStart, opts);
    const backgroundComparison = compareStaticBackgroundsToDynamic(staticLocation, dynamicVisualRecords);
    const collectableItems = parseCollectableItems(
        frame,
        room,
        memory,
        memoryStart
    );
    const spriteTextures = buildSpriteTextureSceneSummary(
        frame,
        staticLocation,
        dynamicVisualRecords,
        collectableItems
    );

    return {
        memoryStart,
        memoryEnd: memoryStart + (memory ? memory.length : 0),
        frame: frame ? {
            pc: frame.pc,
            tstates: frame.tstates,
            halted: frame.halted,
            im: frame.im,
            iff1: frame.iff1,
            iff2: frame.iff2,
        } : null,
        player: {
            body: {
                ...body,
                screenPosition: body,
                renderPosition: body,
            },
            head: {
                ...head,
                screenPosition: headOverlayPosition,
                highResolutionPosition: toHighResolutionPosition(head),
                semanticPosition: head,
                renderPositionCandidate: headOverlayPosition,
                overlayPosition: headOverlayPosition,
                renderPositionSource: '0x5C29,0x5C2A,0x5C2B',
            },
            orientation,
        },
        room: {
            ...room,
            staticCache: parseStaticCacheSummary(frame),
            staticLocation,
            staticBackgrounds: staticLocation && staticLocation.backgrounds
                ? staticLocation.backgrounds
                : [],
            staticBackgroundRecords: backgroundComparison.rows
                .filter(row => row.staticRecord)
                .map(row => ({
                    ...row.staticRecord,
                    staticSource: row.staticSource,
                })),
            backgroundComparison,
            dynamicStart: KNIGHT_LORE_MEMORY.dynamicRoomStart,
            dynamicSlotSize: KNIGHT_LORE_MEMORY.dynamicVisualSlotSize,
            dynamicHeader: readBytes(memory, memoryStart, KNIGHT_LORE_MEMORY.dynamicRoomStart, 8),
            dynamicVisualRecords,
            sprites: dynamicVisualRecords,
            collectableItems,
            spriteTextures,
        },
        objects: dynamicVisualRecords,
        collectableItems,
        spriteTextures,
        raw: {
            selectedBytes: parseSelectedBytes(memory, memoryStart),
        },
    };
}
