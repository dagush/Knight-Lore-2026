import * as THREE from 'three';
import {
    BASIC_BLOCK_GAME_SIZE,
    blockUnitsToSceneSize,
    createFull3DObjectModel,
    createRicardArchModel,
    disposeFull3DObjectModel,
} from './knightlore-full3d-objects.js';

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
const PLAYER_PROXY_BLOCK_UNITS = {x: 0.88, y: 0.88, z: 1.84};
const PLAYER_BODY_SIZE = blockUnitsToSceneSize({x: 0.72, y: 0.78, z: 1.18});
const PLAYER_HEAD_SIZE = blockUnitsToSceneSize({x: 0.56, y: 0.6, z: 0.52});
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
const ITEM_MARKER_SIZE = 5;
const SPELL_MARKER_SIZE = 6;
const CAULDRON_ROOM_ID = 0x88;
const KNIGHT_LORE_SCRATCH_START = 0x5ba0;
const KNIGHT_LORE_DYNAMIC_ROOM_START = 0x5c88;
const KNIGHT_LORE_DYNAMIC_VISUAL_SLOT_SIZE = 0x20;
const SPELL_PROBE_ADDRESS = 0x5c68;
const SPELL_CYCLE_VALUES = [0xa0, 0xa1, 0xa2, 0xa3];
const SPELL_ATTACK_VALUES = [0xa4, 0xa5, 0xa6, 0xa7];
const SPELL_ITEM_DISPLAY_VALUES = [0xae];
const SPELL_OBSERVED_VALUES = [...SPELL_CYCLE_VALUES, ...SPELL_ATTACK_VALUES, ...SPELL_ITEM_DISPLAY_VALUES];
const SPELL_OBSERVED_VALUE_SET = new Set(SPELL_OBSERVED_VALUES);
const SPELL_PROBE_WINDOW_BEFORE = 8;
const SPELL_PROBE_WINDOW_AFTER = 15;
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
    wizard: 0xa855f7,
};
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
const PORTCULLIS_PANEL_SIZE = blockUnitsToSceneSize({x: 2, y: 0.1, z: 2});
const PORTCULLIS_BAR_WIDTH = blockUnitsToSceneSize({x: 0.1, y: 0.1, z: 0.1}).width;

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
    {id: 'full-3d', label: 'Full 3D'},
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

function formatSceneVector(vector) {
    if (!vector) return '--, --, --';
    return [
        Number.isFinite(vector.x) ? vector.x.toFixed(1) : '--',
        Number.isFinite(vector.y) ? vector.y.toFixed(1) : '--',
        Number.isFinite(vector.z) ? vector.z.toFixed(1) : '--',
    ].join(', ');
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

function formatByteList(bytes) {
    if (!bytes || bytes.length === 0) return '--';
    return bytes.map(value => formatHex(value, 2)).join(' ');
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

function fixedBackgroundMarker(background) {
    return FIXED_BACKGROUND_MARKERS[background.id] || {
        label: background.label || 'fixed background',
        color: backgroundDebugColor(background),
        opacity: 0.72,
        fallbackSize: {width: 9, height: 12, depth: 9},
    };
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
        this.lastRoomColorAttribute = null;
        this.roomColourProbeRoomId = null;
        this.previousRoomColourProbe = null;
        this.lastRoomColourProbe = null;
        this.lastRoomColourProbeChange = null;
        this.lastSpecialDynamicMarkers = [];
        this.lastResolvedCollectableItemRecords = [];
        this.lastFull3DObjectCount = 0;
        this.lastFull3DRecognizedObjectCount = 0;
        this.spellProbeRoomId = null;
        this.lastSpellProbeRows = [];
        this.lastSpellProbeTotalHits = 0;
        this.lastSpellProbeChangedHits = 0;
        this.lastSpellProbeValueCounts = new Map();
        this.previousSpellProbeWindows = new Map();
        this.roomDimensions = {...DEFAULT_ROOM_DIMENSIONS};
        this.activeViewPreset = 'game';
        this.activeRenderMode = 'full-3d';
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
        this.scene.background = new THREE.Color(0x1b2026);

        this.camera = new THREE.OrthographicCamera(-5, 5, 3.75, -3.75, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setClearColor(0x1b2026, 1);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.canvasHost.appendChild(this.renderer.domElement);
        this.canvasHost.appendChild(this.directionOverlayElement);

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
        this.scene.add(this.staticBackgroundGroup);

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
        this.playerGroup.add(this.playerBodyMesh);
        this.playerGroup.add(this.playerHeadMesh);
        this.playerGroup.add(this.playerPointerGroup);
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
        this.updateCollectableItemMarkers();
        this.updatePlayerProxy();
        this.updateSpellMovementProbe();
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
            this.clearCollectableItemMarkers();
            this.lastStaticBackgroundSignature = '';
            this.lastRoomSignature = '';
            this.lastRoomColorAttribute = null;
            this.lastFull3DObjectCount = 0;
            this.lastFull3DRecognizedObjectCount = 0;
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
        if (this.gridHelper) this.gridHelper.visible = visible;
        if (this.axesHelper) this.axesHelper.visible = visible;
        if (this.floorMesh) this.floorMesh.visible = visible;
        if (this.roomEdges) this.roomEdges.visible = visible;
        if (this.staticBackgroundGroup) this.staticBackgroundGroup.visible = visible;
        if (this.specialDynamicGroup) this.specialDynamicGroup.visible = visible;
        if (this.objectWireframeGroup) this.objectWireframeGroup.visible = visible;
        if (this.full3DObjectGroup) this.full3DObjectGroup.visible = visible;
        if (this.collectableItemGroup) this.collectableItemGroup.visible = visible;
        if (this.spellMarkerGroup) this.spellMarkerGroup.visible = visible && this.spellMarkerMesh.visible;
        if (this.directionOverlayElement) {
            this.directionOverlayElement.hidden = !visible;
        }
        if (this.wallMeshes) {
            this.wallMeshes.forEach(wall => {
                wall.visible = visible;
            });
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

        const candidates = dynamicObjectCandidatesForRoom(room)
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

    updateSpellMarkerFromProbeRow(row) {
        if (!this.spellMarkerGroup || !this.spellMarkerMesh) return;

        if (!row || !row.observedThisFrame || !isFinitePosition(row.candidatePosition)) {
            this.spellMarkerMesh.visible = false;
            this.spellMarkerGroup.visible = false;
            return;
        }

        const position = mapKnightLoreHighResolutionPositionToScene(row.candidatePosition);
        if (!position) {
            this.spellMarkerMesh.visible = false;
            this.spellMarkerGroup.visible = false;
            return;
        }

        this.spellMarkerMesh.material = row.observedKind === 'wolf attack'
            ? this.spellAttackMaterial
            : (
                row.observedKind === 'item display?'
                    ? this.spellItemDisplayMaterial
                    : this.spellCycleMaterial
            );
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
        if (!withBars) {
            const arch = createRicardArchModel({
                color,
                opacity: background.category === 'tree-arch' ? 0.88 : 0.9,
                outline: true,
            });
            arch.userData.backgroundId = background.id;
            arch.userData.backgroundCategory = background.category;
            group.add(arch);
            this.staticBackgroundGroup.add(group);
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

        if (background.category === 'high-arch-base') {
            const base = this.createDebugBox(openingWidth + thickness, thickness, depth, color, 0.74);
            base.position.set(0, thickness / 2, 0);
            group.add(base);
        }

        if (withBars) {
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
        }

        this.staticBackgroundGroup.add(group);
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
                : mapKnightLorePositionToScene(record.position, this.roomDimensions);
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
            if (forceRoomCenter) {
                recordMesh.userData.cauldronPlacement = 'room-center';
            }
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
            if (forceRoomCenter) {
                fallbackMarker.userData.cauldronPlacement = 'room-center';
            }
            group.add(fallbackMarker);
        }

        group.userData.backgroundId = background.id;
        group.userData.backgroundLabel = markerInfo.label;
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
                if (!LIVE_FIXED_BACKGROUND_IDS.has(background.id)) {
                    this.addFixedBackgroundMarker(background, index);
                }
                break;
            default:
                this.addSidePatch(background, index);
                break;
        }
    }

    updatePlayerProxy() {
        const scene = this.latestFrame && this.latestFrame.knightLoreScene;
        const player = scene ? scene.player : null;
        if (!player || !isFinitePosition(player.body)) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            return;
        }
        const room = scene ? scene.room : null;
        if (!room || room.id === null || room.id === undefined) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            return;
        }
        const orientation = player.orientation || {};
        if (!orientation.visualFacing) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
            return;
        }

        const body = mapKnightLorePositionToScene(player.body, this.roomDimensions);
        if (!body) {
            this.playerGroup.visible = false;
            this.playerProxyInfo = null;
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
        this.playerBodyMesh.material = playerStateMaterial;
        this.playerHeadMesh.material = playerStateMaterial;
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
            'Full 3D basic block game XYZ: ' + [
                BASIC_BLOCK_GAME_SIZE.x,
                BASIC_BLOCK_GAME_SIZE.y,
                BASIC_BLOCK_GAME_SIZE.z,
            ].join(', '),
            'Full 3D object proxies: ' + this.lastFull3DRecognizedObjectCount
                + '/' + this.lastFull3DObjectCount
                + ' recognized',
            'Player proxy block XYZ: ' + [
                PLAYER_PROXY_BLOCK_UNITS.x,
                PLAYER_PROXY_BLOCK_UNITS.y,
                PLAYER_PROXY_BLOCK_UNITS.z,
            ].join(', '),
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
        const objectTable = this.renderDynamicObjectCandidateTable(objectCandidates, backgroundPrefixCount);
        const collectableItems = room && room.collectableItems ? room.collectableItems : null;
        const resolvedItemRecords = room ? this.lastResolvedCollectableItemRecords : [];
        const itemTable = this.renderCollectableItemTable(
            collectableItems,
            room ? room.id : null,
            resolvedItemRecords
        );

        if (!comparison || !staticLocation || staticLocation.error) {
            this.comparisonElement.innerHTML = [
                '<p class="knight-lore-stage2-note is-warning">Background comparison unavailable.</p>',
                objectTable,
                itemTable,
            ].join('');
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
            objectTable,
            itemTable,
        ].join('');
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
                + 'Diagnostic only: reads 0x5C68 every frame. Values 0xA0..0xA3 are the spell cycle, '
                + '0xA4..0xA7 are wolf attack, and 0xAE is tracked as a possible item-display state.'
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
            this.updateObjectWireframes();
            this.updateFull3DObjectModels();
        }
        this.updateSummary();
        this.syncRenderModeVisibility();
        this.render();
    }

    syncRenderModeVisibility() {
        const roomVisible = Boolean(this.floorMesh && this.floorMesh.visible);
        if (this.objectWireframeGroup) {
            this.objectWireframeGroup.visible = roomVisible && this.activeRenderMode === 'schematic';
        }
        if (this.full3DObjectGroup) {
            this.full3DObjectGroup.visible = roomVisible && this.activeRenderMode === 'full-3d';
        }
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
        this.spellMarkerGeometry.dispose();
        this.spellCycleMaterial.dispose();
        this.spellAttackMaterial.dispose();
        this.spellItemDisplayMaterial.dispose();
        this.playerBodyMesh.geometry.dispose();
        this.playerHeadMesh.geometry.dispose();
        this.playerPointerMesh.geometry.dispose();
        this.playerHumanMaterial.dispose();
        this.playerWolfMaterial.dispose();
        this.playerUnknownMaterial.dispose();
        this.playerPointerMaterial.dispose();
        this.playerPointerFallbackMaterial.dispose();
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
