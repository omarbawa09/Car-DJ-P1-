import PartySocket from "partysocket";
import type { ClientMessage, ServerMessage } from "./types";

export interface NetConn {
  send(msg: ClientMessage): void;
  close(): void;
}

export function connect(
  roomId: string,
  onMessage: (msg: ServerMessage) => void,
): NetConn {
  const host = location.host;
  const socket = new PartySocket({ host, room: roomId, party: "main" });

  socket.addEventListener("message", (evt: MessageEvent<string>) => {
    try {
      onMessage(JSON.parse(evt.data) as ServerMessage);
    } catch {
      // ignore malformed frames
    }
  });

  return {
    send: (msg) => socket.send(JSON.stringify(msg)),
    close: () => socket.close(),
  };
}
