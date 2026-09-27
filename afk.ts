/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

import { BADGE_API, badgesReady } from "./badgeConfig";
import { api, getAuth, onLive } from "./badges";
import { settings } from "./settings";

/* ================= AFK mode =================
   A moon button next to camera / screen share in the voice panel. Going AFK mutes and deafens you and shows a
   speech bubble with your message (and when you'll be back) next to your name in the call, for everyone with
   Terono (through the badge server's live connection; needs "Connect with Discord" in the Badges tab). Coming back
   (the same button) puts mute / deafen back as they were. Past the time you gave, the bubble says you're running
   late. Optionally your Discord status shows it too, for people without Terono. */

interface Afk { text: string; until: number; since: number; }

const VoiceActions = findByPropsLazy("toggleSelfMute", "toggleSelfDeaf");
const MediaEngineStore = findStoreLazy("MediaEngineStore") as { isSelfMute(): boolean; isSelfDeaf(): boolean; };
const CustomStatus = getUserSettingLazy<any>("status", "customStatus");

const away = new Map<string, Afk>();
let mine: { before: { mute: boolean; deaf: boolean; }; status?: any; } | null = null;
let offLive: (() => void) | null = null;
let observer: MutationObserver | null = null;
let tickTimer = 0;
let scanTimer = 0;
let popover: HTMLDivElement | null = null;

const myId = () => UserStore.getCurrentUser()?.id;

/* ---------- going away / coming back ---------- */

async function goAway(text: string, minutes: number) {
    const id = myId();
    if (!id) return;
    const until = minutes > 0 ? Date.now() + minutes * 60_000 : 0;
    const before = { mute: MediaEngineStore.isSelfMute(), deaf: MediaEngineStore.isSelfDeaf() };
    if (!before.deaf) VoiceActions.toggleSelfDeaf();
    mine = { before };

    if (settings.store.afkStatus) {
        try {
            mine.status = CustomStatus?.getSetting();
            await CustomStatus?.updateSetting({ text: `AFK: ${text}`.slice(0, 128), emojiName: "💤", expiresAtMs: until ? String(until) : "0" });
        } catch { /* status is only a bonus */ }
    }

    away.set(id, { text, until, since: Date.now() });
    render();
    if (badgesReady() && await getAuth()) {
        api("/me/afk", "PUT", { text, until }).catch(() => showToast("Couldn't tell others you're AFK. Check your connection.", Toasts.Type.FAILURE));
    } else showToast("You're AFK. To show it to friends with Terono, connect once in Terono settings → Badges.", Toasts.Type.MESSAGE);
}

async function comeBack() {
    const id = myId();
    if (!mine || !id) return;
    const { before, status } = mine;
    mine = null;
    if (MediaEngineStore.isSelfDeaf() && !before.deaf) VoiceActions.toggleSelfDeaf();
    if (MediaEngineStore.isSelfMute() !== before.mute) VoiceActions.toggleSelfMute();
    if (settings.store.afkStatus) {
        try { await CustomStatus?.updateSetting(status ?? null); } catch { /* status is only a bonus */ }
    }
    away.delete(id);
    render();
    if (badgesReady() && await getAuth()) api("/me/afk", "DELETE").catch(() => { });
}

/* ---------- the moon button ---------- */

const MOON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8Z"/><path fill="currentColor" d="M15 3h4l-4 4h4M18 9h3l-3 3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

// the row with the camera and screen-share buttons in the "Voice Connected" panel
function voiceButtonRow() {
    // camera first: "Stream <game>" also sits in the panel, in the game activity row
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[class*="panels_"] button[aria-label]')].filter(b => !b.classList.contains("dz-afk-btn"));
    const label = (b: HTMLButtonElement) => b.getAttribute("aria-label")!;
    const btn = buttons.find(b => /camera|video/i.test(label(b))) ?? buttons.find(b => /share.*screen|screen/i.test(label(b)) && !/^stream /i.test(label(b)));
    let row = btn?.parentElement;
    for (let i = 0; row && i < 3 && row.querySelectorAll(":scope > button, :scope > div > button").length < 2; i++) row = row.parentElement;
    return { row, sample: btn as HTMLButtonElement | null };
}

function placeButton() {
    if (!settings.store.afkMode || !SelectedChannelStore.getVoiceChannelId()) return document.querySelector(".dz-afk-btn")?.remove();
    const { row, sample } = voiceButtonRow();
    if (!row || !sample) return;
    let btn = row.querySelector<HTMLButtonElement>(".dz-afk-btn");
    if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = MOON;
        btn.onclick = e => { e.stopPropagation(); mine ? comeBack() : togglePopover(btn!); };
        row.append(btn);
    }
    // looks like its neighbours, whatever Discord calls them this week
    btn.className = `${sample.className} dz-afk-btn${mine ? " dz-afk-on" : ""}`;
    btn.setAttribute("aria-label", mine ? "Back from AFK" : "Go AFK");
    btn.title = mine ? "Back from AFK (unmutes and undeafens you)" : "Go AFK";
}

function togglePopover(anchor: HTMLElement) {
    if (popover) return closePopover();
    popover = document.createElement("div");
    popover.className = "dz-afk-pop";
    popover.innerHTML = `
        <div class="dz-afk-title">Go AFK</div>
        <input class="dz-afk-text" maxlength="80" placeholder="Message, e.g. Getting food, back soon" />
        <div class="dz-afk-row">
            <label>Back in</label>
            <select class="dz-afk-time">
                <option value="0">No time</option><option value="5">5 min</option><option value="10">10 min</option>
                <option value="15" selected>15 min</option><option value="30">30 min</option><option value="60">1 hour</option><option value="120">2 hours</option>
            </select>
        </div>
        <div class="dz-afk-note">Mutes and deafens you until you're back.</div>
        <button class="dz-afk-go">Go AFK</button>`;
    document.body.append(popover);
    const r = anchor.getBoundingClientRect();
    popover.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - 140, innerWidth - 288))}px`;
    popover.style.top = `${Math.max(8, r.top - popover.offsetHeight - 10)}px`;
    const input = popover.querySelector<HTMLInputElement>(".dz-afk-text")!;
    input.value = settings.store.afkLastText || "";
    input.focus();
    const go = () => {
        const text = input.value.trim() || "AFK, back soon";
        settings.store.afkLastText = text;
        const minutes = Number(popover!.querySelector<HTMLSelectElement>(".dz-afk-time")!.value) || 0;
        closePopover();
        goAway(text, minutes);
    };
    popover.querySelector<HTMLButtonElement>(".dz-afk-go")!.onclick = go;
    input.onkeydown = e => { if (e.key === "Enter") go(); if (e.key === "Escape") closePopover(); };
    setTimeout(() => document.addEventListener("mousedown", outside, true));
}

function outside(e: MouseEvent) {
    if (popover && !popover.contains(e.target as Node)) closePopover();
}

function closePopover() {
    popover?.remove();
    popover = null;
    document.removeEventListener("mousedown", outside, true);
}

/* ---------- the bubbles ---------- */

function userIdOf(el: Element): string | null {
    const key = Object.keys(el).find(k => k.startsWith("__reactFiber"));
    let f = key ? (el as any)[key] : null;
    for (let i = 0; f && i < 12; i++, f = f.return) {
        const id = f.memoizedProps?.user?.id ?? f.memoizedProps?.userId ?? f.memoizedProps?.participant?.user?.id;
        if (typeof id === "string") return id;
    }
    return null;
}

const clock = (ms: number) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function bubbleText(a: Afk) {
    if (!a.until) return a.text;
    const left = a.until - Date.now();
    return left > 0 ? `${a.text} · back in ${clock(left)}` : `${a.text} · running late`;
}

// voice members in the channel list and tiles in the call view
const SPOTS = '.voiceUser__07f91, [class*="tile_"][class*="videoLayer"] , [data-selenium-video-tile]';

function render() {
    scanTimer = 0;
    placeButton();
    let visible = 0;
    for (const el of document.querySelectorAll<HTMLElement>(SPOTS)) {
        const id = el.dataset.dzUser ?? userIdOf(el);
        if (!id) continue;
        el.dataset.dzUser = id;
        const a = away.get(id);
        let bubble = el.querySelector<HTMLElement>(":scope > .dz-afk-bubble, :scope .dz-afk-bubble");
        if (!a) {
            bubble?.remove();
            continue;
        }
        visible++;
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.className = "dz-afk-bubble";
            el.append(bubble);
        }
        const text = `💤 ${bubbleText(a)}`;
        if (bubble.textContent !== text) bubble.textContent = text;
        bubble.classList.toggle("dz-afk-late", !!a.until && a.until < Date.now());
    }
    // the countdown only ticks while a bubble is on screen
    if (visible && !tickTimer) tickTimer = window.setInterval(render, 1000);
    else if (!visible && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = 0;
    }
}

const schedule = () => { if (!scanTimer) scanTimer = window.setTimeout(render, 300); };

async function loadAway() {
    if (!badgesReady()) return;
    try {
        const res = await fetch(`${BADGE_API}/afk`, { cache: "no-cache" });
        const body = await res.json();
        const me = myId();
        for (const [id, a] of Object.entries(body.afk ?? {})) if (id !== me || mine) away.set(id, a as Afk);
        schedule();
    } catch { /* offline */ }
}

export function startAfk() {
    offLive = onLive(msg => {
        if (msg.t !== "afk" || typeof msg.u !== "string") return;
        if (msg.a) away.set(msg.u, msg.a);
        else away.delete(msg.u);
        schedule();
    });
    loadAway();
    watchTimer = window.setInterval(watch, 2000);
    watch();
}

// the page is only watched while you're in a voice channel or someone you might see is away
let watchTimer = 0;
function watch() {
    const needed = !!SelectedChannelStore.getVoiceChannelId() || away.size > 0 || !!document.querySelector(".dz-afk-btn");
    if (needed && !observer) {
        observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
        schedule();
    } else if (!needed && observer) {
        observer.disconnect();
        observer = null;
    }
}

export function stopAfk() {
    offLive?.();
    clearInterval(watchTimer);
    observer?.disconnect();
    observer = null;
    clearInterval(tickTimer);
    clearTimeout(scanTimer);
    tickTimer = scanTimer = 0;
    closePopover();
    document.querySelectorAll(".dz-afk-btn, .dz-afk-bubble").forEach(e => e.remove());
    if (mine) comeBack();
}

export const AFK_CSS = `
.dz-afk-btn.dz-afk-on { color: #fff !important; background: var(--dz-accent, #429cff) !important; }
.dz-afk-pop { position: fixed; z-index: 10001; width: 280px; box-sizing: border-box; padding: 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 10px;
    color: var(--dz-text, #f1f2f4); font: 500 14px var(--font, "gg sans"), sans-serif;
    background: color-mix(in srgb, var(--dz-card, #070708) 97%, transparent); border: 1px solid color-mix(in srgb, var(--dz-accent, #429cff) 40%, transparent);
    box-shadow: 0 14px 40px rgb(0 0 0 / 45%); animation: dz-afk-in 160ms ease-out both; }
.dz-afk-title { font-weight: 800; font-size: 15px; }
.dz-afk-pop input, .dz-afk-pop select { box-sizing: border-box; height: 34px; padding: 0 10px; border-radius: 8px; font: 500 14px var(--font, "gg sans"), sans-serif;
    color: var(--dz-text, #f1f2f4); background: color-mix(in srgb, var(--dz-text, #f1f2f4) 6%, transparent); border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 12%, transparent); outline: none; }
.dz-afk-pop input:focus, .dz-afk-pop select:focus { border-color: var(--dz-accent, #429cff); }
.dz-afk-pop select option { background: var(--dz-card, #070708); }
.dz-afk-row { display: flex; align-items: center; gap: 10px; }
.dz-afk-row select { flex: 1; }
.dz-afk-note { font-size: 12px; color: var(--text-muted, #aaa); }
.dz-afk-go { height: 36px; border-radius: 10px; cursor: pointer; font: 700 14px var(--font, "gg sans"), sans-serif; color: #fff; background: var(--dz-accent, #429cff); }
.dz-afk-bubble { position: relative; align-self: center; margin-left: 6px; padding: 3px 9px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    border-radius: 12px; font: 600 12px var(--font, "gg sans"), sans-serif; color: #111; background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / 30%); pointer-events: none; }
.dz-afk-bubble::before { content: ""; position: absolute; left: -5px; top: 50%; width: 10px; height: 10px; margin-top: -5px; background: inherit; border-radius: 2px; transform: rotate(45deg); }
.dz-afk-late { background: #ffd9a8; }
[data-selenium-video-tile] > .dz-afk-bubble, [class*="tile_"] > .dz-afk-bubble { position: absolute; left: 50%; top: 10px; margin: 0; transform: translateX(-50%); font-size: 13px; padding: 5px 12px; border-radius: 16px; z-index: 5; }
[data-selenium-video-tile] > .dz-afk-bubble::before, [class*="tile_"] > .dz-afk-bubble::before { left: 50%; top: auto; bottom: -5px; margin: 0 0 0 -5px; }
@keyframes dz-afk-in { from { opacity: 0; transform: translateY(6px); } }`;
