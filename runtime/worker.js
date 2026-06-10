import { FRAME_BUFFER_SIZE } from './constants.js';
import { TAPFile, TZXFile } from './tape.js';

let core = null;
let memory = null;
let memoryData = null;
let workerFrameData = null;
let registerPairs = null;
let tapePulses = null;

let stopped = false;
let tape = null;
let tapeIsPlaying = false;
let knightLoreStaticMemory = null;
let configuredPokes = [];

const SEMANTIC_MEMORY_START = 0x5ba0;
const SEMANTIC_MEMORY_END = 0x6108;
const KNIGHT_LORE_ITEM_MEMORY_START = 0x6ff2;
const KNIGHT_LORE_ITEM_MEMORY_END = 0x7112;
const KNIGHT_LORE_STATIC_MEMORY_START = 0x6248;
const KNIGHT_LORE_STATIC_MEMORY_END = 0xaf6c;
const KNIGHT_LORE_STATIC_RANGES = {
    roomSizes: {start: 0x6248, end: 0x6251},
    locations: {start: 0x6251, end: 0x6bd1},
    blockTypeOffsets: {start: 0x6bd1, end: 0x6c0b},
    blockTypeData: {start: 0x6c0b, end: 0x6ce2},
    backgroundTypeOffsets: {start: 0x6ce2, end: 0x6d12},
    backgroundTypeData: {start: 0x6d12, end: 0x6f2f},
    staticObjects: {start: 0x6ff2, end: 0x7112},
    spriteOffsets: {start: 0x7112, end: 0x728a},
    spriteData: {start: 0x728a, end: 0xaf6c},
};

const loadCore = (baseUrl) => {
    WebAssembly.instantiateStreaming(
        fetch(new URL('jsspeccy-core.wasm', baseUrl), {})
    ).then(results => {
        core = results.instance.exports;
        memory = core.memory;
        memoryData = new Uint8Array(memory.buffer);
        workerFrameData = memoryData.subarray(core.FRAME_BUFFER, FRAME_BUFFER_SIZE);
        registerPairs = new Uint16Array(core.memory.buffer, core.REGISTERS, 12);
        tapePulses = new Uint16Array(core.memory.buffer, core.TAPE_PULSES, core.TAPE_PULSES_LENGTH);

        postMessage({
            'message': 'ready',
        });
    });
}

const loadMemoryPage = (page, data) => {
    memoryData.set(data, core.MACHINE_MEMORY + page * 0x4000);
    knightLoreStaticMemory = null;
};

const applyPokes = (pokes) => {
    const results = [];
    if (!Array.isArray(pokes) || !core) return results;

    for (const poke of pokes) {
        const address = Number(poke && poke.address);
        const value = Number(poke && poke.value);
        const label = poke && poke.label ? String(poke.label) : '';
        const sourceAddress = Number(poke && poke.sourceAddress);
        const addressBase = Number(poke && poke.addressBase);
        if (!Number.isFinite(address) || !Number.isFinite(value)) {
            results.push({
                address: null,
                value: null,
                label,
                sourceAddress: Number.isFinite(sourceAddress) ? sourceAddress & 0xffff : null,
                addressBase: Number.isFinite(addressBase) ? addressBase & 0xffff : null,
                applied: false,
                error: 'invalid address or value',
            });
            continue;
        }

        const normalizedAddress = address & 0xffff;
        const normalizedValue = value & 0xff;
        const before = core.peek(normalizedAddress);
        core.poke(normalizedAddress, normalizedValue);
        const after = core.peek(normalizedAddress);
        results.push({
            address: normalizedAddress,
            value: normalizedValue,
            label,
            sourceAddress: Number.isFinite(sourceAddress) ? sourceAddress & 0xffff : normalizedAddress,
            addressBase: Number.isFinite(addressBase) ? addressBase & 0xffff : 0,
            before,
            after,
            applied: true,
            readbackMatches: after === normalizedValue,
        });
    }

    if (results.length > 0) {
        knightLoreStaticMemory = captureKnightLoreStaticMemory();
    }

    return results;
};

const loadSnapshot = (snapshot, pokes) => {
    core.setMachineType(snapshot.model);
    for (let page in snapshot.memoryPages) {
        loadMemoryPage(page, snapshot.memoryPages[page]);
    }
    ['AF', 'BC', 'DE', 'HL', 'AF_', 'BC_', 'DE_', 'HL_', 'IX', 'IY', 'SP', 'IR'].forEach(
        (r, i) => {
            registerPairs[i] = snapshot.registers[r];
        }
    )
    core.setPC(snapshot.registers.PC);
    core.setIFF1(snapshot.registers.iff1);
    core.setIFF2(snapshot.registers.iff2);
    core.setIM(snapshot.registers.im);
    core.setHalted(!!snapshot.halted);

    core.writePort(0x00fe, snapshot.ulaState.borderColour);
    if (snapshot.model != 48) {
        core.writePort(0x7ffd, snapshot.ulaState.pagingFlags);
    }

    core.setTStates(snapshot.tstates);
    const pokeResults = applyPokes(pokes);
    knightLoreStaticMemory = captureKnightLoreStaticMemory();
    return pokeResults;
};

const captureMemoryRange = (start, end) => {
    const range = new Uint8Array(end - start);
    for (let addr = start; addr < end; addr++) {
        range[addr - start] = core.peek(addr);
    }
    return range;
};

const captureKnightLoreStaticMemory = () => ({
    memoryStart: KNIGHT_LORE_STATIC_MEMORY_START,
    memoryEnd: KNIGHT_LORE_STATIC_MEMORY_END,
    byteLength: KNIGHT_LORE_STATIC_MEMORY_END - KNIGHT_LORE_STATIC_MEMORY_START,
    staticMemory: captureMemoryRange(KNIGHT_LORE_STATIC_MEMORY_START, KNIGHT_LORE_STATIC_MEMORY_END),
    ranges: KNIGHT_LORE_STATIC_RANGES,
});

const captureSemanticFrame = () => {
    return {
        memoryStart: SEMANTIC_MEMORY_START,
        memoryEnd: SEMANTIC_MEMORY_END,
        semanticMemory: captureMemoryRange(SEMANTIC_MEMORY_START, SEMANTIC_MEMORY_END),
        itemMemoryStart: KNIGHT_LORE_ITEM_MEMORY_START,
        itemMemoryEnd: KNIGHT_LORE_ITEM_MEMORY_END,
        itemMemory: captureMemoryRange(KNIGHT_LORE_ITEM_MEMORY_START, KNIGHT_LORE_ITEM_MEMORY_END),
        registers: Array.from(registerPairs),
        pc: core.getPC(),
        tstates: core.getTStates(),
        iff1: core.getIFF1(),
        iff2: core.getIFF2(),
        im: core.getIM(),
        halted: core.getHalted(),
    };
};

const trapTapeLoad = () => {
    if (!tape) return;
    const block = tape.getNextLoadableBlock();
    if (!block) return;

    /* get expected block type and load vs verify flag from AF' */
    const af_ = registerPairs[4];
    const expectedBlockType = af_ >> 8;
    const shouldLoad = af_ & 0x0001;  // LOAD rather than VERIFY
    let addr = registerPairs[8];  /* IX */
    const requestedLength = registerPairs[2];  /* DE */
    const actualBlockType = block[0];

    let success = true;
    if (expectedBlockType != actualBlockType) {
        success = false;
    } else {
        if (shouldLoad) {
            let offset = 1;
            let loadedBytes = 0;
            let checksum = actualBlockType;
            while (loadedBytes < requestedLength) {
                if (offset >= block.length) {
                    /* have run out of bytes to load */
                    success = false;
                    break;
                }
                const byte = block[offset++];
                loadedBytes++;
                core.poke(addr, byte);
                addr = (addr + 1) & 0xffff;
                checksum ^= byte;
            }

            // if loading is going right, we should still have a checksum byte left to read
            success &= (offset < block.length);
            if (success) {
                const expectedChecksum = block[offset];
                success = (checksum === expectedChecksum);
            }
        } else {
            // VERIFY. TODO: actually verify.
            success = true;
        }
    }

    if (success) {
        /* set carry to indicate success */
        registerPairs[0] |= 0x0001;
        const pokeResults = applyPokes(configuredPokes);
        if (pokeResults.length > 0) {
            postMessage({
                message: 'pokesApplied',
                id: null,
                reason: 'tape trap load',
                pokeResults,
                knightLoreStaticMemory,
            });
        }
    } else {
        /* reset carry to indicate failure */
        registerPairs[0] &= 0xfffe;
    }
    core.setPC(0x05e2);  /* address at which to exit the tape trap */
}

onmessage = (e) => {
    switch (e.data.message) {
        case 'loadCore':
            loadCore(e.data.baseUrl);
            break;
        case 'runFrame':
            if (stopped) return;
            const frameBuffer = e.data.frameBuffer;
            const frameData = new Uint8Array(frameBuffer);

            let audioBufferLeft = null;
            let audioBufferRight = null;
            let audioLength = 0;
            if ('audioBufferLeft' in e.data) {
                audioBufferLeft = e.data.audioBufferLeft;
                audioBufferRight = e.data.audioBufferRight;
                audioLength = audioBufferLeft.byteLength / 4;
                core.setAudioSamplesPerFrame(audioLength);
            } else {
                core.setAudioSamplesPerFrame(0);
            }

            if (tape && tapeIsPlaying) {
                const tapePulseBufferTstateCount = core.getTapePulseBufferTstateCount();
                const tapePulseWriteIndex = core.getTapePulseWriteIndex();
                const [newTapePulseWriteIndex, tstatesGenerated, tapeFinished] = tape.pulseGenerator.emitPulses(
                    tapePulses, tapePulseWriteIndex, 80000 - tapePulseBufferTstateCount
                );
                core.setTapePulseBufferState(newTapePulseWriteIndex, tapePulseBufferTstateCount + tstatesGenerated);
                if (tapeFinished) {
                    tapeIsPlaying = false;
                    postMessage({
                        message: 'stoppedTape',
                    });
                }
            }

            let status = core.runFrame();
            while (status) {
                switch (status) {
                    case 1:
                        stopped = true;
                        throw("Unrecognised opcode!");
                    case 2:
                        trapTapeLoad();
                        break;
                    default:
                        stopped = true;
                        throw("runFrame returned unexpected result: " + status);
                }

                status = core.resumeFrame();
            }

            frameData.set(workerFrameData);
            const semanticFrame = captureSemanticFrame();
            const semanticTransferBuffers = [
                semanticFrame.semanticMemory.buffer,
                semanticFrame.itemMemory.buffer,
            ];
            if (audioLength) {
                const leftSource = new Float32Array(core.memory.buffer, core.AUDIO_BUFFER_LEFT, audioLength);
                const rightSource = new Float32Array(core.memory.buffer, core.AUDIO_BUFFER_RIGHT, audioLength);
                const leftData = new Float32Array(audioBufferLeft);
                const rightData = new Float32Array(audioBufferRight);
                leftData.set(leftSource);
                rightData.set(rightSource);
                postMessage({
                    message: 'frameCompleted',
                    frameBuffer,
                    audioBufferLeft,
                    audioBufferRight,
                    semanticFrame,
                }, [
                    frameBuffer,
                    audioBufferLeft,
                    audioBufferRight,
                    ...semanticTransferBuffers,
                ]);
            } else {
                postMessage({
                    message: 'frameCompleted',
                    frameBuffer,
                    semanticFrame,
                }, [frameBuffer, ...semanticTransferBuffers]);
            }

            break;
        case 'keyDown':
            core.keyDown(e.data.row, e.data.mask);
            break;
        case 'keyUp':
            core.keyUp(e.data.row, e.data.mask);
            break;
        case 'setMachineType':
            core.setMachineType(e.data.type);
            break;
        case 'reset':
            core.reset();
            knightLoreStaticMemory = null;
            break;
        case 'loadMemory':
            loadMemoryPage(e.data.page, e.data.data);
            break;
        case 'loadSnapshot':
            configuredPokes = Array.isArray(e.data.pokes) ? e.data.pokes : [];
            const pokeResults = loadSnapshot(e.data.snapshot, e.data.pokes);
            postMessage({
                message: 'fileOpened',
                id: e.data.id,
                mediaType: 'snapshot',
                knightLoreStaticMemory,
                pokeResults,
            });
            break;
        case 'applyPokes':
            const appliedPokeResults = applyPokes(e.data.pokes);
            postMessage({
                message: 'pokesApplied',
                id: e.data.id,
                pokeResults: appliedPokeResults,
                knightLoreStaticMemory,
            });
            break;
        case 'openTAPFile':
            configuredPokes = Array.isArray(e.data.pokes) ? e.data.pokes : configuredPokes;
            tape = new TAPFile(e.data.data);
            tapeIsPlaying = false;
            postMessage({
                message: 'fileOpened',
                id: e.data.id,
                mediaType: 'tape',
            });
            break;
        case 'openTZXFile':
            configuredPokes = Array.isArray(e.data.pokes) ? e.data.pokes : configuredPokes;
            tape = new TZXFile(e.data.data);
            tapeIsPlaying = false;
            postMessage({
                message: 'fileOpened',
                id: e.data.id,
                mediaType: 'tape',
            });
            break;
        
        case 'playTape':
            if (tape && !tapeIsPlaying) {
                tapeIsPlaying = true;
                postMessage({
                    message: 'playingTape',
                });
            }
            break;
        case 'stopTape':
            if (tape && tapeIsPlaying) {
                tapeIsPlaying = false;
                postMessage({
                    message: 'stoppedTape',
                });
            }
            break;
        case 'setTapeTraps':
            core.setTapeTraps(e.data.value);
            break;
        default:
            console.log('message received by worker:', e.data);
    }
};
