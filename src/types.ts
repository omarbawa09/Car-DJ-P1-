export type LaneId = "drums" | "bass" | "lead" | "fx";

export interface LaneDef {
  id: LaneId;
  label: string;
  clips: string[];
  activeColor: string;
  labelColor: string;
}

export const LANE_DEFS: LaneDef[] = [
  {
    id: "drums",
    label: "Drums",
    clips: ["kick", "snare", "closed hat", "open hat", "clap", "tom", "ride", "perc"],
    activeColor: "#7F77DD",
    labelColor: "#CECBF6",
  },
  {
    id: "bass",
    label: "Bass",
    clips: ["sub", "groove", "octave", "walk", "stepdown", "rumble", "ping", "throb"],
    activeColor: "#1D9E75",
    labelColor: "#9FE1CB",
  },
  {
    id: "lead",
    label: "Lead",
    clips: ["riff A", "riff B", "riff C", "riff D", "riff E", "riff F", "riff G", "riff H"],
    activeColor: "#EF9F27",
    labelColor: "#FAC775",
  },
  {
    id: "fx",
    label: "FX",
    clips: ["sweep", "riser", "noise", "shimmer", "crash", "whoosh", "drone", "glitch"],
    activeColor: "#378ADD",
    labelColor: "#B5D4F4",
  },
];

export interface User {
  id: string;
  name: string;
  color: string;
}

export type Grid = Record<LaneId, boolean[]>;

// Client → Server
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "push_live"; slots: Array<{ lane: LaneId; slot: number }> }
  | { type: "pull_back"; lane: LaneId; slot: number };

// Server → Client
export type ServerMessage =
  | { type: "state"; grid: Grid; roster: User[]; isHost: boolean }
  | { type: "toggle"; lane: LaneId; slot: number; value: boolean }
  | { type: "roster"; roster: User[] }
  | { type: "room_full" };
