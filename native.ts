/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageSrc } from "@main/csp";
import { RendererSettings } from "@main/settings";
import { SETTINGS_DIR } from "@main/utils/constants";
import { app, BrowserWindow, IpcMainInvokeEvent, NativeImage,nativeImage } from "electron";
import { existsSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { TERONO_LOGO } from "./assets";
import { BADGE_API, badgesReady } from "./badgeConfig";
import { canUpdate, getState, latestRelease, startUpdate } from "./update";

// the badge server: its list (connect-src), uploaded badge pictures (img-src) and live updates (a wss:// connection,
// which a bare host doesn't cover)
if (badgesReady()) {
    const { host } = new URL(BADGE_API);
    CspPolicies[host] = ImageSrc;
    CspPolicies[`wss://${host}`] = ConnectSrc;
}

/* ================= in-app updater (called from the settings through VencordNative.pluginHelpers.Terono) ================= */

// the Vencord checkout this Discord runs from: dist/ (where this file is built to) sits next to src/
const ROOT = join(__dirname, "..");

export async function checkUpdate(_: IpcMainInvokeEvent) {
    const [release, updatable] = await Promise.all([latestRelease(), canUpdate(ROOT)]);
    return { ...release, canUpdate: updatable.ok, reason: updatable.reason };
}

export function beginUpdate(_: IpcMainInvokeEvent, version: string) {
    return startUpdate(ROOT, String(version));
}

export function updateState(_: IpcMainInvokeEvent) {
    return getState();
}

export function restartDiscord(_: IpcMainInvokeEvent) {
    app.relaunch();
    app.exit(0);
}

/* ================= updater window ================= */

// Discord's updater ("Checking for updates…") is a separate 300×300 window that Vencord doesn't load into,
// so restyle it from the main process: Terono logo + name instead of Discord's animated logo.

const HEX_RE = /^#[0-9a-f]{6}$/i;

function splashCss(accent: string, base: string) {
    return `
html, body, #splash {
    background: radial-gradient(70% 60% at 50% 38%, ${accent}38, transparent 70%), ${base} !important;
}
.splash-inner :is(video, img) {
    display: none !important;
}
.splash-inner::before {
    content: "";
    display: block;
    width: 112px;
    height: 112px;
    margin: 0 auto 14px;
    background: url("${TERONO_LOGO}") center / contain no-repeat;
    animation: dz-splash 2.4s ease-in-out infinite;
}
.splash-inner .splash-text {
    top: 0 !important;
}
.splash-inner .splash-text::before {
    content: "Terono Discord";
    display: block;
    margin-bottom: 6px;
    color: #fff;
    font: 700 20px/1.3 "gg sans", sans-serif;
}
.progress .progress-bar .complete {
    background-color: ${accent} !important;
}
@keyframes dz-splash {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}
@media (prefers-reduced-motion: reduce) {
    .splash-inner::before { animation: none; }
}`;
}

/* ================= your own app: name in the window title, window / taskbar icon =================
   Discord's app code sets the window title ("Friends - Discord"); every window's setTitle is wrapped so "Discord" in
   it becomes the chosen name. The icon is swapped on every window, including the ones opened later (popouts). Both
   are applied from the first window on, straight from the saved settings. */

const ICON_FILE = join(SETTINGS_DIR, "terono-app-icon.png");
const rawTitles = new WeakMap<BrowserWindow, string>();
let appName = "";
let appIcon: NativeImage | null = null;

const renamed = (t: string) => appName ? t.replace(/\bDiscord\b/g, () => appName) : t;

function adopt(win: BrowserWindow) {
    if (rawTitles.has(win) || win.isDestroyed()) return;
    const original = win.setTitle.bind(win);
    rawTitles.set(win, win.getTitle());
    win.setTitle = (title: string) => {
        rawTitles.set(win, title);
        original(renamed(title));
    };
    if (appName) original(renamed(win.getTitle()));
    if (appIcon) win.setIcon(appIcon);
}

function discordIcon() {
    const ico = join(dirname(process.execPath), "app.ico");
    return existsSync(ico) ? nativeImage.createFromPath(ico) : null;
}

function iconFor(source: unknown) {
    if (source === "terono") return nativeImage.createFromDataURL(TERONO_LOGO);
    if (source === "file" && existsSync(ICON_FILE)) return nativeImage.createFromPath(ICON_FILE);
    return null;
}

export function setAppName(_: IpcMainInvokeEvent, name: string) {
    appName = String(name ?? "").trim().slice(0, 40);
    for (const win of BrowserWindow.getAllWindows()) {
        adopt(win);
        if (!win.isDestroyed()) win.setTitle(rawTitles.get(win) ?? win.getTitle());
    }
}

// source: "discord" | "terono" | "file"; a new file comes as a PNG data URL and is kept next to Vencord's settings
export function setAppIcon(_: IpcMainInvokeEvent, source: string, dataUrl?: string) {
    if (source === "file" && typeof dataUrl === "string" && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl) && dataUrl.length < 4_000_000)
        writeFileSync(ICON_FILE, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
    if (source === "discord" && existsSync(ICON_FILE)) rmSync(ICON_FILE, { force: true });

    appIcon = iconFor(source);
    const icon = appIcon && !appIcon.isEmpty() ? appIcon : discordIcon();
    if (!icon) return false;
    for (const win of BrowserWindow.getAllWindows()) {
        adopt(win);
        if (!win.isDestroyed()) win.setIcon(icon);
    }
    return true;
}

{
    const s = RendererSettings.store.plugins?.Terono;
    if (s?.enabled) {
        appName = typeof s.appName === "string" ? s.appName.trim().slice(0, 40) : "";
        appIcon = iconFor(s.appIcon);
    }
}

app.on("browser-window-created", (_, win) => {
    adopt(win);
    win.webContents.on("dom-ready", () => {
        if (!/[\\/]splash[\\/]index\.html/i.test(win.webContents.getURL())) return;

        const s = RendererSettings.store.plugins?.Terono;
        if (!s?.enabled || s.loadingScreen === false) return;

        const accent = HEX_RE.test(s.accent) ? s.accent : "#429cff";
        const base = HEX_RE.test(s.bgBase) ? s.bgBase : "#000000";
        win.webContents.insertCSS(splashCss(accent, base)).catch(() => { });
    });
});
