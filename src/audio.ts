import * as Tone from "tone";
import type { LaneId } from "./types";

// ── Transport & master gain ───────────────────────────────────────────────────

const transport = Tone.getTransport();
transport.bpm.value = 120;
transport.timeSignature = 4;
transport.loop = true;
transport.loopEnd = "2m";

Tone.getDestination().volume.value = -6;

// All audio routes through this gain node.  Starts at 0 (silent) and is
// ramped to 1 when the host starts audio, back to 0 when stopped.
const masterGain = new Tone.Gain(0).toDestination();

// ── Sequence helpers ──────────────────────────────────────────────────────────
//
// FIX (retrigger): sequences are created once and started immediately at
// transport position 0.  Activating / deactivating a slot only flips an
// `active` flag inside the callback — no stop/start of the sequence itself,
// so there is no re-schedule edge case.

interface ClipPlayer {
  start(): void; // set active
  stop(): void;  // set inactive
}

function noteSeq(
  synth: { triggerAttackRelease(note: string, dur: string, time: number): unknown },
  steps: (string | null)[],
  sub: string,
  dur: string,
): ClipPlayer {
  let active = false;
  const s = new Tone.Sequence<string | null>(
    (time, note) => { if (note && active) synth.triggerAttackRelease(note, dur, time); },
    steps,
    sub,
  );
  s.start(0);
  return { start: () => { active = true; }, stop: () => { active = false; } };
}

function noiseSeq(
  synth: { triggerAttackRelease(dur: string, time: number): unknown },
  steps: (string | null)[],
  sub: string,
  dur: string,
): ClipPlayer {
  let active = false;
  const s = new Tone.Sequence<string | null>(
    (time, v) => { if (v && active) synth.triggerAttackRelease(dur, time); },
    steps,
    sub,
  );
  s.start(0);
  return { start: () => { active = true; }, stop: () => { active = false; } };
}

// Continuous noise source (FX lane): lazily started, muted via a gain node.
function noiseSource(
  builder: () => { source: Tone.Noise; slotGain: Tone.Gain },
): ClipPlayer {
  let initialized = false;
  let slotGain: Tone.Gain | null = null;
  return {
    start: () => {
      if (!initialized) {
        const built = builder();
        slotGain = built.slotGain;
        built.source.start();
        initialized = true;
      }
      slotGain!.gain.rampTo(1, 0.05);
    },
    stop: () => {
      slotGain?.gain.rampTo(0, 0.05);
    },
  };
}

// ── Drums ─────────────────────────────────────────────────────────────────────

function buildDrumClips(): ClipPlayer[] {
  const kick = noteSeq(
    new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5, volume: -6 }).connect(masterGain),
    ["C2",null,null,null,"C2",null,null,null,"C2",null,null,null,"C2",null,null,null,
     "C2",null,null,null,"C2",null,null,null,"C2",null,null,null,"C2",null,"C2",null],
    "16n", "8n",
  );

  const snare = noiseSeq(
    new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      volume: -12,
    }).connect(masterGain),
    [null,null,null,null,"x",null,null,null,null,null,null,null,"x",null,null,null,
     null,null,null,null,"x",null,null,null,null,null,null,null,"x",null,null,null],
    "16n", "8n",
  );

  const closedHat = noteSeq(
    new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      volume: -18,
    }).connect(masterGain),
    ["G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4","G4"],
    "8n", "32n",
  );

  const openHat = noteSeq(
    new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      volume: -20,
    }).connect(masterGain),
    [null,"G4",null,"G4",null,"G4",null,"G4",null,"G4",null,"G4",null,"G4",null,"G4"],
    "8n", "16n",
  );

  const clap = noiseSeq(
    new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: -14,
    }).connect(masterGain),
    [null,null,null,null,"x",null,null,"x",null,null,null,null,"x",null,null,"x",
     null,null,null,null,"x",null,null,"x",null,null,null,null,"x",null,"x",null],
    "16n", "8n",
  );

  const tom = noteSeq(
    new Tone.MembraneSynth({
      pitchDecay: 0.08, octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
      volume: -10,
    }).connect(masterGain),
    [null,null,null,null,null,null,null,null,"A2",null,"G2",null,null,null,null,null,
     null,null,null,null,null,null,null,null,"A2",null,"G2",null,"A2",null,null,null],
    "16n", "8n",
  );

  const ride = noteSeq(
    new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
      harmonicity: 4.1, modulationIndex: 16, resonance: 3200, octaves: 1.5,
      volume: -22,
    }).connect(masterGain),
    ["B3",null,"B3",null,"B3",null,"B3",null,"B3",null,"B3",null,"B3",null,"B3",null],
    "8n", "16n",
  );

  const perc = noiseSeq(
    new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      volume: -16,
    }).connect(masterGain),
    ["x",null,"x",null,"x","x",null,null,"x",null,"x",null,"x","x",null,null,
     "x",null,"x",null,"x","x",null,null,"x",null,"x",null,"x",null,"x",null],
    "16n", "8n",
  );

  return [kick, snare, closedHat, openHat, clap, tom, ride, perc];
}

// ── Bass ──────────────────────────────────────────────────────────────────────

function makeBassSynth(volume: number): Tone.MonoSynth {
  return new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 },
    filterEnvelope: {
      attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.2,
      baseFrequency: 200, octaves: 3,
    },
    volume,
  }).connect(masterGain);
}

function buildBassClips(): ClipPlayer[] {
  const sub = noteSeq(makeBassSynth(-14),
    ["A1",null,null,null,null,null,null,null,"A1",null,null,null,null,null,null,null,
     "A1",null,null,null,null,null,null,null,"A1",null,null,null,null,null,null,null],
    "16n", "4n");

  const groove = noteSeq(makeBassSynth(-16),
    ["A2",null,"A2","C3",null,"A2",null,"C3","A2",null,"G2",null,"A2","G2",null,"E2",
     "A2",null,"A2","C3",null,"A2",null,"E3","D3",null,"C3",null,"A2",null,null,null],
    "16n", "16n");

  const octave = noteSeq(makeBassSynth(-15),
    ["A1",null,null,null,"A2",null,null,null,"A1",null,null,null,"A2",null,"E2",null,
     "A1",null,null,null,"A2",null,null,null,"A1",null,null,"G1","A1",null,null,null],
    "16n", "8n");

  const walk = noteSeq(makeBassSynth(-16),
    ["A2","C3","D3","E3","G3","E3","D3","C3","A2","C3","D3","E3","G3","E3","C3","A2",
     "A2","C3","D3","E3","G3","E3","D3","C3","D3","E3","G3","A3","G3","E3","D3","C3"],
    "16n", "16n");

  const stepdown = noteSeq(makeBassSynth(-16),
    ["A2",null,null,null,null,null,null,null,"G2",null,null,null,null,null,null,null,
     "F2",null,null,null,null,null,null,null,"E2",null,null,null,null,null,null,null],
    "16n", "4n");

  const rumble = noteSeq(makeBassSynth(-20),
    ["A2","A2",null,"A2","A2",null,"A2","A2","A2","A2",null,"A2","A2",null,"A2","A2",
     "A2","A2",null,"A2","A2",null,"A2","A2","G2","G2",null,"G2","E2",null,"E2","A2"],
    "16n", "32n");

  const ping = noteSeq(
    new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
      volume: -20,
    }).connect(masterGain),
    ["A3",null,null,null,null,"E3",null,null,"A3",null,"C4",null,null,"E3",null,null,
     "A3",null,null,null,null,"G3",null,null,"A3",null,null,"D4",null,"E3",null,null],
    "16n", "8n");

  const throb = noteSeq(makeBassSynth(-18),
    ["A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2","A2",
     "A2","A2","A2","A2","A2","A2","A2","A2","G2","G2","G2","G2","E2","E2","E2","A2"],
    "16n", "32n");

  return [sub, groove, octave, walk, stepdown, rumble, ping, throb];
}

// ── Lead ──────────────────────────────────────────────────────────────────────

function makeLeadSynth(volume: number): Tone.Synth {
  return new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.3 },
    volume,
  }).connect(masterGain);
}

function buildLeadClips(): ClipPlayer[] {
  const riffA = noteSeq(makeLeadSynth(-20),
    ["A4",null,"C5",null,"E5",null,"A5",null,"E5",null,"C5",null,"A4",null,null,null,
     "A4",null,"C5",null,"E5",null,"G5",null,"E5","D5","C5",null,"A4",null,null,null],
    "16n", "8n");

  const riffB = noteSeq(makeLeadSynth(-20),
    ["A5",null,"G5",null,"E5",null,"D5",null,"C5",null,"A4",null,null,null,null,null,
     "A5",null,"G5",null,"E5",null,"D5",null,"C5","B4","A4",null,null,null,null,null],
    "16n", "8n");

  const riffC = noteSeq(makeLeadSynth(-20),
    ["E5","D5","C5","A4",null,null,null,null,"E5","D5","C5","B4","A4",null,null,null,
     "E5","D5","C5","A4",null,null,null,null,"G5","E5","D5","C5","A4",null,null,null],
    "16n", "16n");

  const riffD = noteSeq(makeLeadSynth(-21),
    [null,"A4",null,"C5",null,"E5","D5",null,"C5",null,"A4",null,"E5",null,"G5",null,
     null,"A4",null,"C5",null,"E5","D5",null,"C5","A4","G4",null,"A4",null,null,null],
    "16n", "16n");

  const riffE = noteSeq(makeLeadSynth(-21),
    ["A4","B4","C5","D5","E5","F5","G5","A5","G5","F5","E5","D5","C5","B4","A4",null,
     "A4","B4","C5","D5","E5","F5","G5","A5","G5","E5","C5","A4",null,null,null,null],
    "16n", "16n");

  const riffF = (() => {
    let active = false;
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
      volume: -24,
    }).connect(masterGain);
    const chords: (string[] | null)[] = [
      ["A4","C5","E5"],null,null,null,null,null,null,null,
      ["G4","B4","D5"],null,null,null,null,null,null,null,
      ["A4","C5","E5"],null,null,null,null,null,null,null,
      ["E4","G4","B4"],null,null,null,null,null,null,null,
    ];
    const s = new Tone.Sequence<string[] | null>(
      (time, chord) => { if (chord && active) synth.triggerAttackRelease(chord, "4n", time); },
      chords, "16n",
    );
    s.start(0);
    return { start: () => { active = true; }, stop: () => { active = false; } };
  })();

  const riffG = noteSeq(makeLeadSynth(-20),
    ["A4",null,"C5",null,"D5","E5",null,"G5",null,"E5",null,"D5","C5",null,"A4",null,
     "A4",null,"C5",null,"D5","E5",null,"G5","A5",null,"G5","E5","D5","C5","A4",null],
    "16n", "16n");

  const riffH = noteSeq(makeLeadSynth(-21),
    [null,"E5",null,"D5","C5",null,"E5",null,null,"D5","C5",null,"A4",null,null,null,
     null,"E5",null,"D5","C5",null,"G5",null,"E5",null,"D5",null,"C5","A4",null,null],
    "16n", "16n");

  return [riffA, riffB, riffC, riffD, riffE, riffF, riffG, riffH];
}

// ── FX ────────────────────────────────────────────────────────────────────────

function buildFxClips(): ClipPlayer[] {
  // Continuous noise sources: lazily started, gain-controlled for muting.
  // The masterGain node provides the second layer of on/off control.

  const sweep = noiseSource(() => {
    const slotGain = new Tone.Gain(0).connect(masterGain);
    const af = new Tone.AutoFilter({
      frequency: "4n", type: "sine", depth: 0.9, baseFrequency: 400, octaves: 3,
    }).connect(slotGain);
    af.start();
    const source = new Tone.Noise({ type: "white", volume: -24 }).connect(af);
    return { source, slotGain };
  });

  const riser = noiseSource(() => {
    const slotGain = new Tone.Gain(0).connect(masterGain);
    const filter = new Tone.Filter({ frequency: 800, type: "lowpass", rolloff: -12 }).connect(slotGain);
    const lfo = new Tone.LFO({ frequency: "1m", min: 200, max: 5000, type: "sawtooth" });
    lfo.connect(filter.frequency);
    lfo.start();
    const source = new Tone.Noise({ type: "pink", volume: -26 }).connect(filter);
    return { source, slotGain };
  });

  const noise = noiseSource(() => {
    const slotGain = new Tone.Gain(0).connect(masterGain);
    const filter = new Tone.Filter({ frequency: 600, type: "lowpass", rolloff: -24 }).connect(slotGain);
    const source = new Tone.Noise({ type: "white", volume: -28 }).connect(filter);
    return { source, slotGain };
  });

  const shimmer = (() => {
    let active = false;
    const verb = new Tone.Freeverb({ roomSize: 0.8, dampening: 3000, wet: 0.8 }).connect(masterGain);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 3 },
      volume: -28,
    }).connect(verb);
    const chords: (string[] | null)[] = [
      ["A5","C6","E6"],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      ["G5","B5","D6"],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
    ];
    const s = new Tone.Sequence<string[] | null>(
      (time, chord) => { if (chord && active) synth.triggerAttackRelease(chord, "2n", time); },
      chords, "16n",
    );
    s.start(0);
    return { start: () => { active = true; }, stop: () => { active = false; } };
  })();

  const crash = noiseSeq(
    new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 },
      volume: -18,
    }).connect(masterGain),
    ["x",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
     "x",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    "16n", "2n",
  );

  const whoosh = noiseSource(() => {
    const slotGain = new Tone.Gain(0).connect(masterGain);
    const ap = new Tone.AutoPanner({ frequency: "2n", depth: 1 }).connect(slotGain);
    ap.start();
    const filter = new Tone.Filter({ frequency: 1200, type: "bandpass", Q: 0.5 }).connect(ap);
    const lfo = new Tone.LFO({ frequency: "2m", min: 300, max: 3000, type: "sine" });
    lfo.connect(filter.frequency);
    lfo.start();
    const source = new Tone.Noise({ type: "pink", volume: -26 }).connect(filter);
    return { source, slotGain };
  });

  const drone = noteSeq(
    new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.5 },
      volume: -22,
    }).connect(masterGain),
    ["A1",null,null,null,null,null,null,null,"A1",null,null,null,null,null,null,null,
     "A1",null,null,null,null,null,null,null,"A1",null,null,null,null,null,null,null],
    "16n", "2n",
  );

  const glitch = noiseSeq(
    new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
      volume: -20,
    }).connect(masterGain),
    ["x","x",null,"x",null,null,"x",null,"x",null,"x","x",null,"x",null,null,
     "x",null,null,"x","x",null,"x",null,null,"x",null,"x","x","x",null,"x"],
    "16n", "16n",
  );

  return [sweep, riser, noise, shimmer, crash, whoosh, drone, glitch];
}

// ── Clip registry ─────────────────────────────────────────────────────────────

const clips: Record<LaneId, ClipPlayer[]> = {
  drums: buildDrumClips(),
  bass:  buildBassClips(),
  lead:  buildLeadClips(),
  fx:    buildFxClips(),
};

// ── Public API ────────────────────────────────────────────────────────────────

// FIX (toggle): checks transport state each call to support both start and stop.
export async function toggleAudio(): Promise<void> {
  if (transport.state === "started") {
    transport.stop();
    masterGain.gain.rampTo(0, 0.05);
  } else {
    await Tone.start();
    masterGain.gain.rampTo(1, 0.05);
    transport.start();
  }
}

// FIX (retrigger): no sequence start/stop here — only flips the active flag
// (or gain for continuous FX), so repeated toggles always work.
export function setSlotActive(lane: LaneId, slot: number, active: boolean): void {
  const player = clips[lane]?.[slot];
  if (!player) return;
  if (active) player.start();
  else player.stop();
}
