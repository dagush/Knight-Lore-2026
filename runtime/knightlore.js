export const KNIGHT_LORE_MEMORY = {
    scratchStart: 0x5ba0,
    scratchEnd: 0x6108,
    dynamicRoomStart: 0x5c88,
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
};

const DEFAULT_MAX_DYNAMIC_SPRITES = 96;
const DYNAMIC_SPRITE_RECORD_SIZE = 8;
const HIGH_RES_ORIGIN = 72;
const HIGH_RES_SCREEN_Z = 128;

const DEBUG_BYTE_DEFINITIONS = [
    ['player.body.x', KNIGHT_LORE_MEMORY.player.bodyX],
    ['player.body.y', KNIGHT_LORE_MEMORY.player.bodyY],
    ['player.body.z', KNIGHT_LORE_MEMORY.player.bodyZ],
    ['player.body.mirrorFlag', KNIGHT_LORE_MEMORY.player.bodyMirrorFlag],
    ['player.head.x', KNIGHT_LORE_MEMORY.player.headX],
    ['player.head.y', KNIGHT_LORE_MEMORY.player.headY],
    ['player.head.z', KNIGHT_LORE_MEMORY.player.headZ],
    ['player.head.mirrorFlag', KNIGHT_LORE_MEMORY.player.headMirrorFlag],
    ['player.head.sprite', KNIGHT_LORE_MEMORY.player.headSprite],
    ['player.body.sprite', KNIGHT_LORE_MEMORY.player.bodySprite],
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

function parseOrientation(memory, memoryStart) {
    const bodyMirrorFlag = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.bodyMirrorFlag);
    const headMirrorFlag = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.headMirrorFlag);
    const headSprite = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.headSprite);
    const bodySprite = readKnightLoreByte(memory, memoryStart, KNIGHT_LORE_MEMORY.player.bodySprite);

    return {
        label: 'unknown',
        mirrored: Boolean(bodyMirrorFlag || headMirrorFlag),
        bodyMirrorFlag,
        headMirrorFlag,
        bodyMirrorFlagBits: flagBits(bodyMirrorFlag),
        headMirrorFlagBits: flagBits(headMirrorFlag),
        headSprite,
        bodySprite,
    };
}

function parseDynamicSpriteRecord(memory, memoryStart, address) {
    const bytes = readBytes(memory, memoryStart, address, DYNAMIC_SPRITE_RECORD_SIZE);
    if (bytes.some(byte => byte === null)) return null;
    if (bytes.every(byte => byte === 0)) return null;

    const flags = bytes[7];
    const position = {
        x: bytes[1],
        y: bytes[2],
        z: bytes[3],
    };

    return {
        address,
        raw: bytes,
        spriteId: bytes[0],
        position,
        screenPosition: toHighResolutionPosition(position),
        dimensions: {
            width: bytes[4],
            height: bytes[5],
            depth: bytes[6],
        },
        flags: {
            raw: flags,
            bits: flagBits(flags),
        },
    };
}

function parseDynamicSprites(memory, memoryStart, opts) {
    const startAddress = opts.dynamicRoomStart || KNIGHT_LORE_MEMORY.dynamicRoomStart;
    const maxSprites = opts.maxDynamicSprites || DEFAULT_MAX_DYNAMIC_SPRITES;
    const sprites = [];

    for (let i = 0; i < maxSprites; i++) {
        const address = startAddress + i * DYNAMIC_SPRITE_RECORD_SIZE;
        const record = parseDynamicSpriteRecord(memory, memoryStart, address);
        if (!record) break;
        sprites.push(record);
    }

    return sprites;
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

export function extractKnightLoreScene(source, opts = {}) {
    const {memory, memoryStart, frame} = getMemoryAndStart(source, opts);
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
    const dynamicSprites = parseDynamicSprites(memory, memoryStart, opts);

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
            },
            head: {
                ...head,
                screenPosition: headOverlayPosition,
                highResolutionPosition: toHighResolutionPosition(head),
                overlayPosition: headOverlayPosition,
            },
            orientation: parseOrientation(memory, memoryStart),
        },
        room: {
            dynamicStart: KNIGHT_LORE_MEMORY.dynamicRoomStart,
            dynamicHeader: readBytes(memory, memoryStart, KNIGHT_LORE_MEMORY.dynamicRoomStart, 8),
            sprites: dynamicSprites,
        },
        objects: dynamicSprites,
        raw: {
            selectedBytes: parseSelectedBytes(memory, memoryStart),
        },
    };
}
