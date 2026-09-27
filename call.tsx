/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Menu, SelectedChannelStore } from "@webpack/common";

import { settings } from "./settings";

/* ================= calls & streams =================
   People without a camera become just their avatar circle (name under it on hover) with a wave around it while
   they talk. People who stream get a ring in your color and a LIVE pill; clicking them watches the stream.
   Streams you watch share the stage as 16:9 tiles: 1 fills it, 2 side by side, 3 = one big on the left and two
   stacked on the right, 4 = 2 x 2. Streams you don't watch sit in a column at the side, people in a row below.
   Clicking a stream focuses it (big, the others go to the column); "All streams" goes back.
   "Ambient mode" lets a stream's colors glow around it, like YouTube's, following every frame.
   The minimized stream (picture in picture) can be dropped anywhere (near a corner it still snaps there) and has
   a shape button. Only Discord's own call view is rearranged: all its buttons, menus and shortcuts keep working. */

type Look = "terono" | "discord" | "custom";
const FEATURES = ["callCircles", "callWave", "callLiveRing", "callLayout", "callAmbient"] as const;
type Feature = typeof FEATURES[number];

const Streams = findByPropsLazy("getAllApplicationStreams", "getActiveStreamForApplicationStream");
const Watching = findByPropsLazy("getAllActiveStreams");
const RTCActions = findByPropsLazy("selectParticipant", "updateLayout");
const watchStream = findByCodeLazy('type:"STREAM_WATCH",streamKey') as (stream: any, opts?: { forceMultiple?: boolean; noFocus?: boolean; }) => void;

export function callFeature(key: Feature) {
    const look = (settings.store.callLook ?? "terono") as Look;
    if (look === "terono") return true;
    if (look === "discord") return false;
    return !!settings.store[key];
}

/* ---------- layout ---------- */

interface Box { x: number; y: number; w: number; h: number; }

const RATIO = 9 / 16;
// the stage in cells of one 16:9 tile: [columns, rows, cells as x, y, width, height]
const TEMPLATES: Record<number, [number, number, number[][]]> = {
    1: [1, 1, [[0, 0, 1, 1]]],
    2: [2, 1, [[0, 0, 1, 1], [1, 0, 1, 1]]],
    3: [3, 2, [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1]]],
    4: [2, 2, [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]]],
};
const PERSON_W = 104, PERSON_H = 112;

/**
 * Lays out `stage` watched streams, `side` other streams and `people` circles in the area (all relative to it),
 * as one centered group: the stage with the column next to it, the people under both.
 */
function layout(area: Box, stage: number, side: number, people: number, gap: number) {
    const left = settings.store.callSide === "left";
    const perRow = Math.max(1, Math.floor((area.w + gap) / (PERSON_W + gap)));
    const peopleRows = people ? Math.min(2, Math.ceil(people / perRow)) : 0;
    const peopleH = peopleRows ? peopleRows * PERSON_H + gap : 0;
    const colW = side ? Math.min(280, Math.max(170, area.w * .17)) : 0;
    const stageArea = { w: area.w - (side ? colW + gap : 0), h: area.h - peopleH };

    const [cols, rows, cells] = TEMPLATES[Math.min(Math.max(stage, 1), 4)];
    const cell = Math.max(40, Math.min((stageArea.w - (cols - 1) * gap) / cols, (stageArea.h - (rows - 1) * gap) / rows / RATIO));
    const cellH = cell * RATIO;
    const blockW = stage ? cols * cell + (cols - 1) * gap : 0;
    const blockH = stage ? rows * cellH + (rows - 1) * gap : 0;

    // the column: 16:9 cards, as many as fit the stage's height
    const colH = stage ? blockH : Math.min(stageArea.h, 4 * colW * RATIO + 3 * gap);
    const cardH = side ? Math.min(colW * RATIO, (colH - (side - 1) * gap) / side) : 0;
    const cardW = cardH / RATIO;

    const groupW = blockW + (side ? (stage ? gap : 0) + colW : 0);
    const groupH = Math.max(blockH, side ? side * cardH + (side - 1) * gap : 0);
    const gx = area.x + (area.w - groupW) / 2;
    const gy = area.y + Math.max(0, (area.h - groupH - peopleH) / 2);
    const bx = left && side ? gx + colW + gap : gx;
    const cx = left ? gx : gx + groupW - colW;

    const stageBoxes: Box[] = cells.slice(0, stage).map(([x, y, w, h]) => ({
        x: bx + x * (cell + gap), y: gy + y * (cellH + gap), w: w * cell + (w - 1) * gap, h: h * cellH + (h - 1) * gap,
    }));
    const sideTop = gy + (groupH - (side * cardH + (side - 1) * gap)) / 2;
    const sideBoxes: Box[] = Array.from({ length: side }, (_, i) => ({ x: cx + (colW - cardW) / 2, y: sideTop + i * (cardH + gap), w: cardW, h: cardH }));

    const py = gy + groupH + gap;
    const peopleBoxes: Box[] = Array.from({ length: people }, (_, i) => {
        const row = Math.min(Math.floor(i / perRow), peopleRows - 1);
        const inRow = row === peopleRows - 1 ? people - row * perRow : perRow;
        const rowW = inRow * PERSON_W + (inRow - 1) * gap;
        const col = i - row * perRow;
        return { x: area.x + (area.w - rowW) / 2 + col * (PERSON_W + gap), y: py + row * PERSON_H, w: PERSON_W, h: PERSON_H };
    });
    return { stageBoxes, sideBoxes, peopleBoxes };
}

const kindOf = (t: Element) => t.querySelector(".liveIndicator__2f4f7") ? "stream" : t.querySelector("video") ? "camera" : "user";

function place(el: HTMLElement, b: Box, origin: DOMRect, role: string) {
    el.dataset.dzRole = role;
    el.style.setProperty("--dz-x", `${Math.round(b.x - origin.left)}px`);
    el.style.setProperty("--dz-y", `${Math.round(b.y - origin.top)}px`);
    el.style.setProperty("--dz-w", `${Math.round(b.w)}px`);
    el.style.setProperty("--dz-h", `${Math.round(b.h)}px`);
}

const gapNow = () => callFeature("callAmbient") ? 26 : 14;

// grid view: everything is placed by us
function gridView(list: HTMLElement, tiles: HTMLElement[], isWatched: (t: HTMLElement) => boolean) {
    const cell = (t: HTMLElement) => t.closest<HTMLElement>(".tile_d6271c");
    const streams = tiles.filter(t => t.dataset.dzKind !== "user");
    let stage = streams.filter(isWatched);
    let side = streams.filter(t => !isWatched(t));
    if (!stage.length) { stage = side.slice(0, 4); side = side.slice(4); }
    side = side.concat(stage.slice(4));
    stage = stage.slice(0, 4);
    const people = tiles.filter(t => t.dataset.dzKind === "user");
    if (!stage.length && !side.length) return clearIn(list);

    const r = list.getBoundingClientRect();
    const gap = gapNow();
    const L = layout({ x: r.left + gap, y: r.top + 4, w: r.width - gap * 2, h: r.height - 8 }, stage.length, side.length, people.length, gap);
    list.dataset.dzLayout = "";
    const used = new Set<HTMLElement>();
    const put = (t: HTMLElement, b: Box, role: string) => { const c = cell(t); if (c) { used.add(c); place(c, b, r, role); } };
    stage.forEach((t, i) => put(t, L.stageBoxes[i], "stage"));
    side.forEach((t, i) => put(t, L.sideBoxes[i], "side"));
    people.forEach((t, i) => put(t, L.peopleBoxes[i], "user"));
    for (const c of list.querySelectorAll<HTMLElement>(".tile_d6271c[data-dz-role]")) if (!used.has(c)) delete c.dataset.dzRole;
}

// focused view (one stream clicked): it stays Discord's, big; every other stream goes to the column
function focusedView(root: HTMLElement, tiles: HTMLElement[]) {
    const stageEl = root.querySelector<HTMLElement>(".tileWrapper__6981d");
    const pw = root.querySelector<HTMLElement>(".participantsWrapperAnimated__6981d");
    if (!stageEl || !pw) return;
    const sizer = (t: HTMLElement) => t.closest<HTMLElement>(".tileSizer_ba65b0");
    const inRow = tiles.filter(t => pw.contains(t) && sizer(t));
    const side = inRow.filter(t => t.dataset.dzKind !== "user");
    const people = inRow.filter(t => t.dataset.dzKind === "user");

    const r = root.getBoundingClientRect();
    const gap = gapNow();
    const L = layout({ x: r.left + gap, y: r.top + 56, w: r.width - gap * 2, h: r.height - 56 - 64 }, 1, side.length, people.length, gap);
    const f = L.stageBoxes[0];
    root.dataset.dzFocus = "";
    root.style.setProperty("--dz-pad", `${f.y - r.top}px ${r.right - f.x - f.w}px ${r.bottom - f.y - f.h}px ${f.x - r.left}px`);
    const pr = pw.getBoundingClientRect();
    const used = new Set<HTMLElement>();
    side.forEach((t, i) => { const s = sizer(t)!; used.add(s); place(s, L.sideBoxes[i], pr, "side"); });
    people.forEach((t, i) => { const s = sizer(t)!; used.add(s); place(s, L.peopleBoxes[i], pr, "user"); });
    for (const s of root.querySelectorAll<HTMLElement>(".tileSizer_ba65b0[data-dz-role]")) if (!used.has(s)) delete s.dataset.dzRole;
    allButton(stageEl, f, r);
}

// back from one focused stream to all of them
function allButton(stage: HTMLElement, f: Box, r: DOMRect) {
    let b = stage.querySelector<HTMLButtonElement>(":scope > .dz-call-all");
    if (!b) {
        b = Object.assign(document.createElement("button"), { className: "dz-call-all", textContent: "⊞ All streams", title: "Show all the streams you watch side by side" });
        b.onclick = e => { e.stopPropagation(); RTCActions.selectParticipant(SelectedChannelStore.getChannelId(), null); };
        stage.append(b);
    }
    b.style.left = `${f.x - r.left + 12}px`;
    b.style.top = `${f.y - r.top + 12}px`;
}

function clearIn(scope: ParentNode) {
    for (const el of scope.querySelectorAll<HTMLElement>("[data-dz-role], [data-dz-focus], [data-dz-layout]")) {
        delete el.dataset.dzRole; delete el.dataset.dzFocus; delete el.dataset.dzLayout;
    }
    for (const b of scope.querySelectorAll(".dz-call-all")) b.remove();
}

function update() {
    frame = 0;
    const tiles = [...document.querySelectorAll<HTMLElement>("[data-selenium-video-tile]")];
    if (!tiles.length) return;
    let live: Set<string>, watched: Set<string>;
    try {
        live = new Set(Streams.getAllApplicationStreams().map((s: any) => s.ownerId));
        watched = new Set(Watching.getAllActiveStreams().map((s: any) => s.ownerId));
    } catch { return; }
    const ring = callFeature("callLiveRing");
    for (const t of tiles) {
        const k = kindOf(t);
        if (t.dataset.dzKind !== k) t.dataset.dzKind = k;
        t.toggleAttribute("data-dz-live", ring && k === "user" && live.has(t.dataset.seleniumVideoTile!));
    }
    if (!callFeature("callLayout")) return clearIn(document);
    const isWatched = (t: HTMLElement) => t.dataset.dzKind === "camera" || watched.has(t.dataset.seleniumVideoTile!);
    const root = document.querySelector<HTMLElement>(".root__6981d");
    if (root) focusedView(root, tiles);
    const list = document.querySelector<HTMLElement>(".videoGrid_a21736 > .listItems_affa7e");
    if (list) gridView(list, tiles, isWatched);
}

/* clicking a streamer's circle watches their stream, next to the ones you already watch */
function onClick(e: MouseEvent) {
    const tile = (e.target as HTMLElement).closest?.<HTMLElement>("[data-dz-live]");
    if (!tile || !(e.target as HTMLElement).closest(".avatarWrapper_fb62e2")) return;
    const stream = Streams.getAllApplicationStreams().find((s: any) => s.ownerId === tile.dataset.seleniumVideoTile);
    if (!stream) return;
    e.stopPropagation();
    e.preventDefault();
    try { watchStream(stream, { forceMultiple: true, noFocus: true }); } catch { /* Discord changed; the normal click still works */ }
}

/* ---------- ambient mode ---------- */

// a 32 x 18 copy of the picture, updated with every video frame, drawn small and blurred, then scaled up by the GPU:
// the glow follows the stream without delay and costs next to nothing
interface Glow { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; video: HTMLVideoElement; host: HTMLElement; last: number; handle: number; ro: ResizeObserver; }
const glows = new Map<HTMLVideoElement, Glow>();

function drawGlow(g: Glow) {
    const now = performance.now();
    if (now - g.last >= 33 && !document.hidden) {
        g.last = now;
        try { g.ctx.drawImage(g.video, 0, 0, 32, 18); } catch { /* frame not ready */ }
    }
    g.handle = "requestVideoFrameCallback" in g.video
        ? (g.video as any).requestVideoFrameCallback(() => drawGlow(g))
        : requestAnimationFrame(() => drawGlow(g));
}

function sizeGlow(g: Glow) {
    const w = g.host.clientWidth, h = g.host.clientHeight;
    g.canvas.style.setProperty("--dz-sx", String(w * 1.14 / 32));
    g.canvas.style.setProperty("--dz-sy", String(h * 1.24 / 18));
    g.canvas.style.left = `${-w * .07}px`;
    g.canvas.style.top = `${-h * .12}px`;
}

function stopGlow(g: Glow) {
    if ("cancelVideoFrameCallback" in g.video) (g.video as any).cancelVideoFrameCallback(g.handle);
    cancelAnimationFrame(g.handle);
    g.ro.disconnect();
    g.canvas.remove();
}

function syncGlows() {
    const want = new Set<HTMLVideoElement>();
    if (callFeature("callAmbient")) {
        for (const v of document.querySelectorAll<HTMLVideoElement>("[data-selenium-video-tile] video")) {
            // the big ones only: not the cards in the column or the row
            if (v.closest("[data-dz-role=side], [data-dz-role=user]")) continue;
            if (v.closest(".participantsWrapperAnimated__6981d")) continue;
            if (v.closest(".videoGrid_a21736") && !v.closest("[data-dz-role=stage]")) continue;
            want.add(v);
        }
    }
    for (const [v, g] of glows) if (!want.has(v) || !g.host.isConnected) { stopGlow(g); glows.delete(v); }
    for (const v of want) {
        if (glows.has(v)) continue;
        const host = v.closest<HTMLElement>(".wrapper__2f4f7");
        if (!host) continue;
        const canvas = Object.assign(document.createElement("canvas"), { className: "dz-ambient", width: 32, height: 18 });
        host.prepend(canvas);
        const g: Glow = { canvas, ctx: canvas.getContext("2d")!, video: v, host, last: 0, handle: 0, ro: new ResizeObserver(() => sizeGlow(g)) };
        g.ro.observe(host);
        sizeGlow(g);
        glows.set(v, g);
        drawGlow(g);
    }
}

/* ---------- picture in picture ---------- */

export const PIP_SHAPES = [
    { value: "rounded", label: "Rounded (Discord)" },
    { value: "sharp", label: "Sharp" },
    { value: "soft", label: "Extra round" },
    { value: "pill", label: "Pill" },
    { value: "circle", label: "Circle" },
] as const;

function setShape(value: string) {
    settings.store.pipShape = value;
    applyCallAttrs();
}

// Discord's ⋯ menu on it (only there while you watch two or more streams)
const pipMenu: NavContextMenuPatchCallback = children => {
    const current = settings.store.pipShape ?? "rounded";
    children.push(
        <Menu.MenuSeparator key="dz-pip-sep" />,
        <Menu.MenuItem id="dz-pip-shape" key="dz-pip-shape" label="Shape">
            {PIP_SHAPES.map(s => (
                <Menu.MenuRadioItem key={s.value} id={`dz-pip-${s.value}`} group="dz-pip-shape" label={s.label} checked={current === s.value} action={() => setShape(s.value)} />
            ))}
        </Menu.MenuItem>
    );
};

// and a shape button on the window itself, always there
function pipButton(pip: HTMLElement) {
    if (pip.querySelector(".dz-pip-btn")) return;
    const btn = Object.assign(document.createElement("button"), { className: "dz-pip-btn", title: "Shape", innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 4h7v7H4zM15.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM4 13h7l-3.5 7zM13 13h7v7h-7z" opacity=".95"/></svg>' });
    const stop = (e: Event) => e.stopPropagation();
    btn.addEventListener("pointerdown", stop);
    btn.addEventListener("mousedown", stop);
    btn.onclick = e => {
        e.stopPropagation();
        const open = pip.querySelector(".dz-pip-pop");
        if (open) return open.remove();
        const pop = document.createElement("div");
        pop.className = "dz-pip-pop";
        pop.addEventListener("pointerdown", stop);
        pop.addEventListener("mousedown", stop);
        for (const s of PIP_SHAPES) {
            const b = Object.assign(document.createElement("button"), { textContent: s.label });
            b.dataset.shape = s.value;
            if ((settings.store.pipShape ?? "rounded") === s.value) b.dataset.on = "";
            b.onclick = ev => { ev.stopPropagation(); setShape(s.value); pop.remove(); };
            pop.append(b);
        }
        pip.append(pop);
    };
    pip.append(btn);
}

// free placement: Discord snaps it to the nearest corner when you let go; now it stays where you drop it,
// unless you drop it near a corner. The spot is kept as a fraction of the window, so it survives resizing.
let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let measuring = false;

const freeRange = (inst: any) => {
    const p = inst?.props ?? {};
    return {
        minX: 8, minY: 8,
        maxX: bounds.maxX + (p.edgeOffsetRight ?? 80) - 8, maxY: bounds.maxY + (p.edgeOffsetBottom ?? 132) - 8,
    };
};
let lastInst: any = null;

/** Called by Discord's picture-in-picture position code (see the patch in index.tsx). */
export function pipFree(minY: number, minX: number, maxY: number, maxX: number) {
    bounds = { minX, maxX, minY, maxY };
    const { pipX, pipY } = settings.store as any;
    if (measuring || !(pipX >= 0 && pipY >= 0)) return null;
    const r = freeRange(lastInst);
    return { x: Math.round(r.minX + pipX * (r.maxX - r.minX)), y: Math.round(r.minY + pipY * (r.maxY - r.minY)) };
}

/** Called when you let go of it; true = we placed it. */
export function pipDrop(inst: any, x: number, y: number) {
    try {
        lastInst = inst;
        measuring = true;
        inst.getPosition(inst.props.position);
        measuring = false;
        const { minX, maxX, minY, maxY } = bounds;
        const nearCorner = [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 120);
        if (nearCorner) {
            settings.store.pipX = -1;
            settings.store.pipY = -1;
            return false;
        }
        const r = freeRange(inst);
        settings.store.pipX = Math.min(1, Math.max(0, (x - r.minX) / (r.maxX - r.minX)));
        settings.store.pipY = Math.min(1, Math.max(0, (y - r.minY) / (r.maxY - r.minY)));
        inst.setPosition(inst.props.position);
        inst.props.onDragEnd?.(x, y);
        return true;
    } catch {
        measuring = false;
        return false;
    }
}

/* ---------- start / stop ---------- */

let frame = 0;
let observer: MutationObserver | null = null;
let watchTimer = 0;
let watched: Element | null = null;

const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { update(); syncGlows(); }); };

export function applyCallAttrs() {
    const html = document.documentElement.dataset;
    const set = (k: string, on: boolean) => { if (on) html[k] = ""; else delete html[k]; };
    set("dzCallCircles", callFeature("callCircles"));
    set("dzCallWave", callFeature("callWave"));
    set("dzCallLayout", callFeature("callLayout"));
    html.dzPip = settings.store.pipShape ?? "rounded";
    schedule();
}

// the observer only runs while a call view is on screen
function watchCall() {
    const view = document.querySelector("[class*=callContainer_]");
    if (view !== watched) {
        observer?.disconnect();
        watched = view;
        if (view) {
            observer ??= new MutationObserver(schedule);
            observer.observe(view, { childList: true, subtree: true });
        } else clearIn(document);
        schedule();
    }
    const pip = document.querySelector<HTMLElement>(".pictureInPictureWindow__6341f");
    if (pip) pipButton(pip);
    if (!view && glows.size) syncGlows();
}

export function startCall() {
    applyCallAttrs();
    addContextMenuPatch("pip-menu", pipMenu);
    document.addEventListener("click", onClick, true);
    addEventListener("resize", schedule);
    watchTimer = window.setInterval(watchCall, 800);
    watchCall();
}

export function stopCall() {
    removeContextMenuPatch("pip-menu", pipMenu);
    document.removeEventListener("click", onClick, true);
    removeEventListener("resize", schedule);
    clearInterval(watchTimer);
    observer?.disconnect();
    observer = null;
    watched = null;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const g of glows.values()) stopGlow(g);
    glows.clear();
    clearIn(document);
    for (const t of document.querySelectorAll<HTMLElement>("[data-dz-kind], [data-dz-live]")) { delete t.dataset.dzKind; t.removeAttribute("data-dz-live"); }
    for (const b of document.querySelectorAll(".dz-pip-btn, .dz-pip-pop")) b.remove();
    for (const k of ["dzCallCircles", "dzCallWave", "dzCallLayout", "dzPip"]) delete document.documentElement.dataset[k];
}

const USER = ".tile__2f4f7[data-dz-kind=user]";
const L = "html[data-dz-call-layout]";
const MOVE = "left .22s ease, top .22s ease, width .22s ease, height .22s ease";

export const CALL_CSS = `
/* people without a camera: just their avatar circle, the name under it on hover */
html[data-dz-call-circles] ${USER} { background: none !important; box-shadow: none !important; border: none !important; overflow: visible !important; }
html[data-dz-call-circles] ${USER} :is(.background_fb62e2, .tileChild__2f4f7, .content__2f4f7, .overlayContainer__2f4f7) { background: none !important; overflow: visible !important; }
html[data-dz-call-circles] ${USER} .border__2f4f7 { display: none !important; }
html[data-dz-call-circles] ${USER} .overlayBottom__2f4f7 { position: absolute; left: -20px; right: -20px; bottom: -6px; justify-content: center; opacity: 0; transform: translateY(4px); transition: opacity 140ms ease, transform 140ms ease; }
html[data-dz-call-circles] ${USER}:hover .overlayBottom__2f4f7 { opacity: 1; transform: none; }
html[data-dz-call-circles] ${USER} .overlayBottom__2f4f7 [class*="experimentOverlayTitle"] { background: color-mix(in srgb, var(--dz-card, #070708) 85%, transparent) !important; border-radius: 999px; padding: 2px 10px; }
/* talking: a wave around the avatar */
.avatarWrapper_fb62e2 { border-radius: 50%; }
html[data-dz-call-wave] ${USER}:has(.border__2f4f7[style*="status-speaking"]) .avatarWrapper_fb62e2::before,
html[data-dz-call-wave] ${USER}:has(.border__2f4f7[style*="status-speaking"]) .avatarWrapper_fb62e2::after {
    content: ""; position: absolute; inset: -6px; border-radius: 50%; pointer-events: none;
    border: 2px solid var(--dz-accent, #429cff); animation: dz-wave 1.2s ease-out infinite;
}
html[data-dz-call-wave] ${USER}:has(.border__2f4f7[style*="status-speaking"]) .avatarWrapper_fb62e2::after { animation-delay: .6s; }
@keyframes dz-wave { from { transform: scale(1); opacity: .9; } to { transform: scale(1.35); opacity: 0; } }
/* streamers: a ring in your color and a LIVE pill; clicking watches */
[data-dz-live] .avatarWrapper_fb62e2 { box-shadow: 0 0 0 3px var(--dz-accent, #429cff), 0 0 14px color-mix(in srgb, var(--dz-accent, #429cff) 55%, transparent); cursor: pointer; }
[data-dz-live] .background_fb62e2 { position: relative; }
[data-dz-live] .background_fb62e2::after {
    content: "LIVE"; position: absolute; left: 50%; top: calc(50% - 50px); transform: translateX(-50%);
    padding: 1px 8px 2px; border-radius: 999px 999px 8px 8px; font: 800 10px/1.2 var(--font-primary, "gg sans"), sans-serif; letter-spacing: .12em;
    color: #fff; background: var(--dz-accent, #429cff); box-shadow: 0 2px 8px rgb(0 0 0 / 35%); pointer-events: none; z-index: 3;
}

/* grid view: every tile placed exactly (16:9 stage tiles, the column, the people row) */
${L} .videoGrid_a21736:has(> [data-dz-layout]) { overflow: hidden !important; }
${L} [data-dz-layout] .row_d6271c { display: contents !important; }
${L} [data-dz-layout] .tile_d6271c[data-dz-role] { position: absolute !important; margin: 0 !important; left: var(--dz-x); top: var(--dz-y); width: var(--dz-w) !important; height: var(--dz-h) !important; transition: ${MOVE}; }
${L} [data-dz-layout] .tile_d6271c:not([data-dz-role]) { display: none !important; }
${L} [data-dz-layout] .tile_d6271c[data-dz-role] > .tileSizer_d6271c,
${L} [data-dz-layout] .tile_d6271c[data-dz-role] .wrapper__2f4f7,
${L} [data-dz-layout] .tile_d6271c[data-dz-role] .tile__2f4f7 { width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; aspect-ratio: auto !important; }

/* focused view: the focused stream in its 16:9 spot, the column and the people row around it */
${L} .root__6981d[data-dz-focus] > .tileWrapper__6981d { position: static !important; align-self: stretch; height: 100% !important; width: 100% !important; box-sizing: border-box; padding: var(--dz-pad) !important; }
${L} .root__6981d[data-dz-focus] .participantsWrapperAnimated__6981d { transform: none !important; overflow: visible !important; opacity: 1 !important; inset: 0 !important; width: auto !important; height: auto !important; pointer-events: none; }
${L} .root__6981d[data-dz-focus] .participantsWrapperAnimated__6981d .tileSizer_ba65b0[data-dz-role] { position: absolute !important; margin: 0 !important; left: var(--dz-x); top: var(--dz-y); width: var(--dz-w) !important; height: var(--dz-h) !important; pointer-events: auto; transition: ${MOVE}; }
${L} .root__6981d[data-dz-focus] .tileSizer_ba65b0[data-dz-role] > .wrapper__2f4f7,
${L} .root__6981d[data-dz-focus] .tileSizer_ba65b0[data-dz-role] .tile__2f4f7 { width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; }
.dz-call-all { position: absolute; z-index: 5; height: 30px; padding: 0 12px; border-radius: 999px; cursor: pointer; font: 600 13px var(--font-primary, "gg sans"), sans-serif;
    color: #fff; background: rgb(0 0 0 / 55%); border: 1px solid rgb(255 255 255 / 18%); opacity: 0; transition: opacity .15s; }
.tileWrapper__6981d:hover > .dz-call-all { opacity: 1; }
.dz-call-all:hover { background: var(--dz-accent, #429cff); }
/* stream cards */
${L} [data-dz-role=stage] .tile__2f4f7, ${L} [data-dz-role=side] .tile__2f4f7 { border-radius: 14px !important; }

/* ambient mode */
.dz-ambient { position: absolute; width: 32px !important; height: 18px !important; z-index: -1; pointer-events: none; transform-origin: 0 0;
    transform: scale(var(--dz-sx, 20), var(--dz-sy, 20)); filter: blur(1.6px) saturate(1.5); opacity: .6; will-change: transform; animation: dz-amb-in .5s ease both; }
.wrapper__2f4f7:has(> .dz-ambient) { overflow: visible !important; isolation: isolate; }
@keyframes dz-amb-in { from { opacity: 0; } }

/* minimized stream */
.dz-pip-btn { position: absolute; top: 8px; left: 8px; z-index: 20; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; cursor: pointer;
    color: #fff; background: rgb(0 0 0 / 55%); opacity: 0; transition: opacity .15s; }
.pictureInPictureWindow__6341f:hover .dz-pip-btn, .dz-pip-btn:focus-visible { opacity: 1; }
.dz-pip-pop { position: absolute; top: 40px; left: 8px; z-index: 21; display: flex; flex-direction: column; padding: 4px; border-radius: 12px; min-width: 140px;
    background: color-mix(in srgb, var(--dz-card, #111214) 96%, transparent); box-shadow: 0 10px 30px rgb(0 0 0 / 45%); }
.dz-pip-pop button { text-align: left; padding: 7px 10px; border-radius: 8px; cursor: pointer; color: var(--dz-text, #f1f2f4); background: none; font: 500 13px var(--font-primary, "gg sans"), sans-serif; }
.dz-pip-pop button:hover { background: color-mix(in srgb, var(--dz-accent, #429cff) 30%, transparent); }
.dz-pip-pop button[data-on] { color: var(--dz-accent, #429cff); font-weight: 700; }
html:not([data-dz-pip="rounded"]) .pictureInPictureWindow__6341f, html:not([data-dz-pip="rounded"]) .pictureInPictureWindow__6341f > div:first-child { overflow: hidden; }
html[data-dz-pip="sharp"] .pictureInPictureWindow__6341f, html[data-dz-pip="sharp"] .pictureInPictureWindow__6341f > div:first-child, html[data-dz-pip="sharp"] .pictureInPictureVideo_e4cb9a { border-radius: 0 !important; }
html[data-dz-pip="soft"] .pictureInPictureWindow__6341f, html[data-dz-pip="soft"] .pictureInPictureWindow__6341f > div:first-child, html[data-dz-pip="soft"] .pictureInPictureVideo_e4cb9a { border-radius: 26px !important; }
html[data-dz-pip="pill"] .pictureInPictureWindow__6341f, html[data-dz-pip="pill"] .pictureInPictureWindow__6341f > div:first-child, html[data-dz-pip="pill"] .pictureInPictureVideo_e4cb9a { border-radius: 999px !important; }
html[data-dz-pip="circle"] .pictureInPictureWindow__6341f, html[data-dz-pip="circle"] .pictureInPictureWindow__6341f > div:first-child, html[data-dz-pip="circle"] .pictureInPictureVideo_e4cb9a { border-radius: 50% !important; }
html[data-dz-pip="circle"] .pictureInPictureWindow__6341f > div:first-child { aspect-ratio: 1; }
html[data-dz-pip="circle"] .pictureInPictureWindow__6341f > div:first-child > * { height: 100% !important; }
html[data-dz-pip="circle"] .pictureInPictureWindow__6341f video { object-fit: cover !important; }
html[data-dz-pip="circle"] .dz-pip-btn { top: 50%; left: 10px; transform: translateY(-50%); }
`;
