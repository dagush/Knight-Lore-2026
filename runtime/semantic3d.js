import * as THREE from 'three';
import {
    expandKnightLoreSpriteTexture,
    getKnightLoreSpriteTexture,
} from './knightlore.js';
import {
    KnightLoreFull3DBackgroundRenderer,
    SPRITE_TEXTURE_VERTICAL_FLIP_IDS,
} from './knightlore-full3d-renderer.js';
import {
    BASIC_BLOCK_GAME_SIZE,
    blockUnitsToSceneSize,
    createFull3DObjectModel,
    disposeFull3DObjectModel,
} from './knightlore-full3d-objects.js';
import { KnightLoreSchematicBackgroundRenderer } from './knightlore-schematic-renderer.js';

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

const DEFAULT_ROOM_DIMENSIONS = {
    width: 64,
    depth: 64,
    height: 64,
};
const DISPLAY_ROOM_HEIGHT = 64;
const CAD_CAMERA_DISTANCE = 500;
const MIN_CAMERA_FRUSTUM_HEIGHT = 96;
const CAMERA_FRUSTUM_RADIUS_SCALE = 1.72;
const FULL_3D_CAMERA_ZOOM = 1.2;
const FULL_3D_CAMERA_TARGET_HEIGHT_FACTOR = 0.34;
const WALL_TEXTURE_VISIBILITY_EPSILON = 0.0001;
const WALL_OPACITY = 0.3;
const VIEWER_WALL_OPACITY = 0.07;
const FLOOR_OPACITY = 0.18;
const PLAYER_PROXY_BLOCK_UNITS = {x: 0.88, y: 0.88, z: 1.84};
const PLAYER_BODY_SIZE = blockUnitsToSceneSize({x: 0.72, y: 0.78, z: 1.18});
const PLAYER_HEAD_SIZE = blockUnitsToSceneSize({x: 0.56, y: 0.6, z: 0.52});
const PLAYER_SPRITE_BILLBOARD_HALF_SIZE = blockUnitsToSceneSize({x: 1, y: 1, z: 1});
const PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET = 0.16;
const PLAYER_TOP_BOTTOM_MARKER_RADIUS = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width * 0.42;
const PLAYER_TOP_BOTTOM_MARKER_ARROW_LENGTH = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.depth * 0.82;
const PLAYER_TOP_BOTTOM_MARKER_HEIGHT = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height * 2 + 1;
const LIVE_ACTOR_TOP_BOTTOM_MARKER_RADIUS = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width * 0.34;
const LIVE_ACTOR_TOP_BOTTOM_MARKER_ARROW_LENGTH = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.depth * 0.64;
const LIVE_ACTOR_TOP_BOTTOM_MARKER_HEIGHT = PLAYER_TOP_BOTTOM_MARKER_HEIGHT;
const PLAYER_SPRITE_BILLBOARD_FACINGS = [
    {id: 'north', color: 0x38bdf8, normal: new THREE.Vector3(0, 0, -1)},
    {id: 'east', color: 0x22c55e, normal: new THREE.Vector3(1, 0, 0)},
    {id: 'south', color: 0xfacc15, normal: new THREE.Vector3(0, 0, 1)},
    {id: 'west', color: 0xec4899, normal: new THREE.Vector3(-1, 0, 0)},
];
const PLAYER_SPRITE_BILLBOARD_FACING_INDEX = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
};
// Four-direction sprite policy:
// - cameraSide selects which pre-existing billboard plane is visible. This is a
//   geometry/display choice only; do not use it to make the character rotate.
// - textureReferenceSide selects which side of the character the sprite should
//   represent. View names describe the camera side, not the direction it looks:
//   "North" means the camera is north of the room, so a north-facing character
//   shows its front and a south-facing character shows its back.
// - textureStrategy describes how to choose the actual sprite id once the
//   relative character/view relation is known. The game view keeps the live
//   Spectrum sprite selection; opposite/diagonal views are explicit because the
//   original art is not a true four-view 3D model.
// - mirrorTextureXByFacing and swapTextureSideByFacing are explicit perceptual
//   correction tables. They are not global toggles: each view chooses north,
//   south, east, and west independently so visual testing can tune one corner
//   case without disturbing the other axis.
const PLAYER_SPRITE_BILLBOARD_VIEW_POLICIES = {
    game: {
        label: 'game-live-south-east',
        cameraSide: 'east',
        textureReferenceSide: 'east',
        textureStrategy: 'live',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    right: {
        label: 'cardinal-camera-east',
        cameraSide: 'east',
        textureReferenceSide: 'east',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    left: {
        label: 'cardinal-camera-west',
        cameraSide: 'west',
        textureReferenceSide: 'west',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    front: {
        label: 'cardinal-camera-south',
        cameraSide: 'south',
        textureReferenceSide: 'south',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    back: {
        label: 'cardinal-camera-north',
        cameraSide: 'north',
        textureReferenceSide: 'north',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    'upper-back-left': {
        label: 'opposite-game-north-west',
        cameraSide: 'west',
        textureReferenceSide: 'west',
        textureStrategy: 'opposite-live',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    'upper-front-left': {
        label: 'chosen-south-west',
        cameraSide: 'south',
        textureReferenceSide: 'south',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: true, west: true},
        swapTextureSideByFacing: {north: false, south: false, east: true, west: true},
    },
    'upper-back-right': {
        label: 'north-east-ns-front-back-swap',
        cameraSide: 'north',
        textureReferenceSide: 'north',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: true, west: true},
        swapTextureSideByFacing: {north: false, south: false, east: true, west: true},
    },
};
const PLAYER_SPRITE_BILLBOARD_TEXTURE_COLORS = {
    human: 0xf97316,
    wolf: 0x60a5fa,
    transformation: 0xfacc15,
    unknown: 0xf8fafc,
};
const PLAYER_SPRITE_TEXTURE_RANGES = {
    human: {
        body: {
            west: {start: 0x10, length: 6},
            east: {start: 0x18, length: 6},
        },
        head: {
            west: {start: 0x20, length: 8},
            east: {start: 0x28, length: 8},
        },
    },
    wolf: {
        body: {
            west: {start: 0x30, length: 6},
            east: {start: 0x38, length: 6},
        },
        head: {
            west: {start: 0x40, length: 8},
            east: {start: 0x48, length: 8},
        },
    },
};
const PLAYER_TRANSFORMATION_SPRITE_RANGE = {start: 0x5c, length: 4};
const PLAYER_BODY_TEXTURE_VERTICAL_SHIFT_RATIO = 0.08;
const PLAYER_POINTER_RADIUS = 1.1;
const PLAYER_POINTER_LENGTH = 3.4;
const PLAYER_HEAD_FALLBACK_OFFSET = new THREE.Vector3(
    0,
    PLAYER_BODY_SIZE.height + PLAYER_HEAD_SIZE.height / 2,
    -0.35
);
const PLAYER_POINTER_OFFSET = new THREE.Vector3(
    0,
    PLAYER_HEAD_FALLBACK_OFFSET.y,
    -(PLAYER_HEAD_SIZE.depth / 2 + PLAYER_POINTER_LENGTH / 2 + 0.45)
);
const PLAYER_HEAD_MAX_HORIZONTAL_OFFSET = 12;
const PLAYER_MOVEMENT_EPSILON = 0.6;
const OBJECT_WIREFRAME_MAX_RECORDS = 96;
const SCHEMATIC_PORTCULLIS_SPRITE_IDS = new Set([0x08, 0x09, 0x0a, 0x0b]);
const SCHEMATIC_PORTCULLIS_PANEL_SIZE = blockUnitsToSceneSize({x: 2, y: 0.1, z: 2});
const ITEM_MARKER_SIZE = 5;
const SPELL_MARKER_SIZE = 6;
const CAULDRON_ROOM_ID = 0x88;
const KNIGHT_LORE_SCRATCH_START = 0x5ba0;
const KNIGHT_LORE_GRAPHIC_OBJECT_TABLE_START = 0x5c08;
const KNIGHT_LORE_DYNAMIC_ROOM_START = 0x5c88;
const KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE = 0x20;
const SPELL_PROBE_ADDRESS = 0x5c68;
const SPELL_CYCLE_VALUES = [0xa0, 0xa1, 0xa2, 0xa3];
const SPELL_ATTACK_VALUES = [0xa4, 0xa5, 0xa6, 0xa7];
const SPELL_FULL_3D_MODEL_VALUES = new Set([...SPELL_CYCLE_VALUES, ...SPELL_ATTACK_VALUES]);
const SPELL_ITEM_DISPLAY_VALUES = [0xae];
const SPELL_OBSERVED_VALUES = [
    ...SPELL_CYCLE_VALUES,
    ...SPELL_ATTACK_VALUES,
    ...SPELL_ITEM_DISPLAY_VALUES,
];
const SPELL_OBSERVED_VALUE_SET = new Set(SPELL_OBSERVED_VALUES);
const SPELL_PROBE_WINDOW_BEFORE = 8;
const SPELL_PROBE_WINDOW_AFTER = 15;
const PLAYER_SPRITE_MEMORY_WINDOW_BEFORE = 10;
const PLAYER_SPRITE_MEMORY_WINDOW_AFTER = 10;
const PLAYER_SPRITE_MEMORY_PILE_LIMIT = 64;
const PLAYER_BILLBOARD_TRANSITION_TRACE_LIMIT = 20;
const PLAYER_BODY_SPRITE_CANDIDATE_ADDRESS = 0x5c0f - 7;
const PLAYER_HEAD_SPRITE_CANDIDATE_ADDRESS = 0x5c21 + 7;
const PLAYER_SPRITE_MEMORY_VALUES = [
    0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d,
    0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27,
    0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f,
    0x30, 0x31, 0x32, 0x33, 0x34, 0x35,
    0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f,
    0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47,
    0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f,
    0x5c, 0x5d, 0x5e, 0x5f,
];
const PLAYER_SPRITE_MEMORY_VALUE_SET = new Set(PLAYER_SPRITE_MEMORY_VALUES);
const PLAYER_SPRITE_FOCUS_WINDOWS = [
    {
        label: 'body candidate',
        expression: '0x5C0F - 7',
        address: PLAYER_BODY_SPRITE_CANDIDATE_ADDRESS,
    },
    {
        label: 'head candidate',
        expression: '0x5C21 + 7',
        address: PLAYER_HEAD_SPRITE_CANDIDATE_ADDRESS,
    },
];
const ROOM_COLOUR_REFERENCE_ADDRESS = 0x5bad;
const ROOM_COLOUR_CANDIDATE_VALUE = 0x45;
const ROOM_COLOUR_WORKING_WINDOW_BEFORE = 12;
const ROOM_COLOUR_WORKING_WINDOW_AFTER = 12;
const ROOM_COLOUR_ATTRIBUTE_MEMORY_START = 0x5800;
const ROOM_COLOUR_ATTRIBUTE_MEMORY_END = 0x5b00;
const ROOM_COLOUR_CHANGE_HOLD_FRAMES = 90;
const WIZARD_DYNAMIC_ROWS_BY_ROOM = {
    [CAULDRON_ROOM_ID]: [8, 9],
};
const FOCUSED_GUARD_OBJECTS = [
    {address: 0x60c8, label: 'guard observed slot', source: 'direct ASM object slot 38'},
    {address: 0x6028, label: 'guard type 2 top?', source: 'direct ASM object slot 33'},
    {address: 0x6048, label: 'guard type 2 lower?', source: 'direct ASM object slot 34'},
];
const FOCUSED_WIZARD_COMPARISON_ROWS = [8, 9];
const FOCUSED_WIZARD_WINDOW_STARTS = [0x5d88, 0x5da8];
const FOCUSED_WIZARD_WINDOW_LENGTH = 0x20;
const FOCUSED_WIZARD_CHANGE_HOLD_FRAMES = 45;

const ITEM_MARKER_COLORS = [
    0xef4444,
    0x22c55e,
    0x3b82f6,
    0xfacc15,
    0xec4899,
    0x14b8a6,
    0xf97316,
    0xa855f7,
];

const DYNAMIC_OBJECT_ID_SCAN_START = 8;
const SPECIAL_DYNAMIC_OBJECTS_BY_OBJECT_ID = {
    0x10: {
        label: 'cauldron',
        category: 'cauldron',
        source: 'working-memory object id 0x10, disassembly test',
    },
    0x1a: {
        label: 'wizard body candidate',
        category: 'wizard',
        source: 'working-memory object id 0x1A, neighbour of wizard head id',
    },
    0x1b: {
        label: 'wizard head',
        category: 'wizard',
        source: 'working-memory object id 0x1B, disassembly test',
    },
    0x1c: {
        label: 'wizard body candidate',
        category: 'wizard',
        source: 'working-memory object id 0x1C, neighbour of wizard head id',
    },
};
const SPECIAL_OBJECT_WIREFRAME_COLORS = {
    cauldron: 0x14b8a6,
    portcullis: 0x38bdf8,
    wizard: 0xa855f7,
};
const LIVE_FIXED_BACKGROUND_IDS = new Set([0x12]);
const LIVE_ACTOR_MAX_ROWS = 40;
const LIVE_ACTOR_SPRITE_RANGES = [
    {start: 0x9e, end: 0x9f, actor: 'wizard', part: 'top', label: 'wizard top'},
    {start: 0x96, end: 0x97, actor: 'guard', part: 'top', label: 'guard top E/W'},
    {start: 0x1e, end: 0x1f, actor: 'guard', part: 'top', label: 'guard top square'},
    {start: 0x90, end: 0x95, actor: 'guard/wizard', part: 'lower', label: 'guard/wizard lower'},
    {start: 0x98, end: 0x9d, actor: 'guard/wizard', part: 'lower', label: 'guard/wizard lower'},
    {start: 0x50, end: 0x53, actor: 'ghost', part: 'single', label: 'ghost'},
];
const LIVE_ACTOR_BILLBOARD_ACTORS = new Set(['guard', 'wizard']);
const LIVE_ACTOR_BILLBOARD_COLORS = {
    guard: 0x22c55e,
    wizard: 0xa855f7,
};
const LIVE_ACTOR_BILLBOARD_DIRECTION_OFFSET = 0.18;
const LIVE_ACTOR_TEXTURE_VIEW_PRESETS = new Set([
    'game',
    'right',
    'left',
    'front',
    'back',
    'upper-front-left',
    'upper-back-right',
    'upper-back-left',
]);
// Stage 7.7 non-player actor view policy. This intentionally mirrors the
// player's policy shape without sharing the table: guards and the wizard use a
// different sprite family, so front/back side choice and horizontal mirroring
// must remain actor-specific and independently tuneable per facing.
const LIVE_ACTOR_BILLBOARD_VIEW_POLICIES = {
    game: {
        label: 'actor-game-live-south-east',
        textureStrategy: 'live',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    right: {
        label: 'actor-cardinal-camera-east',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    left: {
        label: 'actor-cardinal-camera-west',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    front: {
        label: 'actor-cardinal-camera-south',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    back: {
        label: 'actor-cardinal-camera-north',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    'upper-back-left': {
        label: 'actor-opposite-game-north-west',
        textureStrategy: 'opposite-live',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    },
    'upper-front-left': {
        label: 'actor-chosen-south-west',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: true, west: true},
        swapTextureSideByFacing: {north: true, south: true, east: true, west: true},
    },
    'upper-back-right': {
        label: 'actor-chosen-north-east',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: true, south: true, east: true, west: true},
        swapTextureSideByFacing: {north: true, south: true, east: true, west: true},
    },
};

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
const SPECIAL_DYNAMIC_MARKERS = {
    cauldron: {
        label: 'cauldron',
        color: 0x14b8a6,
        opacity: 0.82,
        fallbackSize: {width: 12, height: 10, depth: 12},
    },
    wizard: {
        label: 'wizard',
        color: 0xa855f7,
        opacity: 0.78,
        fallbackSize: {width: 8, height: 18, depth: 8},
    },
};

const PLAYER_AXIS_TO_SCENE_FACING = {
    '+X': 'east',
    '-X': 'west',
    '+Y': 'north',
    '-Y': 'south',
};

const FLOOR_DIRECTION_LABELS = [
    {side: 'north', label: 'north'},
    {side: 'south', label: 'south'},
    {side: 'east', label: 'east'},
    {side: 'west', label: 'west'},
];
const DIRECTION_LABEL_EDGE_INSET = 10;

// Compass view convention:
// View names describe where the camera is placed, not the direction it looks.
// "North" means the camera is north of the room/character, looking inward.
// This same camera-side convention is used by the player billboard selector:
// if characterFacing === cameraSide, the camera sees the character front.
// The camera side is computed from room center to camera, not from character
// to camera, so it stays constant while the character moves.
// Player sprite views are not resolved only by nearest-cardinal dot product.
// PLAYER_SPRITE_BILLBOARD_VIEW_POLICIES keeps the display plane and the sprite
// interpretation deliberately separate.
const VIEW_PRESETS = [
    {id: 'game', label: 'Upper south east (game)', direction: [1, 0.72, 1], up: [0, 1, 0]},
    {id: 'top', label: 'Top', direction: [0, 1, 0], up: [0, 0, -1]},
    {id: 'bottom', label: 'Bottom', direction: [0, -1, 0], up: [0, 0, 1]},
    {id: 'right', label: 'East', direction: [1, 0, 0], up: [0, 1, 0]},
    {id: 'left', label: 'West', direction: [-1, 0, 0], up: [0, 1, 0]},
    {id: 'front', label: 'South', direction: [0, 0, 1], up: [0, 1, 0]},
    {id: 'back', label: 'North', direction: [0, 0, -1], up: [0, 1, 0]},
    {id: 'upper-front-left', label: 'Upper south west', direction: [-1, 0.72, 1], up: [0, 1, 0]},
    {id: 'upper-back-right', label: 'Upper north east', direction: [1, 0.72, -1], up: [0, 1, 0]},
    {id: 'upper-back-left', label: 'Upper north west', direction: [-1, 0.72, -1], up: [0, 1, 0]},
];
const FULL3D_AMBIENT_LIGHT_INTENSITY = 0.64;
const FULL3D_DIRECTIONAL_LIGHT_INTENSITY = 0.72;
const FULL3D_DIRECTIONAL_LIGHT_POSITION = [-1, 0.72, 1];

const RENDER_MODES = [
    {id: 'schematic', label: 'Schematic'},
    {id: 'full-3d', label: 'Full 3D'},
];
const DEFAULT_WALL_TEXTURE_DEWARP_ENABLED = true;
const DEFAULT_WALL_TEXTURE_DEWARP_SCALE_PERCENT = 100;
const DEFAULT_WALL_TEXTURE_BINARY_THRESHOLD = 141;
const DEFAULT_PLAYER_BILLBOARD_WIREFRAME_ENABLED = false;
const DEFAULT_PLAYER_BILLBOARD_PHASE_BYPASS_DEBUG_ENABLED = false;
const DEFAULT_PLAYER_BILLBOARD_STORAGE_BYPASS_DEBUG_ENABLED = false;
const SPRITE_TEXTURE_PREVIEW_MAX_ROWS = 48;
const SPRITE_TEXTURE_PREVIEW_COLUMNS = 1;
const SPRITE_TEXTURE_PREVIEW_TILE_WIDTH = 620;
const SPRITE_TEXTURE_PREVIEW_TILE_HEIGHT = 232;
const SPRITE_TEXTURE_PREVIEW_MARGIN = 12;
const SPRITE_TEXTURE_PREVIEW_LABEL_HEIGHT = 34;
const SPRITE_TEXTURE_PREVIEW_IMAGE_MAX_WIDTH = 174;
const SPRITE_TEXTURE_PREVIEW_IMAGE_MAX_HEIGHT = 168;
const PLAYER_MATERIAL_DEBUG_CANVAS_WIDTH = 620;
const PLAYER_MATERIAL_DEBUG_ROW_HEIGHT = 86;
const PLAYER_MATERIAL_DEBUG_PREVIEW_MAX_WIDTH = 112;
const PLAYER_MATERIAL_DEBUG_PREVIEW_MAX_HEIGHT = 70;
const PLAYER_MATERIAL_DEBUG_MAX_ROWS = 8;
const SPRITE_TEXTURE_PREVIEW_GROUPS = [
    {
        label: 'guard square heads',
        forceYFlip: true,
        ids: [0x1e, 0x1f],
    },
    {
        label: 'guard body/head sequence',
        forceYFlip: true,
        ids: [
            0x90, 0x91, 0x92, 0x93,
            0x94, 0x95, 0x96, 0x97,
            0x98, 0x99, 0x9a, 0x9b,
            0x9c, 0x9d,
        ],
    },
    {
        label: 'wizard heads',
        forceYFlip: true,
        ids: [0x9e, 0x9f],
    },
];
function formatHex(value, digits = 2) {
    if (value === null || value === undefined) return '--';
    return '0x' + value.toString(16).toUpperCase().padStart(digits, '0');
}

function formatBinaryByte(value) {
    if (!Number.isFinite(value)) return '--------';
    return (value & 0xff).toString(2).padStart(8, '0');
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

function signedByte(value) {
    if (!Number.isFinite(value)) return null;
    const byte = value & 0xff;
    return byte >= 0x80 ? byte - 0x100 : byte;
}

function formatSignedByte(value) {
    const signed = signedByte(value);
    if (signed === null) return '--';
    return (signed > 0 ? '+' : '') + signed;
}

function formatSignedByteTriplet(bytes, startOffset) {
    if (!Array.isArray(bytes)) return '--, --, --';
    return [
        formatSignedByte(bytes[startOffset]),
        formatSignedByte(bytes[startOffset + 1]),
        formatSignedByte(bytes[startOffset + 2]),
    ].join(', ');
}

function formatObjectSlotByteField(offset) {
    switch (offset) {
        case 0x00: return '+0 sprite';
        case 0x01: return '+1 X';
        case 0x02: return '+2 Y';
        case 0x03: return '+3 Z';
        case 0x04: return '+4 width';
        case 0x05: return '+5 depth';
        case 0x06: return '+6 height';
        case 0x07: return '+7 flags';
        case 0x08: return '+8 room';
        case 0x09: return '+9 dX';
        case 0x0a: return '+10 dY';
        case 0x0b: return '+11 dZ';
        case 0x0c: return '+12 counter/OOB';
        case 0x0d: return '+13 info';
        case 0x0e: return '+14 dX adjust';
        case 0x0f: return '+15 dY adjust';
        case 0x10: return '+16 ptr/id lo';
        case 0x11: return '+17 ptr/id hi';
        case 0x12: return '+18 pixel X adjust';
        case 0x13: return '+19 pixel Y adjust';
        case 0x18: return '+24 sprite width';
        case 0x19: return '+25 sprite height';
        case 0x1a: return '+26 pixel X';
        case 0x1b: return '+27 pixel Y';
        case 0x1c: return '+28 old width';
        case 0x1d: return '+29 old height';
        case 0x1e: return '+30 old pixel X';
        case 0x1f: return '+31 old pixel Y';
        default: return '+' + formatHex(offset, 2);
    }
}

function formatSceneVector(vector) {
    if (!vector) return '--, --, --';
    return [
        Number.isFinite(vector.x) ? vector.x.toFixed(1) : '--',
        Number.isFinite(vector.y) ? vector.y.toFixed(1) : '--',
        Number.isFinite(vector.z) ? vector.z.toFixed(1) : '--',
    ].join(', ');
}

function formatDotScore(value) {
    return Number.isFinite(value) ? value.toFixed(3) : '--';
}

function formatSpriteMaterialSelection(requestedSprite, materialSprite) {
    const requested = formatHex(requestedSprite, 2);
    if (
        materialSprite === null
        || materialSprite === undefined
        || materialSprite === requestedSprite
    ) {
        return requested;
    }
    return requested + '->' + formatHex(materialSprite, 2);
}

function formatSpritePhaseAlignment(originalSprite, alignedSprite) {
    if (
        originalSprite === null
        || originalSprite === undefined
        || alignedSprite === null
        || alignedSprite === undefined
        || originalSprite === alignedSprite
    ) {
        return 'no';
    }
    return formatHex(originalSprite, 2) + '=>' + formatHex(alignedSprite, 2);
}

function isFinitePosition(position) {
    return Boolean(
        position
        && Number.isFinite(position.x)
        && Number.isFinite(position.y)
        && Number.isFinite(position.z)
    );
}

function isZeroPosition(position) {
    return isFinitePosition(position)
        && position.x === 0
        && position.y === 0
        && position.z === 0;
}

function roomColorFromAttribute(value) {
    if (value === null || value === undefined) return 0x7dd3fc;
    return ROOM_DEBUG_COLORS[value & 0x07];
}

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

function cssColorFromHex(color) {
    return '#' + color.toString(16).toUpperCase().padStart(6, '0');
}

function formatRecordAddress(value) {
    return formatHex(value, 4);
}

function flagRawFromRecord(record) {
    if (!record) return null;
    if (Number.isFinite(record.flags)) return record.flags;
    if (record.flags && Number.isFinite(record.flags.raw)) return record.flags.raw;
    if (Array.isArray(record.slotRaw) && Number.isFinite(record.slotRaw[7])) return record.slotRaw[7];
    if (Array.isArray(record.raw) && Number.isFinite(record.raw[7])) return record.raw[7];
    return null;
}

function formatVisualRecord(record) {
    if (!record) return '--';
    return [
        formatHex(record.spriteId, 2),
        formatRoomSize(record.position),
        formatRoomSize(record.dimensions),
        formatHex(flagRawFromRecord(record), 2),
    ].join(' | ');
}

function formatDynamicRecordSlotTail(record) {
    if (!record) return '--';
    const slotRaw = Array.isArray(record.slotRaw) ? record.slotRaw : [];
    const objectSlot = objectTableSlotIndexForAddress(record.address);
    const flags = liveActorFlagsFromRecord(record);
    return [
        'obj ' + (objectSlot === null ? '--' : objectSlot),
        '+7 ' + formatLiveActorFlags(flags),
        '+8 ' + formatHex(slotRaw[8], 2),
        '+9..11 ' + formatSignedByteTriplet(slotRaw, 9),
        '+13 ' + formatHex(slotRaw[13], 2),
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

function formatByteList(bytes) {
    if (!bytes || bytes.length === 0) return '--';
    return bytes.map(value => formatHex(value, 2)).join(' ');
}

function formatAddressRange(start, endExclusive) {
    if (
        start === null
        || start === undefined
        || endExclusive === null
        || endExclusive === undefined
    ) {
        return '--';
    }
    return formatRecordAddress(start) + '..' + formatRecordAddress(endExclusive - 1);
}

function formatAddressList(addresses) {
    if (!addresses || addresses.length === 0) return '--';
    return addresses.map(address => formatRecordAddress(address)).join(' ');
}

function formatHexList(values, digits = 2) {
    if (!values || values.length === 0) return '--';
    return values.map(value => formatHex(value, digits)).join(' ');
}

function countByteValues(bytes) {
    const counts = new Map();
    if (!bytes) return counts;
    for (const value of bytes) {
        counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
}

function formatTopByteCounts(counts, limit = 8) {
    if (!counts || counts.size === 0) return '--';
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, limit)
        .map(([value, count]) => formatHex(value, 2) + ':' + count)
        .join(' ');
}

function findByteAddresses(bytes, startAddress, targetValue, limit = 12) {
    if (!bytes || !Number.isFinite(startAddress)) return [];
    const addresses = [];
    for (let offset = 0; offset < bytes.length && addresses.length < limit; offset++) {
        if (bytes[offset] === targetValue) addresses.push(startAddress + offset);
    }
    return addresses;
}

function classifySpellProbeValue(value) {
    if (SPELL_CYCLE_VALUES.includes(value)) return 'spell cycle';
    if (SPELL_ATTACK_VALUES.includes(value)) return 'wolf attack';
    if (SPELL_ITEM_DISPLAY_VALUES.includes(value)) return 'item display?';
    return 'other';
}

function classifyPlayerSpriteMemoryValue(value) {
    if (value === null || value === undefined) return 'not readable';
    const id = value & 0xff;
    const labels = [];
    if (id >= 0x10 && id <= 0x15) labels.push('human body west');
    if (id >= 0x18 && id <= 0x1d) labels.push('human body east');
    if (id >= 0x20 && id <= 0x27) labels.push('human head west');
    if (id >= 0x28 && id <= 0x2f) labels.push('human head east');
    if (id >= 0x30 && id <= 0x35) labels.push('wolf body west');
    if (id >= 0x38 && id <= 0x3f) labels.push('wolf body east');
    if (id >= 0x40 && id <= 0x47) labels.push('wolf head west');
    if (id >= 0x48 && id <= 0x4f) labels.push('wolf head east');
    if (id >= 0x5c && id <= 0x5f) labels.push('transformation');
    return labels.length > 0 ? labels.join(' / ') : 'other matched value';
}

function readFrameMemoryByte(frame, address) {
    const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
    const memory = frame && frame.semanticMemory ? frame.semanticMemory : null;
    if (memoryStart === null || !memory || !Number.isFinite(address)) return null;

    const offset = address - memoryStart;
    if (offset < 0 || offset >= memory.length) return null;
    return memory[offset];
}

function readFrameMemoryWindow(frame, startAddress, length) {
    if (!frame || !frame.semanticMemory || !Number.isFinite(startAddress) || length <= 0) return [];

    const bytes = [];
    for (let offset = 0; offset < length; offset++) {
        bytes.push(readFrameMemoryByte(frame, startAddress + offset));
    }
    return bytes;
}

function scanFrameMemoryForBytes(frame, targetBytes) {
    const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
    const memory = frame && frame.semanticMemory ? frame.semanticMemory : null;
    if (memoryStart === null || !memory) return [];

    const targets = targetBytes instanceof Set ? targetBytes : new Set(targetBytes);
    const hits = [];
    for (let offset = 0; offset < memory.length; offset++) {
        const value = memory[offset];
        if (!targets.has(value)) continue;
        hits.push({
            address: memoryStart + offset,
            value,
        });
    }
    return hits;
}

function dynamicSlotInfoForAddress(address) {
    if (!Number.isFinite(address) || address < KNIGHT_LORE_DYNAMIC_ROOM_START) return null;

    const offset = address - KNIGHT_LORE_DYNAMIC_ROOM_START;
    const slotIndex = Math.floor(offset / KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE);
    const slotOffset = offset % KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE;
    return {
        slotIndex,
        slotOffset,
        isSpriteByte: slotOffset === 0,
    };
}

function formatDynamicSlotLocation(address) {
    const slotInfo = dynamicSlotInfoForAddress(address);
    if (slotInfo) {
        return 'slot '
            + slotInfo.slotIndex
            + ' +'
            + formatHex(slotInfo.slotOffset, 2)
            + (slotInfo.isSpriteByte ? ' sprite' : '');
    }

    return 'working +'
        + formatHex(address - KNIGHT_LORE_SCRATCH_START, 4);
}

function findByteWindowChanges(previous, current, windowStart) {
    if (!previous || previous.windowStart !== windowStart || !Array.isArray(previous.bytes)) return null;

    const changes = [];
    const length = Math.max(previous.bytes.length, current.length);
    for (let offset = 0; offset < length; offset++) {
        const before = offset < previous.bytes.length ? previous.bytes[offset] : null;
        const after = offset < current.length ? current[offset] : null;
        if (before === after) continue;
        changes.push({
            address: windowStart + offset,
            before,
            after,
        });
    }
    return changes;
}

function formatByteChangeSummary(changes) {
    if (changes === null) return 'new';
    if (!changes || changes.length === 0) return 'no';
    return 'changed ' + changes.length;
}

function formatByteChangeDetails(changes, maxChanges = 8) {
    if (changes === null) return 'new';
    if (!changes || changes.length === 0) return 'no';

    const visibleChanges = changes.slice(0, maxChanges).map(change => (
        formatRecordAddress(change.address)
            + ':'
            + formatHex(change.before, 2)
            + '>'
            + formatHex(change.after, 2)
    ));
    const overflow = changes.length > maxChanges
        ? ' +' + (changes.length - maxChanges)
        : '';
    return visibleChanges.join(' ') + overflow;
}

function formatSpellProbeChanges(row) {
    if (!row || row.changes === null) return 'new';
    if (!row.changes || row.changes.length === 0) return 'no';

    const maxChanges = 6;
    const visibleChanges = row.changes.slice(0, maxChanges).map(change => (
        formatRecordAddress(change.address)
            + ':'
            + formatHex(change.before, 2)
            + '>'
            + formatHex(change.after, 2)
    ));
    const overflow = row.changes.length > maxChanges
        ? ' +' + (row.changes.length - maxChanges)
        : '';
    return visibleChanges.join(' ') + overflow;
}

function formatSpellProbeChangeSummary(row) {
    if (!row || row.changes === null) return 'new';
    if (!row.changes || row.changes.length === 0) return 'no';
    return 'changed ' + row.changes.length;
}

function isDynamicObjectCandidate(record, backgroundPrefixCount) {
    return Boolean(
        record
        && Number.isFinite(record.slotIndex)
        && record.slotIndex >= backgroundPrefixCount
    );
}

function dynamicObjectCandidatesForRoom(room) {
    if (!room) return [];
    const comparison = room.backgroundComparison || null;
    const backgroundPrefixCount = comparison && Number.isFinite(comparison.staticRecordCount)
        ? comparison.staticRecordCount
        : 0;
    const dynamicRecords = room.dynamicVisualRecords || room.sprites || [];
    return dynamicRecords.filter(record => (
        isDynamicObjectCandidate(record, backgroundPrefixCount)
    ));
}

function liveObjectRecordsForRoom(room) {
    if (!room) return [];
    return room.liveObjectRecords || room.dynamicVisualRecords || room.sprites || [];
}

function objectTableSlotIndexForAddress(address) {
    if (!Number.isFinite(address) || address < KNIGHT_LORE_GRAPHIC_OBJECT_TABLE_START) return null;

    const offset = address - KNIGHT_LORE_GRAPHIC_OBJECT_TABLE_START;
    if (offset % KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE !== 0) return null;
    return offset / KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE;
}

function classifyLiveActorSpriteId(spriteId) {
    if (!Number.isFinite(spriteId)) return null;
    const id = spriteId & 0xff;
    const range = LIVE_ACTOR_SPRITE_RANGES.find(candidate => (
        id >= candidate.start && id <= candidate.end
    ));
    return range ? {...range, spriteId: id} : null;
}

function liveActorFlagsFromRecord(record) {
    const raw = flagRawFromRecord(record);
    if (raw === null) {
        return {
            raw,
            vflip: false,
            hflip: false,
            wipe: false,
            draw: false,
            moveable: false,
            ignore3d: false,
            nearArch: false,
        };
    }

    return {
        raw,
        vflip: Boolean(raw & 0x80),
        hflip: Boolean(raw & 0x40),
        wipe: Boolean(raw & 0x20),
        draw: Boolean(raw & 0x10),
        moveable: Boolean(raw & 0x04),
        ignore3d: Boolean(raw & 0x02),
        nearArch: Boolean(raw & 0x01),
    };
}

function formatLiveActorFlags(flags) {
    if (!flags || !Number.isFinite(flags.raw)) return '--';
    return [
        formatHex(flags.raw, 2),
        'b' + formatBinaryByte(flags.raw),
        'hf:' + (flags.hflip ? 'Y' : 'n'),
        'vf:' + (flags.vflip ? 'Y' : 'n'),
        'wipe:' + (flags.wipe ? 'Y' : 'n'),
        'draw:' + (flags.draw ? 'Y' : 'n'),
        'mov:' + (flags.moveable ? 'Y' : 'n'),
        'ign:' + (flags.ignore3d ? 'Y' : 'n'),
        'near:' + (flags.nearArch ? 'Y' : 'n'),
    ].join(' ');
}

function formatGuardWizardInfoByte(value) {
    if (!Number.isFinite(value)) return '--';
    const directions = ['west', 'north', 'east', 'south'];
    const direction = directions[value & 0x03] || '--';
    return [
        formatHex(value, 2),
        'dir:' + direction,
        'raw-low2:' + (value & 0x03),
    ].join(' ');
}

function liveActorSpriteVisualSide(spriteId) {
    if (!Number.isFinite(spriteId)) return null;
    const id = spriteId & 0xff;
    if (
        (id >= 0x90 && id <= 0x95)
        || id === 0x96
        || id === 0x1e
        || id === 0x9e
    ) {
        return 'west';
    }
    if (
        (id >= 0x98 && id <= 0x9d)
        || id === 0x97
        || id === 0x1f
        || id === 0x9f
    ) {
        return 'east';
    }
    return null;
}

function liveActorFacingFromVelocity(record) {
    const slotRaw = record && Array.isArray(record.slotRaw) ? record.slotRaw : [];
    const dx = signedByte(slotRaw[9]);
    const dy = signedByte(slotRaw[10]);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return null;

    if (Math.abs(dx) >= Math.abs(dy)) {
        return {
            facing: dx >= 0 ? 'east' : 'west',
            source: '+9/+10 velocity',
            detail: formatSignedByte(dx) + ',' + formatSignedByte(dy),
        };
    }

    return {
        facing: dy >= 0 ? 'south' : 'north',
        source: '+9/+10 velocity',
        detail: formatSignedByte(dx) + ',' + formatSignedByte(dy),
    };
}

function liveActorFacingFromInfoByte(record) {
    const slotRaw = record && Array.isArray(record.slotRaw) ? record.slotRaw : [];
    const value = slotRaw[13];
    if (!Number.isFinite(value)) return null;
    const directions = ['west', 'north', 'east', 'south'];
    return {
        facing: directions[value & 0x03] || null,
        source: '+13 low2',
        detail: formatHex(value, 2),
    };
}

function liveActorFacingFromSpriteSide(record) {
    const visualSide = liveActorSpriteVisualSide(record ? record.spriteId : null);
    if (!visualSide) return null;
    return {
        facing: visualSide,
        source: 'sprite-side clue',
        detail: formatHex(record.spriteId, 2),
    };
}

function resolveLiveActorFacing(spec) {
    const records = [spec ? spec.lowerRecord : null, spec ? spec.topRecord : null].filter(Boolean);
    const velocityFacing = records
        .map(record => liveActorFacingFromVelocity(record))
        .find(Boolean);
    if (velocityFacing) return velocityFacing;

    const infoFacing = records
        .map(record => liveActorFacingFromInfoByte(record))
        .find(Boolean);
    if (infoFacing) return infoFacing;

    const spriteFacing = records
        .map(record => liveActorFacingFromSpriteSide(record))
        .find(Boolean);
    if (spriteFacing) return spriteFacing;

    return {
        facing: null,
        source: 'unknown',
        detail: '--',
    };
}

function liveActorTextureSideForRelativeView(relativeView) {
    switch (relativeView) {
        case 'front':
        case 'right':
            return 'east';
        case 'back':
        case 'left':
            return 'west';
        default:
            return null;
    }
}

function liveActorOppositeTextureSide(textureSide) {
    if (textureSide === 'east') return 'west';
    if (textureSide === 'west') return 'east';
    return null;
}

function liveActorSpriteIdForTextureSide(spriteId, textureSide) {
    if (!Number.isFinite(spriteId) || (textureSide !== 'east' && textureSide !== 'west')) {
        return spriteId;
    }

    const id = spriteId & 0xff;
    if (id >= 0x90 && id <= 0x95) {
        return textureSide === 'west' ? id : 0x98 + (id - 0x90);
    }
    if (id >= 0x98 && id <= 0x9d) {
        return textureSide === 'east' ? id : 0x90 + (id - 0x98);
    }
    if (id === 0x96 || id === 0x97) return textureSide === 'west' ? 0x96 : 0x97;
    if (id === 0x1e || id === 0x1f) return textureSide === 'west' ? 0x1e : 0x1f;
    if (id === 0x9e || id === 0x9f) return textureSide === 'west' ? 0x9e : 0x9f;
    return id;
}

function liveActorBillboardPolicyForViewPreset(viewPreset) {
    return LIVE_ACTOR_BILLBOARD_VIEW_POLICIES[viewPreset] || {
        label: 'actor-relative-default',
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXByFacing: {north: false, south: false, east: false, west: false},
        swapTextureSideByFacing: {north: false, south: false, east: false, west: false},
    };
}

function liveActorBillboardPolicyFacingMirror(viewPolicy, actorFacing) {
    const byFacing = viewPolicy && viewPolicy.mirrorTextureXByFacing;
    if (
        byFacing
        && actorFacing
        && Object.prototype.hasOwnProperty.call(byFacing, actorFacing)
    ) {
        return Boolean(byFacing[actorFacing]);
    }

    const facings = viewPolicy && Array.isArray(viewPolicy.mirrorTextureXWhenFacing)
        ? viewPolicy.mirrorTextureXWhenFacing
        : [];
    return facings.includes(actorFacing);
}

function liveActorBillboardPolicySwapTextureSide(viewPolicy, actorFacing) {
    const byFacing = viewPolicy && viewPolicy.swapTextureSideByFacing;
    if (
        byFacing
        && actorFacing
        && Object.prototype.hasOwnProperty.call(byFacing, actorFacing)
    ) {
        return Boolean(byFacing[actorFacing]);
    }

    const facings = viewPolicy && Array.isArray(viewPolicy.swapTextureSideWhenFacing)
        ? viewPolicy.swapTextureSideWhenFacing
        : [];
    return facings.includes(actorFacing);
}

function liveActorTextureSideForStrategy(strategy, relativeTextureSide, liveSpriteId) {
    if (strategy === 'live') {
        return liveActorSpriteVisualSide(liveSpriteId) || relativeTextureSide;
    }
    if (strategy === 'opposite-live') {
        return liveActorOppositeTextureSide(
            liveActorSpriteVisualSide(liveSpriteId) || relativeTextureSide
        ) || relativeTextureSide;
    }
    if (strategy === 'opposite-relative') {
        return liveActorOppositeTextureSide(relativeTextureSide) || relativeTextureSide;
    }
    return relativeTextureSide;
}

function resolveLiveActorTextureSelection({spec, record, selectedFacing, viewPreset}) {
    const flags = liveActorFlagsFromRecord(record);
    const actorFacing = resolveLiveActorFacing(spec);
    const relativeView = actorFacing.facing && selectedFacing
        ? relativePlayerView(actorFacing.facing, selectedFacing)
        : 'unknown';
    const liveSpriteId = record ? record.spriteId : null;
    const viewPolicy = liveActorBillboardPolicyForViewPreset(viewPreset);
    const textureStrategy = viewPolicy.textureStrategy || 'relative';
    const textureEnabled = liveActorTextureEnabledForView(viewPreset);
    const baseRelativeTextureSide = liveActorTextureSideForRelativeView(relativeView);
    const strategyTextureSide = liveActorTextureSideForStrategy(
        textureStrategy,
        baseRelativeTextureSide,
        liveSpriteId
    );
    const policySwapTextureSide = liveActorBillboardPolicySwapTextureSide(
        viewPolicy,
        actorFacing.facing
    );
    const textureSide = policySwapTextureSide
        ? liveActorOppositeTextureSide(strategyTextureSide) || strategyTextureSide
        : strategyTextureSide;
    const textureSpriteId = textureStrategy === 'live'
        ? liveSpriteId
        : textureSide
        ? liveActorSpriteIdForTextureSide(liveSpriteId, textureSide)
        : liveSpriteId;
    const policyMirrorTextureX = Boolean(viewPolicy && viewPolicy.mirrorTextureX);
    const policyFacingMirrorTextureX = liveActorBillboardPolicyFacingMirror(
        viewPolicy,
        actorFacing.facing
    );

    return {
        textureEnabled,
        liveSpriteId,
        textureSpriteId,
        textureSide: textureSide || '--',
        actorFacing,
        relativeView,
        textureStrategy,
        viewPolicyLabel: viewPolicy.label,
        policyMirrorTextureX,
        policyFacingMirrorTextureX,
        policySwapTextureSide,
        mirrorTextureX: combinePlayerSpriteTextureMirrors(
            flags.hflip,
            policyMirrorTextureX,
            policyFacingMirrorTextureX
        ),
        flags,
        allowSideFallback: textureStrategy !== 'live',
        policy: viewPolicy.label + '/' + textureStrategy,
    };
}

function liveActorTextureEnabledForView(viewPreset) {
    return LIVE_ACTOR_TEXTURE_VIEW_PRESETS.has(viewPreset);
}

function liveActorPairForRecord(record, recordsByObjectSlot) {
    const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
    const classification = classifyLiveActorSpriteId(record ? record.spriteId : null);
    if (objectSlot === null || !classification) {
        return {
            objectSlot,
            pairLabel: '--',
            actor: classification ? classification.actor : 'unknown',
        };
    }

    const previous = recordsByObjectSlot.get(objectSlot - 1);
    const next = recordsByObjectSlot.get(objectSlot + 1);
    const previousClass = classifyLiveActorSpriteId(previous ? previous.spriteId : null);
    const nextClass = classifyLiveActorSpriteId(next ? next.spriteId : null);

    if (classification.part === 'top') {
        const nextIsLower = nextClass && nextClass.part === 'lower';
        return {
            objectSlot,
            pairLabel: nextIsLower
                ? 'lower obj ' + (objectSlot + 1) + ' ' + formatHex(next.spriteId, 2)
                : 'top only',
            actor: classification.actor,
        };
    }

    if (classification.part === 'lower') {
        const previousIsTop = previousClass && previousClass.part === 'top';
        return {
            objectSlot,
            pairLabel: previousIsTop
                ? 'top obj ' + (objectSlot - 1) + ' ' + formatHex(previous.spriteId, 2)
                : 'lower only',
            actor: previousIsTop ? previousClass.actor : classification.actor,
        };
    }

    return {
        objectSlot,
        pairLabel: 'single',
        actor: classification.actor,
    };
}

function liveActorCandidatesForRoom(room) {
    if (!room) return [];
    const dynamicRecords = liveObjectRecordsForRoom(room);
    const recordsByObjectSlot = new Map();
    dynamicRecords.forEach(record => {
        const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
        if (objectSlot !== null) recordsByObjectSlot.set(objectSlot, record);
    });

    return dynamicRecords
        .map(record => {
            const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
            if (objectSlot !== null && objectSlot < 4) return null;

            const classification = classifyLiveActorSpriteId(record ? record.spriteId : null);
            if (!classification) return null;

            const pair = liveActorPairForRecord(record, recordsByObjectSlot);
            return {
                record,
                classification,
                flags: liveActorFlagsFromRecord(record),
                objectSlot: pair.objectSlot,
                actor: pair.actor,
                pairLabel: pair.pairLabel,
            };
        })
        .filter(Boolean);
}

function liveObjectRecordsByObjectSlotForRoom(room) {
    const recordsByObjectSlot = new Map();
    liveObjectRecordsForRoom(room).forEach(record => {
        const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
        if (objectSlot !== null) recordsByObjectSlot.set(objectSlot, record);
    });
    return recordsByObjectSlot;
}

function shouldRenderAsLiveActorBillboard(record, recordsByObjectSlot) {
    const classification = classifyLiveActorSpriteId(record ? record.spriteId : null);
    if (!classification) return false;
    if (LIVE_ACTOR_BILLBOARD_ACTORS.has(classification.actor)) return true;
    if (classification.part !== 'lower' || !recordsByObjectSlot) return false;

    const pair = liveActorPairForRecord(record, recordsByObjectSlot);
    return LIVE_ACTOR_BILLBOARD_ACTORS.has(pair.actor);
}

function liveActorBillboardSpecsForRoom(room) {
    if (!room) return [];
    const records = liveObjectRecordsForRoom(room);
    const recordsByObjectSlot = liveObjectRecordsByObjectSlotForRoom(room);

    const consumedSlots = new Set();
    const consumedAddresses = new Set();
    const specs = [];
    records.forEach(record => {
        const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
        if (objectSlot === null || objectSlot < 4 || consumedSlots.has(objectSlot)) return;

        const classification = classifyLiveActorSpriteId(record ? record.spriteId : null);
        if (
            !classification
            || classification.part !== 'top'
            || !LIVE_ACTOR_BILLBOARD_ACTORS.has(classification.actor)
        ) {
            return;
        }

        const previous = recordsByObjectSlot.get(objectSlot - 1) || null;
        const next = recordsByObjectSlot.get(objectSlot + 1) || null;
        const previousClass = classifyLiveActorSpriteId(previous ? previous.spriteId : null);
        const nextClass = classifyLiveActorSpriteId(next ? next.spriteId : null);
        const lowerRecord = nextClass && nextClass.part === 'lower'
            ? next
            : (previousClass && previousClass.part === 'lower' ? previous : null);
        const lowerSlot = objectTableSlotIndexForAddress(lowerRecord ? lowerRecord.address : null);

        consumedSlots.add(objectSlot);
        if (Number.isFinite(record.address)) consumedAddresses.add(record.address);
        if (lowerSlot !== null) consumedSlots.add(lowerSlot);
        if (lowerRecord && Number.isFinite(lowerRecord.address)) consumedAddresses.add(lowerRecord.address);
        specs.push({
            actor: classification.actor,
            topRecord: record,
            lowerRecord,
            objectSlot,
            lowerSlot,
            label: classification.actor + ' billboard',
        });
    });

    const wizardRows = WIZARD_DYNAMIC_ROWS_BY_ROOM[room.id] || [];
    if (wizardRows.length > 0 && room.backgroundComparison && Array.isArray(room.backgroundComparison.rows)) {
        const wizardRecords = wizardRows
            .map(rowIndex => {
                const row = room.backgroundComparison.rows.find(candidate => candidate.index === rowIndex);
                return row ? row.dynamicRecord : null;
            })
            .filter(record => (
                record
                && !consumedAddresses.has(record.address)
                && isFinitePosition(record.position)
            ))
            .sort((a, b) => (a.position.z || 0) - (b.position.z || 0));

        if (wizardRecords.length > 0) {
            const lowerRecord = wizardRecords[0] || null;
            const topRecord = wizardRecords[1] || null;
            specs.push({
                actor: 'wizard',
                topRecord,
                lowerRecord,
                objectSlot: objectTableSlotIndexForAddress(topRecord ? topRecord.address : null),
                lowerSlot: objectTableSlotIndexForAddress(lowerRecord ? lowerRecord.address : null),
                label: 'wizard billboard from comparison rows',
            });
        }
    }

    return specs;
}

function liveActorBillboardRecordAddressesForRoom(room) {
    const addresses = new Set();
    liveActorBillboardSpecsForRoom(room).forEach(spec => {
        [spec.topRecord, spec.lowerRecord].forEach(record => {
            if (record && Number.isFinite(record.address)) addresses.add(record.address);
        });
    });
    return addresses;
}

function classifyLiveObjectRecord(record) {
    const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
    if (objectSlot === 0) return 'player lower';
    if (objectSlot === 1) return 'player upper';
    if (objectSlot === 2 || objectSlot === 3) return 'special/item slot';

    const actor = classifyLiveActorSpriteId(record ? record.spriteId : null);
    if (actor) return actor.label;

    const semantic = classifyDynamicObjectRecord(record);
    return semantic && semantic.label ? semantic.label : 'live object';
}

function focusedActorSlotRowsForRoom(room) {
    const liveRecords = liveObjectRecordsForRoom(room);
    const liveRecordByAddress = new Map();
    liveRecords.forEach(record => {
        if (Number.isFinite(record.address)) liveRecordByAddress.set(record.address, record);
    });

    const comparisonRows = room && room.backgroundComparison && Array.isArray(room.backgroundComparison.rows)
        ? room.backgroundComparison.rows
        : [];
    const rows = FOCUSED_GUARD_OBJECTS.map(guard => ({
        label: guard.label,
        source: guard.source,
        expected: formatRecordAddress(guard.address),
        record: liveRecordByAddress.get(guard.address) || null,
        staticSource: null,
    }));

    FOCUSED_WIZARD_COMPARISON_ROWS.forEach(rowIndex => {
        const comparisonRow = comparisonRows.find(row => row.index === rowIndex);
        rows.push({
            label: 'wizard comparison row ' + rowIndex,
            source: 'Static background vs dynamic slots row ' + rowIndex,
            expected: comparisonRow && comparisonRow.staticSource
                ? formatStaticSource(comparisonRow.staticSource)
                : 'row ' + rowIndex,
            record: comparisonRow ? comparisonRow.dynamicRecord : null,
            staticSource: comparisonRow ? comparisonRow.staticSource : null,
        });
    });

    return rows;
}

function isSchematicPortcullisRecord(record) {
    return Boolean(
        record
        && Number.isFinite(record.spriteId)
        && SCHEMATIC_PORTCULLIS_SPRITE_IDS.has(record.spriteId & 0xff)
    );
}

function compactDynamicRecordSignature(record) {
    if (!record) return 'none';
    const position = record.position || {};
    const dimensions = record.dimensions || {};
    return [
        record.address,
        record.spriteId,
        position.x,
        position.y,
        position.z,
        dimensions.x,
        dimensions.y,
        dimensions.z,
        record.flags,
    ].join(',');
}

function liveSchematicBackgroundSignature(comparison) {
    if (!comparison || !Array.isArray(comparison.rows)) return 'no-live-backgrounds';
    return comparison.rows
        .filter(row => (
            row.staticSource
            && row.staticSource.category === 'portcullis'
            && row.dynamicRecord
        ))
        .map(row => row.index + '=' + compactDynamicRecordSignature(row.dynamicRecord))
        .join('|') || 'no-live-portcullises';
}

function schematicBackgroundsWithLivePortcullises(backgrounds, comparison) {
    if (!Array.isArray(backgrounds) || !comparison || !Array.isArray(comparison.rows)) {
        return backgrounds || [];
    }

    const liveRecordsByStaticKey = new Map();
    comparison.rows.forEach(row => {
        if (
            !row.staticSource
            || row.staticSource.category !== 'portcullis'
            || !row.dynamicRecord
        ) {
            return;
        }

        liveRecordsByStaticKey.set(
            row.staticSource.backgroundIndex + ':' + row.staticSource.recordIndex,
            row.dynamicRecord
        );
    });

    if (liveRecordsByStaticKey.size === 0) return backgrounds;

    return backgrounds.map((background, backgroundIndex) => {
        if (background.category !== 'portcullis' || !Array.isArray(background.records)) {
            return background;
        }

        let changed = false;
        const records = background.records.map((record, recordIndex) => {
            const liveRecord = liveRecordsByStaticKey.get(backgroundIndex + ':' + recordIndex);
            if (!liveRecord) return record;
            changed = true;
            return {
                ...record,
                address: Number.isFinite(liveRecord.address) ? liveRecord.address : record.address,
                spriteId: Number.isFinite(liveRecord.spriteId) ? liveRecord.spriteId : record.spriteId,
                position: liveRecord.position || record.position,
                dimensions: liveRecord.dimensions || record.dimensions,
                flags: Number.isFinite(liveRecord.flags)
                    ? {raw: liveRecord.flags}
                    : record.flags,
                liveDynamicSource: true,
            };
        });

        return changed ? {...background, records} : background;
    });
}

function findDynamicObjectIdHits(record) {
    if (!record || !Array.isArray(record.slotRaw)) return [];
    const hits = [];
    for (let offset = DYNAMIC_OBJECT_ID_SCAN_START; offset < record.slotRaw.length; offset++) {
        const value = record.slotRaw[offset];
        const definition = SPECIAL_DYNAMIC_OBJECTS_BY_OBJECT_ID[value];
        if (!definition) continue;
        hits.push({
            offset,
            address: Number.isFinite(record.address) ? record.address + offset : null,
            objectId: value,
            ...definition,
        });
    }
    return hits;
}

function formatDynamicObjectIdHits(hits) {
    if (!hits || hits.length === 0) return '--';
    return hits.map(hit => (
        '+' + formatHex(hit.offset, 2)
        + '='
        + formatHex(hit.objectId, 2)
        + '@'
        + formatRecordAddress(hit.address)
    )).join(' ');
}

function specialMarkerForCategory(category) {
    return SPECIAL_DYNAMIC_MARKERS[category] || null;
}

function specialMarkerCategoryForBackgroundId(backgroundId) {
    switch (backgroundId) {
        default:
            return null;
    }
}

function classifyDynamicObjectRecord(record) {
    if (!record) {
        return {
            label: 'unknown',
            category: 'unknown',
            source: 'no dynamic record',
            objectIdHits: [],
        };
    }
    const objectIdHits = findDynamicObjectIdHits(record);
    if (objectIdHits.length > 0) {
        const labels = [...new Set(objectIdHits.map(hit => hit.label))];
        const categories = objectIdHits.map(hit => hit.category);
        const category = categories.includes('wizard')
                ? 'wizard'
                : categories[0];
        return {
            label: labels.join(' / '),
            category,
            source: objectIdHits
                .map(hit => hit.source + ' at +' + formatHex(hit.offset, 2))
                .join('; '),
            objectIdHits,
        };
    }

    if (isSchematicPortcullisRecord(record)) {
        return {
            label: 'portcullis',
            category: 'portcullis',
            source: 'working-memory visual slot sprite 0x08..0x0B',
            objectIdHits,
        };
    }

    return {
        label: 'dynamic visual object',
        category: 'object',
        source: 'working-memory visual slot',
        objectIdHits,
    };
}

function specialDynamicMarkersForRoom(room) {
    if (!room) return [];

    const markers = [];
    const dynamicRecords = room.dynamicVisualRecords || room.sprites || [];
    const dynamicRecordByAddress = new Map();
    dynamicRecords.forEach(record => {
        if (Number.isFinite(record.address)) dynamicRecordByAddress.set(record.address, record);
    });
    const usedKeys = new Set();
    const addMarker = (record, marker) => {
        if (!record || !marker || !marker.category) return;
        const key = [
            marker.category,
            Number.isFinite(record.address) ? record.address : markers.length,
            marker.source || '',
        ].join(':');
        if (usedKeys.has(key)) return;
        usedKeys.add(key);
        markers.push({
            ...marker,
            record,
            markerInfo: specialMarkerForCategory(marker.category),
        });
    };

    const rows = room.backgroundComparison && Array.isArray(room.backgroundComparison.rows)
        ? room.backgroundComparison.rows
        : [];

    const wizardRows = WIZARD_DYNAMIC_ROWS_BY_ROOM[room.id] || [];
    wizardRows.forEach((rowIndex, partIndex) => {
        const row = rows.find(candidate => candidate.index === rowIndex);
        if (!row || !row.dynamicRecord) return;

        const liveRecord = dynamicRecordByAddress.get(row.dynamicRecord.address) || row.dynamicRecord;
        addMarker(liveRecord, {
            category: 'wizard',
            label: 'wizard part ' + partIndex,
            source: 'room 0x88 live dynamic row ' + rowIndex
                + ' observed as wizard movement; static label was '
                + formatStaticSource(row.staticSource),
        });
    });

    rows.forEach(row => {
        const backgroundId = row.staticSource ? row.staticSource.backgroundId : null;
        const category = specialMarkerCategoryForBackgroundId(backgroundId);
        if (!category || !row.dynamicRecord) return;

        const liveRecord = dynamicRecordByAddress.get(row.dynamicRecord.address) || row.dynamicRecord;
        addMarker(liveRecord, {
            category,
            label: specialMarkerForCategory(category).label,
            source: 'dynamic visual slot matched to static background ' + formatHex(backgroundId, 2),
        });
    });

    return markers;
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

function looksLikeHighResolutionPosition(position) {
    return isFinitePosition(position)
        && (
            position.x >= 72
            || position.y >= 72
            || position.z >= 96
        );
}

function mapKnightLorePositionToScene(position, roomDimensions) {
    if (!isFinitePosition(position)) return null;

    if (looksLikeHighResolutionPosition(position)) {
        return {
            source: 'high-res bytes',
            vector: new THREE.Vector3(
                (position.x - 128) / 2,
                Math.max(0, (position.z - 128) / 2),
                (128 - position.y) / 2
            ),
        };
    }

    return {
        source: 'room-local bytes',
        vector: new THREE.Vector3(
            position.x - roomDimensions.width / 2,
            Math.max(0, position.z),
            roomDimensions.depth / 2 - position.y
        ),
    };
}

function mapKnightLoreHighResolutionPositionToScene(position) {
    if (!isFinitePosition(position)) return null;
    return {
        source: 'forced high-res bytes',
        vector: new THREE.Vector3(
            (position.x - 128) / 2,
            Math.max(0, (position.z - 128) / 2),
            (128 - position.y) / 2
        ),
    };
}

function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}

function facingFromDelta(delta) {
    if (Math.abs(delta.x) < PLAYER_MOVEMENT_EPSILON && Math.abs(delta.z) < PLAYER_MOVEMENT_EPSILON) {
        return null;
    }
    if (Math.abs(delta.x) >= Math.abs(delta.z)) {
        return delta.x >= 0 ? 'east' : 'west';
    }
    return delta.z >= 0 ? 'south' : 'north';
}

function sceneFacingFromGameAxis(axisFacing) {
    return PLAYER_AXIS_TO_SCENE_FACING[axisFacing] || axisFacing || null;
}

function sceneFacingForLiveActorTopBottomMarker(facing) {
    // Actor facing is decoded in game Y-space; top/bottom markers rotate in scene Z-space.
    if (facing === 'north') return 'south';
    if (facing === 'south') return 'north';
    return facing;
}

function relativePlayerView(characterFacing, cameraSide) {
    const characterIndex = PLAYER_SPRITE_BILLBOARD_FACING_INDEX[characterFacing];
    const cameraSideIndex = PLAYER_SPRITE_BILLBOARD_FACING_INDEX[cameraSide];
    if (!Number.isFinite(characterIndex) || !Number.isFinite(cameraSideIndex)) return 'unknown';

    const delta = (cameraSideIndex - characterIndex + 4) % 4;
    switch (delta) {
        case 0:
            return 'front';
        case 1:
            return 'right';
        case 2:
            return 'back';
        case 3:
            return 'left';
        default:
            return 'unknown';
    }
}

function playerSpriteSideForRelativeView(relativeView) {
    switch (relativeView) {
        case 'front':
        case 'right':
            return 'east';
        case 'back':
        case 'left':
            return 'west';
        default:
            return 'east';
    }
}

function playerSpriteBillboardPolicyForViewPreset(viewPreset) {
    return PLAYER_SPRITE_BILLBOARD_VIEW_POLICIES[viewPreset] || {
        label: 'cardinal-dot-product',
        cameraSide: null,
        textureReferenceSide: null,
        textureStrategy: 'relative',
        mirrorTextureX: false,
        mirrorTextureXWhenFacing: [],
        swapTextureSideWhenFacing: [],
    };
}

function selectedSpriteBillboardFacingForView(viewPreset, facingScores) {
    const viewPolicy = playerSpriteBillboardPolicyForViewPreset(viewPreset);
    const selectedFacing = viewPolicy.cameraSide
        || (facingScores && facingScores.signedBest ? facingScores.signedBest.id : null);
    const selectedScore = facingScores && Array.isArray(facingScores.scores)
        ? facingScores.scores.find(score => score.id === selectedFacing) || null
        : null;
    return {
        viewPolicy,
        selectedFacing,
        selectedScore,
        textureReferenceSide: viewPolicy.textureReferenceSide || selectedFacing,
    };
}

function playerSpriteBillboardPolicyFacingMirror(viewPolicy, characterFacing) {
    const byFacing = viewPolicy && viewPolicy.mirrorTextureXByFacing;
    if (
        byFacing
        && characterFacing
        && Object.prototype.hasOwnProperty.call(byFacing, characterFacing)
    ) {
        return Boolean(byFacing[characterFacing]);
    }

    const facings = viewPolicy && Array.isArray(viewPolicy.mirrorTextureXWhenFacing)
        ? viewPolicy.mirrorTextureXWhenFacing
        : [];
    return facings.includes(characterFacing);
}

function playerSpriteBillboardPolicySwapTextureSide(viewPolicy, characterFacing) {
    const byFacing = viewPolicy && viewPolicy.swapTextureSideByFacing;
    if (
        byFacing
        && characterFacing
        && Object.prototype.hasOwnProperty.call(byFacing, characterFacing)
    ) {
        return Boolean(byFacing[characterFacing]);
    }

    const facings = viewPolicy && Array.isArray(viewPolicy.swapTextureSideWhenFacing)
        ? viewPolicy.swapTextureSideWhenFacing
        : [];
    return facings.includes(characterFacing);
}

function oppositePlayerSpriteSide(side) {
    if (side === 'east') return 'west';
    if (side === 'west') return 'east';
    return side;
}

function playerSpriteBillboardMirrorFromFlag(flag, threshold = 0x4c) {
    return Number.isFinite(flag) && flag >= threshold;
}

function combinePlayerSpriteTextureMirrors(...mirrors) {
    return mirrors.reduce((enabled, mirror) => enabled !== Boolean(mirror), false);
}

function countExpandedSpritePlanePixels(expanded, plane = 'image') {
    if (!expanded) return 0;
    const pixels = plane === 'mask' ? expanded.maskPixels : expanded.imagePixels;
    if (!pixels) return 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index++) {
        if (pixels[index]) count += 1;
    }
    return count;
}

function rotationForFacing(facing) {
    switch (facing) {
        case 'east':
            return -Math.PI / 2;
        case 'south':
            return Math.PI;
        case 'west':
            return Math.PI / 2;
        case 'north':
        default:
            return 0;
    }
}

function createVerticalRectangleLineGeometry(width, height) {
    const halfWidth = width / 2;
    const positions = [
        -halfWidth, 0, 0,
        halfWidth, 0, 0,
        halfWidth, 0, 0,
        halfWidth, height, 0,
        halfWidth, height, 0,
        -halfWidth, height, 0,
        -halfWidth, height, 0,
        -halfWidth, 0, 0,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
}

function createVerticalBillboardPlaneGeometry(width, height) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        -halfWidth, -halfHeight, 0,
        -halfWidth, halfHeight, 0,
        halfWidth, -halfHeight, 0,
        halfWidth, halfHeight, 0,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
        0, 1,
        0, 0,
        1, 1,
        1, 0,
    ], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    geometry.computeVertexNormals();
    return geometry;
}

function createHorizontalFacingArrowGeometry(length, halfWidth) {
    const shape = new THREE.Shape();
    shape.moveTo(0, length);
    shape.lineTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
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

function formatPlayerSprites(orientation) {
    if (!orientation) return '--';
    return 'head ' + formatHex(orientation.headSprite, 2)
        + ', body ' + formatHex(orientation.bodySprite, 2);
}

function formatPlayerMirrors(orientation) {
    if (!orientation) return '--';
    return 'body ' + formatHex(orientation.bodyMirrorFlag, 2)
        + ', head ' + formatHex(orientation.headMirrorFlag, 2)
        + ', axis threshold ' + formatHex(orientation.directionAxisThreshold, 2);
}

function formatOrientationCandidate(candidate) {
    if (!candidate) return '--';
    return formatHex(candidate.spriteId, 2)
        + '/'
        + candidate.state
        + '/'
        + candidate.axisPair
        + '/'
        + candidate.axisFacing;
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
        this.lastPlayerScenePosition = null;
        this.lastPlayerFacing = 'north';
        this.lastPointerAxisFacing = null;
        this.hasSeenGameplayRoom = false;
        this.playerProxyInfo = null;
        this.playerSpriteBillboardHookInfo = null;
        this.playerSpriteBillboardHookCallCount = 0;
        this.playerBillboardTransitionTrace = [];
        this.lastPlayerBillboardTransitionKey = '';
        this.playerSpriteBillboardMaterialDiagnostics = new Map();
        this.actorSpriteBillboardMaterialDiagnostics = new Map();
        this.lastRoomColorAttribute = null;
        this.roomColourProbeRoomId = null;
        this.previousRoomColourProbe = null;
        this.lastRoomColourProbe = null;
        this.lastRoomColourProbeChange = null;
        this.lastSpecialDynamicMarkers = [];
        this.lastLiveActorBillboardCount = 0;
        this.lastLiveActorBillboardTextureCount = 0;
        this.lastLiveActorBillboardWireframesVisible = false;
        this.lastResolvedCollectableItemRecords = [];
        this.lastFull3DObjectCount = 0;
        this.lastFull3DRecognizedObjectCount = 0;
        this.spriteTexturePreviewCache = new Map();
        this.lastTexturedBackgroundQuadCount = 0;
        this.lastDewarpedBackgroundQuadCount = 0;
        this.lastVisibleWallTextureQuadCount = 0;
        this.lastWallTextureVisibilityQuadCount = 0;
        this.spellProbeRoomId = null;
        this.lastSpellProbeRows = [];
        this.lastSpellProbeTotalHits = 0;
        this.lastSpellProbeChangedHits = 0;
        this.lastSpellProbeValueCounts = new Map();
        this.previousSpellProbeWindows = new Map();
        this.focusedWizardByteWindowState = new Map();
        this.playerSpriteMemoryPile = [];
        this.playerSpriteMemoryPileAddresses = new Set();
        this.playerSpriteMemoryPileOverflow = 0;
        this.lastPlayerSpriteMemoryScanHits = 0;
        this.roomDimensions = {...DEFAULT_ROOM_DIMENSIONS};
        this.roomGeometryVisible = false;
        this.activeViewPreset = 'game';
        this.activeRenderMode = 'full-3d';
        this.wallTextureDewarpEnabled = DEFAULT_WALL_TEXTURE_DEWARP_ENABLED;
        this.wallTextureDewarpScalePercent = DEFAULT_WALL_TEXTURE_DEWARP_SCALE_PERCENT;
        this.wallTextureBinaryThreshold = DEFAULT_WALL_TEXTURE_BINARY_THRESHOLD;
        this.playerSpriteBillboardWireframeEnabled = DEFAULT_PLAYER_BILLBOARD_WIREFRAME_ENABLED;
        this.playerSpriteBillboardPhaseBypassDebugEnabled = DEFAULT_PLAYER_BILLBOARD_PHASE_BYPASS_DEBUG_ENABLED;
        this.playerSpriteBillboardStorageBypassDebugEnabled = DEFAULT_PLAYER_BILLBOARD_STORAGE_BYPASS_DEBUG_ENABLED;
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
            button.title = mode.label + ' render mode';
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

        this.wallTextureDewarpControl = document.createElement('div');
        this.wallTextureDewarpControl.className = 'knight-lore-dewarp-scale-control';
        this.wallTextureDewarpControl.title = 'Wall texture dewarp';
        this.wallTextureDewarpControl.setAttribute('aria-label', 'Wall texture dewarp');
        this.wallTextureDewarpToggleLabel = document.createElement('label');
        this.wallTextureDewarpToggleLabel.className = 'knight-lore-dewarp-toggle';
        this.wallTextureDewarpToggle = document.createElement('input');
        this.wallTextureDewarpToggle.type = 'checkbox';
        this.wallTextureDewarpToggle.checked = this.wallTextureDewarpEnabled;
        this.wallTextureDewarpToggle.addEventListener('change', () => {
            this.setWallTextureDewarpEnabled(this.wallTextureDewarpToggle.checked);
        });
        this.wallTextureDewarpToggleLabel.appendChild(this.wallTextureDewarpToggle);
        this.wallTextureDewarpToggleLabel.appendChild(document.createTextNode('Dewarp'));
        this.wallTextureDewarpControl.appendChild(this.wallTextureDewarpToggleLabel);
        this.playerSpriteBillboardWireframeToggleLabel = document.createElement('label');
        this.playerSpriteBillboardWireframeToggleLabel.className = 'knight-lore-dewarp-toggle knight-lore-billboard-wireframe-toggle';
        this.playerSpriteBillboardWireframeToggleLabel.title = 'Player and actor billboard wireframes';
        this.playerSpriteBillboardWireframeToggleLabel.setAttribute('aria-label', 'Player and actor billboard wireframes');
        this.playerSpriteBillboardWireframeToggle = document.createElement('input');
        this.playerSpriteBillboardWireframeToggle.type = 'checkbox';
        this.playerSpriteBillboardWireframeToggle.checked = this.playerSpriteBillboardWireframeEnabled;
        this.playerSpriteBillboardWireframeToggle.addEventListener('change', () => {
            this.setPlayerSpriteBillboardWireframeEnabled(
                this.playerSpriteBillboardWireframeToggle.checked
            );
        });
        this.playerSpriteBillboardWireframeToggleLabel.appendChild(
            this.playerSpriteBillboardWireframeToggle
        );
        this.playerSpriteBillboardWireframeToggleLabel.appendChild(document.createTextNode('Wireframe'));
        this.wallTextureDewarpControl.appendChild(this.playerSpriteBillboardWireframeToggleLabel);
        this.controlsElement.appendChild(this.wallTextureDewarpControl);
        this.updateWallTextureDewarpControl();

        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'knight-lore-stage0-canvas';
        this.directionOverlayElement = document.createElement('div');
        this.directionOverlayElement.className = 'knight-lore-direction-overlay';
        this.directionLabelElements = new Map();
        FLOOR_DIRECTION_LABELS.forEach(item => {
            const label = document.createElement('span');
            label.className = 'knight-lore-direction-label is-' + item.side;
            label.textContent = item.label;
            label.dataset.side = item.side;
            this.directionLabelElements.set(item.side, label);
            this.directionOverlayElement.appendChild(label);
        });
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
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.OrthographicCamera(-5, 5, 3.75, -3.75, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.canvasHost.appendChild(this.renderer.domElement);
        this.canvasHost.appendChild(this.directionOverlayElement);

        this.ambientLight = new THREE.AmbientLight(0xffffff, FULL3D_AMBIENT_LIGHT_INTENSITY);
        this.scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, FULL3D_DIRECTIONAL_LIGHT_INTENSITY);
        this.directionalLight.castShadow = false;
        this.directionalLight.position
            .set(...FULL3D_DIRECTIONAL_LIGHT_POSITION)
            .normalize()
            .multiplyScalar(500);
        this.directionalLight.target.position.set(0, 0, 0);
        this.scene.add(this.directionalLight);
        this.scene.add(this.directionalLight.target);

        this.gridHelper = new THREE.GridHelper(200, 10, 0x6b7280, 0x374151);
        this.axesHelper = new THREE.AxesHelper(72);
        this.scene.add(this.gridHelper);
        this.scene.add(this.axesHelper);

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
        this.schematicBackgroundGroup = new THREE.Group();
        this.full3DBackgroundGroup = new THREE.Group();
        this.staticBackgroundGroup.add(this.schematicBackgroundGroup);
        this.staticBackgroundGroup.add(this.full3DBackgroundGroup);
        this.scene.add(this.staticBackgroundGroup);
        this.schematicBackgroundRenderer = new KnightLoreSchematicBackgroundRenderer(
            this.schematicBackgroundGroup
        );
        this.full3DBackgroundRenderer = new KnightLoreFull3DBackgroundRenderer(
            this.full3DBackgroundGroup
        );

        this.specialDynamicGroup = new THREE.Group();
        this.scene.add(this.specialDynamicGroup);

        this.objectWireframeGroup = new THREE.Group();
        this.objectWireframeMaterial = new THREE.LineBasicMaterial({
            color: 0xf8fafc,
            transparent: true,
            opacity: 0.92,
        });
        this.specialObjectWireframeMaterials = new Map();
        this.scene.add(this.objectWireframeGroup);

        this.full3DObjectGroup = new THREE.Group();
        this.scene.add(this.full3DObjectGroup);

        this.liveActorBillboardGroup = new THREE.Group();
        this.liveActorBillboardGeometry = createVerticalRectangleLineGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height
        );
        this.liveActorBillboardPlaneGeometry = createVerticalBillboardPlaneGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height
        );
        this.liveActorBillboardMaterials = new Map();
        this.liveActorTopBottomMarkerDiskGeometry = new THREE.CircleGeometry(
            LIVE_ACTOR_TOP_BOTTOM_MARKER_RADIUS,
            24
        );
        this.liveActorTopBottomMarkerArrowGeometry = createHorizontalFacingArrowGeometry(
            LIVE_ACTOR_TOP_BOTTOM_MARKER_ARROW_LENGTH,
            LIVE_ACTOR_TOP_BOTTOM_MARKER_RADIUS * 0.48
        );
        this.liveActorTopBottomMarkerMaterials = new Map();
        this.liveActorTopBottomMarkerArrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xf8fafc,
            transparent: true,
            opacity: 0.94,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
        });
        this.scene.add(this.liveActorBillboardGroup);

        this.collectableItemGroup = new THREE.Group();
        this.collectableItemGeometry = new THREE.BoxGeometry(
            ITEM_MARKER_SIZE,
            ITEM_MARKER_SIZE,
            ITEM_MARKER_SIZE
        );
        this.collectableItemMaterials = ITEM_MARKER_COLORS.map(color => (
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.86,
            })
        ));
        this.collectableItemFallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.86,
        });
        this.scene.add(this.collectableItemGroup);

        this.spellMarkerGroup = new THREE.Group();
        this.spellMarkerGroup.visible = false;
        this.spellMarkerGeometry = new THREE.SphereGeometry(SPELL_MARKER_SIZE / 2, 12, 8);
        this.spellCycleMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.92,
        });
        this.spellAttackMaterial = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.94,
        });
        this.spellItemDisplayMaterial = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.92,
        });
        this.spellMarkerMesh = new THREE.Mesh(this.spellMarkerGeometry, this.spellCycleMaterial);
        this.spellMarkerMesh.visible = false;
        this.spellMarkerGroup.add(this.spellMarkerMesh);
        this.spellMarkerModel = null;
        this.spellMarkerModelSpriteId = null;
        this.scene.add(this.spellMarkerGroup);

        this.playerGroup = new THREE.Group();
        this.playerGroup.visible = false;
        this.playerHumanMaterial = new THREE.MeshBasicMaterial({color: 0xf97316});
        this.playerWolfMaterial = new THREE.MeshBasicMaterial({color: 0x2563eb});
        this.playerUnknownMaterial = new THREE.MeshBasicMaterial({color: 0x94a3b8});
        this.playerPointerMaterial = new THREE.MeshBasicMaterial({color: 0x38bdf8});
        this.playerPointerFallbackMaterial = new THREE.MeshBasicMaterial({color: 0x94a3b8});
        this.playerBodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(PLAYER_BODY_SIZE.width, PLAYER_BODY_SIZE.height, PLAYER_BODY_SIZE.depth),
            this.playerUnknownMaterial
        );
        this.playerBodyMesh.position.y = PLAYER_BODY_SIZE.height / 2;
        this.playerHeadMesh = new THREE.Mesh(
            new THREE.BoxGeometry(PLAYER_HEAD_SIZE.width, PLAYER_HEAD_SIZE.height, PLAYER_HEAD_SIZE.depth),
            this.playerUnknownMaterial
        );
        this.playerHeadMesh.position.copy(PLAYER_HEAD_FALLBACK_OFFSET);
        this.playerPointerGroup = new THREE.Group();
        this.playerPointerMesh = new THREE.Mesh(
            new THREE.ConeGeometry(PLAYER_POINTER_RADIUS, PLAYER_POINTER_LENGTH, 4),
            this.playerPointerMaterial
        );
        this.playerPointerMesh.rotation.x = -Math.PI / 2;
        this.playerPointerMesh.position.copy(PLAYER_POINTER_OFFSET);
        this.playerPointerGroup.add(this.playerPointerMesh);
        this.playerTopBottomMarkerGroup = new THREE.Group();
        this.playerTopBottomMarkerGroup.visible = false;
        this.playerTopBottomMarkerDiskMaterial = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.78,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
        });
        this.playerTopBottomMarkerArrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xf8fafc,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
        });
        this.playerTopBottomMarkerDisk = new THREE.Mesh(
            new THREE.CircleGeometry(PLAYER_TOP_BOTTOM_MARKER_RADIUS, 32),
            this.playerTopBottomMarkerDiskMaterial
        );
        this.playerTopBottomMarkerDisk.rotation.x = -Math.PI / 2;
        this.playerTopBottomMarkerDisk.position.y = PLAYER_TOP_BOTTOM_MARKER_HEIGHT;
        this.playerTopBottomMarkerDisk.renderOrder = 30;
        this.playerTopBottomMarkerArrow = new THREE.Mesh(
            createHorizontalFacingArrowGeometry(
                PLAYER_TOP_BOTTOM_MARKER_ARROW_LENGTH,
                PLAYER_TOP_BOTTOM_MARKER_RADIUS * 0.48
            ),
            this.playerTopBottomMarkerArrowMaterial
        );
        this.playerTopBottomMarkerArrow.position.y = PLAYER_TOP_BOTTOM_MARKER_HEIGHT + 0.06;
        this.playerTopBottomMarkerArrow.renderOrder = 31;
        this.playerTopBottomMarkerGroup.add(this.playerTopBottomMarkerDisk);
        this.playerTopBottomMarkerGroup.add(this.playerTopBottomMarkerArrow);
        this.playerSpriteBillboardGroup = new THREE.Group();
        this.playerSpriteBillboardGroup.visible = false;
        this.playerSpriteBillboardGeometry = createVerticalRectangleLineGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height
        );
        this.playerSpriteBillboardPlaneGeometry = createVerticalBillboardPlaneGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height
        );
        this.playerSpriteBillboardFullGeometry = createVerticalRectangleLineGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height * 2
        );
        this.playerSpriteBillboardFullPlaneGeometry = createVerticalBillboardPlaneGeometry(
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.width,
            PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height * 2
        );
        this.playerSpriteBillboardTextureMaterials = new Map();
        this.playerSpriteBillboardMirroredTextureMaterials = new Map();
        this.actorSpriteBillboardTextureMaterials = new Map();
        this.actorSpriteBillboardMirroredTextureMaterials = new Map();
        this.playerSpriteBillboardFallbackTextureMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        this.playerSpriteBillboardMaterials = PLAYER_SPRITE_BILLBOARD_FACINGS.map(facing => (
            new THREE.LineBasicMaterial({
                color: facing.color,
                transparent: true,
                opacity: 0.92,
                depthTest: true,
            })
        ));
        PLAYER_SPRITE_BILLBOARD_FACINGS.forEach((facing, index) => {
            const facingGroup = new THREE.Group();
            facingGroup.rotation.y = rotationForFacing(facing.id);
            facingGroup.userData.facing = facing.id;

            const bodyPlane = new THREE.Mesh(
                this.playerSpriteBillboardPlaneGeometry,
                this.playerSpriteBillboardFallbackTextureMaterial
            );
            // Line rectangles start at their bottom edge; PlaneGeometry is centered.
            bodyPlane.position.set(
                0,
                PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height / 2,
                -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET - 0.01
            );
            bodyPlane.renderOrder = 9;

            const bodyFrame = new THREE.LineSegments(
                this.playerSpriteBillboardGeometry,
                this.playerSpriteBillboardMaterials[index]
            );
            bodyFrame.position.z = -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET;
            bodyFrame.renderOrder = 10;

            const headPlane = new THREE.Mesh(
                this.playerSpriteBillboardPlaneGeometry,
                this.playerSpriteBillboardFallbackTextureMaterial
            );
            headPlane.position.set(
                0,
                PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height * 1.5,
                -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET - 0.01
            );
            headPlane.renderOrder = 9;

            const headFrame = new THREE.LineSegments(
                this.playerSpriteBillboardGeometry,
                this.playerSpriteBillboardMaterials[index]
            );
            headFrame.position.set(
                0,
                PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height,
                -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET
            );
            headFrame.renderOrder = 10;

            const fullTransformPlane = new THREE.Mesh(
                this.playerSpriteBillboardFullPlaneGeometry,
                this.playerSpriteBillboardFallbackTextureMaterial
            );
            fullTransformPlane.position.set(
                0,
                PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height,
                -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET - 0.01
            );
            fullTransformPlane.visible = false;
            fullTransformPlane.renderOrder = 9;

            const fullTransformFrame = new THREE.LineSegments(
                this.playerSpriteBillboardFullGeometry,
                this.playerSpriteBillboardMaterials[index]
            );
            fullTransformFrame.position.z = -PLAYER_SPRITE_BILLBOARD_DIRECTION_OFFSET;
            fullTransformFrame.visible = false;
            fullTransformFrame.renderOrder = 10;

            facingGroup.userData.bodyPlane = bodyPlane;
            facingGroup.userData.bodyFrame = bodyFrame;
            facingGroup.userData.headPlane = headPlane;
            facingGroup.userData.headFrame = headFrame;
            facingGroup.userData.fullTransformPlane = fullTransformPlane;
            facingGroup.userData.fullTransformFrame = fullTransformFrame;
            facingGroup.add(bodyPlane);
            facingGroup.add(bodyFrame);
            facingGroup.add(headPlane);
            facingGroup.add(headFrame);
            facingGroup.add(fullTransformPlane);
            facingGroup.add(fullTransformFrame);
            this.playerSpriteBillboardGroup.add(facingGroup);
        });
        this.playerGroup.add(this.playerBodyMesh);
        this.playerGroup.add(this.playerHeadMesh);
        this.playerGroup.add(this.playerPointerGroup);
        this.playerGroup.add(this.playerTopBottomMarkerGroup);
        this.playerGroup.add(this.playerSpriteBillboardGroup);
        this.scene.add(this.playerGroup);
        this.setRoomGeometryVisible(false);

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
        // Keep already-built player textures. Later static-memory captures can
        // contain transient game-state bytes in the sprite table region; once a
        // compact player sprite material is known-good, it is safer to retain it
        // and only fill missing entries.
        this.rebuildPlayerSpriteBillboardTextureMaterials();
        this.updateSummary();
    }

    update(frame) {
        this.latestFrame = frame;
        this.frameCounter += 1;
        this.updateRoomShape();
        this.updateStaticBackgroundGeometry();
        this.updateSpecialDynamicMarkers();
        this.updateObjectWireframes();
        this.updateFull3DObjectModels();
        this.updateLiveActorBillboards();
        this.updateCollectableItemMarkers();
        this.updatePlayerProxy();
        this.updateSpellMovementProbe();
        this.updatePlayerSpriteMemoryPile();
        this.updateSummary();
        this.updateComparisonDiagnostics();
        this.render();
    }

    updateRoomShape() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        const hasRoom = Boolean(room && room.id !== null && room.id !== undefined);
        const hasGameplayPlayer = Boolean(
            scene
            && scene.player
            && isFinitePosition(scene.player.body)
            && scene.player.orientation
            && scene.player.orientation.visualFacing
        );
        if (hasRoom && hasGameplayPlayer) {
            this.hasSeenGameplayRoom = true;
        }

        const showRoomGeometry = hasRoom && this.hasSeenGameplayRoom;
        this.setRoomGeometryVisible(showRoomGeometry);
        if (!showRoomGeometry) {
            this.clearStaticBackgroundGeometry();
            this.clearSpecialDynamicMarkers();
            this.clearObjectWireframes();
            this.clearFull3DObjectModels();
            this.clearLiveActorBillboards();
            this.clearCollectableItemMarkers();
            this.lastStaticBackgroundSignature = '';
            this.lastRoomSignature = '';
            this.lastRoomColorAttribute = null;
            this.lastFull3DObjectCount = 0;
            this.lastFull3DRecognizedObjectCount = 0;
            this.lastLiveActorBillboardCount = 0;
            this.lastTexturedBackgroundQuadCount = 0;
            this.lastDewarpedBackgroundQuadCount = 0;
            if (this.full3DBackgroundRenderer) this.full3DBackgroundRenderer.dispose();
            this.playerGroup.visible = false;
            this.updateDirectionOverlayLabels();
            return;
        }
        this.updateRoomColor(room);
        const signature = room
            ? [room.id, room.size.x, room.size.y, room.size.z].join(':')
            : '';
        if (signature === this.lastRoomSignature) return;
        this.lastRoomSignature = signature;

        const dimensions = roomDimensionsFromRoom(room);
        this.roomDimensions = dimensions;

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

    updateRoomColor(room) {
        const colourAttribute = room ? room.colourAttribute : null;
        if (colourAttribute === this.lastRoomColorAttribute) return;
        this.lastRoomColorAttribute = colourAttribute;

        const color = roomColorFromAttribute(colourAttribute);
        this.floorMaterial.color.setHex(color);
        this.wallMaterial.color.setHex(color);
        this.viewerWallMaterial.color.setHex(color);
        this.roomEdges.material.color.setHex(color);
    }

    setRoomGeometryVisible(visible) {
        this.roomGeometryVisible = Boolean(visible);
        if (this.axesHelper) this.axesHelper.visible = false;
        if (this.staticBackgroundGroup) this.staticBackgroundGroup.visible = visible;
        if (this.specialDynamicGroup) this.specialDynamicGroup.visible = visible;
        if (this.objectWireframeGroup) this.objectWireframeGroup.visible = visible;
        if (this.full3DObjectGroup) this.full3DObjectGroup.visible = visible;
        if (this.liveActorBillboardGroup) this.liveActorBillboardGroup.visible = visible;
        if (this.collectableItemGroup) this.collectableItemGroup.visible = visible;
        if (this.spellMarkerGroup) {
            this.spellMarkerGroup.visible = visible && (
                this.spellMarkerMesh.visible
                || (this.spellMarkerModel && this.spellMarkerModel.visible)
            );
        }
        if (this.directionOverlayElement) {
            this.directionOverlayElement.hidden = !visible;
        }
        this.syncRenderModeVisibility();
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
                room.colourAttribute,
                this.wallTextureDewarpEnabled ? 'dewarp-on' : 'dewarp-off',
                this.wallTextureDewarpScalePercent,
                this.wallTextureBinaryThreshold,
                location.backgroundIds.join(','),
                liveSchematicBackgroundSignature(room.backgroundComparison),
            ].join(':')
            : 'none';
        if (signature === this.lastStaticBackgroundSignature) return;
        this.lastStaticBackgroundSignature = signature;

        this.clearStaticBackgroundGeometry();
        this.lastTexturedBackgroundQuadCount = 0;
        this.lastDewarpedBackgroundQuadCount = 0;
        this.lastVisibleWallTextureQuadCount = 0;
        this.lastWallTextureVisibilityQuadCount = 0;
        if (!location) {
            if (this.full3DBackgroundRenderer) this.full3DBackgroundRenderer.dispose();
            return;
        }

        const backgrounds = location.backgrounds || [];
        const backgroundsWithLivePortcullises = schematicBackgroundsWithLivePortcullises(
            backgrounds,
            room.backgroundComparison
        );
        const mapPosition = position => mapKnightLorePositionToScene(position, this.roomDimensions);
        this.schematicBackgroundRenderer.render(backgroundsWithLivePortcullises, {
            roomDimensions: this.roomDimensions,
            roomColor: roomColorFromAttribute(room ? room.colourAttribute : null),
            mapPosition,
        });
        const full3DResult = this.full3DBackgroundRenderer.render(backgroundsWithLivePortcullises, {
            roomDimensions: this.roomDimensions,
            colourAttribute: room ? room.colourAttribute : null,
            latestFrame: this.latestFrame,
            staticMemory: this.staticMemory,
            mapPosition,
            wallTextureDewarpEnabled: this.wallTextureDewarpEnabled,
            wallTextureDewarpScale: this.wallTextureDewarpScalePercent / 100,
            wallTextureBinaryThreshold: this.wallTextureBinaryThreshold,
        });
        this.lastTexturedBackgroundQuadCount = full3DResult.texturedQuadCount || 0;
        this.lastDewarpedBackgroundQuadCount = full3DResult.dewarpedQuadCount || 0;
        this.updateFull3DBackgroundWallTextureVisibility();
        this.syncRenderModeVisibility();
    }

    clearRenderableGroup(group) {
        if (!group) return;
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
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

    clearStaticBackgroundGeometry() {
        this.clearRenderableGroup(this.schematicBackgroundGroup);
        this.clearRenderableGroup(this.full3DBackgroundGroup);
    }

    clearSpecialDynamicMarkers() {
        while (this.specialDynamicGroup.children.length > 0) {
            const child = this.specialDynamicGroup.children[0];
            this.specialDynamicGroup.remove(child);
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

    clearObjectWireframes() {
        while (this.objectWireframeGroup.children.length > 0) {
            const child = this.objectWireframeGroup.children[0];
            this.objectWireframeGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
        }
    }

    clearFull3DObjectModels() {
        while (this.full3DObjectGroup.children.length > 0) {
            const child = this.full3DObjectGroup.children[0];
            this.full3DObjectGroup.remove(child);
            disposeFull3DObjectModel(child);
        }
    }

    clearLiveActorBillboards() {
        if (!this.liveActorBillboardGroup) return;
        while (this.liveActorBillboardGroup.children.length > 0) {
            this.liveActorBillboardGroup.remove(this.liveActorBillboardGroup.children[0]);
        }
    }

    clearCollectableItemMarkers() {
        while (this.collectableItemGroup.children.length > 0) {
            this.collectableItemGroup.remove(this.collectableItemGroup.children[0]);
        }
    }

    updateSpecialDynamicMarkers() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        if (!room || !this.hasSeenGameplayRoom) {
            this.lastSpecialDynamicMarkers = [];
            this.clearSpecialDynamicMarkers();
            return;
        }

        const markers = specialDynamicMarkersForRoom(room);
        this.lastSpecialDynamicMarkers = markers;
        this.clearSpecialDynamicMarkers();

        markers.filter(marker => marker.render !== false).forEach(marker => {
            this.addSpecialDynamicMarker(marker);
        });
    }

    addSpecialDynamicMarker(marker) {
        const record = marker.record;
        const markerInfo = marker.markerInfo || specialMarkerForCategory(marker.category);
        if (!record || !markerInfo) return;
        if (this.activeRenderMode === 'full-3d' && marker.category === 'wizard') return;

        const position = mapKnightLorePositionToScene(record.position, this.roomDimensions);
        if (!position) return;

        const fallbackSize = markerInfo.fallbackSize;
        const dimensions = record.dimensions || {};
        const width = Math.max(3, (dimensions.x || dimensions.width || fallbackSize.width) / 2);
        const depth = Math.max(3, (dimensions.y || dimensions.depth || fallbackSize.depth) / 2);
        const height = Math.max(3, (dimensions.z || dimensions.height || fallbackSize.height) / 2);
        const mesh = this.createDebugBox(width, height, depth, markerInfo.color, markerInfo.opacity);
        mesh.position.copy(position.vector);
        mesh.position.y += height / 2;
        mesh.userData.dynamicAddress = record.address;
        mesh.userData.spriteId = record.spriteId;
        mesh.userData.objectCategory = marker.category;
        mesh.userData.objectLabel = marker.label || markerInfo.label;
        this.specialDynamicGroup.add(mesh);
    }

    updateLiveActorBillboards() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        if (this.activeRenderMode !== 'full-3d' || !room || !this.hasSeenGameplayRoom) {
            this.lastLiveActorBillboardCount = 0;
            this.lastLiveActorBillboardTextureCount = 0;
            this.lastLiveActorBillboardWireframesVisible = false;
            this.clearLiveActorBillboards();
            return;
        }

        const facingScores = this.computePlayerSpriteBillboardFacingScores({camera: this.camera});
        const selection = selectedSpriteBillboardFacingForView(this.activeViewPreset, facingScores);
        const topBottomActorMarkersVisible = (
            this.activeViewPreset === 'top'
            || this.activeViewPreset === 'bottom'
        );
        const specs = liveActorBillboardSpecsForRoom(room);
        if (!selection.selectedFacing && !topBottomActorMarkersVisible) {
            this.lastLiveActorBillboardCount = 0;
            this.lastLiveActorBillboardTextureCount = 0;
            this.lastLiveActorBillboardWireframesVisible = false;
            this.clearLiveActorBillboards();
            return;
        }

        this.clearLiveActorBillboards();
        this.lastLiveActorBillboardCount = 0;
        this.lastLiveActorBillboardTextureCount = 0;
        this.lastLiveActorBillboardWireframesVisible = topBottomActorMarkersVisible
            ? false
            : this.playerSpriteBillboardWireframeEnabled;
        specs.forEach(spec => {
            const actorBillboard = topBottomActorMarkersVisible
                ? this.createLiveActorTopBottomMarker(spec)
                : this.createLiveActorBillboard(spec, selection.selectedFacing);
            if (!actorBillboard) return;
            this.lastLiveActorBillboardCount += 1;
            this.lastLiveActorBillboardTextureCount += actorBillboard.userData.texturedHalfCount || 0;
            this.liveActorBillboardGroup.add(actorBillboard);
        });
    }

    createLiveActorTopBottomMarker(spec) {
        if (!spec) return null;
        const baseRecord = spec.lowerRecord || spec.topRecord;
        if (!baseRecord) return null;
        const basePosition = mapKnightLorePositionToScene(baseRecord.position, this.roomDimensions);
        if (!basePosition) return null;

        const actorFacing = resolveLiveActorFacing(spec);
        const markerFacing = sceneFacingForLiveActorTopBottomMarker(actorFacing.facing) || 'north';
        const markerGroup = new THREE.Group();
        markerGroup.position.copy(basePosition.vector);
        markerGroup.userData.actor = spec.actor;
        markerGroup.userData.objectSlot = spec.objectSlot;
        markerGroup.userData.lowerSlot = spec.lowerSlot;
        markerGroup.userData.actorFacing = actorFacing.facing;
        markerGroup.userData.markerFacing = markerFacing;
        markerGroup.userData.actorFacingSource = actorFacing.source;
        markerGroup.userData.topBottomActorMarker = true;
        markerGroup.userData.texturedHalfCount = 0;

        const disk = new THREE.Mesh(
            this.liveActorTopBottomMarkerDiskGeometry,
            this.liveActorTopBottomMarkerMaterialForActor(spec.actor)
        );
        disk.rotation.x = -Math.PI / 2;
        disk.position.y = LIVE_ACTOR_TOP_BOTTOM_MARKER_HEIGHT;
        disk.renderOrder = 32;
        disk.userData.actor = spec.actor;
        disk.userData.topBottomActorMarker = 'disk';
        markerGroup.add(disk);

        const arrow = new THREE.Mesh(
            this.liveActorTopBottomMarkerArrowGeometry,
            this.liveActorTopBottomMarkerArrowMaterial
        );
        arrow.position.y = LIVE_ACTOR_TOP_BOTTOM_MARKER_HEIGHT + 0.06;
        arrow.rotation.y = rotationForFacing(markerFacing);
        arrow.renderOrder = 33;
        arrow.userData.actor = spec.actor;
        arrow.userData.actorFacing = actorFacing.facing;
        arrow.userData.markerFacing = markerFacing;
        arrow.userData.topBottomActorMarker = 'arrow';
        markerGroup.add(arrow);

        return markerGroup;
    }

    createLiveActorBillboard(spec, selectedFacing) {
        if (!spec || !selectedFacing) return null;
        const baseRecord = spec.lowerRecord || spec.topRecord;
        if (!baseRecord) return null;
        const basePosition = mapKnightLorePositionToScene(baseRecord.position, this.roomDimensions);
        if (!basePosition) return null;

        const actorGroup = new THREE.Group();
        actorGroup.userData.actor = spec.actor;
        actorGroup.userData.objectSlot = spec.objectSlot;
        actorGroup.userData.lowerSlot = spec.lowerSlot;
        actorGroup.userData.billboardFacing = selectedFacing;
        actorGroup.userData.texturedHalfCount = 0;
        const actorFacing = resolveLiveActorFacing(spec);
        const relativeView = actorFacing.facing
            ? relativePlayerView(actorFacing.facing, selectedFacing)
            : 'unknown';
        actorGroup.userData.actorFacing = actorFacing.facing;
        actorGroup.userData.actorFacingSource = actorFacing.source;
        actorGroup.userData.relativeView = relativeView;
        const material = this.liveActorBillboardMaterialForActor(spec.actor);
        const normal = this.billboardNormalForFacing(selectedFacing);
        actorGroup.position.copy(basePosition.vector);
        actorGroup.position.addScaledVector(normal, LIVE_ACTOR_BILLBOARD_DIRECTION_OFFSET);
        actorGroup.rotation.y = rotationForFacing(selectedFacing);

        const addHalf = (record, part, stackIndex) => {
            if (!record) return;
            const yPosition = PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height * stackIndex;
            // Stage 7.6 cardinal actor pass: keep display-plane selection and
            // texture-side decisions separate. The canonical game view still
            // uses the live sprite ids. Cardinal views use a stable side remap
            // so a back-facing guard/wizard does not flicker between sprite
            // families while the live game frames settle.
            const textureSelection = resolveLiveActorTextureSelection({
                spec,
                record,
                selectedFacing,
                viewPreset: this.activeViewPreset,
            });
            const textureResult = this.actorSpriteBillboardTextureMaterialForSelection(
                spec.actor,
                textureSelection
            );
            const effectiveTextureSelection = textureResult.selection || textureSelection;
            const textureMaterial = textureResult.material;
            if (textureMaterial) {
                const plane = new THREE.Mesh(
                    this.liveActorBillboardPlaneGeometry,
                    textureMaterial
                );
                // Line rectangles start at their bottom edge; billboard planes
                // are centered. Match the player billboard placement so the
                // lower actor half is not sunk below the actor baseline.
                plane.position.y = yPosition + PLAYER_SPRITE_BILLBOARD_HALF_SIZE.height / 2;
                plane.renderOrder = 11;
                plane.userData.actor = spec.actor;
                plane.userData.actorPart = part;
                plane.userData.dynamicAddress = record.address;
                plane.userData.spriteId = effectiveTextureSelection.textureSpriteId;
                plane.userData.liveSpriteId = effectiveTextureSelection.liveSpriteId;
                plane.userData.billboardFacing = selectedFacing;
                plane.userData.actorFacing = effectiveTextureSelection.actorFacing.facing;
                plane.userData.relativeView = effectiveTextureSelection.relativeView;
                plane.userData.liveActorTexturePolicy = effectiveTextureSelection.policy;
                plane.userData.actorTextureSide = effectiveTextureSelection.textureSide;
                actorGroup.add(plane);
                actorGroup.userData.texturedHalfCount += 1;
            }

            const frame = new THREE.LineSegments(
                this.liveActorBillboardGeometry,
                material
            );
            frame.position.y = yPosition;
            frame.visible = this.playerSpriteBillboardWireframeEnabled;
            frame.renderOrder = 12;
            frame.userData.actor = spec.actor;
            frame.userData.actorPart = part;
            frame.userData.dynamicAddress = record.address;
            frame.userData.spriteId = record.spriteId;
            frame.userData.billboardFacing = selectedFacing;
            actorGroup.add(frame);
        };

        addHalf(spec.lowerRecord, 'lower', 0);
        addHalf(spec.topRecord, 'top', spec.lowerRecord ? 1 : 0);
        return actorGroup.children.length > 0 ? actorGroup : null;
    }

    liveActorBillboardMaterialForActor(actor) {
        const key = actor || 'unknown';
        if (!this.liveActorBillboardMaterials.has(key)) {
            this.liveActorBillboardMaterials.set(
                key,
                new THREE.LineBasicMaterial({
                    color: LIVE_ACTOR_BILLBOARD_COLORS[key] || 0xf8fafc,
                    transparent: true,
                    opacity: 0.98,
                    depthTest: true,
                })
            );
        }
        return this.liveActorBillboardMaterials.get(key);
    }

    liveActorTopBottomMarkerMaterialForActor(actor) {
        const key = actor || 'unknown';
        if (!this.liveActorTopBottomMarkerMaterials.has(key)) {
            this.liveActorTopBottomMarkerMaterials.set(
                key,
                new THREE.MeshBasicMaterial({
                    color: LIVE_ACTOR_BILLBOARD_COLORS[key] || 0xf8fafc,
                    transparent: true,
                    opacity: 0.82,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    depthWrite: false,
                })
            );
        }
        return this.liveActorTopBottomMarkerMaterials.get(key);
    }

    billboardNormalForFacing(facing) {
        const candidate = PLAYER_SPRITE_BILLBOARD_FACINGS.find(item => item.id === facing);
        return candidate ? candidate.normal : new THREE.Vector3(0, 0, -1);
    }

    updateObjectWireframes() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        if (this.activeRenderMode !== 'schematic' || !room || !this.hasSeenGameplayRoom) {
            this.clearObjectWireframes();
            return;
        }

        const candidates = dynamicObjectCandidatesForRoom(room)
            .slice(0, OBJECT_WIREFRAME_MAX_RECORDS);
        this.clearObjectWireframes();

        candidates.forEach(record => {
            const position = mapKnightLorePositionToScene(record.position, this.roomDimensions);
            if (!position) return;

            const semantic = classifyDynamicObjectRecord(record);
            if (isSchematicPortcullisRecord(record)) {
                const portcullis = this.createSchematicPortcullisWireframe(record, position, semantic);
                if (portcullis) this.objectWireframeGroup.add(portcullis);
                return;
            }

            const width = Math.max(1, (record.dimensions.x || record.dimensions.width || 1) / 2);
            const depth = Math.max(1, (record.dimensions.y || record.dimensions.depth || 1) / 2);
            const height = Math.max(1, (record.dimensions.z || record.dimensions.height || 1) / 2);
            const mesh = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
                this.materialForDynamicObjectSemantic(semantic)
            );
            mesh.scale.set(width, height, depth);
            mesh.position.copy(position.vector);
            mesh.position.y += height / 2;
            mesh.userData.dynamicSlot = record.slotIndex;
            mesh.userData.spriteId = record.spriteId;
            mesh.userData.objectCategory = semantic.category;
            mesh.userData.objectLabel = semantic.label;
            this.objectWireframeGroup.add(mesh);
        });
    }

    createSchematicPortcullisWireframe(record, position, semantic) {
        if (!record || !position) return null;

        const dimensions = record.dimensions || {};
        const thinX = Number.isFinite(dimensions.x)
            && Number.isFinite(dimensions.y)
            && dimensions.x < dimensions.y;
        const width = thinX
            ? SCHEMATIC_PORTCULLIS_PANEL_SIZE.depth
            : SCHEMATIC_PORTCULLIS_PANEL_SIZE.width;
        const depth = thinX
            ? SCHEMATIC_PORTCULLIS_PANEL_SIZE.width
            : SCHEMATIC_PORTCULLIS_PANEL_SIZE.depth;
        const height = SCHEMATIC_PORTCULLIS_PANEL_SIZE.height;
        const halfWidth = width / 2;
        const halfDepth = depth / 2;
        const positions = [];
        const addLine = (x1, y1, z1, x2, y2, z2) => {
            positions.push(x1, y1, z1, x2, y2, z2);
        };

        if (thinX) {
            addLine(0, 0, -halfDepth, 0, height, -halfDepth);
            addLine(0, 0, halfDepth, 0, height, halfDepth);
            addLine(0, height, -halfDepth, 0, height, halfDepth);
            addLine(-halfWidth, 0, -halfDepth, halfWidth, 0, -halfDepth);
            addLine(-halfWidth, 0, halfDepth, halfWidth, 0, halfDepth);
            for (let i = 0; i < 5; i++) {
                const z = -depth * 0.38 + (depth * 0.76) * (i / 4);
                addLine(0, 0, z, 0, height * 0.94, z);
            }
            [0.22, 0.78].forEach(heightFactor => {
                addLine(0, height * heightFactor, -halfDepth, 0, height * heightFactor, halfDepth);
            });
        } else {
            addLine(-halfWidth, 0, 0, -halfWidth, height, 0);
            addLine(halfWidth, 0, 0, halfWidth, height, 0);
            addLine(-halfWidth, height, 0, halfWidth, height, 0);
            addLine(-halfWidth, 0, -halfDepth, -halfWidth, 0, halfDepth);
            addLine(halfWidth, 0, -halfDepth, halfWidth, 0, halfDepth);
            for (let i = 0; i < 5; i++) {
                const x = -width * 0.38 + (width * 0.76) * (i / 4);
                addLine(x, 0, 0, x, height * 0.94, 0);
            }
            [0.22, 0.78].forEach(heightFactor => {
                addLine(-halfWidth, height * heightFactor, 0, halfWidth, height * heightFactor, 0);
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mesh = new THREE.LineSegments(
            geometry,
            this.materialForDynamicObjectSemantic(semantic)
        );
        mesh.position.copy(position.vector);
        mesh.userData.dynamicSlot = record.slotIndex;
        mesh.userData.spriteId = record.spriteId;
        mesh.userData.objectCategory = semantic.category;
        mesh.userData.objectLabel = semantic.label;
        mesh.userData.schematicKind = 'portcullis-bars';
        return mesh;
    }

    updateFull3DObjectModels() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        if (this.activeRenderMode !== 'full-3d' || !room || !this.hasSeenGameplayRoom) {
            this.lastFull3DObjectCount = 0;
            this.lastFull3DRecognizedObjectCount = 0;
            this.clearFull3DObjectModels();
            return;
        }

        const recordsByObjectSlot = liveObjectRecordsByObjectSlotForRoom(room);
        const actorBillboardAddresses = liveActorBillboardRecordAddressesForRoom(room);
        const candidates = dynamicObjectCandidatesForRoom(room)
            .filter(record => (
                !actorBillboardAddresses.has(record.address)
                && !shouldRenderAsLiveActorBillboard(record, recordsByObjectSlot)
            ))
            .slice(0, OBJECT_WIREFRAME_MAX_RECORDS);
        this.clearFull3DObjectModels();
        this.lastFull3DObjectCount = candidates.length;
        this.lastFull3DRecognizedObjectCount = 0;

        candidates.forEach(record => {
            const position = mapKnightLorePositionToScene(record.position, this.roomDimensions);
            if (!position) return;

            const semantic = classifyDynamicObjectRecord(record);
            const object = createFull3DObjectModel(record.spriteId, {
                dimensions: record.dimensions,
                semanticCategory: semantic.category,
            });
            if (!object) return;

            object.position.copy(position.vector);
            object.userData.dynamicSlot = record.slotIndex;
            object.userData.dynamicAddress = record.address;
            object.userData.spriteId = record.spriteId;
            object.userData.objectCategory = semantic.category;
            object.userData.objectLabel = semantic.label;
            if (object.userData.full3dRecognized) {
                this.lastFull3DRecognizedObjectCount += 1;
            }
            this.full3DObjectGroup.add(object);
        });

        this.syncRenderModeVisibility();
    }

    materialForDynamicObjectSemantic(semantic) {
        const color = semantic && SPECIAL_OBJECT_WIREFRAME_COLORS[semantic.category];
        if (!color) return this.objectWireframeMaterial;
        if (!this.specialObjectWireframeMaterials.has(semantic.category)) {
            this.specialObjectWireframeMaterials.set(
                semantic.category,
                new THREE.LineBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.96,
                })
            );
        }
        return this.specialObjectWireframeMaterials.get(semantic.category);
    }

    updateCollectableItemMarkers() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        if (!room || !this.hasSeenGameplayRoom) {
            this.clearCollectableItemMarkers();
            return;
        }

        const itemRecords = room.collectableItems && room.collectableItems.currentRoomRecords
            ? room.collectableItems.currentRoomRecords
            : [];
        this.lastResolvedCollectableItemRecords = itemRecords;
        this.clearCollectableItemMarkers();

        itemRecords.forEach(item => {
            const position = mapKnightLoreHighResolutionPositionToScene(item.livePosition || item.currentPosition);
            if (!position) return;
            const itemSpriteId = item.spriteId !== null && item.spriteId !== undefined
                ? item.spriteId
                : (item.graphicId || 0);
            const material = this.collectableItemMaterials[itemSpriteId % this.collectableItemMaterials.length]
                || this.collectableItemFallbackMaterial;
            const marker = new THREE.Mesh(this.collectableItemGeometry, material);
            marker.position.copy(position.vector);
            marker.position.y += ITEM_MARKER_SIZE / 2;
            marker.userData.itemIndex = item.index;
            marker.userData.graphicId = itemSpriteId;
            this.collectableItemGroup.add(marker);
        });
    }

    resetSpellMovementProbe(roomId = null) {
        this.spellProbeRoomId = roomId;
        this.lastSpellProbeRows = [];
        this.lastSpellProbeTotalHits = 0;
        this.lastSpellProbeChangedHits = 0;
        this.lastSpellProbeValueCounts = new Map(SPELL_OBSERVED_VALUES.map(value => [value, 0]));
        this.previousSpellProbeWindows = new Map();
        this.updateSpellMarkerFromProbeRow(null);
    }

    clearSpellMarkerModel() {
        if (!this.spellMarkerModel) return;
        if (this.spellMarkerGroup) this.spellMarkerGroup.remove(this.spellMarkerModel);
        disposeFull3DObjectModel(this.spellMarkerModel);
        this.spellMarkerModel = null;
        this.spellMarkerModelSpriteId = null;
    }

    spellMarkerModelForSprite(spriteId) {
        const id = Number.isFinite(spriteId) ? spriteId & 0xff : null;
        if (
            this.activeRenderMode !== 'full-3d'
            || id === null
            || !SPELL_FULL_3D_MODEL_VALUES.has(id)
        ) {
            return null;
        }

        if (this.spellMarkerModel && this.spellMarkerModelSpriteId === id) {
            return this.spellMarkerModel;
        }

        this.clearSpellMarkerModel();
        const model = createFull3DObjectModel(id, {semanticCategory: 'special-spell'});
        if (!model || !model.userData.full3dRecognized) return null;

        model.visible = false;
        this.spellMarkerModel = model;
        this.spellMarkerModelSpriteId = id;
        this.spellMarkerGroup.add(model);
        return model;
    }

    hideSpellMarker() {
        if (this.spellMarkerMesh) this.spellMarkerMesh.visible = false;
        if (this.spellMarkerModel) this.spellMarkerModel.visible = false;
        if (this.spellMarkerGroup) this.spellMarkerGroup.visible = false;
    }

    updateSpellMarkerFromProbeRow(row) {
        if (!this.spellMarkerGroup || !this.spellMarkerMesh) return;

        if (!row || !row.observedThisFrame || !isFinitePosition(row.candidatePosition)) {
            this.hideSpellMarker();
            return;
        }

        const position = mapKnightLoreHighResolutionPositionToScene(row.candidatePosition);
        if (!position) {
            this.hideSpellMarker();
            return;
        }

        const spellModel = this.spellMarkerModelForSprite(row.observedValue);
        if (spellModel) {
            this.spellMarkerMesh.visible = false;
            spellModel.position.copy(position.vector);
            spellModel.userData.spellProbeAddress = row.address;
            spellModel.userData.spellProbeValue = row.observedValue;
            spellModel.userData.spellProbeKind = row.observedKind;
            spellModel.visible = true;
            this.spellMarkerGroup.visible = this.hasSeenGameplayRoom;
            return;
        }

        if (this.spellMarkerModel) this.spellMarkerModel.visible = false;

        this.spellMarkerMesh.material = row.observedKind === 'wolf attack'
            ? this.spellAttackMaterial
            : (row.observedKind === 'item display?'
                ? this.spellItemDisplayMaterial
                : this.spellCycleMaterial);
        this.spellMarkerMesh.position.copy(position.vector);
        this.spellMarkerMesh.position.y += SPELL_MARKER_SIZE / 2;
        this.spellMarkerMesh.userData.spellProbeAddress = row.address;
        this.spellMarkerMesh.userData.spellProbeValue = row.observedValue;
        this.spellMarkerMesh.userData.spellProbeKind = row.observedKind;
        this.spellMarkerMesh.visible = true;
        this.spellMarkerGroup.visible = this.hasSeenGameplayRoom;
    }

    updateSpellMovementProbe() {
        const frame = this.latestFrame;
        const scene = frame && frame.knightLoreScene ? frame.knightLoreScene : null;
        const room = scene ? scene.room : null;
        const roomId = room && room.id !== null && room.id !== undefined ? room.id : null;
        const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
        const memoryEnd = frame && Number.isFinite(frame.memoryEnd) ? frame.memoryEnd : null;
        const hasProbeRoom = this.hasSeenGameplayRoom && roomId !== null;

        if (!frame || !frame.semanticMemory || memoryStart === null || memoryEnd === null || !hasProbeRoom) {
            this.resetSpellMovementProbe(null);
            return;
        }

        if (this.spellProbeRoomId !== roomId) {
            this.resetSpellMovementProbe(roomId);
        }

        const currentValue = readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS);
        const isObservedValue = SPELL_OBSERVED_VALUE_SET.has(currentValue);
        const valueCounts = new Map(SPELL_OBSERVED_VALUES.map(value => [value, 0]));
        if (isObservedValue) {
            valueCounts.set(currentValue, 1);
        }

        const windowStart = Math.max(memoryStart, SPELL_PROBE_ADDRESS - SPELL_PROBE_WINDOW_BEFORE);
        const windowEnd = Math.min(memoryEnd, SPELL_PROBE_ADDRESS + SPELL_PROBE_WINDOW_AFTER + 1);
        const windowBytes = readFrameMemoryWindow(frame, windowStart, windowEnd - windowStart);
        const previous = this.previousSpellProbeWindows.get(SPELL_PROBE_ADDRESS) || null;
        const changes = findByteWindowChanges(previous, windowBytes, windowStart);
        const slotInfo = dynamicSlotInfoForAddress(SPELL_PROBE_ADDRESS);
        const row = {
            address: SPELL_PROBE_ADDRESS,
            observedThisFrame: isObservedValue,
            observedValue: currentValue,
            observedKind: classifySpellProbeValue(currentValue),
            windowStart,
            windowBytes,
            changes,
            changeCount: changes ? changes.length : 0,
            slotInfo,
            candidatePosition: {
                x: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 1),
                y: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 2),
                z: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 3),
            },
            candidateDimensions: {
                x: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 4),
                y: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 5),
                z: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 6),
            },
            candidateRoomId: readFrameMemoryByte(frame, SPELL_PROBE_ADDRESS + 8),
        };

        this.previousSpellProbeWindows.set(SPELL_PROBE_ADDRESS, {
            windowStart,
            bytes: windowBytes,
        });

        const rows = [row];

        this.lastSpellProbeTotalHits = isObservedValue ? 1 : 0;
        this.lastSpellProbeChangedHits = rows.filter(row => row.changes && row.changes.length > 0).length;
        this.lastSpellProbeValueCounts = valueCounts;
        this.lastSpellProbeRows = rows;
        this.updateSpellMarkerFromProbeRow(row);
    }

    updatePlayerSpriteMemoryPile() {
        const frame = this.latestFrame;
        const scene = frame && frame.knightLoreScene ? frame.knightLoreScene : null;
        const room = scene ? scene.room : null;
        const roomId = room && room.id !== null && room.id !== undefined ? room.id : null;
        const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
        const memoryEnd = frame && Number.isFinite(frame.memoryEnd) ? frame.memoryEnd : null;
        if (
            !frame
            || !frame.semanticMemory
            || memoryStart === null
            || memoryEnd === null
            || !this.hasSeenGameplayRoom
            || roomId === null
        ) {
            this.lastPlayerSpriteMemoryScanHits = 0;
            return;
        }

        const hits = scanFrameMemoryForBytes(frame, PLAYER_SPRITE_MEMORY_VALUE_SET);
        this.lastPlayerSpriteMemoryScanHits = hits.length;
        hits.forEach(hit => {
            if (this.playerSpriteMemoryPileAddresses.has(hit.address)) return;
            if (this.playerSpriteMemoryPile.length >= PLAYER_SPRITE_MEMORY_PILE_LIMIT) {
                this.playerSpriteMemoryPileOverflow += 1;
                return;
            }

            this.playerSpriteMemoryPileAddresses.add(hit.address);
            this.playerSpriteMemoryPile.push({
                address: hit.address,
                firstFrame: this.frameCounter,
                firstValue: hit.value,
            });
        });
    }

    resetRoomColourProbe(roomId = null) {
        this.roomColourProbeRoomId = roomId;
        this.previousRoomColourProbe = null;
        this.lastRoomColourProbe = null;
        this.lastRoomColourProbeChange = null;
    }

    updateRoomColourProbe() {
        const frame = this.latestFrame;
        const scene = frame && frame.knightLoreScene ? frame.knightLoreScene : null;
        const room = scene ? scene.room : null;
        const roomId = room && room.id !== null && room.id !== undefined ? room.id : null;
        const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
        const memoryEnd = frame && Number.isFinite(frame.memoryEnd) ? frame.memoryEnd : null;

        if (!frame || !frame.semanticMemory || memoryStart === null || memoryEnd === null || roomId === null) {
            this.resetRoomColourProbe(null);
            return;
        }

        if (this.roomColourProbeRoomId !== roomId) {
            this.resetRoomColourProbe(roomId);
        }

        const workingWindowStart = Math.max(
            memoryStart,
            ROOM_COLOUR_REFERENCE_ADDRESS - ROOM_COLOUR_WORKING_WINDOW_BEFORE
        );
        const workingWindowEnd = Math.min(
            memoryEnd,
            ROOM_COLOUR_REFERENCE_ADDRESS + ROOM_COLOUR_WORKING_WINDOW_AFTER + 1
        );
        const workingWindowBytes = readFrameMemoryWindow(
            frame,
            workingWindowStart,
            workingWindowEnd - workingWindowStart
        );
        const previous = this.previousRoomColourProbe;
        const workingChanges = findByteWindowChanges(
            previous ? previous.workingWindow : null,
            workingWindowBytes,
            workingWindowStart
        );
        const workingCandidateAddresses = findByteAddresses(
            workingWindowBytes,
            workingWindowStart,
            ROOM_COLOUR_CANDIDATE_VALUE
        );

        const attributeBytes = frame.attributeMemory || null;
        const attributeStart = frame && Number.isFinite(frame.attributeMemoryStart)
            ? frame.attributeMemoryStart
            : ROOM_COLOUR_ATTRIBUTE_MEMORY_START;
        const attributeEnd = frame && Number.isFinite(frame.attributeMemoryEnd)
            ? frame.attributeMemoryEnd
            : ROOM_COLOUR_ATTRIBUTE_MEMORY_END;
        const attributeCounts = countByteValues(attributeBytes);
        const attributeCandidateCount = attributeCounts.get(ROOM_COLOUR_CANDIDATE_VALUE) || 0;
        const attributeCandidateAddresses = findByteAddresses(
            attributeBytes,
            attributeStart,
            ROOM_COLOUR_CANDIDATE_VALUE
        );
        const attributeChanges = attributeBytes
            ? findByteWindowChanges(
                previous && previous.attributeBytes
                    ? {windowStart: previous.attributeStart, bytes: previous.attributeBytes}
                    : null,
                attributeBytes,
                attributeStart
            )
            : null;
        const attributeCandidateChangeCount = attributeChanges
            ? attributeChanges.filter(change => change.after === ROOM_COLOUR_CANDIDATE_VALUE).length
            : 0;
        const workingChangeCount = workingChanges ? workingChanges.length : 0;
        const attributeChangeCount = attributeChanges ? attributeChanges.length : 0;

        if (workingChangeCount > 0 || attributeChangeCount > 0) {
            this.lastRoomColourProbeChange = {
                frameCounter: this.frameCounter,
                semanticFrameCounter: frame.semanticFrameCounter || null,
                workingChangeCount,
                attributeChangeCount,
                attributeCandidateChangeCount,
            };
        }

        const framesSinceChange = this.lastRoomColourProbeChange
            ? this.frameCounter - this.lastRoomColourProbeChange.frameCounter
            : null;
        const recentChange = framesSinceChange !== null && framesSinceChange <= ROOM_COLOUR_CHANGE_HOLD_FRAMES
            ? this.lastRoomColourProbeChange
            : null;

        this.lastRoomColourProbe = {
            roomId,
            documentedAddress: ROOM_COLOUR_REFERENCE_ADDRESS,
            documentedValue: readFrameMemoryByte(frame, ROOM_COLOUR_REFERENCE_ADDRESS),
            candidateValue: ROOM_COLOUR_CANDIDATE_VALUE,
            rendererColor: roomColorFromAttribute(room ? room.colourAttribute : null),
            workingWindowStart,
            workingWindowBytes,
            workingChanges,
            workingCandidateAddresses,
            attributeStart,
            attributeEnd,
            attributeCaptured: Boolean(attributeBytes),
            attributeTotalBytes: attributeBytes ? attributeBytes.length : 0,
            attributeCandidateCount,
            attributeCandidateAddresses,
            attributeTopCounts: formatTopByteCounts(attributeCounts),
            attributeChanges,
            attributeChangeCount,
            attributeCandidateChangeCount,
            recentChange,
            framesSinceChange,
        };

        this.previousRoomColourProbe = {
            roomId,
            workingWindow: {
                windowStart: workingWindowStart,
                bytes: Array.from(workingWindowBytes),
            },
            attributeStart,
            attributeBytes: attributeBytes ? Array.from(attributeBytes) : null,
        };
    }

    createDebugBox(width, height, depth, color, opacity) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            createBackgroundMaterial(color, opacity)
        );
        mesh.scale.set(width, height, depth);
        return mesh;
    }

    updatePlayerProxy() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const player = scene ? scene.player : null;
        if (!player || !isFinitePosition(player.body)) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            this.playerSpriteBillboardHookInfo = null;
            this.playerSpriteBillboardGroup.visible = false;
            return;
        }
        const room = scene ? scene.room : null;
        if (!room || room.id === null || room.id === undefined) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            this.playerSpriteBillboardHookInfo = null;
            this.playerSpriteBillboardGroup.visible = false;
            return;
        }
        const orientation = player.orientation || {};
        if (!orientation.visualFacing) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            this.playerSpriteBillboardHookInfo = null;
            this.playerSpriteBillboardGroup.visible = false;
            return;
        }

        const body = mapKnightLorePositionToScene(player.body, this.roomDimensions);
        if (!body) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            this.playerSpriteBillboardHookInfo = null;
            this.playerSpriteBillboardGroup.visible = false;
            return;
        }

        const previousPosition = this.lastPlayerScenePosition;
        this.playerGroup.visible = true;
        this.playerGroup.position.copy(body.vector);

        const movementFacing = previousPosition
            ? facingFromDelta(body.vector.clone().sub(previousPosition))
            : null;
        if (movementFacing) {
            this.lastPlayerFacing = movementFacing;
        }
        this.lastPlayerScenePosition = body.vector.clone();
        this.playerGroup.rotation.y = 0;

        const stateLabel = orientation.state ? orientation.state.label : 'unclassified';
        const playerStateMaterial = stateLabel === 'human'
            ? this.playerHumanMaterial
            : stateLabel === 'wolf'
                ? this.playerWolfMaterial
                : this.playerUnknownMaterial;
        const classifiedAxisFacing = orientation.visualFacing || null;
        if (classifiedAxisFacing) {
            this.lastPointerAxisFacing = classifiedAxisFacing;
        }

        const pointerAxisFacing = classifiedAxisFacing || this.lastPointerAxisFacing;
        const pointerFacing = sceneFacingFromGameAxis(pointerAxisFacing) || this.lastPlayerFacing;
        const pointerLabel = pointerAxisFacing
            ? pointerAxisFacing + '/' + pointerFacing
            : pointerFacing;
        const pointerSource = classifiedAxisFacing
            ? orientation.visualFacingSource + ', current frame'
            : (
                pointerAxisFacing
                    ? 'last classified orientation held'
                    : (movementFacing ? 'movement delta fallback' : 'last movement/default fallback')
            );
        this.playerPointerGroup.rotation.y = rotationForFacing(pointerFacing);
        this.playerPointerMesh.material = pointerAxisFacing
            ? this.playerPointerMaterial
            : this.playerPointerFallbackMaterial;

        const headCandidatePosition = player.head && player.head.renderPositionCandidate
            ? player.head.renderPositionCandidate
            : (player.head ? player.head.screenPosition : null);
        const head = !isZeroPosition(headCandidatePosition)
            ? mapKnightLorePositionToScene(headCandidatePosition, this.roomDimensions)
            : null;
        const headOffset = head
            ? head.vector.clone().sub(body.vector)
            : null;
        const headHorizontalOffset = headOffset ? distanceXZ(headOffset, new THREE.Vector3()) : Infinity;
        const useHeadCandidate = Boolean(
            head
            && headHorizontalOffset <= PLAYER_HEAD_MAX_HORIZONTAL_OFFSET
        );

        if (useHeadCandidate) {
            this.playerHeadMesh.position.set(
                headOffset.x,
                PLAYER_HEAD_FALLBACK_OFFSET.y,
                headOffset.z
            );
        } else {
            this.playerHeadMesh.position.copy(PLAYER_HEAD_FALLBACK_OFFSET);
        }

        const proxyVisible = this.activeRenderMode === 'schematic';
        const topBottomMarkerVisible = this.activeRenderMode === 'full-3d'
            && (this.activeViewPreset === 'top' || this.activeViewPreset === 'bottom');
        this.playerBodyMesh.visible = proxyVisible;
        this.playerHeadMesh.visible = proxyVisible;
        this.playerPointerGroup.visible = proxyVisible;
        this.playerTopBottomMarkerGroup.visible = topBottomMarkerVisible;
        this.playerTopBottomMarkerGroup.rotation.y = rotationForFacing(pointerFacing);
        this.playerTopBottomMarkerDiskMaterial.color.setHex(
            stateLabel === 'human'
                ? 0xf97316
                : stateLabel === 'wolf'
                    ? 0x60a5fa
                    : 0x94a3b8
        );
        this.playerBodyMesh.material = playerStateMaterial;
        this.playerHeadMesh.material = playerStateMaterial;

        this.updatePlayerSpriteBillboards({
            bodySprite: readFrameMemoryByte(this.latestFrame, PLAYER_BODY_SPRITE_CANDIDATE_ADDRESS),
            headSprite: readFrameMemoryByte(this.latestFrame, PLAYER_HEAD_SPRITE_CANDIDATE_ADDRESS),
            bodyPosition: player.body,
            headPosition: headCandidatePosition,
            bodyScenePosition: body.vector,
            headSceneOffset: useHeadCandidate ? headOffset : PLAYER_HEAD_FALLBACK_OFFSET,
            room,
            orientation,
            state: stateLabel,
            pointerFacing,
            pointerAxisFacing,
            bodyMirrorFlag: orientation.bodyMirrorFlag,
            headMirrorFlag: orientation.headMirrorFlag,
            directionAxisThreshold: orientation.directionAxisThreshold,
            activeRenderMode: this.activeRenderMode,
            activeViewPreset: this.activeViewPreset,
            camera: this.camera,
        });

        this.playerProxyInfo = {
            bodySource: body.source,
            headSource: useHeadCandidate
                ? head.source + ' from 0x5C29 candidate'
                : 'attached fallback',
            facing: this.lastPlayerFacing,
            facingSource: movementFacing ? 'movement delta' : 'last movement/default',
            pointerFacing,
            pointerAxisFacing,
            classifiedAxisFacing,
            pointerLabel,
            pointerSource,
            mirrored: Boolean(orientation.primaryOrientation && orientation.primaryOrientation.mirrored),
            mirrorFlagsConsistent: orientation.mirrorFlagsConsistent,
            directionAxisThreshold: orientation.directionAxisThreshold,
            visualAxisPair: orientation.visualAxisPair || null,
            spriteMirrorKey: orientation.spriteMirrorKey || '--',
            primaryOrientation: orientation.primaryOrientation || null,
            documentedOrientation: orientation.documentedOrientation || null,
            bodyOrientation: orientation.bodyOrientation || null,
            state: stateLabel,
            proxyVisible,
            topBottomMarkerVisible,
        };
    }

    updatePlayerSpriteBillboards(billboardInput) {
        this.playerSpriteBillboardHookCallCount += 1;
        const facingScores = this.computePlayerSpriteBillboardFacingScores(billboardInput);
        const selection = selectedSpriteBillboardFacingForView(
            billboardInput.activeViewPreset,
            facingScores
        );
        const viewPolicy = selection.viewPolicy;
        const selectedFacing = selection.selectedFacing;
        const textureReferenceSide = selection.textureReferenceSide;
        const selectedScore = selection.selectedScore;
        const visible = billboardInput.activeRenderMode === 'full-3d' && Boolean(selectedFacing);
        const textureSelection = this.resolvePlayerSpriteBillboardTextureSelection(
            billboardInput,
            textureReferenceSide,
            viewPolicy
        );
        this.playerSpriteBillboardGroup.visible = visible;
        const wireframesVisible = visible && this.playerSpriteBillboardWireframeEnabled;
        this.playerSpriteBillboardGroup.children.forEach(facingGroup => {
            const selected = visible && facingGroup.userData.facing === selectedFacing;
            facingGroup.visible = selected;
            if (!selected) return;
            const transformVisible = textureSelection.renderMode === 'transformation';
            facingGroup.userData.bodyPlane.visible = !transformVisible;
            facingGroup.userData.bodyFrame.visible = wireframesVisible && !transformVisible;
            facingGroup.userData.headPlane.visible = !transformVisible;
            facingGroup.userData.headFrame.visible = wireframesVisible && !transformVisible;
            facingGroup.userData.fullTransformPlane.visible = transformVisible;
            facingGroup.userData.fullTransformFrame.visible = wireframesVisible && transformVisible;
            if (transformVisible) {
                facingGroup.userData.fullTransformPlane.material = textureSelection.fullMaterial
                    || this.playerSpriteBillboardFallbackTextureMaterial;
            } else {
                facingGroup.userData.bodyPlane.material = textureSelection.bodyMaterial
                    || this.playerSpriteBillboardFallbackTextureMaterial;
                facingGroup.userData.headPlane.material = textureSelection.headMaterial
                    || this.playerSpriteBillboardFallbackTextureMaterial;
            }
        });
        const wireframeCount = wireframesVisible
            ? (textureSelection.renderMode === 'transformation' ? 1 : 2)
            : 0;
        this.playerSpriteBillboardHookInfo = {
            frame: this.frameCounter,
            callCount: this.playerSpriteBillboardHookCallCount,
            mode: billboardInput.activeRenderMode,
            viewPreset: billboardInput.activeViewPreset,
            wireframesVisible,
            wireframeCount,
            viewerDirection: facingScores.viewerDirection,
            viewerDirectionSource: facingScores.viewerDirectionSource,
            selectedFacing,
            selectedDot: selectedScore ? selectedScore.dot : null,
            textureReferenceSide,
            geometryFront: '-Z',
            viewConvention: 'camera-side',
            viewPolicy: viewPolicy.label,
            textureStrategy: textureSelection.textureStrategy,
            textureMirrorX: textureSelection.mirrorTextureX,
            policyMirrorTextureX: textureSelection.policyMirrorTextureX,
            policyFacingMirrorTextureX: textureSelection.policyFacingMirrorTextureX,
            policySwapTextureSide: textureSelection.policySwapTextureSide,
            bodyLiveMirrorX: textureSelection.bodyLiveMirrorX,
            headLiveMirrorX: textureSelection.headLiveMirrorX,
            bodyLiveSpriteValid: textureSelection.bodyLiveSpriteValid,
            headLiveSpriteValid: textureSelection.headLiveSpriteValid,
            bodyTextureSpriteValid: textureSelection.bodyTextureSpriteValid,
            headTextureSpriteValid: textureSelection.headTextureSpriteValid,
            bodyMirrorTextureX: textureSelection.bodyMirrorTextureX,
            headMirrorTextureX: textureSelection.headMirrorTextureX,
            textureFlip: 'buffer-xy',
            billboardMode: textureSelection.renderMode,
            relativeView: textureSelection.relativeView,
            textureSide: textureSelection.textureSide,
            gameViewDebugActive: textureSelection.gameViewDebugActive,
            phaseAlignmentBypassed: textureSelection.phaseAlignmentBypassed,
            storedTextureBypassed: textureSelection.storedTextureBypassed,
            textureCharacterFacing: textureSelection.characterFacing,
            textureState: textureSelection.state,
            textureFullSprite: textureSelection.fullSprite,
            textureBodySprite: textureSelection.bodySprite,
            textureHeadSprite: textureSelection.headSprite,
            textureBodyRawSprite: textureSelection.bodyRawSprite,
            textureHeadRawSprite: textureSelection.headRawSprite,
            textureBodyPhaseAligned: textureSelection.bodyPhaseAligned,
            textureHeadPhaseAligned: textureSelection.headPhaseAligned,
            textureHeadBodyPhase: textureSelection.headBodyPhase,
            textureHeadRawPhase: textureSelection.headRawPhase,
            textureBodyAlignedPhase: textureSelection.bodyAlignedPhase,
            textureHeadAlignedPhase: textureSelection.headAlignedPhase,
            textureBodyMaterialSprite: textureSelection.bodyMaterialSprite,
            textureHeadMaterialSprite: textureSelection.headMaterialSprite,
            textureBodyMaterialDiagnostic: textureSelection.bodyMaterialDiagnostic,
            textureHeadMaterialDiagnostic: textureSelection.headMaterialDiagnostic,
            textureBodyMaterialFallback: textureSelection.bodyMaterialFallback,
            textureHeadMaterialFallback: textureSelection.headMaterialFallback,
            textureBodyStoredSprite: textureSelection.bodyStoredSprite,
            textureHeadStoredSprite: textureSelection.headStoredSprite,
            textureBodyStoredSide: textureSelection.bodyStoredSide,
            textureHeadStoredSide: textureSelection.headStoredSide,
            textureBodyStoredMirrorX: textureSelection.bodyStoredMirrorX,
            textureHeadStoredMirrorX: textureSelection.headStoredMirrorX,
            textureFullReady: Boolean(textureSelection.fullMaterial),
            textureBodyReady: Boolean(textureSelection.bodyMaterial),
            textureHeadReady: Boolean(textureSelection.headMaterial),
            bodyTextureYOffset: textureSelection.bodyTextureYOffset,
            dotSummary: facingScores.scores.map(score => (
                score.id + ':' + formatDotScore(score.dot)
            )).join(' '),
            bodySprite: billboardInput.bodySprite,
            headSprite: billboardInput.headSprite,
            state: billboardInput.state,
            pointerFacing: billboardInput.pointerFacing,
            pointerAxisFacing: billboardInput.pointerAxisFacing,
            bodyMirrorFlag: billboardInput.bodyMirrorFlag,
            headMirrorFlag: billboardInput.headMirrorFlag,
            roomId: billboardInput.room ? billboardInput.room.id : null,
            cameraPosition: billboardInput.camera ? billboardInput.camera.position.clone() : null,
            cameraUp: billboardInput.camera ? billboardInput.camera.up.clone() : null,
        };
        this.recordPlayerBillboardTransitionTrace(this.playerSpriteBillboardHookInfo);
    }

    recordPlayerBillboardTransitionTrace(info) {
        if (!info) return;
        const key = [
            info.roomId,
            info.mode,
            info.viewPreset,
            info.billboardMode,
            info.state,
            info.pointerFacing,
            info.textureBodySprite,
            info.textureHeadSprite,
            info.textureBodyMaterialSprite,
            info.textureHeadMaterialSprite,
            info.bodyMirrorTextureX ? 1 : 0,
            info.headMirrorTextureX ? 1 : 0,
            info.textureBodyReady ? 1 : 0,
            info.textureHeadReady ? 1 : 0,
            info.phaseAlignmentBypassed ? 1 : 0,
            info.storedTextureBypassed ? 1 : 0,
        ].join(':');

        const reasons = [];
        if (key !== this.lastPlayerBillboardTransitionKey) reasons.push('changed');
        if (info.billboardMode === 'transformation') reasons.push('transformation');
        if (!info.textureBodyReady || !info.textureHeadReady) reasons.push('missing-texture');
        if (info.textureBodyMaterialFallback || info.textureHeadMaterialFallback) reasons.push('fallback');
        if (info.textureBodySprite !== info.textureBodyRawSprite) reasons.push('body-align');
        if (info.textureHeadSprite !== info.textureHeadRawSprite) reasons.push('head-align');
        if (info.textureBodyStoredMirrorX || info.textureHeadStoredMirrorX) reasons.push('stored-mirror');
        if (info.phaseAlignmentBypassed) reasons.push('phase-bypass');
        if (info.storedTextureBypassed) reasons.push('storage-bypass');

        if (reasons.length === 0) return;
        this.lastPlayerBillboardTransitionKey = key;
        this.playerBillboardTransitionTrace.unshift({
            frame: info.frame,
            roomId: info.roomId,
            reasons: reasons.join(' '),
            mode: info.mode,
            viewPreset: info.viewPreset,
            billboardMode: info.billboardMode,
            state: info.state,
            facing: info.pointerFacing,
            rawBodySprite: info.textureBodyRawSprite,
            rawHeadSprite: info.textureHeadRawSprite,
            textureBodySprite: info.textureBodySprite,
            textureHeadSprite: info.textureHeadSprite,
            materialBodySprite: info.textureBodyMaterialSprite,
            materialHeadSprite: info.textureHeadMaterialSprite,
            bodyMaterialDiagnostic: info.textureBodyMaterialDiagnostic,
            headMaterialDiagnostic: info.textureHeadMaterialDiagnostic,
            bodyMirrorTextureX: info.bodyMirrorTextureX,
            headMirrorTextureX: info.headMirrorTextureX,
            bodyStoredSide: info.textureBodyStoredSide,
            headStoredSide: info.textureHeadStoredSide,
            bodyStoredMirrorX: info.textureBodyStoredMirrorX,
            headStoredMirrorX: info.textureHeadStoredMirrorX,
            phaseBypass: info.phaseAlignmentBypassed,
            storageBypass: info.storedTextureBypassed,
            bodyReady: info.textureBodyReady,
            headReady: info.textureHeadReady,
        });
        if (this.playerBillboardTransitionTrace.length > PLAYER_BILLBOARD_TRANSITION_TRACE_LIMIT) {
            this.playerBillboardTransitionTrace.length = PLAYER_BILLBOARD_TRANSITION_TRACE_LIMIT;
        }
    }

    resolvePlayerSpriteBillboardTextureSelection(billboardInput, textureReferenceSide, viewPolicy) {
        const characterFacing = billboardInput.pointerFacing || null;
        const relativeView = relativePlayerView(characterFacing, textureReferenceSide);
        const baseRelativeTextureSide = playerSpriteSideForRelativeView(relativeView);
        const textureStrategy = viewPolicy ? viewPolicy.textureStrategy : 'relative';
        const gameViewDebugActive = Boolean(
            viewPolicy
            && typeof viewPolicy.label === 'string'
            && viewPolicy.label.startsWith('game-')
        );
        const phaseAlignmentBypassed = Boolean(
            gameViewDebugActive
            && this.playerSpriteBillboardPhaseBypassDebugEnabled
        );
        const storedTextureBypassed = Boolean(
            gameViewDebugActive
            && this.playerSpriteBillboardStorageBypassDebugEnabled
        );
        const policyMirrorTextureX = Boolean(viewPolicy && viewPolicy.mirrorTextureX);
        const policyFacingMirrorTextureX = playerSpriteBillboardPolicyFacingMirror(
            viewPolicy,
            characterFacing
        );
        const policySwapTextureSide = playerSpriteBillboardPolicySwapTextureSide(
            viewPolicy,
            characterFacing
        );
        const relativeTextureSide = policySwapTextureSide
            ? oppositePlayerSpriteSide(baseRelativeTextureSide)
            : baseRelativeTextureSide;
        const mirrorThreshold = Number.isFinite(billboardInput.directionAxisThreshold)
            ? billboardInput.directionAxisThreshold
            : 0x4c;
        const bodyLiveMirrorX = playerSpriteBillboardMirrorFromFlag(
            billboardInput.bodyMirrorFlag,
            mirrorThreshold
        );
        const headLiveMirrorX = playerSpriteBillboardMirrorFromFlag(
            billboardInput.headMirrorFlag,
            mirrorThreshold
        );
        const transformLiveMirrorX = bodyLiveMirrorX || headLiveMirrorX;
        const state = this.resolvePlayerSpriteBillboardState(
            billboardInput.state,
            billboardInput.bodySprite,
            billboardInput.headSprite
        );
        const bodyLiveSpriteValid = this.isPlayerSpriteBillboardTextureSpriteId(billboardInput.bodySprite);
        const headLiveSpriteValid = this.isPlayerSpriteBillboardTextureSpriteId(billboardInput.headSprite);
        const transformationSprite = this.playerTransformationSpriteId(
            billboardInput.bodySprite,
            billboardInput.headSprite
        );
        if (transformationSprite !== null) {
            const fullMirrorTextureX = combinePlayerSpriteTextureMirrors(
                policyMirrorTextureX,
                policyFacingMirrorTextureX,
                transformLiveMirrorX
            );
            const fullMaterial = this.playerSpriteBillboardTextureMaterialForSprite(
                transformationSprite,
                fullMirrorTextureX
            );
            return {
                renderMode: 'transformation',
                relativeView,
                textureSide: relativeTextureSide,
                textureStrategy,
                gameViewDebugActive,
                phaseAlignmentBypassed: false,
                storedTextureBypassed: false,
                policyMirrorTextureX,
                policyFacingMirrorTextureX,
                policySwapTextureSide,
                bodyLiveMirrorX,
                headLiveMirrorX,
                bodyLiveSpriteValid,
                headLiveSpriteValid,
                bodyTextureSpriteValid: true,
                headTextureSpriteValid: true,
                bodyMaterialSprite: fullMaterial ? transformationSprite : null,
                headMaterialSprite: fullMaterial ? transformationSprite : null,
                bodyMaterialDiagnostic: this.playerSpriteBillboardMaterialDiagnosticForSprite(
                    transformationSprite,
                    fullMirrorTextureX
                ),
                headMaterialDiagnostic: this.playerSpriteBillboardMaterialDiagnosticForSprite(
                    transformationSprite,
                    fullMirrorTextureX
                ),
                bodyMaterialFallback: false,
                headMaterialFallback: false,
                mirrorTextureX: fullMirrorTextureX,
                bodyMirrorTextureX: fullMirrorTextureX,
                headMirrorTextureX: fullMirrorTextureX,
                characterFacing,
                state: 'transformation',
                fullSprite: transformationSprite,
                bodySprite: transformationSprite,
                headSprite: transformationSprite,
                fullMaterial,
                bodyMaterial: null,
                headMaterial: null,
                bodyTextureYOffset: 0,
            };
        }
        const bodyTextureSide = this.resolvePlayerSpriteBillboardTextureSide({
            strategy: textureStrategy,
            relativeTextureSide,
            liveSprite: billboardInput.bodySprite,
            half: 'body',
        });
        const headTextureSide = this.resolvePlayerSpriteBillboardTextureSide({
            strategy: textureStrategy,
            relativeTextureSide,
            liveSprite: billboardInput.headSprite,
            half: 'head',
        });
        const bodyRawSprite = textureStrategy === 'live'
            ? billboardInput.bodySprite
            : this.resolvePlayerSpriteBillboardSpriteId({
                state,
                half: 'body',
                side: bodyTextureSide,
                liveSprite: billboardInput.bodySprite,
            });
        const headRawSprite = textureStrategy === 'live'
            ? billboardInput.headSprite
            : this.resolvePlayerSpriteBillboardSpriteId({
                state,
                half: 'head',
                side: headTextureSide,
                liveSprite: billboardInput.headSprite,
            });
        const halfAlignment = phaseAlignmentBypassed
            ? {
                bodySprite: bodyRawSprite,
                headSprite: headRawSprite,
                bodyAligned: false,
                headAligned: false,
                bodyPhase: this.playerSpriteAnimationPhase(bodyRawSprite, 'body'),
                headPhase: this.playerSpriteAnimationPhase(headRawSprite, 'head'),
                bodyAlignedPhase: null,
                headAlignedPhase: null,
            }
            : this.alignPlayerSpriteBillboardHalves({
                state,
                bodySprite: bodyRawSprite,
                headSprite: headRawSprite,
                bodySide: bodyTextureSide,
                headSide: headTextureSide,
            });
        const bodySprite = halfAlignment.bodySprite;
        const headSprite = halfAlignment.headSprite;
        const requestedBodyMirrorTextureX = combinePlayerSpriteTextureMirrors(
            policyMirrorTextureX,
            policyFacingMirrorTextureX,
            bodyLiveMirrorX
        );
        const requestedHeadMirrorTextureX = combinePlayerSpriteTextureMirrors(
            policyMirrorTextureX,
            policyFacingMirrorTextureX,
            headLiveMirrorX
        );
        const bodyTextureStorage = storedTextureBypassed
            ? {
                spriteId: bodySprite,
                side: bodyTextureSide,
                mirrorTextureX: requestedBodyMirrorTextureX,
                storageMirrorX: false,
            }
            : this.resolvePlayerSpriteBillboardStoredTexture({
                state,
                half: 'body',
                side: bodyTextureSide,
                spriteId: bodySprite,
                mirrorTextureX: requestedBodyMirrorTextureX,
            });
        const headTextureStorage = storedTextureBypassed
            ? {
                spriteId: headSprite,
                side: headTextureSide,
                mirrorTextureX: requestedHeadMirrorTextureX,
                storageMirrorX: false,
            }
            : this.resolvePlayerSpriteBillboardStoredTexture({
                state,
                half: 'head',
                side: headTextureSide,
                spriteId: headSprite,
                mirrorTextureX: requestedHeadMirrorTextureX,
            });
        const bodyMirrorTextureX = bodyTextureStorage.mirrorTextureX;
        const headMirrorTextureX = headTextureStorage.mirrorTextureX;
        const bodyMaterialRecord = this.playerSpriteBillboardTextureMaterialForSelection({
            spriteId: bodyTextureStorage.spriteId,
            mirrorTextureX: bodyMirrorTextureX,
            state,
            half: 'body',
            side: bodyTextureStorage.side,
        });
        const headMaterialRecord = this.playerSpriteBillboardTextureMaterialForSelection({
            spriteId: headTextureStorage.spriteId,
            mirrorTextureX: headMirrorTextureX,
            state,
            half: 'head',
            side: headTextureStorage.side,
        });
        const bodyMaterial = bodyMaterialRecord.material;
        const headMaterial = headMaterialRecord.material;
        const bodyTextureSpriteValid = this.isPlayerSpriteBillboardTextureSpriteId(bodySprite);
        const headTextureSpriteValid = this.isPlayerSpriteBillboardTextureSpriteId(headSprite);

        return {
            renderMode: 'split',
            relativeView,
            textureSide: bodyTextureSide === headTextureSide
                ? bodyTextureSide
                : bodyTextureSide + '/' + headTextureSide,
            textureStrategy,
            gameViewDebugActive,
            phaseAlignmentBypassed,
            storedTextureBypassed,
            policyMirrorTextureX,
            policyFacingMirrorTextureX,
            policySwapTextureSide,
            bodyLiveMirrorX,
            headLiveMirrorX,
            bodyLiveSpriteValid,
            headLiveSpriteValid,
            bodyTextureSpriteValid,
            headTextureSpriteValid,
            bodyMaterialSprite: bodyMaterialRecord.materialSprite,
            headMaterialSprite: headMaterialRecord.materialSprite,
            bodyMaterialDiagnostic: bodyMaterialRecord.diagnostic,
            headMaterialDiagnostic: headMaterialRecord.diagnostic,
            bodyMaterialFallback: bodyMaterialRecord.fallback,
            headMaterialFallback: headMaterialRecord.fallback,
            bodyStoredSprite: bodyTextureStorage.spriteId,
            headStoredSprite: headTextureStorage.spriteId,
            bodyStoredSide: bodyTextureStorage.side,
            headStoredSide: headTextureStorage.side,
            bodyStoredMirrorX: bodyTextureStorage.storageMirrorX,
            headStoredMirrorX: headTextureStorage.storageMirrorX,
            mirrorTextureX: bodyMirrorTextureX || headMirrorTextureX,
            bodyMirrorTextureX,
            headMirrorTextureX,
            characterFacing,
            state,
            fullSprite: null,
            bodySprite,
            headSprite,
            bodyRawSprite,
            headRawSprite,
            bodyPhaseAligned: halfAlignment.bodyAligned,
            headPhaseAligned: halfAlignment.headAligned,
            headBodyPhase: halfAlignment.bodyPhase,
            headRawPhase: halfAlignment.headPhase,
            bodyAlignedPhase: halfAlignment.bodyAlignedPhase,
            headAlignedPhase: halfAlignment.headAlignedPhase,
            fullMaterial: null,
            bodyMaterial,
            headMaterial,
            bodyTextureYOffset: bodyMaterial ? bodyMaterial.userData.bodyTextureYOffset || 0 : 0,
        };
    }

    resolvePlayerSpriteBillboardStoredTexture({
        side,
        spriteId,
        mirrorTextureX = false,
    }) {
        // Keep the requested sprite family intact. An earlier experiment mapped
        // every west-family request onto the east-family texture plus an X
        // mirror, based on the idea that the game stored only one visual side.
        // That preserves left/right mirroring but erases the front/back cue we
        // need for the four-direction renderer: back/left requests collapse
        // into front/right-looking art. The decoded west/east sprite ranges are
        // valid material sources, so the only mirror applied here should be the
        // policy/live mirror requested by the caller.
        return {
            spriteId,
            side,
            mirrorTextureX,
            storageMirrorX: false,
        };
    }

    alignPlayerSpriteBillboardHalves({
        state,
        bodySprite,
        headSprite,
        bodySide,
        headSide,
    }) {
        const unchanged = {
            bodySprite,
            headSprite,
            bodyAligned: false,
            headAligned: false,
            bodyPhase: null,
            headPhase: null,
            bodyAlignedPhase: null,
            headAlignedPhase: null,
        };
        const stateRanges = PLAYER_SPRITE_TEXTURE_RANGES[state];
        if (!stateRanges || bodySide !== headSide) return unchanged;

        const bodyRange = stateRanges.body && stateRanges.body[bodySide];
        const headRange = stateRanges.head && stateRanges.head[headSide];
        if (!bodyRange || !headRange) return unchanged;
        if (
            !this.spriteIdInRange(bodySprite, bodyRange)
            || !this.spriteIdInRange(headSprite, headRange)
        ) {
            return unchanged;
        }

        const bodyPhase = bodySprite - bodyRange.start;
        const headPhase = headSprite - headRange.start;
        if (bodyRange.length === headRange.length) {
            const bodyAlignedPhase = headPhase % bodyRange.length;
            const alignedBodySprite = bodyRange.start + bodyAlignedPhase;
            return {
                bodySprite: alignedBodySprite,
                headSprite,
                bodyAligned: alignedBodySprite !== bodySprite,
                headAligned: false,
                bodyPhase,
                headPhase,
                bodyAlignedPhase,
                headAlignedPhase: headPhase,
            };
        }

        const headAlignedPhase = bodyPhase % headRange.length;
        const alignedHeadSprite = headRange.start + headAlignedPhase;
        return {
            bodySprite,
            headSprite: alignedHeadSprite,
            bodyAligned: false,
            headAligned: alignedHeadSprite !== headSprite,
            bodyPhase,
            headPhase,
            bodyAlignedPhase: bodyPhase,
            headAlignedPhase,
        };
    }

    playerSpriteBillboardTextureMaterialForSelection({
        spriteId,
        mirrorTextureX = false,
        state = null,
        half = null,
        side = null,
    }) {
        const material = this.playerSpriteBillboardTextureMaterialForSprite(
            spriteId,
            mirrorTextureX
        );
        if (material) {
            return {
                material,
                materialSprite: spriteId,
                diagnostic: this.playerSpriteBillboardMaterialDiagnosticForSprite(
                    spriteId,
                    mirrorTextureX
                ),
                fallback: false,
            };
        }

        // Adjacent animation-frame fallbacks hide the real problem and can make
        // respawn/transformation glitches look like corrupted character art.
        // Keep player billboards exact: if a texture cannot be built, surface it
        // through diagnostics and let the plane use the neutral fallback material.
        return {
            material: null,
            materialSprite: null,
            diagnostic: this.playerSpriteBillboardMaterialDiagnosticForSprite(
                spriteId,
                mirrorTextureX
            ),
            fallback: false,
        };
    }

    resolvePlayerSpriteBillboardState(stateLabel, bodySprite, headSprite) {
        if (stateLabel === 'human' || stateLabel === 'wolf') return stateLabel;
        const bodyState = this.playerSpriteStateFromSpriteId(bodySprite);
        if (bodyState) return bodyState;
        const headState = this.playerSpriteStateFromSpriteId(headSprite);
        return headState || 'unknown';
    }

    playerTransformationSpriteId(bodySprite, headSprite) {
        if (this.spriteIdInRange(bodySprite, PLAYER_TRANSFORMATION_SPRITE_RANGE)) return bodySprite;
        if (this.spriteIdInRange(headSprite, PLAYER_TRANSFORMATION_SPRITE_RANGE)) return headSprite;
        return null;
    }

    resolvePlayerSpriteBillboardTextureSide({strategy, relativeTextureSide, liveSprite, half}) {
        if (strategy === 'live') {
            return this.playerSpriteSideFromSpriteId(liveSprite, half) || relativeTextureSide;
        }
        if (strategy === 'opposite-live') {
            return oppositePlayerSpriteSide(
                this.playerSpriteSideFromSpriteId(liveSprite, half) || relativeTextureSide
            );
        }
        if (strategy === 'opposite-relative') {
            return oppositePlayerSpriteSide(relativeTextureSide);
        }
        return relativeTextureSide;
    }

    resolvePlayerSpriteBillboardSpriteId({state, half, side, liveSprite}) {
        if (this.spriteIdInRange(liveSprite, PLAYER_TRANSFORMATION_SPRITE_RANGE)) {
            return liveSprite;
        }
        const range = PLAYER_SPRITE_TEXTURE_RANGES[state]
            && PLAYER_SPRITE_TEXTURE_RANGES[state][half]
            && PLAYER_SPRITE_TEXTURE_RANGES[state][half][side];
        if (!range) return liveSprite;

        const phase = this.playerSpriteAnimationPhase(liveSprite, half);
        return range.start + (phase % range.length);
    }

    playerSpriteAnimationPhase(spriteId, half) {
        for (const stateRanges of Object.values(PLAYER_SPRITE_TEXTURE_RANGES)) {
            const halfRanges = stateRanges[half] || {};
            for (const range of Object.values(halfRanges)) {
                if (this.spriteIdInRange(spriteId, range)) {
                    return spriteId - range.start;
                }
            }
        }
        if (this.spriteIdInRange(spriteId, PLAYER_TRANSFORMATION_SPRITE_RANGE)) {
            return spriteId - PLAYER_TRANSFORMATION_SPRITE_RANGE.start;
        }
        return 0;
    }

    playerSpriteStateFromSpriteId(spriteId) {
        for (const [state, stateRanges] of Object.entries(PLAYER_SPRITE_TEXTURE_RANGES)) {
            for (const halfRanges of Object.values(stateRanges)) {
                for (const range of Object.values(halfRanges)) {
                    if (this.spriteIdInRange(spriteId, range)) return state;
                }
            }
        }
        return null;
    }

    isPlayerSpriteBillboardTextureSpriteId(spriteId) {
        return Boolean(
            this.playerSpriteStateFromSpriteId(spriteId)
            || this.spriteIdInRange(spriteId, PLAYER_TRANSFORMATION_SPRITE_RANGE)
        );
    }

    playerSpriteSideFromSpriteId(spriteId, half = null) {
        for (const stateRanges of Object.values(PLAYER_SPRITE_TEXTURE_RANGES)) {
            const halfEntries = half
                ? [[half, stateRanges[half] || {}]]
                : Object.entries(stateRanges);
            for (const [, halfRanges] of halfEntries) {
                for (const [side, range] of Object.entries(halfRanges)) {
                    if (this.spriteIdInRange(spriteId, range)) return side;
                }
            }
        }
        return null;
    }

    isPlayerBodySpriteId(spriteId) {
        for (const stateRanges of Object.values(PLAYER_SPRITE_TEXTURE_RANGES)) {
            const bodyRanges = stateRanges.body || {};
            for (const range of Object.values(bodyRanges)) {
                if (this.spriteIdInRange(spriteId, range)) return true;
            }
        }
        return false;
    }

    spriteIdInRange(spriteId, range) {
        return Number.isFinite(spriteId)
            && spriteId >= range.start
            && spriteId < range.start + range.length;
    }

    computePlayerSpriteBillboardFacingScores(billboardInput) {
        const cameraPosition = billboardInput.camera ? billboardInput.camera.position : null;
        const cameraTarget = this.cameraTarget();
        if (!cameraPosition || !cameraTarget) {
            return {
                viewerDirection: null,
                viewerDirectionSource: 'unavailable',
                scores: [],
                signedBest: null,
            };
        }

        const viewerDirection = cameraPosition.clone().sub(cameraTarget);
        viewerDirection.y = 0;
        if (viewerDirection.lengthSq() < 0.000001) {
            return {
                viewerDirection: null,
                viewerDirectionSource: 'room-center',
                scores: [],
                signedBest: null,
            };
        }

        // Use the room center, not the moving character, to classify the camera
        // side. The side is a property of the selected view, so it must remain
        // stable while the player walks across the room.
        viewerDirection.normalize();
        const scores = PLAYER_SPRITE_BILLBOARD_FACINGS.map(facing => {
            const dot = viewerDirection.dot(facing.normal);
            return {
                id: facing.id,
                dot,
            };
        });
        const signedBest = scores.reduce((best, score) => (
            !best || score.dot > best.dot ? score : best
        ), null);

        return {
            viewerDirection,
            viewerDirectionSource: 'room-center',
            scores,
            signedBest,
        };
    }

    updateSummary() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const room = scene ? scene.room : null;
        const player = scene ? scene.player : null;
        const cache = (room && room.staticCache) || this.staticMemory;
        const staticLocation = room ? room.staticLocation : null;
        const decodedLocation = staticLocationForRoom(room);
        const dynamicRecords = room && room.dynamicVisualRecords
            ? room.dynamicVisualRecords
            : (room && room.sprites ? room.sprites : []);
        const backgroundComparison = room ? room.backgroundComparison : null;
        const spriteTextures = room ? room.spriteTextures : null;
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
            'Wall texture dewarp: ' + (
                this.wallTextureDewarpEnabled
                    ? 'on'
                    : 'off (raw textures)'
            ),
            'Wall texture binary threshold: ' + (
                this.wallTextureBinaryThreshold > 0
                    ? this.wallTextureBinaryThreshold
                    : 'off'
            ),
            'Wall texture far-side selector: ' + this.lastVisibleWallTextureQuadCount
                + '/' + this.lastWallTextureVisibilityQuadCount
                + ' visible',
            'Full 3D basic block game XYZ: ' + [
                BASIC_BLOCK_GAME_SIZE.x,
                BASIC_BLOCK_GAME_SIZE.y,
                BASIC_BLOCK_GAME_SIZE.z,
            ].join(', '),
            'Full 3D object proxies: ' + this.lastFull3DRecognizedObjectCount
                + '/' + this.lastFull3DObjectCount
                + ' recognized',
            'Full 3D live actors: ' + this.lastLiveActorBillboardCount
                + (
                    this.activeViewPreset === 'top' || this.activeViewPreset === 'bottom'
                        ? ', top/bottom markers'
                        : ', textured quads '
                            + this.lastLiveActorBillboardTextureCount
                            + ', wireframes '
                            + (this.lastLiveActorBillboardWireframesVisible ? 'visible' : 'hidden')
                ),
            'Player proxy block XYZ: ' + [
                PLAYER_PROXY_BLOCK_UNITS.x,
                PLAYER_PROXY_BLOCK_UNITS.y,
                PLAYER_PROXY_BLOCK_UNITS.z,
            ].join(', '),
            'Geometry size source: ' + roomDimensionSource(room),
            'Static cache: ' + (cache && cache.byteLength ? cache.byteLength + ' bytes' : 'not loaded'),
            'Sprite textures: ' + (
                spriteTextures && spriteTextures.available
                    ? spriteTextures.decodedCount + '/' + spriteTextures.spriteCount
                        + ' decoded, current refs ' + spriteTextures.referencedCount
                        + ', invalid refs ' + spriteTextures.invalidReferencedCount
                    : 'not decoded'
            ),
            staticLine,
            comparisonLine,
            'Background ids: ' + formatBackgroundIds(decodedLocation ? decodedLocation.backgroundIds : []),
            'Background types: ' + summarizeBackgroundCategories(decodedLocation ? decodedLocation.backgrounds : []),
            'Static background sprites: ' + countBackgroundRecords(decodedLocation ? decodedLocation.backgrounds : []),
            'Textured background quads: ' + this.lastTexturedBackgroundQuadCount
                + ' (' + this.lastDewarpedBackgroundQuadCount + ' texture-dewarped)',
            'Dynamic visual slots: ' + dynamicRecords.length + ' @ ' + formatHex(room ? room.dynamicStart : null, 4)
                + ' step ' + formatHex(room ? room.dynamicSlotSize : null, 2),
            'Static/dynamic prefix: ' + summarizeBackgroundComparison(backgroundComparison),
            'Player body XYZ: ' + formatRoomSize(player ? player.body : null),
            'Player head semantic XYZ: ' + formatRoomSize(player && player.head ? player.head.semanticPosition : null),
            'Player head render XYZ: ' + formatRoomSize(player && player.head ? player.head.renderPositionCandidate : null),
            'Player sprites: ' + formatPlayerSprites(player ? player.orientation : null),
            'Player mirror flags: ' + formatPlayerMirrors(player ? player.orientation : null),
            'Orientation candidates: doc '
                + formatOrientationCandidate(player && player.orientation ? player.orientation.documentedOrientation : null)
                + ', body '
                + formatOrientationCandidate(player && player.orientation ? player.orientation.bodyOrientation : null),
            'Player proxy: ' + (
                this.playerProxyInfo
                    ? [
                        this.playerProxyInfo.facing,
                        this.playerProxyInfo.facingSource,
                        this.playerProxyInfo.bodySource,
                        this.playerProxyInfo.headSource,
                        'pointer ' + this.playerProxyInfo.pointerLabel,
                        this.playerProxyInfo.pointerSource,
                        'state ' + this.playerProxyInfo.state,
                        this.playerProxyInfo.proxyVisible ? 'proxy visible' : 'proxy hidden for Full 3D',
                        this.playerProxyInfo.topBottomMarkerVisible
                            ? 'top/bottom marker visible'
                            : 'top/bottom marker hidden',
                        'mirror flags ' + (this.playerProxyInfo.mirrorFlagsConsistent ? 'consistent' : 'differ'),
                        'key ' + this.playerProxyInfo.spriteMirrorKey,
                        'pair ' + (this.playerProxyInfo.visualAxisPair || '--'),
                        'source ' + (
                            this.playerProxyInfo.primaryOrientation
                                ? formatHex(this.playerProxyInfo.primaryOrientation.spriteId, 2)
                                : '--'
                        ),
                        'doc ' + formatOrientationCandidate(this.playerProxyInfo.documentedOrientation),
                        'body ' + formatOrientationCandidate(this.playerProxyInfo.bodyOrientation),
                        'primary ' + (
                            this.playerProxyInfo.primaryOrientation
                                ? formatHex(this.playerProxyInfo.primaryOrientation.spriteId, 2)
                                    + '/'
                                    + (this.playerProxyInfo.primaryOrientation.mirrored ? 'mirrored' : 'base')
                                    + '/'
                                    + this.playerProxyInfo.primaryOrientation.axisFacing
                                    + '/'
                                    + formatHex(this.playerProxyInfo.primaryOrientation.directionAxisThreshold, 2)
                                : 'unclassified'
                        ),
                    ].join(', ')
                    : 'not available'
            ),
            'Player billboard hook: ' + (
                this.playerSpriteBillboardHookInfo
                    ? [
                        'called',
                        'frame ' + this.playerSpriteBillboardHookInfo.frame,
                        'calls ' + this.playerSpriteBillboardHookInfo.callCount,
                        'mode ' + this.playerSpriteBillboardHookInfo.mode,
                        'view ' + this.playerSpriteBillboardHookInfo.viewPreset,
                        this.playerSpriteBillboardHookInfo.wireframesVisible
                            ? 'wireframes visible'
                            : 'wireframes hidden',
                        'rects ' + this.playerSpriteBillboardHookInfo.wireframeCount,
                        'viewdir ' + formatSceneVector(this.playerSpriteBillboardHookInfo.viewerDirection)
                            + ' from ' + this.playerSpriteBillboardHookInfo.viewerDirectionSource,
                        'view-convention ' + this.playerSpriteBillboardHookInfo.viewConvention,
                        'view-policy ' + this.playerSpriteBillboardHookInfo.viewPolicy,
                        this.playerSpriteBillboardHookInfo.gameViewDebugActive
                            ? 'game-view-debug on'
                            : 'game-view-debug off',
                        'phase-bypass ' + (
                            this.playerSpriteBillboardHookInfo.phaseAlignmentBypassed ? 'yes' : 'no'
                        ),
                        'storage-bypass ' + (
                            this.playerSpriteBillboardHookInfo.storedTextureBypassed ? 'yes' : 'no'
                        ),
                        'camera-side ' + (
                            this.playerSpriteBillboardHookInfo.selectedFacing || '--'
                        ) + ' ' + formatDotScore(this.playerSpriteBillboardHookInfo.selectedDot),
                        'sprite-ref ' + (
                            this.playerSpriteBillboardHookInfo.textureReferenceSide || '--'
                        ),
                        'front ' + this.playerSpriteBillboardHookInfo.geometryFront,
                        'flip ' + this.playerSpriteBillboardHookInfo.textureFlip,
                        'billboard ' + this.playerSpriteBillboardHookInfo.billboardMode,
                        'strategy ' + this.playerSpriteBillboardHookInfo.textureStrategy,
                        'mirror-x ' + (this.playerSpriteBillboardHookInfo.textureMirrorX ? 'yes' : 'no'),
                        'policy-mirror ' + (this.playerSpriteBillboardHookInfo.policyMirrorTextureX ? 'yes' : 'no'),
                        'facing-policy-mirror ' + (
                            this.playerSpriteBillboardHookInfo.policyFacingMirrorTextureX ? 'yes' : 'no'
                        ),
                        'side-swap ' + (
                            this.playerSpriteBillboardHookInfo.policySwapTextureSide ? 'yes' : 'no'
                        ),
                        'live-mirror body/head '
                            + (this.playerSpriteBillboardHookInfo.bodyLiveMirrorX ? 'yes' : 'no')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.headLiveMirrorX ? 'yes' : 'no'),
                        'live-valid body/head '
                            + (this.playerSpriteBillboardHookInfo.bodyLiveSpriteValid ? 'yes' : 'no')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.headLiveSpriteValid ? 'yes' : 'no'),
                        'texture-valid body/head '
                            + (this.playerSpriteBillboardHookInfo.bodyTextureSpriteValid ? 'yes' : 'no')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.headTextureSpriteValid ? 'yes' : 'no'),
                        'final-mirror body/head '
                            + (this.playerSpriteBillboardHookInfo.bodyMirrorTextureX ? 'yes' : 'no')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.headMirrorTextureX ? 'yes' : 'no'),
                        'mirror-flags '
                            + formatHex(this.playerSpriteBillboardHookInfo.bodyMirrorFlag, 2)
                            + '/'
                            + formatHex(this.playerSpriteBillboardHookInfo.headMirrorFlag, 2),
                        'relative ' + this.playerSpriteBillboardHookInfo.relativeView,
                        'texture-facing ' + this.playerSpriteBillboardHookInfo.textureCharacterFacing,
                        'texture-side ' + this.playerSpriteBillboardHookInfo.textureSide,
                        'tex-full ' + formatHex(this.playerSpriteBillboardHookInfo.textureFullSprite, 2)
                            + (
                                this.playerSpriteBillboardHookInfo.textureFullSprite === null
                                    ? ''
                                    : (this.playerSpriteBillboardHookInfo.textureFullReady ? '' : ' missing')
                            ),
                        'tex-body ' + formatSpriteMaterialSelection(
                            this.playerSpriteBillboardHookInfo.textureBodySprite,
                            this.playerSpriteBillboardHookInfo.textureBodyMaterialSprite
                        )
                            + (this.playerSpriteBillboardHookInfo.textureBodyReady ? '' : ' missing'),
                        'body-align ' + formatSpritePhaseAlignment(
                            this.playerSpriteBillboardHookInfo.textureBodyRawSprite,
                            this.playerSpriteBillboardHookInfo.textureBodySprite
                        ),
                        'body-y +' + this.playerSpriteBillboardHookInfo.bodyTextureYOffset + 'px',
                        'tex-head ' + formatSpriteMaterialSelection(
                            this.playerSpriteBillboardHookInfo.textureHeadSprite,
                            this.playerSpriteBillboardHookInfo.textureHeadMaterialSprite
                        )
                            + (this.playerSpriteBillboardHookInfo.textureHeadReady ? '' : ' missing'),
                        'stored-side body/head '
                            + (this.playerSpriteBillboardHookInfo.textureBodyStoredSide || '--')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.textureHeadStoredSide || '--'),
                        'stored-mirror body/head '
                            + (this.playerSpriteBillboardHookInfo.textureBodyStoredMirrorX ? 'yes' : 'no')
                            + '/'
                            + (this.playerSpriteBillboardHookInfo.textureHeadStoredMirrorX ? 'yes' : 'no'),
                        'head-align ' + formatSpritePhaseAlignment(
                            this.playerSpriteBillboardHookInfo.textureHeadRawSprite,
                            this.playerSpriteBillboardHookInfo.textureHeadSprite
                        )
                            + ' phase body/head '
                            + (
                                Number.isFinite(this.playerSpriteBillboardHookInfo.textureHeadBodyPhase)
                                    ? this.playerSpriteBillboardHookInfo.textureHeadBodyPhase
                                    : '--'
                            )
                            + '/'
                            + (
                                Number.isFinite(this.playerSpriteBillboardHookInfo.textureHeadRawPhase)
                                    ? this.playerSpriteBillboardHookInfo.textureHeadRawPhase
                                    : '--'
                            ),
                        'dots ' + (this.playerSpriteBillboardHookInfo.dotSummary || '--'),
                        'body ' + formatHex(this.playerSpriteBillboardHookInfo.bodySprite, 2),
                        'head ' + formatHex(this.playerSpriteBillboardHookInfo.headSprite, 2),
                        'state ' + this.playerSpriteBillboardHookInfo.state,
                        'facing ' + (
                            this.playerSpriteBillboardHookInfo.pointerAxisFacing
                                ? this.playerSpriteBillboardHookInfo.pointerAxisFacing
                                    + '/'
                                    + this.playerSpriteBillboardHookInfo.pointerFacing
                                : this.playerSpriteBillboardHookInfo.pointerFacing
                        ),
                        'camera ' + formatSceneVector(this.playerSpriteBillboardHookInfo.cameraPosition),
                    ].join(', ')
                    : 'not called yet'
            ),
        ].join('\n');
    }

    updateComparisonDiagnostics() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const room = scene ? scene.room : null;
        const comparison = room ? room.backgroundComparison : null;
        const staticLocation = room ? room.staticLocation : null;
        const backgroundPrefixCount = comparison && Number.isFinite(comparison.staticRecordCount)
            ? comparison.staticRecordCount
            : 0;
        const objectCandidates = dynamicObjectCandidatesForRoom(room);
        const focusedActorTable = this.renderFocusedActorSlotTable(focusedActorSlotRowsForRoom(room));
        const focusedWizardByteWindowTable = this.renderFocusedWizardByteWindowTable();
        const objectTable = this.renderDynamicObjectCandidateTable(objectCandidates, backgroundPrefixCount);
        const liveObjectTable = this.renderLiveObjectSlotTable(liveObjectRecordsForRoom(room));
        const liveActorTable = this.renderLiveActorCandidateTable(liveActorCandidatesForRoom(room));
        const liveActorPolicyTable = this.renderLiveActorBillboardPolicyTable(room);
        const collectableItems = room && room.collectableItems ? room.collectableItems : null;
        const resolvedItemRecords = room ? this.lastResolvedCollectableItemRecords : [];
        const itemTable = this.renderCollectableItemTable(
            collectableItems,
            room ? room.id : null,
            resolvedItemRecords
        );
        const playerSpriteTable = this.renderPlayerSpriteIdentificationTable();
        const playerSpriteMemoryPileTable = this.renderPlayerSpriteMemoryPileTable();
        const playerMaterialDebugPanel = this.renderPlayerSpriteBillboardMaterialDebugPanel();
        const playerBillboardTraceTable = this.renderPlayerBillboardTransitionTraceTable();

        if (!comparison || !staticLocation || staticLocation.error) {
            this.comparisonElement.innerHTML = [
                '<p class="knight-lore-stage2-note is-warning">Background comparison unavailable.</p>',
                focusedActorTable,
                focusedWizardByteWindowTable,
                liveObjectTable,
                objectTable,
                liveActorTable,
                liveActorPolicyTable,
                itemTable,
                playerSpriteTable,
                playerSpriteMemoryPileTable,
                playerMaterialDebugPanel,
                playerBillboardTraceTable,
            ].join('');
            this.updatePlayerSpriteBillboardMaterialDebugCanvas();
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
            focusedActorTable,
            focusedWizardByteWindowTable,
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
            '<th>Dynamic slot tail</th>',
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
                '<td class="mono">' + escapeHtml(formatDynamicRecordSlotTail(row.dynamicRecord)) + '</td>' +
                '<td>' + escapeHtml(row.status + formatMismatchList(row.mismatches)) + '</td>' +
                '</tr>'
            )).join(''),
            '</tbody>',
            '</table>',
            liveObjectTable,
            objectTable,
            liveActorTable,
            liveActorPolicyTable,
            itemTable,
            playerSpriteTable,
            playerSpriteMemoryPileTable,
            playerMaterialDebugPanel,
            playerBillboardTraceTable,
        ].join('');
        this.updatePlayerSpriteBillboardMaterialDebugCanvas();
    }

    spriteTexturePreviewRows(spriteTextures) {
        if (!spriteTextures || !spriteTextures.available) return [];

        const rows = [];
        for (const group of SPRITE_TEXTURE_PREVIEW_GROUPS) {
            for (const spriteId of group.ids) {
                const yFlipped = Boolean(group.forceYFlip) || SPRITE_TEXTURE_VERTICAL_FLIP_IDS.has(spriteId);
                const texture = getKnightLoreSpriteTexture(this.latestFrame, spriteId)
                    || getKnightLoreSpriteTexture(this.staticMemory, spriteId);
                if (!texture) {
                    rows.push({
                        id: spriteId,
                        valid: false,
                        warning: 'missing from static texture catalog',
                        groupLabel: group.label,
                        yFlipped,
                    });
                    continue;
                }

                const textureYFlipped = Boolean(group.forceYFlip)
                    || SPRITE_TEXTURE_VERTICAL_FLIP_IDS.has(texture.id);
                rows.push({
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
                    imageBitCount: texture.imageBitCount || 0,
                    maskBitCount: texture.maskBitCount || 0,
                    previewRows: texture.previewRows || [],
                    groupLabel: group.label,
                    yFlipped: textureYFlipped,
                });
            }
        }

        return rows;
    }

    createSpriteBitplaneCanvas(expanded, colourAttribute, mode, flipY = false) {
        if (!expanded || typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = expanded.widthPixels;
        canvas.height = expanded.heightPixels;

        const context = canvas.getContext('2d');
        if (!context) return null;

        const imageData = context.createImageData(canvas.width, canvas.height);
        const ink = rgbFromHexColor(spectrumInkColorFromAttribute(colourAttribute));
        const paper = rgbFromHexColor(spectrumPaperColorFromAttribute(colourAttribute));

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

    createCanvasTexture(canvas) {
        if (!canvas) return null;
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;
        texture.generateMipmaps = false;
        if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.needsUpdate = true;
        return texture;
    }

    createSpriteBillboardTextureMaterial(spriteId, options = {}) {
        const mirrorTextureX = Boolean(options.mirrorTextureX);
        const validateSpriteId = typeof options.validateSpriteId === 'function'
            ? options.validateSpriteId
            : () => true;
        const validateTexture = typeof options.validateTexture === 'function'
            ? options.validateTexture
            : texture => Boolean(texture && texture.valid);
        const color = options.color === undefined || options.color === null
            ? 0xffffff
            : options.color;
        const sourceCandidates = Array.isArray(options.sourceCandidates)
            ? options.sourceCandidates
            : [
                ['frame', getKnightLoreSpriteTexture(this.latestFrame, spriteId)],
                ['static', getKnightLoreSpriteTexture(this.staticMemory, spriteId)],
            ];
        const fail = diagnostic => ({
            material: null,
            diagnostic,
            canvas: null,
            texture: null,
            sourceLabel: null,
            sourceTexture: null,
            verticalShiftPixels: 0,
        });

        if (!validateSpriteId(spriteId)) return fail('invalid-id');
        const sourceRecord = sourceCandidates.find(([, texture]) => validateTexture(texture, spriteId));
        if (!sourceRecord) {
            const rejectedTexture = sourceCandidates
                .map(([label, texture]) => ({label, texture}))
                .find(candidate => candidate.texture && candidate.texture.valid);
            if (rejectedTexture) {
                return fail(
                    'bad-dim-'
                    + rejectedTexture.label
                    + '-'
                    + rejectedTexture.texture.widthPixels
                    + 'x'
                    + rejectedTexture.texture.heightPixels
                );
            }
            return fail('no-source');
        }
        const [sourceLabel, sourceTexture] = sourceRecord;

        const expanded = expandKnightLoreSpriteTexture(sourceTexture);
        if (!expanded) return fail('no-expanded');

        let alphaPlane = options.alphaPlane || 'image';
        let alphaPixelCount = countExpandedSpritePlanePixels(expanded, alphaPlane);
        if (
            alphaPixelCount === 0
            && options.alphaFallbackPlane
            && options.alphaFallbackPlane !== alphaPlane
        ) {
            const fallbackPixelCount = countExpandedSpritePlanePixels(
                expanded,
                options.alphaFallbackPlane
            );
            if (fallbackPixelCount > 0) {
                alphaPlane = options.alphaFallbackPlane;
                alphaPixelCount = fallbackPixelCount;
            }
        }

        const rawCanvas = this.createSpriteBillboardTextureCanvas(expanded, color, {
            alphaPlane,
            colourPlane: options.colourPlane || alphaPlane,
        });
        if (!rawCanvas) return fail('no-raw-canvas');

        // This is the shared actor/player texture-buffer convention. The game
        // sprite bytes are first expanded into a transparent colour canvas,
        // then flipped into the orientation expected by our fixed billboard UVs.
        // Higher-level actor code decides which sprite id and live mirror state
        // to request; this helper only builds that requested material.
        const yAdjustedCanvas = options.flipTextureY === false
            ? rawCanvas
            : this.createVerticallyFlippedCanvas(rawCanvas) || rawCanvas;
        const xyAdjustedCanvas = options.flipTextureX === false
            ? yAdjustedCanvas
            : this.createHorizontallyFlippedCanvas(yAdjustedCanvas) || yAdjustedCanvas;
        const requestedShift = typeof options.verticalShiftPixels === 'function'
            ? options.verticalShiftPixels({
                spriteId,
                canvas: xyAdjustedCanvas,
                sourceTexture,
                expanded,
            })
            : options.verticalShiftPixels;
        const verticalShiftPixels = Number.isFinite(requestedShift)
            ? Math.max(0, Math.round(requestedShift))
            : 0;
        const shiftedCanvas = verticalShiftPixels > 0
            ? this.createVerticallyShiftedCanvas(xyAdjustedCanvas, verticalShiftPixels)
                || xyAdjustedCanvas
            : xyAdjustedCanvas;
        const canvas = mirrorTextureX
            ? this.createHorizontallyFlippedCanvas(shiftedCanvas) || shiftedCanvas
            : shiftedCanvas;
        const texture = this.createCanvasTexture(canvas);
        if (!texture) return fail('no-three-texture');
        const diagnostic = 'ok-' + sourceLabel + '-' + canvas.width + 'x' + canvas.height
            + '-alpha-' + alphaPlane + '-' + alphaPixelCount;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.04,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        material.userData.texture = texture;
        material.userData.canvas = canvas;
        material.userData.spriteId = spriteId;
        material.userData.mirrorTextureX = mirrorTextureX;
        material.userData.sourceLabel = sourceLabel;
        material.userData.diagnostic = diagnostic;
        material.userData.alphaPlane = alphaPlane;
        material.userData.alphaPixelCount = alphaPixelCount;
        material.userData.verticalShiftPixels = verticalShiftPixels;

        return {
            material,
            diagnostic,
            canvas,
            texture,
            sourceLabel,
            sourceTexture,
            alphaPlane,
            alphaPixelCount,
            verticalShiftPixels,
        };
    }

    spriteBillboardTextureMaterialCacheForMirror(normalCache, mirroredCache, mirrorTextureX) {
        return mirrorTextureX ? mirroredCache : normalCache;
    }

    spriteBillboardCachedTextureMaterialForSprite(spriteId, options = {}) {
        const mirrorTextureX = Boolean(options.mirrorTextureX);
        const cache = this.spriteBillboardTextureMaterialCacheForMirror(
            options.normalCache,
            options.mirroredCache,
            mirrorTextureX
        );
        if (!cache || typeof options.createMaterial !== 'function') return null;

        const cached = cache.get(spriteId);
        if (cached) return cached;

        const material = options.createMaterial(spriteId, {mirrorTextureX});
        if (material) cache.set(spriteId, material);
        return material || null;
    }

    rebuildPlayerSpriteBillboardTextureMaterials() {
        if (!this.staticMemory || typeof document === 'undefined') return;

        PLAYER_SPRITE_MEMORY_VALUES.forEach(spriteId => {
            this.playerSpriteBillboardTextureMaterialForSprite(spriteId, false);
            this.playerSpriteBillboardTextureMaterialForSprite(spriteId, true);
        });
    }

    playerSpriteBillboardMaterialDiagnosticKey(spriteId, mirrorTextureX = false) {
        return (mirrorTextureX ? 'mirror' : 'normal') + ':' + formatHex(spriteId, 2);
    }

    setPlayerSpriteBillboardMaterialDiagnostic(spriteId, mirrorTextureX, diagnostic) {
        if (!this.playerSpriteBillboardMaterialDiagnostics) return;
        this.playerSpriteBillboardMaterialDiagnostics.set(
            this.playerSpriteBillboardMaterialDiagnosticKey(spriteId, mirrorTextureX),
            diagnostic
        );
    }

    playerSpriteBillboardMaterialDiagnosticForSprite(spriteId, mirrorTextureX = false) {
        if (!this.playerSpriteBillboardMaterialDiagnostics) return '--';
        return this.playerSpriteBillboardMaterialDiagnostics.get(
            this.playerSpriteBillboardMaterialDiagnosticKey(spriteId, mirrorTextureX)
        ) || 'not-built';
    }

    playerSpriteBillboardTextureMaterialForSprite(spriteId, mirrorTextureX = false) {
        if (!this.isPlayerSpriteBillboardTextureSpriteId(spriteId)) return null;
        return this.spriteBillboardCachedTextureMaterialForSprite(spriteId, {
            mirrorTextureX,
            normalCache: this.playerSpriteBillboardTextureMaterials,
            mirroredCache: this.playerSpriteBillboardMirroredTextureMaterials,
            createMaterial: (candidate, materialOptions) => (
                this.createPlayerSpriteBillboardTextureMaterial(candidate, materialOptions)
            ),
        });
    }

    createPlayerSpriteBillboardTextureMaterial(spriteId, options = {}) {
        const mirrorTextureX = Boolean(options.mirrorTextureX);
        const result = this.createSpriteBillboardTextureMaterial(spriteId, {
            mirrorTextureX,
            color: this.playerSpriteBillboardColorForSpriteId(spriteId),
            validateSpriteId: candidate => this.isPlayerSpriteBillboardTextureSpriteId(candidate),
            validateTexture: texture => this.isUsablePlayerSpriteBillboardSourceTexture(
                spriteId,
                texture
            ),
            verticalShiftPixels: ({canvas}) => (
                this.isPlayerBodySpriteId(spriteId)
                    ? Math.max(
                        1,
                        Math.round(canvas.height * PLAYER_BODY_TEXTURE_VERTICAL_SHIFT_RATIO)
                    )
                    : 0
            ),
        });
        this.setPlayerSpriteBillboardMaterialDiagnostic(
            spriteId,
            mirrorTextureX,
            result.diagnostic
        );
        if (result.material) {
            result.material.userData.bodyTextureYOffset = result.verticalShiftPixels;
        }
        return result.material;
    }

    actorSpriteBillboardMaterialDiagnosticKey(actor, spriteId, mirrorTextureX = false) {
        return [
            actor || 'unknown',
            mirrorTextureX ? 'mirror' : 'normal',
            formatHex(spriteId, 2),
        ].join(':');
    }

    setActorSpriteBillboardMaterialDiagnostic(actor, spriteId, mirrorTextureX, diagnostic) {
        if (!this.actorSpriteBillboardMaterialDiagnostics) return;
        this.actorSpriteBillboardMaterialDiagnostics.set(
            this.actorSpriteBillboardMaterialDiagnosticKey(actor, spriteId, mirrorTextureX),
            diagnostic
        );
    }

    actorSpriteBillboardMaterialDiagnosticForSprite(actor, spriteId, mirrorTextureX = false) {
        if (!this.actorSpriteBillboardMaterialDiagnostics) return '--';
        return this.actorSpriteBillboardMaterialDiagnostics.get(
            this.actorSpriteBillboardMaterialDiagnosticKey(actor, spriteId, mirrorTextureX)
        ) || 'not-built';
    }

    actorSpriteBillboardTextureCacheForActor(actor, mirrorTextureX = false) {
        const rootCache = mirrorTextureX
            ? this.actorSpriteBillboardMirroredTextureMaterials
            : this.actorSpriteBillboardTextureMaterials;
        if (!rootCache) return null;

        const actorKey = actor || 'unknown';
        if (!rootCache.has(actorKey)) rootCache.set(actorKey, new Map());
        return rootCache.get(actorKey);
    }

    actorSpriteBillboardTextureMaterialForSprite(actor, spriteId, mirrorTextureX = false) {
        if (!this.isActorSpriteBillboardTextureSpriteId(actor, spriteId)) return null;
        return this.spriteBillboardCachedTextureMaterialForSprite(spriteId, {
            mirrorTextureX,
            normalCache: this.actorSpriteBillboardTextureCacheForActor(actor, false),
            mirroredCache: this.actorSpriteBillboardTextureCacheForActor(actor, true),
            createMaterial: (candidate, materialOptions) => (
                this.createActorSpriteBillboardTextureMaterial(actor, candidate, materialOptions)
            ),
        });
    }

    isVisibleSpriteBillboardTextureMaterial(material) {
        if (!material || !material.userData || !material.userData.canvas) return false;
        if (Number.isFinite(material.userData.alphaPixelCount)) {
            return material.userData.alphaPixelCount > 0;
        }
        return true;
    }

    actorSpriteBillboardTextureMaterialForSelection(actor, textureSelection) {
        if (!textureSelection || !textureSelection.textureEnabled) {
            return {
                material: null,
                selection: textureSelection,
            };
        }

        const actorKey = actor || 'unknown';
        const candidates = [];
        const addCandidate = (spriteId, textureSide, policy) => {
            if (!Number.isFinite(spriteId)) return;
            if (candidates.some(candidate => candidate.textureSpriteId === spriteId)) return;
            candidates.push({
                ...textureSelection,
                textureSpriteId: spriteId,
                textureSide: textureSide || textureSelection.textureSide,
                policy,
            });
        };

        addCandidate(
            textureSelection.textureSpriteId,
            textureSelection.textureSide,
            textureSelection.policy
        );

        if (textureSelection.allowSideFallback) {
            const oppositeSide = liveActorOppositeTextureSide(textureSelection.textureSide);
            addCandidate(
                liveActorSpriteIdForTextureSide(textureSelection.liveSpriteId, oppositeSide),
                oppositeSide,
                textureSelection.policy + '-opposite-fallback'
            );
            addCandidate(
                textureSelection.liveSpriteId,
                liveActorSpriteVisualSide(textureSelection.liveSpriteId),
                textureSelection.policy + '-live-fallback'
            );
        }

        let firstBuilt = null;
        for (const candidate of candidates) {
            const material = this.actorSpriteBillboardTextureMaterialForSprite(
                actorKey,
                candidate.textureSpriteId,
                candidate.mirrorTextureX
            );
            const result = {material, selection: candidate};
            if (!firstBuilt) firstBuilt = result;
            if (this.isVisibleSpriteBillboardTextureMaterial(material)) {
                return result;
            }
        }

        return firstBuilt || {
            material: null,
            selection: textureSelection,
        };
    }

    createActorSpriteBillboardTextureMaterial(actor, spriteId, options = {}) {
        const mirrorTextureX = Boolean(options.mirrorTextureX);
        const actorKey = actor || 'unknown';
        const result = this.createSpriteBillboardTextureMaterial(spriteId, {
            mirrorTextureX,
            color: LIVE_ACTOR_BILLBOARD_COLORS[actorKey] || 0xf8fafc,
            // Actor sprites are not built eagerly at snapshot load like the
            // player cache, so prefer the preserved static capture. The live
            // frame remains a fallback for diagnostics, not the primary source.
            sourceCandidates: [
                ['static', getKnightLoreSpriteTexture(this.staticMemory, spriteId)],
                ['frame', getKnightLoreSpriteTexture(this.latestFrame, spriteId)],
            ],
            validateSpriteId: candidate => this.isActorSpriteBillboardTextureSpriteId(actorKey, candidate),
            validateTexture: texture => this.isUsableActorSpriteBillboardSourceTexture(
                actorKey,
                spriteId,
                texture
            ),
            alphaPlane: 'image',
            alphaFallbackPlane: 'mask',
        });
        this.setActorSpriteBillboardMaterialDiagnostic(
            actorKey,
            spriteId,
            mirrorTextureX,
            result.diagnostic
        );
        if (result.material) {
            result.material.userData.actor = actorKey;
        }
        return result.material;
    }

    isUsablePlayerSpriteBillboardSourceTexture(spriteId, texture) {
        if (!texture || !texture.valid) return false;
        if (!this.isPlayerSpriteBillboardTextureSpriteId(spriteId)) return false;

        // All known main-character and transformation sprites are compact
        // 24-pixel-wide bitmaps. Reject wildly decoded stale/static-cache frames
        // such as 536x16; they are valid as byte records but not as player art.
        return (
            Number.isFinite(texture.widthPixels)
            && Number.isFinite(texture.heightPixels)
            && texture.widthPixels > 0
            && texture.widthPixels <= 32
            && texture.heightPixels >= 8
            && texture.heightPixels <= 48
        );
    }

    isActorSpriteBillboardTextureSpriteId(actor, spriteId) {
        const classification = classifyLiveActorSpriteId(spriteId);
        if (!classification) return false;
        if (classification.actor === 'guard/wizard') {
            return actor === 'guard' || actor === 'wizard';
        }
        return classification.actor === actor;
    }

    isUsableActorSpriteBillboardSourceTexture(actor, spriteId, texture) {
        if (!texture || !texture.valid) return false;
        if (!this.isActorSpriteBillboardTextureSpriteId(actor, spriteId)) return false;

        return (
            Number.isFinite(texture.widthPixels)
            && Number.isFinite(texture.heightPixels)
            && texture.widthPixels > 0
            && texture.widthPixels <= 64
            && texture.heightPixels >= 8
            && texture.heightPixels <= 64
        );
    }

    createSpriteBillboardTextureCanvas(expanded, color, options = {}) {
        if (!expanded || typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = expanded.widthPixels;
        canvas.height = expanded.heightPixels;

        const context = canvas.getContext('2d');
        if (!context) return null;

        const imageData = context.createImageData(canvas.width, canvas.height);
        const rgb = rgbFromHexColor(color);
        const alphaPixels = options.alphaPlane === 'mask'
            ? expanded.maskPixels
            : expanded.imagePixels;

        for (let y = 0; y < expanded.heightPixels; y++) {
            for (let x = 0; x < expanded.widthPixels; x++) {
                const sourceIndex = y * expanded.widthPixels + x;
                const pixelIndex = (y * expanded.widthPixels + x) * 4;
                const visible = alphaPixels[sourceIndex];
                imageData.data[pixelIndex] = rgb.r;
                imageData.data[pixelIndex + 1] = rgb.g;
                imageData.data[pixelIndex + 2] = rgb.b;
                imageData.data[pixelIndex + 3] = visible ? 0xff : 0x00;
            }
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
    }

    createVerticallyFlippedCanvas(sourceCanvas) {
        if (!sourceCanvas || typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;

        const context = canvas.getContext('2d');
        if (!context) return null;

        context.translate(0, canvas.height);
        context.scale(1, -1);
        context.drawImage(sourceCanvas, 0, 0);
        return canvas;
    }

    createHorizontallyFlippedCanvas(sourceCanvas) {
        if (!sourceCanvas || typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;

        const context = canvas.getContext('2d');
        if (!context) return null;

        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(sourceCanvas, 0, 0);
        return canvas;
    }

    createVerticallyShiftedCanvas(sourceCanvas, yOffsetPixels) {
        if (!sourceCanvas || typeof document === 'undefined') return null;
        if (!Number.isFinite(yOffsetPixels) || yOffsetPixels === 0) return sourceCanvas;
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;

        const context = canvas.getContext('2d');
        if (!context) return null;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(sourceCanvas, 0, yOffsetPixels);
        return canvas;
    }

    playerSpriteBillboardColorForSpriteId(spriteId) {
        if (this.spriteIdInRange(spriteId, PLAYER_TRANSFORMATION_SPRITE_RANGE)) {
            return PLAYER_SPRITE_BILLBOARD_TEXTURE_COLORS.transformation;
        }
        const state = this.playerSpriteStateFromSpriteId(spriteId);
        return PLAYER_SPRITE_BILLBOARD_TEXTURE_COLORS[state || 'unknown'];
    }

    disposeSpriteBillboardTextureMaterialMap(materialMap) {
        if (!materialMap) return;
        materialMap.forEach(entry => {
            if (entry instanceof Map) {
                this.disposeSpriteBillboardTextureMaterialMap(entry);
                return;
            }
            if (entry && entry.userData && entry.userData.texture) {
                entry.userData.texture.dispose();
            }
            if (entry && typeof entry.dispose === 'function') entry.dispose();
        });
        materialMap.clear();
    }

    clearPlayerSpriteBillboardTextureMaterials() {
        if (!this.playerSpriteBillboardTextureMaterials) return;
        this.disposeSpriteBillboardTextureMaterialMap(this.playerSpriteBillboardTextureMaterials);
        this.disposeSpriteBillboardTextureMaterialMap(this.playerSpriteBillboardMirroredTextureMaterials);
        if (this.playerSpriteBillboardMaterialDiagnostics) {
            this.playerSpriteBillboardMaterialDiagnostics.clear();
        }
    }

    clearActorSpriteBillboardTextureMaterials() {
        this.disposeSpriteBillboardTextureMaterialMap(this.actorSpriteBillboardTextureMaterials);
        this.disposeSpriteBillboardTextureMaterialMap(this.actorSpriteBillboardMirroredTextureMaterials);
        if (this.actorSpriteBillboardMaterialDiagnostics) {
            this.actorSpriteBillboardMaterialDiagnostics.clear();
        }
    }

    generatedSpriteTextureRecord(textureSummary, colourAttribute) {
        if (!textureSummary || !textureSummary.valid) return null;
        const texture = getKnightLoreSpriteTexture(this.latestFrame, textureSummary.id)
            || getKnightLoreSpriteTexture(this.staticMemory, textureSummary.id);
        if (!texture || !texture.valid) return null;

        const cacheKey = [
            texture.id,
            colourAttribute === null || colourAttribute === undefined ? '--' : colourAttribute,
            textureSummary.yFlipped ? 'flip-y' : 'normal-y',
            'actor-buffer-xy',
            texture.dataAddress,
            texture.dataEndAddress,
            texture.widthPixels,
            texture.heightPixels,
            texture.imageBitCount,
            texture.maskBitCount,
        ].join(':');

        const cached = this.spriteTexturePreviewCache.get(cacheKey);
        if (cached) return cached;

        const expanded = expandKnightLoreSpriteTexture(texture);
        if (!expanded) return null;

        const rawImageCanvas = this.createSpriteBitplaneCanvas(
            expanded,
            colourAttribute,
            'image',
            false
        );
        const maskCanvas = this.createSpriteBitplaneCanvas(
            expanded,
            colourAttribute,
            'mask',
            false
        );
        const rawTextureBufferCanvas = this.createSpriteBillboardTextureCanvas(
            expanded,
            spectrumInkColorFromAttribute(colourAttribute)
        );
        if (!rawImageCanvas || !maskCanvas || !rawTextureBufferCanvas) return null;

        // Stage 7.1 actor previews deliberately use the same buffer orientation
        // as the proven main-character billboard textures: source pixels are
        // vertically flipped for the canvas/texture convention, then horizontally
        // flipped to match the current billboard UV layout. Per-actor live mirror
        // flags are intentionally not applied in this inventory pass.
        const yAdjustedTextureBufferCanvas = textureSummary.yFlipped
            ? this.createVerticallyFlippedCanvas(rawTextureBufferCanvas) || rawTextureBufferCanvas
            : rawTextureBufferCanvas;
        const textureBufferCanvas = this.createHorizontallyFlippedCanvas(yAdjustedTextureBufferCanvas)
            || yAdjustedTextureBufferCanvas;

        const record = {
            key: cacheKey,
            summary: textureSummary,
            texture,
            expanded,
            imageCanvas: textureBufferCanvas,
            rawImageCanvas,
            maskCanvas,
            textureBufferCanvas,
            yFlipped: Boolean(textureSummary.yFlipped),
            groupLabel: textureSummary.groupLabel || '',
            imageTexture: this.createCanvasTexture(textureBufferCanvas),
            maskTexture: this.createCanvasTexture(maskCanvas),
        };
        this.spriteTexturePreviewCache.set(cacheKey, record);
        return record;
    }

    pruneSpriteTexturePreviewCache(activeKeys) {
        for (const [key, record] of this.spriteTexturePreviewCache.entries()) {
            if (activeKeys.has(key)) continue;
            if (record.imageTexture) record.imageTexture.dispose();
            if (record.maskTexture) record.maskTexture.dispose();
            this.spriteTexturePreviewCache.delete(key);
        }
    }

    spritePreviewScale(canvas) {
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) return 1;
        const maxScale = Math.min(
            SPRITE_TEXTURE_PREVIEW_IMAGE_MAX_WIDTH / canvas.width,
            SPRITE_TEXTURE_PREVIEW_IMAGE_MAX_HEIGHT / canvas.height
        );
        if (maxScale >= 1) return Math.max(1, Math.floor(Math.min(maxScale, 6)));
        return maxScale;
    }

    drawSpritePreviewImage(context, sourceCanvas, x, y, label) {
        const scale = this.spritePreviewScale(sourceCanvas);
        const width = Math.max(1, Math.round(sourceCanvas.width * scale));
        const height = Math.max(1, Math.round(sourceCanvas.height * scale));

        context.fillStyle = '#CBD5E1';
        context.fillText(label, x, y - 5);
        context.strokeStyle = '#64748B';
        context.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
        context.imageSmoothingEnabled = false;
        context.drawImage(sourceCanvas, x, y, width, height);
    }

    playerSpriteBillboardMaterialDebugRows() {
        const info = this.playerSpriteBillboardHookInfo;
        const rows = [];

        if (info && info.textureFullSprite !== null && info.textureFullSprite !== undefined) {
            rows.push(
                this.playerSpriteBillboardMaterialDebugRow({
                    part: 'full',
                    requestedSprite: info.textureFullSprite,
                    materialSprite: info.textureBodyMaterialSprite,
                    mirrorTextureX: info.bodyMirrorTextureX,
                    ready: info.textureFullReady,
                    diagnostic: info.textureBodyMaterialDiagnostic,
                    verticalShiftPixels: 0,
                    meta: 'player transformation',
                })
            );
        } else if (info) {
            rows.push(
                this.playerSpriteBillboardMaterialDebugRow({
                    part: 'body',
                    requestedSprite: info.textureBodySprite,
                    materialSprite: info.textureBodyMaterialSprite,
                    mirrorTextureX: info.bodyMirrorTextureX,
                    ready: info.textureBodyReady,
                    diagnostic: info.textureBodyMaterialDiagnostic,
                    verticalShiftPixels: info.bodyTextureYOffset,
                    meta: 'player',
                }),
                this.playerSpriteBillboardMaterialDebugRow({
                    part: 'head',
                    requestedSprite: info.textureHeadSprite,
                    materialSprite: info.textureHeadMaterialSprite,
                    mirrorTextureX: info.headMirrorTextureX,
                    ready: info.textureHeadReady,
                    diagnostic: info.textureHeadMaterialDiagnostic,
                    verticalShiftPixels: 0,
                    meta: 'player',
                })
            );
        }

        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const room = scene ? scene.room : null;
        const liveActorSelection = this.currentLiveActorBillboardSelection();
        const selectedFacing = liveActorSelection.selectedFacing || null;
        liveActorBillboardSpecsForRoom(room).forEach((spec, specIndex) => {
            if (spec.lowerRecord) {
                rows.push(this.actorSpriteBillboardMaterialDebugRow(
                    spec,
                    spec.lowerRecord,
                    'lower',
                    specIndex,
                    selectedFacing
                ));
            }
            if (spec.topRecord) {
                rows.push(this.actorSpriteBillboardMaterialDebugRow(
                    spec,
                    spec.topRecord,
                    'top',
                    specIndex,
                    selectedFacing
                ));
            }
        });

        return rows.slice(0, PLAYER_MATERIAL_DEBUG_MAX_ROWS);
    }

    playerSpriteBillboardMaterialDebugRow({
        part,
        requestedSprite,
        materialSprite,
        mirrorTextureX = false,
        ready = false,
        diagnostic = '--',
        verticalShiftPixels = 0,
        meta = '',
    }) {
        const material = Number.isFinite(materialSprite)
            ? this.playerSpriteBillboardTextureMaterialForSprite(materialSprite, mirrorTextureX)
            : null;
        const canvas = material && material.userData ? material.userData.canvas : null;

        return {
            part,
            requestedSprite,
            materialSprite,
            mirrorTextureX: Boolean(mirrorTextureX),
            ready: Boolean(ready && canvas),
            diagnostic: diagnostic || (material && material.userData ? material.userData.diagnostic : '--'),
            verticalShiftPixels,
            meta,
            canvas,
        };
    }

    actorSpriteBillboardMaterialDebugRow(spec, record, part, specIndex, selectedFacing) {
        const actor = spec && spec.actor ? spec.actor : 'unknown';
        const textureSelection = resolveLiveActorTextureSelection({
            spec,
            record,
            selectedFacing,
            viewPreset: this.activeViewPreset,
        });
        const textureResult = this.actorSpriteBillboardTextureMaterialForSelection(
            actor,
            textureSelection
        );
        const effectiveTextureSelection = textureResult.selection || textureSelection;
        const material = textureResult.material;
        const canvas = material && material.userData ? material.userData.canvas : null;
        const objectSlot = objectTableSlotIndexForAddress(record ? record.address : null);
        return {
            part: actor + ' ' + part,
            requestedSprite: effectiveTextureSelection.liveSpriteId,
            materialSprite: effectiveTextureSelection.textureSpriteId,
            mirrorTextureX: effectiveTextureSelection.mirrorTextureX,
            ready: this.isVisibleSpriteBillboardTextureMaterial(material),
            diagnostic: this.actorSpriteBillboardMaterialDiagnosticForSprite(
                actor,
                effectiveTextureSelection.textureSpriteId,
                effectiveTextureSelection.mirrorTextureX
            ),
            verticalShiftPixels: 0,
            meta: 'actor#' + specIndex
                + ' obj '
                + (objectSlot === null ? '--' : objectSlot)
                + ' +7 '
                + formatHex(effectiveTextureSelection.flags.raw, 2)
                + (effectiveTextureSelection.flags.hflip ? ' hflip applied' : '')
                + ' '
                + effectiveTextureSelection.relativeView
                + '/'
                + effectiveTextureSelection.textureSide
                + '/'
                + effectiveTextureSelection.policy
                + ' swap:'
                + (effectiveTextureSelection.policySwapTextureSide ? 'Y' : 'n')
                + ' hmir:'
                + (effectiveTextureSelection.policyFacingMirrorTextureX ? 'Y' : 'n'),
            canvas,
        };
    }

    renderPlayerSpriteBillboardMaterialDebugPanel() {
        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Sprite material helper preview</strong>',
            '<span>Actual cached player and live guard/wizard material output; quick Stage 7.2 flip/mirror check.</span>',
            '</div>',
            '<canvas class="knight-lore-player-material-helper-preview" width="'
                + PLAYER_MATERIAL_DEBUG_CANVAS_WIDTH
                + '" height="'
                + (28 + PLAYER_MATERIAL_DEBUG_ROW_HEIGHT * PLAYER_MATERIAL_DEBUG_MAX_ROWS)
                + '" aria-label="Current sprite material helper output preview"></canvas>',
        ].join('');
    }

    drawMaterialDebugCheckerboard(context, x, y, width, height) {
        const squareSize = 6;
        for (let yy = 0; yy < height; yy += squareSize) {
            for (let xx = 0; xx < width; xx += squareSize) {
                const light = ((Math.floor(xx / squareSize) + Math.floor(yy / squareSize)) % 2) === 0;
                context.fillStyle = light ? '#475569' : '#1E293B';
                context.fillRect(x + xx, y + yy, squareSize, squareSize);
            }
        }
    }

    updatePlayerSpriteBillboardMaterialDebugCanvas() {
        const canvas = this.comparisonElement
            ? this.comparisonElement.querySelector('.knight-lore-player-material-helper-preview')
            : null;
        if (!canvas) return;

        const rows = this.playerSpriteBillboardMaterialDebugRows();
        const visibleRows = rows.slice(0, PLAYER_MATERIAL_DEBUG_MAX_ROWS);
        canvas.width = PLAYER_MATERIAL_DEBUG_CANVAS_WIDTH;
        canvas.height = 28 + PLAYER_MATERIAL_DEBUG_ROW_HEIGHT * Math.max(2, visibleRows.length);
        const context = canvas.getContext('2d');
        if (!context) return;

        context.fillStyle = '#0F172A';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '11px Menlo, Consolas, monospace';
        context.textBaseline = 'top';
        context.fillStyle = '#CBD5E1';
        context.fillText(
            'part  request -> material  mirror  shift  diagnostic',
            12,
            9
        );

        for (let index = 0; index < Math.max(2, visibleRows.length); index++) {
            const row = visibleRows[index] || null;
            const y = 28 + index * PLAYER_MATERIAL_DEBUG_ROW_HEIGHT;
            context.fillStyle = index % 2 === 0 ? '#1E293B' : '#172033';
            context.fillRect(0, y, canvas.width, PLAYER_MATERIAL_DEBUG_ROW_HEIGHT - 2);

            if (!row) {
                context.fillStyle = '#64748B';
                context.fillText('--', 12, y + 10);
                continue;
            }

            const sourceCanvas = row.canvas;
            const previewX = 478;
            const previewY = y + 8;
            const previewW = PLAYER_MATERIAL_DEBUG_PREVIEW_MAX_WIDTH;
            const previewH = PLAYER_MATERIAL_DEBUG_PREVIEW_MAX_HEIGHT;
            this.drawMaterialDebugCheckerboard(context, previewX, previewY, previewW, previewH);
            context.strokeStyle = row.ready ? '#22C55E' : '#EF4444';
            context.strokeRect(previewX + 0.5, previewY + 0.5, previewW, previewH);

            if (sourceCanvas) {
                const scale = Math.min(
                    previewW / sourceCanvas.width,
                    previewH / sourceCanvas.height
                );
                const width = Math.max(1, Math.round(sourceCanvas.width * scale));
                const height = Math.max(1, Math.round(sourceCanvas.height * scale));
                const imageX = previewX + Math.floor((previewW - width) / 2);
                const imageY = previewY + Math.floor((previewH - height) / 2);
                context.imageSmoothingEnabled = false;
                context.drawImage(sourceCanvas, imageX, imageY, width, height);
            } else {
                context.fillStyle = '#FCA5A5';
                context.fillText('missing', previewX + 14, previewY + 26);
            }

            context.fillStyle = row.ready ? '#BBF7D0' : '#FCA5A5';
            context.fillText(
                row.part
                    + '  '
                    + formatHex(row.requestedSprite, 2)
                    + ' -> '
                    + formatHex(row.materialSprite, 2)
                    + '  '
                    + (row.mirrorTextureX ? 'mirror' : 'normal')
                    + '  +'
                    + (Number.isFinite(row.verticalShiftPixels) ? row.verticalShiftPixels : 0)
                    + 'px',
                12,
                y + 10
            );
            context.fillStyle = '#CBD5E1';
            context.fillText(
                row.diagnostic || '--',
                12,
                y + 30
            );
            context.fillStyle = '#94A3B8';
            context.fillText(
                (sourceCanvas ? (sourceCanvas.width + 'x' + sourceCanvas.height) : '--')
                    + (row.meta ? '  ' + row.meta : ''),
                12,
                y + 50
            );
        }
    }

    updateSpriteTexturePreviewCanvas(spriteTextures, colourAttribute) {
        const canvas = this.comparisonElement
            ? this.comparisonElement.querySelector('.knight-lore-sprite-texture-preview')
            : null;
        if (!canvas) return;

        const rows = this.spriteTexturePreviewRows(spriteTextures)
            .filter(texture => texture.valid);
        const visibleRows = rows.slice(0, SPRITE_TEXTURE_PREVIEW_MAX_ROWS);
        const activeKeys = new Set();
        const records = visibleRows
            .map(texture => this.generatedSpriteTextureRecord(texture, colourAttribute))
            .filter(Boolean);
        records.forEach(record => activeKeys.add(record.key));
        this.pruneSpriteTexturePreviewCache(activeKeys);

        if (records.length === 0) {
            canvas.width = 360;
            canvas.height = 48;
            const context = canvas.getContext('2d');
            if (!context) return;
            context.fillStyle = '#0F172A';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#CBD5E1';
            context.font = '12px Menlo, Consolas, monospace';
            context.fillText('No valid focused actor sprite textures to preview.', 12, 28);
            return;
        }

        const columns = Math.min(SPRITE_TEXTURE_PREVIEW_COLUMNS, records.length);
        const bodyRows = Math.ceil(records.length / columns);
        canvas.width = SPRITE_TEXTURE_PREVIEW_MARGIN * 2
            + columns * SPRITE_TEXTURE_PREVIEW_TILE_WIDTH;
        canvas.height = SPRITE_TEXTURE_PREVIEW_MARGIN * 2
            + bodyRows * SPRITE_TEXTURE_PREVIEW_TILE_HEIGHT;

        const context = canvas.getContext('2d');
        if (!context) return;
        const inkColor = cssColorFromHex(spectrumInkColorFromAttribute(colourAttribute));
        const paperColor = cssColorFromHex(spectrumPaperColorFromAttribute(colourAttribute));

        context.fillStyle = '#0F172A';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '11px Menlo, Consolas, monospace';
        context.textBaseline = 'top';

        records.forEach((record, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = SPRITE_TEXTURE_PREVIEW_MARGIN + column * SPRITE_TEXTURE_PREVIEW_TILE_WIDTH;
            const y = SPRITE_TEXTURE_PREVIEW_MARGIN + row * SPRITE_TEXTURE_PREVIEW_TILE_HEIGHT;
            const label = [
                formatHex(record.texture.id, 2),
                record.texture.widthPixels + 'x' + record.texture.heightPixels,
                formatRecordAddress(record.texture.dataAddress),
            ].join('  ');

            context.fillStyle = '#1E293B';
            context.fillRect(
                x,
                y,
                SPRITE_TEXTURE_PREVIEW_TILE_WIDTH - SPRITE_TEXTURE_PREVIEW_MARGIN,
                SPRITE_TEXTURE_PREVIEW_TILE_HEIGHT - SPRITE_TEXTURE_PREVIEW_MARGIN
            );
            context.strokeStyle = '#334155';
            context.strokeRect(
                x + 0.5,
                y + 0.5,
                SPRITE_TEXTURE_PREVIEW_TILE_WIDTH - SPRITE_TEXTURE_PREVIEW_MARGIN - 1,
                SPRITE_TEXTURE_PREVIEW_TILE_HEIGHT - SPRITE_TEXTURE_PREVIEW_MARGIN - 1
            );

            context.fillStyle = '#F8FAFC';
            context.fillText(label, x + 8, y + 8);
            context.fillStyle = '#94A3B8';
            context.fillText(
                'ink ' + inkColor + ' paper ' + paperColor
                    + ' bits ' + record.texture.imageBitCount + '/' + record.texture.maskBitCount,
                x + 8,
                y + 21
            );
            context.fillText(
                record.groupLabel + (record.yFlipped ? '  actor buffer X+Y' : '  actor buffer X'),
                x + 8,
                y + 34
            );

            const imageY = y + SPRITE_TEXTURE_PREVIEW_LABEL_HEIGHT + 30;
            this.drawSpritePreviewImage(
                context,
                record.rawImageCanvas || record.imageCanvas,
                x + 8,
                imageY,
                'raw decoded'
            );
            this.drawSpritePreviewImage(
                context,
                record.textureBufferCanvas || record.imageCanvas,
                x + 210,
                imageY,
                'texture buffer'
            );
            this.drawSpritePreviewImage(
                context,
                record.maskCanvas,
                x + 412,
                imageY,
                'raw mask'
            );
        });
    }

    renderRoomColourProbeTable(room) {
        const probe = this.lastRoomColourProbe;
        const roomLabel = room && room.id !== null && room.id !== undefined
            ? formatHex(room.id, 2)
            : '--';

        if (!probe) {
            return [
                '<div class="knight-lore-stage2-comparison-heading is-secondary">',
                '<strong>Room colour 0x45 probe</strong>',
                '<span>room ' + escapeHtml(roomLabel) + '</span>',
                '</div>',
                '<p class="knight-lore-stage2-note is-warning">No live colour probe data captured yet.</p>',
            ].join('');
        }

        const attributeRange = probe.attributeCaptured
            ? formatRecordAddress(probe.attributeStart)
                + '..'
                + formatRecordAddress(probe.attributeEnd - 1)
                + ' ('
                + probe.attributeTotalBytes
                + ' bytes)'
            : 'not captured';
        const recentChange = probe.recentChange
            ? (
                'frame -'
                + (probe.framesSinceChange === null ? '?' : probe.framesSinceChange)
                + ': work '
                + probe.recentChange.workingChangeCount
                + ', attrs '
                + probe.recentChange.attributeChangeCount
                + ', attrs->'
                + formatHex(probe.candidateValue, 2)
                + ' '
                + probe.recentChange.attributeCandidateChangeCount
            )
            : 'no recent change';
        const candidateLabel = formatHex(probe.candidateValue, 2);

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Room colour 0x45 probe</strong>',
            '<span>room '
                + escapeHtml(roomLabel)
                + ', documented '
                + escapeHtml(formatRecordAddress(probe.documentedAddress))
                + '='
                + escapeHtml(formatHex(probe.documentedValue, 2))
                + ', candidate '
                + escapeHtml(candidateLabel)
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Reads the documented room colour byte and the Spectrum screen attribute bytes every frame. '
                + 'If 0x5BAD remains fixed while the screen attributes change, the temporary cauldron colour is not stored in the room header.'
                + '</p>',
            '<table>',
            '<tbody>',
            '<tr>',
            '<th>Documented colour</th>',
            '<td class="mono">'
                + escapeHtml(formatRecordAddress(probe.documentedAddress))
                + ' = '
                + escapeHtml(formatHex(probe.documentedValue, 2))
                + ', renderer '
                + escapeHtml(formatHex(probe.rendererColor, 6))
                + '</td>',
            '</tr>',
            '<tr>',
            '<th>Working window</th>',
            '<td class="mono">'
                + escapeHtml(formatRecordAddress(probe.workingWindowStart) + ': ' + formatByteList(probe.workingWindowBytes))
                + '</td>',
            '</tr>',
            '<tr class="' + (probe.workingChanges && probe.workingChanges.length > 0 ? 'is-room-colour-changed' : '') + '">',
            '<th>Working changes</th>',
            '<td class="mono" title="' + escapeHtml(formatByteChangeDetails(probe.workingChanges)) + '">'
                + escapeHtml(formatByteChangeSummary(probe.workingChanges))
                + ', '
                + escapeHtml(candidateLabel)
                + ' at '
                + escapeHtml(formatAddressList(probe.workingCandidateAddresses))
                + '</td>',
            '</tr>',
            '<tr>',
            '<th>Screen attributes</th>',
            '<td class="mono">'
                + escapeHtml(attributeRange)
                + ', top values '
                + escapeHtml(probe.attributeTopCounts)
                + '</td>',
            '</tr>',
            '<tr class="' + (probe.attributeChangeCount > 0 ? 'is-room-colour-changed' : '') + '">',
            '<th>Attribute changes</th>',
            '<td class="mono" title="' + escapeHtml(formatByteChangeDetails(probe.attributeChanges)) + '">'
                + escapeHtml(formatByteChangeSummary(probe.attributeChanges))
                + ', recent '
                + escapeHtml(recentChange)
                + '</td>',
            '</tr>',
            '<tr>',
            '<th>Candidate ' + escapeHtml(candidateLabel) + '</th>',
            '<td class="mono">'
                + 'screen count '
                + probe.attributeCandidateCount
                + ', first addresses '
                + escapeHtml(formatAddressList(probe.attributeCandidateAddresses))
                + '</td>',
            '</tr>',
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderSpecialDynamicMarkerTable(markers) {
        const rows = markers || [];
        const counts = rows.reduce((memo, marker) => {
            memo[marker.category] = (memo[marker.category] || 0) + 1;
            return memo;
        }, {});
        const countLabel = ['wizard']
            .map(category => category + ':' + (counts[category] || 0))
            .join(', ');

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Live special markers</strong>',
            '<span>'
                + escapeHtml(countLabel)
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'In room 0x88, wizard markers use live dynamic rows 8 and 9. '
                + 'The cauldron is rendered directly from static background 0x13. '
                + 'The spell marker uses live bytes at 0x5C68..0x5C6B.'
                + '</p>',
            rows.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No live wizard marker found in current dynamic slots.</p>'
                : [
                    '<table>',
                    '<thead><tr>',
                    '<th>Class</th>',
                    '<th>Dynamic address</th>',
                    '<th>Sprite</th>',
                    '<th>Position XYZ</th>',
                    '<th>Dim XYZ</th>',
                    '<th>Render</th>',
                    '<th>Source</th>',
                    '<th>Object-id hits</th>',
                    '</tr></thead>',
                    '<tbody>',
                    rows.map(marker => {
                        const record = marker.record || {};
                        return (
                            '<tr class="is-' + escapeHtml(marker.category || 'object') + '">' +
                            '<td>' + escapeHtml(marker.label || marker.category || '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(record.address)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.spriteId, 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.position)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.dimensions)) + '</td>' +
                            '<td>' + (marker.render === false ? 'hidden' : 'shown') + '</td>' +
                            '<td>' + escapeHtml(marker.source || '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(formatDynamicObjectIdHits(marker.objectIdHits)) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderCauldronStaticProbeTable(room) {
        const location = staticLocationForRoom(room);
        const cauldronBackground = location && Array.isArray(location.backgrounds)
            ? location.backgrounds.find(background => background.id === 0x13)
            : null;
        const records = cauldronBackground && Array.isArray(cauldronBackground.records)
            ? cauldronBackground.records
            : [];
        const roomDepth = this.roomDimensions && Number.isFinite(this.roomDimensions.depth)
            ? this.roomDimensions.depth
            : null;

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Cauldron static 0x13 probe</strong>',
            '<span>records: '
                + records.length
                + ', data '
                + escapeHtml(formatRecordAddress(cauldronBackground ? cauldronBackground.dataAddress : null))
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Diagnostic only: static background 0x13 is rendered as cauldron. '
                + 'Rendering is forced to the room center; raw static coordinates are retained here for reference.'
                + '</p>',
            records.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No static background 0x13 record found in this room.</p>'
                : [
                    '<table>',
                    '<thead><tr>',
                    '<th>#</th>',
                    '<th>Address</th>',
                    '<th>Sprite</th>',
                    '<th>Decoded XYZ</th>',
                    '<th>Dim XYZ</th>',
                    '<th>Static scene</th>',
                    '<th>Y candidates</th>',
                    '<th>Raw bytes</th>',
                    '<th>Flags</th>',
                    '</tr></thead>',
                    '<tbody>',
                    records.map((record, recordIndex) => {
                        const currentScene = mapKnightLorePositionToScene(record.position, this.roomDimensions);
                        const depthMinusY = roomDepth === null || !Number.isFinite(record.position.y)
                            ? null
                            : roomDepth - record.position.y;
                        const flipped128Y = Number.isFinite(record.position.y)
                            ? 128 - record.position.y
                            : null;
                        const yCandidates = [
                            'raw ' + (Number.isFinite(record.position.y) ? record.position.y : '--'),
                            'depth-y ' + (depthMinusY === null ? '--' : depthMinusY),
                            '128-y ' + (flipped128Y === null ? '--' : flipped128Y),
                        ].join(' | ');
                        return (
                            '<tr class="is-cauldron">' +
                            '<td class="mono">' + recordIndex + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(record.address)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.spriteId, 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.position)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.dimensions)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatSceneVector(currentScene ? currentScene.vector : null)) + '</td>' +
                            '<td class="mono">' + escapeHtml(yCandidates) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatByteList(record.raw)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.flags ? record.flags.raw : null, 2)) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderSpellMovementProbeTable(rows, room) {
        const visibleRows = rows || [];
        const totalHits = this.lastSpellProbeTotalHits || 0;
        const changedRows = this.lastSpellProbeChangedHits || 0;
        const roomLabel = room && room.id !== null && room.id !== undefined
            ? formatHex(room.id, 2)
            : '--';
        const targetLabel = formatHexList(SPELL_OBSERVED_VALUES, 2);
        const valueCounts = SPELL_OBSERVED_VALUES.map(value => (
            formatHex(value, 2)
                + ':'
                + (this.lastSpellProbeValueCounts && this.lastSpellProbeValueCounts.get(value) || 0)
        )).join(' ');

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Spell movement probe</strong>',
            '<span>address '
                + escapeHtml(formatRecordAddress(SPELL_PROBE_ADDRESS))
                + ', observed values '
                + escapeHtml(targetLabel)
                + ', matched this frame: '
                + totalHits
                + ' ('
                + escapeHtml(valueCounts)
                + ')'
                + ', changed: '
                + changedRows
                + ', room '
                + escapeHtml(roomLabel)
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Diagnostic only: reads 0x5C68 every frame. In Full 3D, values 0xA0..0xA3 render as bubble clusters, '
                + '0xA4..0xA7 render as wolf attack, and 0xAE is tracked as a possible item-display state. '
                + 'Schematic mode keeps the compact sphere marker.'
                + '</p>',
            '<table class="knight-lore-spell-probe-table">',
            '<colgroup>',
            '<col class="is-spell-probe-address-cell">',
            '<col class="is-spell-probe-value-cell">',
            '<col class="is-spell-probe-class-cell">',
            '<col class="is-spell-probe-room-cell">',
            '<col class="is-spell-probe-location-cell">',
            '<col class="is-spell-probe-change-cell">',
            '<col class="is-spell-probe-xyz-cell">',
            '<col class="is-spell-probe-dim-cell">',
            '<col class="is-spell-probe-window-cell">',
            '</colgroup>',
            '<thead><tr>',
            '<th class="is-spell-probe-address-cell">Address</th>',
            '<th class="is-spell-probe-value-cell">Value</th>',
            '<th class="is-spell-probe-class-cell">Class</th>',
            '<th class="is-spell-probe-room-cell">Room +8</th>',
            '<th class="is-spell-probe-location-cell">Location</th>',
            '<th class="is-spell-probe-change-cell">Changed bytes</th>',
            '<th class="is-spell-probe-xyz-cell">+1,+2,+3</th>',
            '<th class="is-spell-probe-dim-cell">+4,+5,+6</th>',
            '<th class="is-spell-probe-window-cell">Probe window</th>',
            '</tr></thead>',
            '<tbody>',
            visibleRows.length === 0
                ? [
                    '<tr class="is-spell-probe-empty">',
                    '<td class="mono is-spell-probe-address-cell">' + escapeHtml(formatRecordAddress(SPELL_PROBE_ADDRESS)) + '</td>',
                    '<td class="mono is-spell-probe-value-cell">--</td>',
                    '<td class="is-spell-probe-class-cell">unavailable</td>',
                    '<td class="mono is-spell-probe-room-cell">--</td>',
                    '<td class="is-spell-probe-location-cell">--</td>',
                    '<td class="mono is-spell-probe-change-cell">--</td>',
                    '<td class="mono is-spell-probe-xyz-cell">--, --, --</td>',
                    '<td class="mono is-spell-probe-dim-cell">--, --, --</td>',
                    '<td class="mono is-spell-probe-window-cell">--</td>',
                    '</tr>',
                ].join('')
                : visibleRows.map(row => {
                const rowClass = row.changes && row.changes.length > 0
                    ? ' class="is-spell-probe-changed"'
                    : (row.observedThisFrame ? '' : ' class="is-spell-probe-held"');
                const changeDetails = formatSpellProbeChanges(row);
                const changeSummary = formatSpellProbeChangeSummary(row);
                return (
                    '<tr' + rowClass + '>' +
                    '<td class="mono is-spell-probe-address-cell">' + escapeHtml(formatRecordAddress(row.address)) + '</td>' +
                    '<td class="mono is-spell-probe-value-cell">'
                        + escapeHtml(formatHex(row.observedValue, 2))
                        + '</td>' +
                    '<td class="is-spell-probe-class-cell">' + escapeHtml(row.observedKind || 'other') + '</td>' +
                    '<td class="mono is-spell-probe-room-cell">' + escapeHtml(formatHex(row.candidateRoomId, 2)) + '</td>' +
                    '<td class="is-spell-probe-location-cell">' + escapeHtml(formatDynamicSlotLocation(row.address)) + '</td>' +
                    '<td class="mono is-spell-probe-change-cell" title="' + escapeHtml(changeDetails) + '">'
                        + escapeHtml(changeSummary)
                        + '</td>' +
                    '<td class="mono is-spell-probe-xyz-cell">' + escapeHtml(formatRoomSize(row.candidatePosition)) + '</td>' +
                    '<td class="mono is-spell-probe-dim-cell">' + escapeHtml(formatRoomSize(row.candidateDimensions)) + '</td>' +
                    '<td class="mono is-spell-probe-window-cell">'
                        + escapeHtml(formatRecordAddress(row.windowStart) + ': ' + formatByteList(row.windowBytes))
                        + '</td>' +
                    '</tr>'
                );
            }).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderPlayerSpriteIdentificationTable() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene
            ? this.latestFrame.knightLoreScene
            : null;
        const player = scene ? scene.player : null;
        const orientation = player ? player.orientation : null;
        const room = scene ? scene.room : null;
        const roomLabel = room && room.id !== null && room.id !== undefined
            ? formatHex(room.id, 2)
            : '--';

        if (!player || !orientation) {
            return [
                '<div class="knight-lore-stage2-comparison-heading is-secondary">',
                '<strong>Main character sprite identification</strong>',
                '<span>room ' + escapeHtml(roomLabel) + '</span>',
                '</div>',
                '<p class="knight-lore-stage2-note is-warning">'
                    + 'No live player sprite data captured yet. Start gameplay to populate 0x5C41, 0x5C45, 0x5C0F, and 0x5C2F.'
                    + '</p>',
            ].join('');
        }

        const rows = [
            {
                label: '0x5C09 body X',
                value: formatHex(player.body ? player.body.x : null, 2),
                interpretation: 'Documented main-character body X.',
            },
            {
                label: '0x5C0A body Y',
                value: formatHex(player.body ? player.body.y : null, 2),
                interpretation: 'Documented main-character body Y.',
            },
            {
                label: '0x5C0B body Z',
                value: formatHex(player.body ? player.body.z : null, 2),
                interpretation: 'Documented main-character body Z.',
            },
            {
                label: '0x5C20 head X',
                value: formatHex(player.head && player.head.semanticPosition ? player.head.semanticPosition.x : null, 2),
                interpretation: 'Documented main-character head X.',
            },
            {
                label: '0x5C2A head Y',
                value: formatHex(player.head && player.head.semanticPosition ? player.head.semanticPosition.y : null, 2),
                interpretation: 'Documented main-character head Y.',
            },
            {
                label: '0x5C2B head Z',
                value: formatHex(player.head && player.head.semanticPosition ? player.head.semanticPosition.z : null, 2),
                interpretation: 'Documented main-character head Z.',
            },
            {
                label: '0x5C41 live sprite',
                value: formatHex(orientation.headSprite, 2),
                interpretation: 'Documented/Ricard orientation sprite; current code treats this as the primary player sprite.',
            },
            {
                label: '0x5C45 live sprite',
                value: formatHex(orientation.bodySprite, 2),
                interpretation: 'Second documented player sprite byte; compare visually to decide whether it is the other half.',
            },
            {
                label: '0x5C0F mirror/axis',
                value: formatHex(orientation.bodyMirrorFlag, 2),
                interpretation: 'Primary axis flag used by the verified direction rule; >= '
                    + formatHex(orientation.directionAxisThreshold, 2)
                    + ' means north/south axis.',
            },
            {
                label: '0x5C2F mirror/axis',
                value: formatHex(orientation.headMirrorFlag, 2),
                interpretation: 'Second mirror/axis byte; check whether it follows 0x5C0F for the other character half.',
            },
            {
                label: 'Documented orientation',
                value: formatOrientationCandidate(orientation.documentedOrientation),
                interpretation: '0x5C41 combined with 0x5C0F.',
            },
            {
                label: '0x5C45 orientation candidate',
                value: formatOrientationCandidate(orientation.bodyOrientation),
                interpretation: '0x5C45 combined with 0x5C0F.',
            },
            {
                label: 'Head-byte orientation candidate',
                value: formatOrientationCandidate(orientation.headOrientation),
                interpretation: '0x5C41 combined with 0x5C2F.',
            },
            {
                label: 'Selected state/facing',
                value: (orientation.state ? orientation.state.label : 'unclassified')
                    + ' / '
                    + (orientation.visualFacing || '--'),
                interpretation: orientation.visualFacingSource || '--',
            },
            {
                label: 'Body position 0x5C09..0x5C0B',
                value: formatRoomSize(player.body),
                interpretation: 'Current render anchor for the character proxy.',
            },
            {
                label: 'Head semantic 0x5C20,0x5C2A,0x5C2B',
                value: formatRoomSize(player.head ? player.head.semanticPosition : null),
                interpretation: 'Documented head position, kept for comparison.',
            },
            {
                label: 'Head render candidate 0x5C29,0x5C2A,0x5C2B',
                value: formatRoomSize(player.head ? player.head.renderPositionCandidate : null),
                interpretation: 'Current visual candidate used by the proxy when close to the body.',
            },
        ];

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Main character sprite identification</strong>',
            '<span>room '
                + escapeHtml(roomLabel)
                + ', live sprites '
                + escapeHtml(formatHex(orientation.headSprite, 2))
                + ' / '
                + escapeHtml(formatHex(orientation.bodySprite, 2))
                + ', mirrors '
                + escapeHtml(formatHex(orientation.bodyMirrorFlag, 2))
                + ' / '
                + escapeHtml(formatHex(orientation.headMirrorFlag, 2))
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Focused diagnostic for the first billboard pass. Watch 0x5C41 and 0x5C45 while walking, turning, '
                + 'and transforming. The table below searches working memory for the confirmed player sprite ranges '
                + 'and keeps each discovered address in a stable pile.'
                + '</p>',
            '<table>',
            '<thead><tr>',
            '<th>Field</th>',
            '<th>Live value</th>',
            '<th>Interpretation / check</th>',
            '</tr></thead>',
            '<tbody>',
            rows.map(row => (
                '<tr>' +
                '<td>' + escapeHtml(row.label) + '</td>' +
                '<td class="mono">' + escapeHtml(row.value) + '</td>' +
                '<td>' + escapeHtml(row.interpretation) + '</td>' +
                '</tr>'
            )).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderPlayerSpriteMemoryPileTable() {
        const frame = this.latestFrame;
        const memoryStart = frame && Number.isFinite(frame.memoryStart) ? frame.memoryStart : null;
        const memoryEnd = frame && Number.isFinite(frame.memoryEnd) ? frame.memoryEnd : null;
        const offsets = [];
        for (
            let offset = -PLAYER_SPRITE_MEMORY_WINDOW_BEFORE;
            offset <= PLAYER_SPRITE_MEMORY_WINDOW_AFTER;
            offset++
        ) {
            offsets.push(offset);
        }
        const targetLabel = formatHexList(PLAYER_SPRITE_MEMORY_VALUES, 2);

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Player sprite focused memory windows</strong>',
            '<span>targets '
                + escapeHtml(targetLabel)
                + ', body '
                + escapeHtml(formatRecordAddress(PLAYER_BODY_SPRITE_CANDIDATE_ADDRESS))
                + ', head '
                + escapeHtml(formatRecordAddress(PLAYER_HEAD_SPRITE_CANDIDATE_ADDRESS))
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Shows fixed working-memory windows around the current body/head sprite-address candidates. '
                + 'The blue cell is the candidate address; shaded cells contain bytes from the corrected player sprite ranges.'
                + '</p>',
            memoryStart === null || memoryEnd === null
                ? '<p class="knight-lore-stage2-note is-warning">Working memory is not available yet.</p>'
                : '',
            '<table>',
            '<thead><tr>',
            '<th>#</th>',
            '<th>Address</th>',
            '<th>Expression</th>',
            '<th>Location</th>',
            '<th>Current</th>',
            '<th>Class</th>',
            offsets.map(offset => (
                '<th class="mono">' + (offset > 0 ? '+' + offset : offset) + '</th>'
            )).join(''),
            '</tr></thead>',
            '<tbody>',
            memoryStart === null || memoryEnd === null
                ? [
                    '<tr>',
                    '<td colspan="' + (6 + offsets.length) + '">No working memory window available yet.</td>',
                    '</tr>',
                ].join('')
                : PLAYER_SPRITE_FOCUS_WINDOWS.map((entry, index) => {
                    const currentValue = readFrameMemoryByte(frame, entry.address);
                    const currentClass = classifyPlayerSpriteMemoryValue(currentValue);
                    return (
                        '<tr>' +
                        '<td class="mono">' + index + '</td>' +
                        '<td class="mono">' + escapeHtml(formatRecordAddress(entry.address)) + '</td>' +
                        '<td class="mono">' + escapeHtml(entry.expression) + '</td>' +
                        '<td>' + escapeHtml(formatDynamicSlotLocation(entry.address)) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatHex(currentValue, 2)) + '</td>' +
                        '<td>' + escapeHtml(currentClass) + '</td>' +
                        offsets.map(offset => {
                            const address = entry.address + offset;
                            const value = readFrameMemoryByte(frame, address);
                            const classes = ['mono'];
                            if (offset === 0) classes.push('is-selected-byte');
                            if (PLAYER_SPRITE_MEMORY_VALUE_SET.has(value)) classes.push('is-exact');
                            return '<td class="' + classes.join(' ') + '" title="'
                                + escapeHtml(formatRecordAddress(address))
                                + ' '
                                + escapeHtml(classifyPlayerSpriteMemoryValue(value))
                                + '">'
                                + escapeHtml(formatHex(value, 2))
                                + '</td>';
                        }).join('') +
                        '</tr>'
                    );
                }).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderPlayerBillboardTransitionTraceTable() {
        const traceRows = this.playerBillboardTransitionTrace || [];
        const rows = Array.from(
            {length: PLAYER_BILLBOARD_TRANSITION_TRACE_LIMIT},
            (_, index) => traceRows[index] || null
        );

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Player billboard transition trace</strong>',
            '<span>Newest first; fixed 20-slot capture for respawn/transformation sprite glitches.</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'When a glitch flashes by, copy the first occupied rows here. '
                + 'Important columns: raw body/head, texture body/head, material body/head, mirror, stored, and bypass.'
                + '</p>',
            '<table>',
            '<thead><tr>',
            '<th>#</th>',
            '<th>Frame</th>',
            '<th>Room</th>',
            '<th>Reason</th>',
            '<th>State/facing</th>',
            '<th>Raw B/H</th>',
            '<th>Tex B/H</th>',
            '<th>Mat B/H</th>',
            '<th>Diag B/H</th>',
            '<th>Mirror B/H</th>',
            '<th>Stored B/H</th>',
            '<th>Bypass P/S</th>',
            '<th>Ready B/H</th>',
            '</tr></thead>',
            '<tbody>',
            rows.map((row, index) => {
                if (!row) {
                    return (
                        '<tr>' +
                        '<td class="mono">' + index + '</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td>--</td>' +
                        '<td>--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '<td class="mono">--</td>' +
                        '</tr>'
                    );
                }

                return (
                    '<tr>' +
                    '<td class="mono">' + index + '</td>' +
                    '<td class="mono">' + escapeHtml(row.frame) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(row.roomId, 2)) + '</td>' +
                    '<td>' + escapeHtml(row.reasons || '--') + '</td>' +
                    '<td>' + escapeHtml((row.state || '--') + '/' + (row.facing || '--')) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(row.rawBodySprite, 2) + '/' + formatHex(row.rawHeadSprite, 2)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(row.textureBodySprite, 2) + '/' + formatHex(row.textureHeadSprite, 2)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(row.materialBodySprite, 2) + '/' + formatHex(row.materialHeadSprite, 2)) + '</td>' +
                    '<td class="mono">' + escapeHtml(
                        (row.bodyMaterialDiagnostic || '--')
                        + '/'
                        + (row.headMaterialDiagnostic || '--')
                    ) + '</td>' +
                    '<td class="mono">' + escapeHtml((row.bodyMirrorTextureX ? 'Y' : 'n') + '/' + (row.headMirrorTextureX ? 'Y' : 'n')) + '</td>' +
                    '<td class="mono">' + escapeHtml(
                        (row.bodyStoredSide || '--')
                        + (row.bodyStoredMirrorX ? '*' : '')
                        + '/'
                        + (row.headStoredSide || '--')
                        + (row.headStoredMirrorX ? '*' : '')
                    ) + '</td>' +
                    '<td class="mono">' + escapeHtml((row.phaseBypass ? 'Y' : 'n') + '/' + (row.storageBypass ? 'Y' : 'n')) + '</td>' +
                    '<td class="mono">' + escapeHtml((row.bodyReady ? 'Y' : 'n') + '/' + (row.headReady ? 'Y' : 'n')) + '</td>' +
                    '</tr>'
                );
            }).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderSpriteTextureExtractorTable(spriteTextures, colourAttribute) {
        if (!spriteTextures || !spriteTextures.available) {
            return [
                '<div class="knight-lore-stage2-comparison-heading is-secondary">',
                '<strong>Sprite texture extractor</strong>',
                '<span>static memory unavailable</span>',
                '</div>',
                '<p class="knight-lore-stage2-note is-warning">'
                    + 'Sprite textures cannot be decoded until the static memory cache is available.'
                    + '</p>',
            ].join('');
        }

        const maxRows = SPRITE_TEXTURE_PREVIEW_MAX_ROWS;
        const rows = this.spriteTexturePreviewRows(spriteTextures);
        const visibleRows = rows.slice(0, maxRows);
        const overflowNote = rows.length > maxRows
            ? '<p class="knight-lore-stage2-note">Showing first '
                + maxRows
                + ' focused sprites; '
                + (rows.length - maxRows)
                + ' additional sprites hidden.</p>'
            : '';
        const pointerRange = formatAddressRange(
            spriteTextures.pointerTableStart,
            spriteTextures.pointerTableEnd
        );
        const dataRange = formatAddressRange(
            spriteTextures.spriteDataStart,
            spriteTextures.spriteDataEnd
        );
        const inkColor = cssColorFromHex(spectrumInkColorFromAttribute(colourAttribute));
        const paperColor = cssColorFromHex(spectrumPaperColorFromAttribute(colourAttribute));

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Sprite texture extractor</strong>',
            '<span>'
                + escapeHtml(pointerRange)
                + ' pointers, '
                + escapeHtml(dataRange)
                + ' data, decoded '
                + spriteTextures.decodedCount
                + '/'
                + spriteTextures.spriteCount
                + ', current refs '
                + spriteTextures.referencedCount
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Decodes the original sprite texture bytes from static memory: byte 0 width in bytes, '
                + 'byte 1 height in pixels, then mask/image byte pairs. '
                + 'The bit order is treated as most-significant-bit first, left to right.'
                + '</p>',
            '<p class="knight-lore-stage2-note">'
                + 'Focused Stage 7.1 atlas for the non-player billboard pass: guard square heads 0x1E..0x1F, '
                + 'the guard body/head sequence 0x90..0x9D including 0x96..0x97, and wizard heads 0x9E..0x9F. '
                + 'All previews use the same actor buffer flip convention as the main-character billboards '
                + 'unless a sprite-specific exception is found.'
                + '</p>',
            '<p class="knight-lore-stage2-note">'
                + 'Preview canvas uses the current room attribute '
                + escapeHtml(formatHex(colourAttribute, 2))
                + ': image bits are rendered as ink '
                + escapeHtml(inkColor)
                + ' over paper '
                + escapeHtml(paperColor)
                + '; the middle preview is the transparent billboard texture buffer after the actor Y flip '
                + 'and current billboard UV X flip; raw mask bits are shown separately in greyscale.'
                + '</p>',
            '<canvas class="knight-lore-sprite-texture-preview" width="1" height="1" '
                + 'aria-label="Decoded sprite texture previews"></canvas>',
            rows.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No focused sprite textures found.</p>'
                : [
                    overflowNote,
                    '<table>',
                    '<thead><tr>',
                    '<th>Group</th>',
                    '<th>Sprite</th>',
                    '<th>Pointer</th>',
                    '<th>Data bytes</th>',
                    '<th>Pixel size</th>',
                    '<th>Width bytes</th>',
                    '<th>Image/mask bytes</th>',
                    '<th>Set bits image/mask</th>',
                    '<th>Preview transform</th>',
                    '<th>Status</th>',
                    '</tr></thead>',
                    '<tbody>',
                    visibleRows.map(texture => {
                        const dataRangeLabel = texture.valid
                            ? formatAddressRange(texture.dataAddress, texture.dataEndAddress)
                            : formatRecordAddress(texture.dataAddress);
                        const pixelSize = texture.valid
                            ? texture.widthPixels + ' x ' + texture.heightPixels
                            : '--';
                        const planeBytes = texture.valid
                            ? texture.imageByteCount + ' / ' + texture.maskByteCount
                            : '--';
                        const bitCounts = texture.valid
                            ? texture.imageBitCount + ' / ' + texture.maskBitCount
                            : '--';
                        const preview = texture.previewRows && texture.previewRows.length > 0
                            ? texture.previewRows.join('\n')
                            : '';
                        const rowClass = texture.valid ? 'is-exact' : 'is-mismatch';
                        return (
                            '<tr class="' + rowClass + '">' +
                            '<td>' + escapeHtml(texture.groupLabel || '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(texture.id, 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(texture.pointerAddress)) + '</td>' +
                            '<td class="mono">' + escapeHtml(dataRangeLabel) + '</td>' +
                            '<td class="mono" title="' + escapeHtml(preview) + '">' + escapeHtml(pixelSize) + '</td>' +
                            '<td class="mono">' + escapeHtml(texture.valid ? texture.widthBytes : '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(planeBytes) + '</td>' +
                            '<td class="mono">' + escapeHtml(bitCounts) + '</td>' +
                            '<td>' + escapeHtml(texture.yFlipped ? 'actor buffer X+Y' : 'actor buffer X') + '</td>' +
                            '<td>' + escapeHtml(texture.valid ? 'decoded' : (texture.warning || 'invalid')) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderFocusedActorSlotTable(rows) {
        const records = rows || [];

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Focused guard/wizard slots</strong>',
            '<span>guards 0x60C8, 0x6028, 0x6048; wizard rows 8 and 9</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Compact live view of the slots we are validating now. '
                + 'Flags are decoded from +7: hflip is bit 6, while wipe/draw are transient bits 5 and 4. '
                + 'For NSEW guard/wizard movement, +13 low two bits decode as west, north, east, south. '
                + 'dXYZ is shown as signed bytes.'
                + '</p>',
            '<table>',
            '<thead><tr>',
            '<th>Focus</th>',
            '<th>Source</th>',
            '<th>Address</th>',
            '<th>Obj slot</th>',
            '<th>Sprite +0</th>',
            '<th>XYZ +1..+3</th>',
            '<th>Dim +4..+6</th>',
            '<th>Flags +7</th>',
            '<th>Room +8</th>',
            '<th>dXYZ +9..+11</th>',
            '<th>Info +13</th>',
            '<th>Bytes +0..+13</th>',
            '</tr></thead>',
            '<tbody>',
            records.map(row => {
                const record = row.record;
                const slotRaw = record && Array.isArray(record.slotRaw) ? record.slotRaw : [];
                const objectSlot = record ? objectTableSlotIndexForAddress(record.address) : null;
                const flags = liveActorFlagsFromRecord(record);
                const rowClass = record
                    ? ''
                    : ' class="is-missing-dynamic"';
                return (
                    '<tr' + rowClass + '>' +
                    '<td>' + escapeHtml(row.label) + '</td>' +
                    '<td class="mono" title="' + escapeHtml(row.source) + '">'
                        + escapeHtml(row.expected || row.source || '--')
                        + '</td>' +
                    '<td class="mono">' + escapeHtml(formatRecordAddress(record ? record.address : null)) + '</td>' +
                    '<td class="mono">' + escapeHtml(objectSlot === null ? '--' : objectSlot) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(record ? record.spriteId : null, 2)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatRoomSize(record ? record.position : null)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatRoomSize(record ? record.dimensions : null)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatLiveActorFlags(flags)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatHex(slotRaw[8], 2)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatSignedByteTriplet(slotRaw, 9)) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatGuardWizardInfoByte(slotRaw[13])) + '</td>' +
                    '<td class="mono">' + escapeHtml(formatByteList(slotRaw.slice(0, 14))) + '</td>' +
                    '</tr>'
                );
            }).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    focusedWizardByteWindows() {
        return FOCUSED_WIZARD_WINDOW_STARTS.map((startAddress, index) => {
            const bytes = readFrameMemoryWindow(
                this.latestFrame,
                startAddress,
                FOCUSED_WIZARD_WINDOW_LENGTH
            );
            const state = this.focusedWizardByteWindowState.get(startAddress) || {
                previousBytes: [],
                changedUntilByOffset: new Map(),
                lastChangeByOffset: new Map(),
            };
            let changedCount = 0;

            bytes.forEach((value, offset) => {
                const previous = state.previousBytes[offset];
                const readable = value !== null && value !== undefined;
                const hadPrevious = previous !== null && previous !== undefined;
                if (readable && hadPrevious && previous !== value) {
                    state.changedUntilByOffset.set(
                        offset,
                        this.frameCounter + FOCUSED_WIZARD_CHANGE_HOLD_FRAMES
                    );
                    state.lastChangeByOffset.set(offset, {
                        before: previous,
                        after: value,
                        frame: this.frameCounter,
                    });
                    changedCount += 1;
                }
            });

            state.previousBytes = bytes.slice();
            this.focusedWizardByteWindowState.set(startAddress, state);

            return {
                startAddress,
                label: 'row ' + FOCUSED_WIZARD_COMPARISON_ROWS[index],
                bytes,
                state,
                changedCount,
            };
        });
    }

    focusedWizardByteCell(window, offset) {
        const value = window && Array.isArray(window.bytes) ? window.bytes[offset] : null;
        const changedUntil = window && window.state
            ? window.state.changedUntilByOffset.get(offset)
            : null;
        const recentChange = window && window.state
            ? window.state.lastChangeByOffset.get(offset)
            : null;
        const isRecentlyChanged = Number.isFinite(changedUntil) && changedUntil >= this.frameCounter;
        const className = 'mono' + (isRecentlyChanged ? ' is-selected-byte' : '');
        const titleParts = [
            formatRecordAddress(window ? window.startAddress + offset : null),
            'dec ' + (value === null || value === undefined ? '--' : value),
            'signed ' + formatSignedByte(value),
        ];
        if (isRecentlyChanged && recentChange) {
            titleParts.push(
                'changed '
                    + formatHex(recentChange.before, 2)
                    + '>'
                    + formatHex(recentChange.after, 2)
                    + ' at frame '
                    + recentChange.frame
            );
        }

        return '<td class="' + className + '" title="' + escapeHtml(titleParts.join(', ')) + '">'
            + escapeHtml(formatHex(value, 2))
            + '</td>';
    }

    focusedWizardByteChangeSummary(window, offset) {
        if (!window || !window.state) return '--';
        const changedUntil = window.state.changedUntilByOffset.get(offset);
        const recentChange = window.state.lastChangeByOffset.get(offset);
        if (!Number.isFinite(changedUntil) || changedUntil < this.frameCounter || !recentChange) {
            return '--';
        }

        return formatRecordAddress(window.startAddress + offset)
            + ' '
            + formatHex(recentChange.before, 2)
            + '>'
            + formatHex(recentChange.after, 2)
            + ' f'
            + recentChange.frame;
    }

    renderFocusedWizardByteWindowTable() {
        const windows = this.focusedWizardByteWindows();
        const summary = windows.map(window => (
            formatRecordAddress(window.startAddress)
                + ': '
                + window.changedCount
                + ' changed this frame'
        )).join(', ');

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Wizard byte windows</strong>',
            '<span>'
                + escapeHtml(summary)
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Full 0x20-byte live windows starting at 0x5D88 and 0x5DA8. '
                + 'Recently changed cells are highlighted briefly so fast flags are easier to spot.'
                + '</p>',
            '<table>',
            '<thead><tr>',
            '<th>Offset</th>',
            '<th>Field guess</th>',
            '<th>0x5D88 row 8</th>',
            '<th>0x5DA8 row 9</th>',
            '<th>Recent changes</th>',
            '</tr></thead>',
            '<tbody>',
            Array.from({length: FOCUSED_WIZARD_WINDOW_LENGTH}, (_unused, offset) => {
                const changes = windows
                    .map(window => this.focusedWizardByteChangeSummary(window, offset))
                    .filter(summaryText => summaryText !== '--')
                    .join(' | ') || '--';
                return (
                    '<tr>' +
                    '<td class="mono">+' + escapeHtml(formatHex(offset, 2)) + '</td>' +
                    '<td>' + escapeHtml(formatObjectSlotByteField(offset)) + '</td>' +
                    this.focusedWizardByteCell(windows[0], offset) +
                    this.focusedWizardByteCell(windows[1], offset) +
                    '<td class="mono">' + escapeHtml(changes) + '</td>' +
                    '</tr>'
                );
            }).join(''),
            '</tbody>',
            '</table>',
        ].join('');
    }

    renderLiveObjectSlotTable(liveObjectRecords) {
        const records = liveObjectRecords || [];
        const visibleRows = records.slice(0, LIVE_ACTOR_MAX_ROWS);
        const overflowNote = records.length > LIVE_ACTOR_MAX_ROWS
            ? '<p class="knight-lore-stage2-note">Showing first '
                + LIVE_ACTOR_MAX_ROWS
                + ' live object slots; '
                + (records.length - LIVE_ACTOR_MAX_ROWS)
                + ' additional slots hidden.</p>'
            : '';

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>All live object slots</strong>',
            '<span>ASM table 0x5C08, active slots: '
                + records.length
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Plain listing of active 0x20-byte object slots from the disassembly layout. '
                + 'Use this table to identify wizard/guard/ghost rows visually before we hard-code any renderer assumptions.'
                + '</p>',
            records.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No active live object slots found.</p>'
                : [
                    overflowNote,
                    '<table>',
                    '<thead><tr>',
                    '<th>Obj slot</th>',
                    '<th>Address</th>',
                    '<th>Sprite +0</th>',
                    '<th>Class hint</th>',
                    '<th>XYZ +1..+3</th>',
                    '<th>Dim +4..+6</th>',
                    '<th>Flags +7</th>',
                    '<th>Room +8</th>',
                    '<th>dXYZ +9..+11</th>',
                    '<th>Info +13</th>',
                    '<th>Bytes +0..+13</th>',
                    '</tr></thead>',
                    '<tbody>',
                    visibleRows.map(record => {
                        const slotRaw = Array.isArray(record.slotRaw) ? record.slotRaw : [];
                        const objectSlot = objectTableSlotIndexForAddress(record.address);
                        const flags = liveActorFlagsFromRecord(record);
                        return (
                            '<tr>' +
                            '<td class="mono">' + escapeHtml(objectSlot === null ? '--' : objectSlot) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(record.address)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.spriteId, 2)) + '</td>' +
                            '<td>' + escapeHtml(classifyLiveObjectRecord(record)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.position)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.dimensions)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatLiveActorFlags(flags)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(slotRaw[8], 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatSignedByteTriplet(slotRaw, 9)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(slotRaw[13], 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatByteList(slotRaw.slice(0, 14))) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderDynamicObjectCandidateTable(objectCandidates, backgroundPrefixCount) {
        const maxRows = 64;
        const visibleRows = objectCandidates.slice(0, maxRows);
        const overflowNote = objectCandidates.length > maxRows
            ? '<p class="knight-lore-stage2-note">Showing first '
                + maxRows
                + ' object candidates; '
                + (objectCandidates.length - maxRows)
                + ' additional candidates hidden.</p>'
            : '';

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Dynamic object candidates</strong>',
            '<span>working memory only, background prefix slots excluded: '
                + backgroundPrefixCount
                + ', candidates: '
                + objectCandidates.length
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Rows below come from 0x20-byte dynamic slots after the decoded background prefix. '
                + 'Bytes +0x08..+0x1F are still scanned for experimental object-id candidates '
                + '0x10, 0x1A, 0x1B, and 0x1C.'
                + '</p>',
            objectCandidates.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No non-background dynamic visual records found.</p>'
                : [
                    overflowNote,
                    '<table>',
                    '<thead><tr>',
                    '<th>Slot</th>',
                    '<th>Address</th>',
                    '<th>Sprite</th>',
                    '<th>Class</th>',
                    '<th>Object-id hits</th>',
                    '<th>Position XYZ</th>',
                    '<th>Dim XYZ</th>',
                    '<th>Flags</th>',
                    '<th>Visual bytes</th>',
                    '<th>Full 0x20 slot</th>',
                    '</tr></thead>',
                    '<tbody>',
                    visibleRows.map(record => {
                        const semantic = classifyDynamicObjectRecord(record);
                        const rowClass = semantic.category === 'object'
                            ? ''
                            : ' class="is-special-object is-' + escapeHtml(semantic.category) + '"';
                        return (
                            '<tr' + rowClass + '>' +
                            '<td class="mono">' + record.slotIndex + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(record.address)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.spriteId, 2)) + '</td>' +
                            '<td title="' + escapeHtml(semantic.source) + '">' + escapeHtml(semantic.label) + '</td>' +
                            '<td class="mono" title="' + escapeHtml(semantic.source) + '">'
                                + escapeHtml(formatDynamicObjectIdHits(semantic.objectIdHits))
                                + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.position)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.dimensions)) + '</td>' +
                            '<td class="mono" title="' + escapeHtml(record.flags && record.flags.bits ? record.flags.bits : '') + '">'
                                + escapeHtml(formatHex(record.flags ? record.flags.raw : null, 2))
                                + '</td>' +
                            '<td class="mono">' + escapeHtml(formatByteList(record.raw)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatByteList(record.slotRaw)) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderLiveActorCandidateTable(actorCandidates) {
        const visibleRows = actorCandidates.slice(0, LIVE_ACTOR_MAX_ROWS);
        const overflowNote = actorCandidates.length > LIVE_ACTOR_MAX_ROWS
            ? '<p class="knight-lore-stage2-note">Showing first '
                + LIVE_ACTOR_MAX_ROWS
                + ' live actor candidates; '
                + (actorCandidates.length - LIVE_ACTOR_MAX_ROWS)
                + ' additional candidates hidden.</p>'
            : '';

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Live actor candidates</strong>',
            '<span>ASM object slots; candidates: '
                + actorCandidates.length
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Rows are classified from live working-memory sprite ids. '
                + 'The ASM object table starts at 0x5C08, while the older dynamic diagnostics start at 0x5C88; '
                + 'hflip is bit 6 of slot +7.'
                + '</p>',
            actorCandidates.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No guard, wizard, or ghost sprite candidates found in the live dynamic slots.</p>'
                : [
                    overflowNote,
                    '<table>',
                    '<thead><tr>',
                    '<th>Actor</th>',
                    '<th>Part</th>',
                    '<th>Obj / Dyn slot</th>',
                    '<th>Address</th>',
                    '<th>Sprite</th>',
                    '<th>XYZ</th>',
                    '<th>Dim</th>',
                    '<th>dXYZ</th>',
                    '<th>Flags +7</th>',
                    '<th>Room +8</th>',
                    '<th>Info +13</th>',
                    '<th>Pair</th>',
                    '</tr></thead>',
                    '<tbody>',
                    visibleRows.map(row => {
                        const record = row.record;
                        const slotRaw = Array.isArray(record.slotRaw) ? record.slotRaw : [];
                        const rowClass = row.actor && row.actor !== 'guard/wizard'
                            ? ' class="is-special-object is-' + escapeHtml(row.actor) + '"'
                            : '';
                        const dynamicSlot = Number.isFinite(record.slotIndex)
                            ? record.slotIndex
                            : '--';
                        const objectSlot = Number.isFinite(row.objectSlot)
                            ? row.objectSlot
                            : '--';
                        return (
                            '<tr' + rowClass + '>' +
                            '<td>' + escapeHtml(row.actor || row.classification.actor) + '</td>' +
                            '<td>' + escapeHtml(row.classification.part) + '</td>' +
                            '<td class="mono">' + escapeHtml(objectSlot + ' / ' + dynamicSlot) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRecordAddress(record.address)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(record.spriteId, 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.position)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatRoomSize(record.dimensions)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatSignedByteTriplet(slotRaw, 9)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatLiveActorFlags(row.flags)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(slotRaw[8], 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(formatHex(slotRaw[13], 2)) + '</td>' +
                            '<td class="mono">' + escapeHtml(row.pairLabel) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    currentLiveActorBillboardSelection() {
        const facingScores = this.computePlayerSpriteBillboardFacingScores({camera: this.camera});
        return selectedSpriteBillboardFacingForView(this.activeViewPreset, facingScores);
    }

    renderLiveActorBillboardPolicyTable(room) {
        const specs = liveActorBillboardSpecsForRoom(room);
        const selection = this.currentLiveActorBillboardSelection();
        const selectedFacing = selection.selectedFacing || null;
        const textureEnabled = liveActorTextureEnabledForView(this.activeViewPreset);

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Live actor billboard policy</strong>',
            '<span>view '
                + escapeHtml(this.activeViewPreset)
                + ', selected side '
                + escapeHtml(selectedFacing || '--')
                + ', textures '
                + (textureEnabled ? 'enabled' : 'off')
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Actor facing is derived from +9/+10 signed velocity, then +13 low two bits, then sprite-family side clue. '
                + '+7 bit 6 is combined with actor-specific policy hflip. The game view uses live sprite ids; non-game actor views may remap only the sprite side, preserving each half phase.'
                + '</p>',
            specs.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No live guard/wizard billboards in this room.</p>'
                : [
                    '<table>',
                    '<thead><tr>',
                    '<th>Actor</th>',
                    '<th>Billboard side</th>',
                    '<th>Actor facing</th>',
                    '<th>Relative view</th>',
                    '<th>Lower / upper sprites</th>',
                    '<th>Mirror lower / upper</th>',
                    '<th>Texture side</th>',
                    '<th>Policy fix</th>',
                    '<th>Policy</th>',
                    '</tr></thead>',
                    '<tbody>',
                    specs.map(spec => {
                        const lowerSelectionBase = resolveLiveActorTextureSelection({
                            spec,
                            record: spec.lowerRecord,
                            selectedFacing,
                            viewPreset: this.activeViewPreset,
                        });
                        const topSelectionBase = resolveLiveActorTextureSelection({
                            spec,
                            record: spec.topRecord,
                            selectedFacing,
                            viewPreset: this.activeViewPreset,
                        });
                        const lowerSelectionResult = this.actorSpriteBillboardTextureMaterialForSelection(
                            spec.actor,
                            lowerSelectionBase
                        );
                        const topSelectionResult = this.actorSpriteBillboardTextureMaterialForSelection(
                            spec.actor,
                            topSelectionBase
                        );
                        const lowerSelection = lowerSelectionResult.selection || lowerSelectionBase;
                        const topSelection = topSelectionResult.selection || topSelectionBase;
                        const actorFacing = lowerSelection.actorFacing || topSelection.actorFacing;
                        const relativeView = lowerSelection.relativeView !== 'unknown'
                            ? lowerSelection.relativeView
                            : topSelection.relativeView;
                        return (
                            '<tr>' +
                            '<td>' + escapeHtml(spec.actor || '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(selectedFacing || '--') + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                (actorFacing.facing || '--')
                                + ' / '
                                + actorFacing.source
                                + ' '
                                + actorFacing.detail
                            ) + '</td>' +
                            '<td class="mono">' + escapeHtml(relativeView) + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                formatSpriteMaterialSelection(
                                    lowerSelection.liveSpriteId,
                                    lowerSelection.textureSpriteId
                                )
                                + ' / '
                                + formatSpriteMaterialSelection(
                                    topSelection.liveSpriteId,
                                    topSelection.textureSpriteId
                                )
                            ) + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                (lowerSelection.mirrorTextureX ? 'Y' : 'n')
                                + ' / '
                                + (topSelection.mirrorTextureX ? 'Y' : 'n')
                            ) + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                lowerSelection.textureSide
                                + ' / '
                                + topSelection.textureSide
                            ) + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                'swap '
                                + (lowerSelection.policySwapTextureSide ? 'Y' : 'n')
                                + '/'
                                + (topSelection.policySwapTextureSide ? 'Y' : 'n')
                                + ', hmir '
                                + (lowerSelection.policyFacingMirrorTextureX ? 'Y' : 'n')
                                + '/'
                                + (topSelection.policyFacingMirrorTextureX ? 'Y' : 'n')
                            ) + '</td>' +
                            '<td class="mono">' + escapeHtml(
                                lowerSelection.policy
                                + ' / '
                                + topSelection.policy
                            ) + '</td>' +
                            '</tr>'
                        );
                    }).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
        ].join('');
    }

    renderCollectableItemTable(collectableItems, roomId, resolvedRecords = null) {
        const records = resolvedRecords || (
            collectableItems && collectableItems.currentRoomRecords
                ? collectableItems.currentRoomRecords
                : []
        );
        const totalRecords = collectableItems && collectableItems.records
            ? collectableItems.records.length
            : 0;
        const tableStart = collectableItems ? collectableItems.tableStart : null;
        const tableEnd = collectableItems ? collectableItems.tableEnd : null;
        const source = collectableItems && collectableItems.source
            ? collectableItems.source
            : 'live working memory';
        const rangeLabel = tableStart !== null && tableEnd !== null
            ? formatRecordAddress(tableStart) + '..' + formatRecordAddress(tableEnd - 1)
            : 'not captured';
        const roomLabel = roomId === null || roomId === undefined
            ? 'unknown room'
            : 'room ' + formatHex(roomId, 2);

        return [
            '<div class="knight-lore-stage2-comparison-heading is-secondary">',
            '<strong>Collectable items in current room</strong>',
            '<span>'
                + escapeHtml(source)
                + ', table '
                + escapeHtml(rangeLabel)
                + ', '
                + escapeHtml(roomLabel)
                + ', current-room items: '
                + records.length
                + ', total records: '
                + totalRecords
                + '</span>',
            '</div>',
            '<p class="knight-lore-stage2-note">'
                + 'Live item rendering uses slots at 0x5C48 and 0x5C68. '
                + 'A zero sprite/object byte marks that slot inactive; 0x6FF2 is retained as storage/writeback metadata.'
                + '</p>',
            records.length === 0
                ? '<p class="knight-lore-stage2-note is-warning">No live collectable item currently points to this room.</p>'
                : [
                    '<table>',
                    '<thead><tr>',
                    '<th>Live slot</th>',
                    '<th>Live address</th>',
                    '<th>Storage #</th>',
                    '<th>Storage address</th>',
                    '<th>Live sprite</th>',
                    '<th>Live room</th>',
                    '<th>Live XYZ</th>',
                    '<th>Live source</th>',
                    '<th>Storage room</th>',
                    '<th>Storage XYZ</th>',
                    '<th>Storage raw</th>',
                    '</tr></thead>',
                    '<tbody>',
                    records.map(record => (
                        '<tr>' +
                        '<td class="mono">' + (record.liveSlotIndex !== null && record.liveSlotIndex !== undefined ? record.liveSlotIndex : '--') + '</td>' +
                        '<td class="mono">' + escapeHtml(formatRecordAddress(record.liveSlotAddress)) + '</td>' +
                        '<td class="mono">' + (record.storageRecordIndex !== null && record.storageRecordIndex !== undefined ? record.storageRecordIndex : '--') + '</td>' +
                        '<td class="mono">' + escapeHtml(formatRecordAddress(record.storageRecordAddress)) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatHex(
                            record.spriteId !== null && record.spriteId !== undefined
                                ? record.spriteId
                                : record.graphicId,
                            2
                        )) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatHex(record.liveRoomId, 2)) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatRoomSize(record.livePosition)) + '</td>' +
                        '<td class="mono">' + escapeHtml(record.livePositionSource || '0x6FF2 table') + '</td>' +
                        '<td class="mono">' + escapeHtml(formatHex(record.storageScreen, 2)) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatRoomSize(record.storagePosition)) + '</td>' +
                        '<td class="mono">' + escapeHtml(formatByteList(record.raw)) + '</td>' +
                        '</tr>'
                    )).join(''),
                    '</tbody>',
                    '</table>',
                ].join(''),
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
        if (this.latestFrame) {
            this.updateSpecialDynamicMarkers();
            this.updateObjectWireframes();
            this.updateFull3DObjectModels();
            this.updateLiveActorBillboards();
            this.updatePlayerProxy();
        }
        if (this.lastSpellProbeRows && this.lastSpellProbeRows.length > 0) {
            this.updateSpellMarkerFromProbeRow(this.lastSpellProbeRows[0]);
        }
        this.updateSummary();
        this.syncRenderModeVisibility();
        this.setViewPreset(this.activeViewPreset);
        this.render();
    }

    updateWallTextureDewarpControl() {
        if (this.wallTextureDewarpToggle) {
            this.wallTextureDewarpToggle.checked = this.wallTextureDewarpEnabled;
        }
        if (this.playerSpriteBillboardWireframeToggle) {
            this.playerSpriteBillboardWireframeToggle.checked = this.playerSpriteBillboardWireframeEnabled;
        }
        if (this.wallTextureDewarpControl) {
            this.wallTextureDewarpControl.classList.toggle('is-disabled', !this.wallTextureDewarpEnabled);
        }
    }

    setWallTextureDewarpEnabled(enabled) {
        const nextEnabled = Boolean(enabled);
        if (nextEnabled === this.wallTextureDewarpEnabled) {
            this.updateWallTextureDewarpControl();
            return;
        }

        this.wallTextureDewarpEnabled = nextEnabled;
        this.updateWallTextureDewarpControl();
        this.lastStaticBackgroundSignature = null;
        if (this.latestFrame) this.updateStaticBackgroundGeometry();
        this.updateSummary();
        this.render();
    }

    setPlayerSpriteBillboardWireframeEnabled(enabled) {
        const nextEnabled = Boolean(enabled);
        if (nextEnabled === this.playerSpriteBillboardWireframeEnabled) {
            this.updateWallTextureDewarpControl();
            return;
        }

        this.playerSpriteBillboardWireframeEnabled = nextEnabled;
        this.updateWallTextureDewarpControl();
        if (this.latestFrame) {
            this.updatePlayerProxy();
            this.updateLiveActorBillboards();
        }
        this.updateSummary();
        this.render();
    }

    full3DWallTextureVisibilityVector() {
        const vector = new THREE.Vector3(this.camera.position.x, 0, this.camera.position.z);
        if (vector.lengthSq() <= WALL_TEXTURE_VISIBILITY_EPSILON) {
            return new THREE.Vector3(1, 0, 1).normalize();
        }
        return vector.normalize();
    }

    updateFull3DBackgroundWallTextureVisibility() {
        if (!this.full3DBackgroundGroup) return;

        const cameraSide = this.full3DWallTextureVisibilityVector();
        let total = 0;
        let visible = 0;

        this.full3DBackgroundGroup.traverse(object => {
            const inwardNormal = object.userData ? object.userData.wallTextureInwardNormal : null;
            if (!inwardNormal) return;

            total += 1;
            const dot = inwardNormal.x * cameraSide.x + inwardNormal.z * cameraSide.z;
            const isVisible = dot > WALL_TEXTURE_VISIBILITY_EPSILON;
            object.visible = isVisible;
            object.userData.wallTextureVisibilityDot = dot;
            object.userData.wallTextureVisibilityCameraSide = cameraSide.clone();
            if (isVisible) visible += 1;
        });

        this.lastVisibleWallTextureQuadCount = visible;
        this.lastWallTextureVisibilityQuadCount = total;
    }

    syncRenderModeVisibility() {
        const roomVisible = Boolean(this.roomGeometryVisible);
        const schematicVisible = roomVisible && this.activeRenderMode === 'schematic';
        if (this.directionOverlayElement) {
            this.directionOverlayElement.hidden = !schematicVisible;
        }
        if (this.gridHelper) {
            this.gridHelper.visible = schematicVisible;
        }
        if (this.floorMesh) {
            this.floorMesh.visible = schematicVisible;
        }
        if (this.roomEdges) {
            this.roomEdges.visible = schematicVisible;
        }
        if (this.wallMeshes) {
            this.wallMeshes.forEach(wall => {
                wall.visible = schematicVisible;
            });
        }
        if (this.schematicBackgroundGroup) {
            this.schematicBackgroundGroup.visible = schematicVisible;
        }
        if (this.full3DBackgroundGroup) {
            this.full3DBackgroundGroup.visible = roomVisible && this.activeRenderMode === 'full-3d';
        }
        if (this.objectWireframeGroup) {
            this.objectWireframeGroup.visible = roomVisible && this.activeRenderMode === 'schematic';
        }
        if (this.full3DObjectGroup) {
            this.full3DObjectGroup.visible = roomVisible && this.activeRenderMode === 'full-3d';
        }
        if (this.liveActorBillboardGroup) {
            this.liveActorBillboardGroup.visible = roomVisible && this.activeRenderMode === 'full-3d';
        }
    }

    setViewPreset(id) {
        const preset = VIEW_PRESETS.find(item => item.id === id) || VIEW_PRESETS[0];
        this.activeViewPreset = preset.id;
        this.viewSelect.value = preset.id;

        const target = this.cameraTarget();
        const direction = new THREE.Vector3(...preset.direction).normalize();
        this.camera.position.copy(target).addScaledVector(direction, CAD_CAMERA_DISTANCE);
        this.camera.up.set(...preset.up).normalize();
        this.camera.lookAt(target);
        if (this.latestFrame) this.updatePlayerProxy();
        if (this.latestFrame) this.updateLiveActorBillboards();
        this.updateFull3DBackgroundWallTextureVisibility();
        this.updateWallVisibility();
        this.resize();
        this.render();
    }

    cameraTarget() {
        const targetY = this.activeRenderMode === 'full-3d'
            ? this.roomDimensions.height * FULL_3D_CAMERA_TARGET_HEIGHT_FACTOR
            : this.roomDimensions.height / 2;
        return new THREE.Vector3(0, targetY, 0);
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
        const baseFrustumHeight = Math.max(MIN_CAMERA_FRUSTUM_HEIGHT, radius * CAMERA_FRUSTUM_RADIUS_SCALE);
        const frustumHeight = this.activeRenderMode === 'full-3d'
            ? baseFrustumHeight / FULL_3D_CAMERA_ZOOM
            : baseFrustumHeight;

        this.camera.left = -frustumHeight * aspect / 2;
        this.camera.right = frustumHeight * aspect / 2;
        this.camera.top = frustumHeight / 2;
        this.camera.bottom = -frustumHeight / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.updateDirectionOverlayLabels();
    }

    render() {
        this.updateDirectionOverlayLabels();
        this.renderer.render(this.scene, this.camera);
    }

    updateDirectionOverlayLabels() {
        if (!this.directionLabelElements || !this.canvasHost) return;
        const width = this.canvasHost.clientWidth || 0;
        const height = this.canvasHost.clientHeight || 0;
        if (!width || !height) return;

        const dimensions = this.roomDimensions;
        const y = 1;
        const anchors = {
            north: new THREE.Vector3(0, y, -dimensions.depth / 2),
            south: new THREE.Vector3(0, y, dimensions.depth / 2),
            east: new THREE.Vector3(dimensions.width / 2, y, 0),
            west: new THREE.Vector3(-dimensions.width / 2, y, 0),
        };

        this.directionLabelElements.forEach((element, side) => {
            const projected = anchors[side].clone().project(this.camera);
            const x = THREE.MathUtils.clamp(
                (projected.x * 0.5 + 0.5) * width,
                DIRECTION_LABEL_EDGE_INSET,
                width - DIRECTION_LABEL_EDGE_INSET
            );
            const top = THREE.MathUtils.clamp(
                (-projected.y * 0.5 + 0.5) * height,
                DIRECTION_LABEL_EDGE_INSET,
                height - DIRECTION_LABEL_EDGE_INSET
            );
            element.style.left = x + 'px';
            element.style.top = top + 'px';
        });
    }

    dispose() {
        window.removeEventListener('resize', this.handleResize);
        this.floorMesh.geometry.dispose();
        this.floorMaterial.dispose();
        this.gridHelper.geometry.dispose();
        this.gridHelper.material.dispose();
        this.axesHelper.geometry.dispose();
        this.axesHelper.material.dispose();
        this.wallMeshes.forEach(wall => {
            wall.geometry.dispose();
        });
        this.wallMaterial.dispose();
        this.viewerWallMaterial.dispose();
        this.clearStaticBackgroundGeometry();
        this.clearSpecialDynamicMarkers();
        this.clearObjectWireframes();
        this.objectWireframeMaterial.dispose();
        this.specialObjectWireframeMaterials.forEach(material => {
            material.dispose();
        });
        this.clearFull3DObjectModels();
        this.clearCollectableItemMarkers();
        this.collectableItemGeometry.dispose();
        this.collectableItemMaterials.forEach(material => {
            material.dispose();
        });
        this.collectableItemFallbackMaterial.dispose();
        this.clearSpellMarkerModel();
        this.spellMarkerGeometry.dispose();
        this.spellCycleMaterial.dispose();
        this.spellAttackMaterial.dispose();
        this.spellItemDisplayMaterial.dispose();
        this.playerBodyMesh.geometry.dispose();
        this.playerHeadMesh.geometry.dispose();
        this.playerPointerMesh.geometry.dispose();
        this.playerTopBottomMarkerDisk.geometry.dispose();
        this.playerTopBottomMarkerArrow.geometry.dispose();
        this.playerTopBottomMarkerDiskMaterial.dispose();
        this.playerTopBottomMarkerArrowMaterial.dispose();
        this.liveActorBillboardGeometry.dispose();
        this.liveActorBillboardPlaneGeometry.dispose();
        this.liveActorBillboardMaterials.forEach(material => {
            material.dispose();
        });
        this.liveActorTopBottomMarkerDiskGeometry.dispose();
        this.liveActorTopBottomMarkerArrowGeometry.dispose();
        this.liveActorTopBottomMarkerMaterials.forEach(material => {
            material.dispose();
        });
        this.liveActorTopBottomMarkerArrowMaterial.dispose();
        this.playerSpriteBillboardGeometry.dispose();
        this.playerSpriteBillboardPlaneGeometry.dispose();
        this.playerSpriteBillboardFullGeometry.dispose();
        this.playerSpriteBillboardFullPlaneGeometry.dispose();
        this.playerSpriteBillboardMaterials.forEach(material => {
            material.dispose();
        });
        this.playerSpriteBillboardFallbackTextureMaterial.dispose();
        this.clearPlayerSpriteBillboardTextureMaterials();
        this.clearActorSpriteBillboardTextureMaterials();
        this.playerHumanMaterial.dispose();
        this.playerWolfMaterial.dispose();
        this.playerUnknownMaterial.dispose();
        this.playerPointerMaterial.dispose();
        this.playerPointerFallbackMaterial.dispose();
        this.roomEdges.geometry.dispose();
        this.roomEdges.material.dispose();
        this.pruneSpriteTexturePreviewCache(new Set());
        if (this.full3DBackgroundRenderer) this.full3DBackgroundRenderer.dispose();
        this.renderer.dispose();
        if (this.diagnosticsContainer) {
            this.summaryElement.remove();
            this.comparisonElement.remove();
        }
        this.container.innerHTML = '';
    }
}
