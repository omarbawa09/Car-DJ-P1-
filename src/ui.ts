import { LANE_DEFS, type Grid, type LaneDef, type LaneId, type User } from "./types";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

// ── Landing ──────────────────────────────────────────────────────────────────

export function renderLanding(onJoin: (name: string, roomId: string) => void): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="landing">
      <h1 class="logo">Car‑DJ</h1>
      <div class="landing-form">
        <input id="name-input" type="text" placeholder="Display name" maxlength="20" autocomplete="off" />
        <input id="room-input" type="text" placeholder="Room code" maxlength="10" autocomplete="off" />
        <div class="landing-buttons">
          <button id="join-btn">Join</button>
          <button id="create-btn">Create new room</button>
        </div>
        <p id="landing-error" class="error">&nbsp;</p>
      </div>
    </div>
  `;

  const nameInput = document.getElementById("name-input") as HTMLInputElement;
  const roomInput = document.getElementById("room-input") as HTMLInputElement;
  const errorEl   = document.getElementById("landing-error")!;

  const showError = (msg: string) => { errorEl.textContent = msg; };

  document.getElementById("join-btn")!.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const room = roomInput.value.trim().toUpperCase();
    if (!name) { showError("Enter your display name."); return; }
    if (!room) { showError("Enter a room code."); return; }
    onJoin(name, room);
  });

  document.getElementById("create-btn")!.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) { showError("Enter your display name first."); return; }
    const code = randCode();
    roomInput.value = code;
    onJoin(name, code);
  });

  const onEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") (document.getElementById("join-btn") as HTMLButtonElement).click();
  };
  nameInput.addEventListener("keydown", onEnter);
  roomInput.addEventListener("keydown", onEnter);
}

// ── Room full ─────────────────────────────────────────────────────────────────

export function renderRoomFull(): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="room-full">
      <h2>Room Full</h2>
      <p>This room already has 4 players. Try a different room code.</p>
      <button id="back-btn">Back to lobby</button>
    </div>
  `;
  document.getElementById("back-btn")!.addEventListener("click", () => {
    window.location.reload();
  });
}

// ── Session ───────────────────────────────────────────────────────────────────

export function renderSession(
  roomId: string,
  grid: Grid,
  roster: User[],
  onToggle: (lane: LaneId, slot: number) => void,
  onToggleAudio: (() => void) | null,  // null = non-host, button hidden
): void {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="session">
      <header class="session-header">
        <span class="room-code">${esc(roomId)}</span>
        <div id="roster" class="roster"></div>
        ${onToggleAudio ? '<button id="audio-btn" class="audio-btn">&#9654; Start audio</button>' : ""}
      </header>
      <div class="grid">
        ${LANE_DEFS.map(l => laneHTML(l, grid[l.id])).join("")}
      </div>
    </div>
  `;

  for (const lane of LANE_DEFS) {
    for (let s = 0; s < 8; s++) {
      const el = document.querySelector<HTMLElement>(
        `[data-lane="${lane.id}"][data-slot="${s}"]`,
      );
      if (el) el.addEventListener("click", () => onToggle(lane.id, s));
    }
  }

  if (onToggleAudio) {
    const audioBtn = document.getElementById("audio-btn") as HTMLButtonElement;
    let audioOn = false;
    audioBtn.addEventListener("click", () => {
      audioOn = !audioOn;
      audioBtn.textContent = audioOn ? "Audio on ●" : "&#9654; Start audio";
      onToggleAudio();
    });
  }

  updateRoster(roster);
}

function laneHTML(lane: LaneDef, active: boolean[]): string {
  return `<div class="lane">
    <div class="lane-label" style="color:${lane.labelColor}">${lane.label}</div>
    ${Array.from({ length: 8 }, (_, i) => slotHTML(lane, i, active[i] ?? false)).join("")}
  </div>`;
}

function slotHTML(lane: LaneDef, slot: number, active: boolean): string {
  const style = active
    ? `background:${lane.activeColor}`
    : `border-color:${lane.activeColor}55`;
  return `<div
    class="slot${active ? " active" : ""}"
    data-lane="${lane.id}"
    data-slot="${slot}"
    style="${style}"
  ><span class="clip-name">${esc(lane.clips[slot] ?? "")}</span></div>`;
}

// ── Incremental updates ───────────────────────────────────────────────────────

export function updateSlot(lane: LaneId, slot: number, active: boolean): void {
  const el = document.querySelector<HTMLElement>(
    `[data-lane="${lane}"][data-slot="${slot}"]`,
  );
  if (!el) return;
  const def = LANE_DEFS.find(l => l.id === lane)!;
  el.classList.toggle("active", active);
  if (active) {
    el.style.background = def.activeColor;
    el.style.borderColor = "";
  } else {
    el.style.background = "";
    el.style.borderColor = `${def.activeColor}55`;
  }
}

export function updateRoster(roster: User[]): void {
  const el = document.getElementById("roster");
  if (!el) return;
  el.innerHTML = roster
    .map(u => `<span class="chip chip-${esc(u.color)}">${esc(u.name)}</span>`)
    .join("");
}
