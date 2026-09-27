/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies, ImageSrc } from "@main/csp";
import { RendererSettings } from "@main/settings";
import { app, IpcMainInvokeEvent } from "electron";
import { join } from "path";

import { TERONO_LOGO } from "./assets";
import { BADGE_API, badgesReady } from "./badgeConfig";
import { canUpdate, getState, latestRelease, startUpdate } from "./update";

// the badge server: its list (connect-src) and uploaded badge pictures (img-src)
if (badgesReady()) CspPolicies[new URL(BADGE_API).host] = ImageSrc;

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

app.on("browser-window-created", (_, win) => {
    win.webContents.on("dom-ready", () => {
        if (!/[\\/]splash[\\/]index\.html/i.test(win.webContents.getURL())) return;

        const s = RendererSettings.store.plugins?.Terono;
        if (!s?.enabled || s.loadingScreen === false) return;

        const accent = HEX_RE.test(s.accent) ? s.accent : "#429cff";
        const base = HEX_RE.test(s.bgBase) ? s.bgBase : "#000000";
        win.webContents.insertCSS(splashCss(accent, base)).catch(() => { });
    });
});
