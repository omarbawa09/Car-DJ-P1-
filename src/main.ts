import "./style.css";
import { connect, type NetConn } from "./net";
import {
  renderLanding, renderRoomFull, renderSession,
  updateRoster, updateSlot, updateStagedSlot, updatePushLiveButton,
} from "./ui";
import { toggleAudio, setSlotActive } from "./audio";
import { LANE_DEFS, type Grid, type LaneId, type ServerMessage } from "./types";

let conn: NetConn | null = null;
let currentRoomId = "";
let isHostClient = false;

function emptyGrid(): Grid {
  return {
    drums: Array<boolean>(8).fill(false),
    bass:  Array<boolean>(8).fill(false),
    lead:  Array<boolean>(8).fill(false),
    fx:    Array<boolean>(8).fill(false),
  };
}

let liveGrid: Grid = emptyGrid();
const staged = new Set<string>();

function slotKey(lane: LaneId, slot: number): string {
  return `${lane}:${slot}`;
}

function joinRoom(name: string, roomId: string): void {
  conn?.close();
  currentRoomId = roomId;
  staged.clear();
  liveGrid = emptyGrid();
  conn = connect(roomId, handleMessage);
  conn.send({ type: "join", name });
}

function handleMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "state":
      isHostClient = msg.isHost;
      liveGrid = {
        drums: [...msg.grid.drums],
        bass:  [...msg.grid.bass],
        lead:  [...msg.grid.lead],
        fx:    [...msg.grid.fx],
      };
      staged.clear();
      renderSession(
        currentRoomId, msg.grid, msg.roster,
        handleSlotClick, handlePushLive, handlePullBackStaged,
        isHostClient ? () => void toggleAudio() : null,
      );
      if (isHostClient) {
        for (const lane of LANE_DEFS) {
          for (let i = 0; i < 8; i++) {
            setSlotActive(lane.id, i, msg.grid[lane.id][i] ?? false);
          }
        }
      }
      break;

    case "toggle":
      liveGrid[msg.lane][msg.slot] = msg.value;
      if (msg.value) {
        // Slot went live — clear staged flag if present (handles push_live echo)
        const key = slotKey(msg.lane, msg.slot);
        if (staged.delete(key)) updatePushLiveButton(staged.size);
      }
      updateSlot(msg.lane, msg.slot, msg.value);
      if (isHostClient) setSlotActive(msg.lane, msg.slot, msg.value);
      break;

    case "roster":
      updateRoster(msg.roster);
      break;

    case "room_full":
      conn?.close();
      conn = null;
      renderRoomFull();
      break;
  }
}

function handleSlotClick(lane: LaneId, slot: number): void {
  const key = slotKey(lane, slot);
  if (liveGrid[lane]?.[slot]) {
    // Live → pull it back from shared grid
    conn?.send({ type: "pull_back", lane, slot });
  } else if (staged.has(key)) {
    // Staged → un-stage
    staged.delete(key);
    updateStagedSlot(lane, slot, false);
    updatePushLiveButton(staged.size);
  } else {
    // Empty → stage
    staged.add(key);
    updateStagedSlot(lane, slot, true);
    updatePushLiveButton(staged.size);
  }
}

function handlePushLive(): void {
  if (staged.size === 0) return;
  const slots = Array.from(staged).map(key => {
    const [lane, s] = key.split(":");
    return { lane: lane as LaneId, slot: Number(s) };
  });
  staged.clear();
  updatePushLiveButton(0);
  conn?.send({ type: "push_live", slots });
}

function handlePullBackStaged(): void {
  for (const key of staged) {
    const [lane, s] = key.split(":");
    updateStagedSlot(lane as LaneId, Number(s), false);
  }
  staged.clear();
  updatePushLiveButton(0);
}

renderLanding((name, roomId) => joinRoom(name, roomId));
