import "./style.css";
import { connect, type NetConn } from "./net";
import { renderLanding, renderRoomFull, renderSession, updateRoster, updateSlot } from "./ui";
import { toggleAudio, setSlotActive } from "./audio";
import { LANE_DEFS, type LaneId, type ServerMessage } from "./types";

let conn: NetConn | null = null;
let currentRoomId = "";
let isHostClient = false;

function joinRoom(name: string, roomId: string): void {
  conn?.close();
  currentRoomId = roomId;
  conn = connect(roomId, handleMessage);
  conn.send({ type: "join", name });
}

function handleMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "state":
      isHostClient = msg.isHost;
      renderSession(
        currentRoomId, msg.grid, msg.roster, handleToggle,
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

function handleToggle(lane: LaneId, slot: number): void {
  conn?.send({ type: "toggle", lane, slot });
}

renderLanding((name, roomId) => joinRoom(name, roomId));
