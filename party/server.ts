import type * as Party from "partykit/server";

const COLORS = ["purple", "teal", "amber", "blue"] as const;
const MAX_USERS = 4;
const LANE_IDS = ["drums", "bass", "lead", "fx"] as const;

type LaneId = typeof LANE_IDS[number];
type Color  = typeof COLORS[number];

interface User { id: string; name: string; color: Color; }
type Grid = Record<LaneId, boolean[]>;

function defaultGrid(): Grid {
  return {
    drums: Array<boolean>(8).fill(false),
    bass:  Array<boolean>(8).fill(false),
    lead:  Array<boolean>(8).fill(false),
    fx:    Array<boolean>(8).fill(false),
  };
}

export default class CarDJServer implements Party.Server {
  readonly room: Party.Room;
  private grid: Grid = defaultGrid();
  private users = new Map<string, User>();
  private connectedIds = new Set<string>();
  private hostId: string | null = null;

  constructor(room: Party.Room) {
    this.room = room;
  }

  onConnect(conn: Party.Connection): void {
    if (this.connectedIds.size >= MAX_USERS) {
      conn.send(JSON.stringify({ type: "room_full" }));
      conn.close(1000, "Room full");
      return;
    }
    this.connectedIds.add(conn.id);
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection): void {
    if (typeof message !== "string") return;

    let msg: Record<string, unknown>;
    try { msg = JSON.parse(message) as Record<string, unknown>; }
    catch { return; }

    if (msg["type"] === "join") {
      const rawName = msg["name"];
      const name = (typeof rawName === "string" ? rawName : "").trim().slice(0, 20) || "anon";

      const usedColors = new Set(Array.from(this.users.values()).map(u => u.color));
      const color: Color = COLORS.find(c => !usedColors.has(c)) ?? COLORS[this.users.size % COLORS.length];

      const user: User = { id: sender.id, name, color };
      this.users.set(sender.id, user);
      if (this.hostId === null) this.hostId = sender.id;

      const roster = Array.from(this.users.values());
      const isHost = sender.id === this.hostId;

      // Full state to the new joiner
      sender.send(JSON.stringify({ type: "state", grid: this.grid, roster, isHost }));

      // Roster update to everyone else
      this.room.broadcast(
        JSON.stringify({ type: "roster", roster }),
        [sender.id],
      );

    } else if (msg["type"] === "push_live") {
      const rawSlots = msg["slots"];
      if (!Array.isArray(rawSlots)) return;
      for (const item of rawSlots) {
        if (typeof item !== "object" || item === null) continue;
        const r = item as Record<string, unknown>;
        const lane = r["lane"] as LaneId;
        const slot = r["slot"] as number;
        if (!LANE_IDS.includes(lane) || typeof slot !== "number" || slot < 0 || slot > 7) continue;
        this.grid[lane][slot] = true;
        this.room.broadcast(JSON.stringify({ type: "toggle", lane, slot, value: true }));
      }
    } else if (msg["type"] === "pull_back") {
      const lane = msg["lane"] as LaneId;
      const slot = msg["slot"] as number;
      if (!LANE_IDS.includes(lane) || typeof slot !== "number" || slot < 0 || slot > 7) return;
      this.grid[lane][slot] = false;
      this.room.broadcast(JSON.stringify({ type: "toggle", lane, slot, value: false }));
    }
  }

  onClose(conn: Party.Connection): void {
    const wasUser = this.users.has(conn.id);
    this.connectedIds.delete(conn.id);
    this.users.delete(conn.id);
    if (wasUser) {
      const roster = Array.from(this.users.values());
      this.room.broadcast(JSON.stringify({ type: "roster", roster }));
    }
  }

  onError(conn: Party.Connection, _err: Error): void {
    this.onClose(conn);
  }
}
