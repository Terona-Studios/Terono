/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageSrc } from "@main/csp";
import { RendererSettings } from "@main/settings";
import { SETTINGS_DIR } from "@main/utils/constants";
import { execFile } from "child_process";
import { app, BrowserWindow, IpcMainInvokeEvent, NativeImage, nativeImage, shell } from "electron";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "fs";
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
    brandShortcuts();
}

/* ---------- Windows: the taskbar, Start and search show Discord's shortcuts, not the window ----------
   So the Discord shortcuts (Start menu, Desktop, pinned taskbar) get the icon and, except the pinned one (renaming
   it would unpin it), the name. What they were is saved first and put back when switching to Discord again.
   Discord's updater recreates its shortcuts, so this is checked again at every start. */

const ICO_FILE = join(SETTINGS_DIR, "terono-app-icon.ico");
const LINKS_FILE = join(SETTINGS_DIR, "terono-shortcuts.json");
const DISCORD_ICO = join(dirname(dirname(process.execPath)), "app.ico");

interface SavedLink { dir: string; icon: string; iconIndex: number; name: string; current: string; }

// an .ico holding PNG images (Windows Vista+), which shortcuts need
function writeIco(img: NativeImage) {
    const sizes = [256, 64, 48, 32, 16];
    const pngs = sizes.map(n => img.resize({ width: n, height: n, quality: "best" }).toPNG());
    const head = Buffer.alloc(6 + 16 * sizes.length);
    head.writeUInt16LE(0, 0);
    head.writeUInt16LE(1, 2);
    head.writeUInt16LE(sizes.length, 4);
    let offset = head.length;
    sizes.forEach((n, i) => {
        const e = 6 + 16 * i;
        head.writeUInt8(n >= 256 ? 0 : n, e);
        head.writeUInt8(n >= 256 ? 0 : n, e + 1);
        head.writeUInt16LE(1, e + 4);
        head.writeUInt16LE(32, e + 6);
        head.writeUInt32LE(pngs[i].length, e + 8);
        head.writeUInt32LE(offset, e + 12);
        offset += pngs[i].length;
    });
    writeFileSync(ICO_FILE, Buffer.concat([head, ...pngs]));
}

function linkDirs() {
    const roaming = app.getPath("appData");
    return [
        { dir: join(roaming, "Microsoft", "Windows", "Start Menu", "Programs", "Discord Inc"), rename: true },
        { dir: join(roaming, "Microsoft", "Windows", "Start Menu", "Programs"), rename: true },
        { dir: app.getPath("desktop"), rename: true },
        { dir: join(roaming, "Microsoft", "Internet Explorer", "Quick Launch", "User Pinned", "TaskBar"), rename: false },
    ];
}

const isDiscordLink = (target: string, args: string) =>
    /[\\/]Discord[\\/](Update|Discord)\.exe$/i.test(target) && (!/Update\.exe$/i.test(target) || /Discord\.exe/i.test(args));

const safeName = (n: string) => n.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();

function brandShortcuts() {
    if (process.platform !== "win32") return;
    try {
        const saved: Record<string, SavedLink> = existsSync(LINKS_FILE) ? JSON.parse(readFileSync(LINKS_FILE, "utf8")) : {};
        const custom = appIcon && !appIcon.isEmpty();
        if (custom) writeIco(appIcon!);
        const name = safeName(appName);
        let changed = false;

        for (const { dir, rename } of linkDirs()) {
            if (!existsSync(dir)) continue;
            for (const file of readdirSync(dir)) {
                if (!file.toLowerCase().endsWith(".lnk")) continue;
                const path = join(dir, file);
                let link: Electron.ShortcutDetails;
                try { link = shell.readShortcutLink(path); } catch { continue; }
                if (!isDiscordLink(link.target, link.args ?? "")) continue;

                // first time: remember how it was; later found by its original or its current name in this folder
                const key = Object.keys(saved).find(k => saved[k].dir === dir && (saved[k].name === file || saved[k].current === file)) ?? `${dir}|${file}`;
                saved[key] ??= { dir, icon: link.icon ?? "", iconIndex: link.iconIndex ?? 0, name: file, current: file };
                const orig = saved[key];

                const icon = custom ? ICO_FILE : orig.icon;
                const iconIndex = custom ? 0 : orig.iconIndex;
                if ((link.icon ?? "") !== icon || (link.iconIndex ?? 0) !== iconIndex) {
                    shell.writeShortcutLink(path, "update", { ...link, icon, iconIndex });
                    changed = true;
                }

                if (rename) {
                    const wanted = name ? `${name}.lnk` : orig.name;
                    const target = join(dir, wanted);
                    if (wanted !== file) {
                        // Discord's updater may have put a fresh "Discord.lnk" next to a renamed one: keep one
                        if (existsSync(target)) unlinkSync(path);
                        else renameSync(path, target);
                        changed = true;
                    }
                    orig.current = wanted;
                }
            }
        }

        // back to plain Discord: nothing left to remember
        if (!custom && !name) {
            if (existsSync(LINKS_FILE)) rmSync(LINKS_FILE, { force: true });
            if (existsSync(ICO_FILE)) rmSync(ICO_FILE, { force: true });
        } else writeFileSync(LINKS_FILE, JSON.stringify(saved));

        // Explorer caches shortcut icons: ask it to refresh
        if (changed) execFile("ie4uinit.exe", ["-show"], { windowsHide: true }, () => { });
    } catch (e) {
        console.error("[Terono] shortcuts", e);
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
    brandShortcuts();
    return true;
}

{
    const s = RendererSettings.store.plugins?.Terono;
    if (s?.enabled) {
        appName = typeof s.appName === "string" ? s.appName.trim().slice(0, 40) : "";
        appIcon = iconFor(s.appIcon);
        // Discord's own updates recreate its shortcuts: brand them again (only if something is set or still to undo)
        if (appName || appIcon || existsSync(LINKS_FILE)) app.whenReady().then(brandShortcuts);
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
