/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";

/* ================= ambient mode =================
   The colors of the stream you're watching glow softly around it, like YouTube's ambient mode. Discord's call view
   itself is left exactly as it is. The glow is a 32 x 18 copy of the picture, redrawn with every video frame (at
   most 30 times a second), drawn small and blurred and scaled up by the GPU: it follows the stream without delay
   and costs next to nothing. Only the big stream in the focused view gets one. */

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
    if (settings.store.callAmbient) {
        // the big stream of the focused view: not the small tiles in the row under it, not the grid
        for (const v of document.querySelectorAll<HTMLVideoElement>(".tileWrapper__6981d [data-selenium-video-tile] video")) {
            if (!v.closest(".participantsWrapperAnimated__6981d")) want.add(v);
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

/* ---------- start / stop ---------- */

let frame = 0;
let observer: MutationObserver | null = null;
let watchTimer = 0;
let watched: Element | null = null;

const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; syncGlows(); }); };

export const applyAmbient = schedule;

// the observer only runs while a call view is on screen
function watchCall() {
    const view = document.querySelector("[class*=callContainer_]");
    if (view === watched) return;
    observer?.disconnect();
    watched = view;
    if (view) {
        observer ??= new MutationObserver(schedule);
        observer.observe(view, { childList: true, subtree: true });
    }
    schedule();
}

export function startCall() {
    watchTimer = window.setInterval(watchCall, 1000);
    watchCall();
}

export function stopCall() {
    clearInterval(watchTimer);
    observer?.disconnect();
    observer = null;
    watched = null;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const g of glows.values()) stopGlow(g);
    glows.clear();
}

export const CALL_CSS = `
.dz-ambient { position: absolute; width: 32px !important; height: 18px !important; z-index: -1; pointer-events: none; transform-origin: 0 0;
    transform: scale(var(--dz-sx, 20), var(--dz-sy, 20)); filter: blur(1.6px) saturate(1.5); opacity: .6; will-change: transform; animation: dz-amb-in .5s ease both; }
.wrapper__2f4f7:has(> .dz-ambient) { overflow: visible !important; isolation: isolate; }
@keyframes dz-amb-in { from { opacity: 0; } }
`;
