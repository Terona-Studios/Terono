/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Button } from "@components/Button";
import { PluginNative } from "@utils/types";
import { showToast, Toasts, useEffect, useState } from "@webpack/common";

import { TERONO_LOGO } from "./assets";
import { settings } from "./settings";

// Make Discord your own app: its name in the window title, its window / taskbar icon, and any icon inside it
// swapped for your own picture. The desktop app does the title and window icon in the main process (native.ts);
// in the browser the tab title and tab icon change instead.

const Native = IS_DISCORD_DESKTOP ? VencordNative.pluginHelpers.Terono as PluginNative<typeof import("./native")> : null;

const SWAPS_KEY = "Terono_iconSwaps";
const APP_ICON_KEY = "Terono_appIcon";

// places you can give your own icon; "custom:<name>" entries match any button by its name (the hover text)
export const ICON_SPOTS: [key: string, label: string, selector: string][] = [
    ["friends", "Friends", 'a[href="/channels/@me"] svg'],
    ["shop", "Shop", 'a[href="/shop"] svg'],
    ["nitro", "Nitro", 'a[href="/store"] svg'],
    ["addServer", "Add a Server", '[data-list-item-id="guildsnav___create-join-button"] svg'],
    ["discover", "Discover", '[data-list-item-id="guildsnav___guild-discover-button"] svg'],
    ["mute", "Microphone", ':is(button[aria-label="Mute"], button[aria-label="Unmute"]) svg'],
    ["deafen", "Headphones", ':is(button[aria-label="Deafen"], button[aria-label="Undeafen"]) svg'],
    ["settings", "User settings", '[aria-label="User Settings"] svg'],
    ["inbox", "Inbox", '[aria-label="Inbox"] svg'],
    ["help", "Help", '[aria-label="Help"] svg'],
    ["pins", "Pinned messages", '[aria-label="Pinned Messages"] svg'],
    ["members", "Member list", ':is([aria-label="Show Member List"], [aria-label="Hide Member List"]) svg'],
];

let swaps: Record<string, string> = {};
let appIconData: string | null = null;
let css: HTMLStyleElement | null = null;
let titleObs: MutationObserver | null = null;
let favicon: HTMLLinkElement | null = null;
let originalFavicon: string | null = null;

const cssString = (v: string) => v.replace(/["\\\n\r]/g, "");

function selectorFor(key: string) {
    if (key.startsWith("custom:")) return `[aria-label="${cssString(key.slice(7))}" i] svg`;
    return ICON_SPOTS.find(s => s[0] === key)?.[2];
}

function applySwaps() {
    const rules = Object.entries(swaps).flatMap(([key, url]) => {
        const sel = selectorFor(key);
        return sel ? [`html ${sel} { background: url("${url}") center / contain no-repeat !important; } html ${sel} > * { visibility: hidden !important; }`] : [];
    });
    if (!css) css = document.head.appendChild(Object.assign(document.createElement("style"), { id: "terono-icons" }));
    css.textContent = rules.join("\n");
}

/* ---------- title + app icon ---------- */

function webTitle() {
    const name = settings.store.appName.trim();
    if (name && /\bDiscord\b/.test(document.title)) document.title = document.title.replace(/\bDiscord\b/g, () => name);
}

function webIcon(url: string | null) {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) return;
    originalFavicon ??= link.href;
    favicon = link;
    link.href = url ?? originalFavicon;
}

export function applyAppIdentity() {
    const s = settings.store;
    const icon = s.appIcon === "terono" ? TERONO_LOGO : s.appIcon === "file" ? appIconData : null;
    if (Native) {
        Native.setAppName(s.appName ?? "").catch(() => { });
        Native.setAppIcon(s.appIcon ?? "discord", s.appIcon === "file" ? appIconData ?? undefined : undefined).catch(() => { });
    } else {
        webTitle();
        titleObs ??= new MutationObserver(webTitle);
        const title = document.querySelector("title");
        if (title) titleObs.observe(title, { childList: true, characterData: true, subtree: true });
        webIcon(icon);
    }
}

export async function startBranding() {
    swaps = await DataStore.get(SWAPS_KEY) ?? {};
    appIconData = await DataStore.get(APP_ICON_KEY) ?? null;
    applySwaps();
    applyAppIdentity();
}

export function stopBranding() {
    css?.remove();
    css = null;
    titleObs?.disconnect();
    titleObs = null;
    if (favicon && originalFavicon) favicon.href = originalFavicon;
    if (Native) {
        Native.setAppName("").catch(() => { });
        Native.setAppIcon("discord").catch(() => { });
    }
}

/* ---------- pictures ---------- */

// any image -> square PNG of the given size, fitted inside and centered
async function toPng(file: File, size: number) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const k = size / Math.max(bmp.width, bmp.height);
    ctx.drawImage(bmp, (size - bmp.width * k) / 2, (size - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
    bmp.close();
    return canvas.toDataURL("image/png");
}

function pickImage(onPicked: (file: File) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/")) return showToast("Pick an image file.", Toasts.Type.FAILURE);
        if (f.size > 20 * 1024 * 1024) return showToast("Image must be 20 MB or smaller.", Toasts.Type.FAILURE);
        onPicked(f);
    };
    input.click();
}

export function AppIconFile() {
    const [preview, setPreview] = useState(appIconData);
    return (
        <div className="dz-appicon">
            {preview ? <img src={preview} alt="" /> : <span className="dz-appicon-empty">No picture yet</span>}
            <Button size="small" onClick={() => pickImage(async f => {
                try {
                    const url = await toPng(f, 256);
                    appIconData = url;
                    await DataStore.set(APP_ICON_KEY, url);
                    setPreview(url);
                    settings.store.appIcon = "file";
                    applyAppIdentity();
                    showToast("App icon changed.", Toasts.Type.SUCCESS);
                } catch {
                    showToast("That image couldn't be read.", Toasts.Type.FAILURE);
                }
            })}>Choose picture</Button>
        </div>
    );
}

export function IconSwaps() {
    const [map, setMap] = useState<Record<string, string>>(swaps);
    const [name, setName] = useState("");
    useEffect(() => { setMap({ ...swaps }); }, []);

    async function save(next: Record<string, string>) {
        swaps = next;
        setMap({ ...next });
        applySwaps();
        await DataStore.set(SWAPS_KEY, next);
    }
    const choose = (key: string) => pickImage(async f => {
        try {
            await save({ ...swaps, [key]: await toPng(f, 64) });
        } catch {
            showToast("That image couldn't be read.", Toasts.Type.FAILURE);
        }
    });
    const reset = (key: string) => {
        const { [key]: _, ...rest } = swaps;
        save(rest);
    };
    const custom = Object.keys(map).filter(k => k.startsWith("custom:"));

    return (
        <div className="dz-swaps">
            <div className="dz-swap-grid">
                {ICON_SPOTS.map(([key, label]) => (
                    <div key={key} className="dz-swap">
                        <div className="dz-swap-pic">{map[key] ? <img src={map[key]} alt="" /> : <span>Default</span>}</div>
                        <div className="dz-swap-label">{label}</div>
                        <div className="dz-swap-actions">
                            <button onClick={() => choose(key)}>Change</button>
                            {map[key] && <button onClick={() => reset(key)}>Reset</button>}
                        </div>
                    </div>
                ))}
                {custom.map(key => (
                    <div key={key} className="dz-swap">
                        <div className="dz-swap-pic"><img src={map[key]} alt="" /></div>
                        <div className="dz-swap-label">{key.slice(7)}</div>
                        <div className="dz-swap-actions">
                            <button onClick={() => choose(key)}>Change</button>
                            <button onClick={() => reset(key)}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="dz-swap-add">
                <input placeholder="Any other button: its name as shown when you hover it, e.g. Start Video Call" value={name} maxLength={60} onChange={e => setName(e.currentTarget.value)} />
                <Button size="small" disabled={!name.trim()} onClick={() => { const key = `custom:${name.trim()}`; setName(""); choose(key); }}>Choose picture</Button>
            </div>
        </div>
    );
}

export const BRANDING_CSS = `
.dz-appicon { display: flex; align-items: center; gap: 14px; padding: 6px 0 12px; }
.dz-appicon img { width: 48px; height: 48px; border-radius: 10px; }
.dz-appicon-empty { font-size: 13px; color: var(--text-muted, #aaa); }
.dz-swaps { padding: 6px 0 12px; }
.dz-swap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.dz-swap { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 8px; border-radius: 12px; text-align: center;
    background: color-mix(in srgb, var(--dz-text, #f1f2f4) 4%, transparent); border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 8%, transparent); }
.dz-swap-pic { display: grid; place-items: center; width: 36px; height: 36px; }
.dz-swap-pic img { width: 28px; height: 28px; }
.dz-swap-pic span { font-size: 11px; color: var(--text-muted, #aaa); }
.dz-swap-label { font-size: 13px; font-weight: 600; color: var(--text-default, #fff); }
.dz-swap-actions { display: flex; gap: 6px; }
.dz-swap-actions button { padding: 3px 9px; border-radius: 8px; cursor: pointer; font: 600 12px var(--font-primary, "gg sans", sans-serif);
    color: var(--text-default, #fff); background: color-mix(in srgb, var(--dz-text, #f1f2f4) 9%, transparent); }
.dz-swap-actions button:hover { background: color-mix(in srgb, var(--dz-accent, #429cff) 30%, transparent); }
.dz-swap-add { display: flex; gap: 8px; margin-top: 10px; }
.dz-swap-add input { flex: 1; height: 34px; padding: 0 10px; border-radius: 8px; font: 500 13px var(--font-primary, "gg sans", sans-serif); color: var(--text-default, #fff);
    background: color-mix(in srgb, var(--dz-text, #f1f2f4) 5%, transparent); border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 10%, transparent); outline: none; }
.dz-swap-add input:focus { border-color: var(--dz-accent, #429cff); }`;
