/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { gitHash } from "@shared/vencordUserAgent";
import { copyToClipboard } from "@utils/clipboard";
import { showToast, Toasts } from "@webpack/common";

import { VERSION } from "./version";

// When something works on one PC and not another, this collects what differs (versions, Discord build, window,
// which parts of Discord's layout were found, errors while starting) so it can be pasted into a bug report.

const errors: string[] = [];

// run one start step; a failing step is recorded instead of stopping everything after it
export function safely(name: string, fn: () => unknown) {
    try {
        const r = fn();
        if (r instanceof Promise) r.catch(e => recordError(name, e));
    } catch (e) {
        recordError(name, e);
    }
}

export function recordError(name: string, e: unknown) {
    const msg = `${name}: ${e instanceof Error ? e.message : String(e)}`;
    if (errors.length < 30) errors.push(msg);
    console.error("[Terono]", msg, e);
}

// the parts of Discord Terono positions and paints (their class names change with Discord updates)
const PARTS: Record<string, string> = {
    app: ".base__5e434",
    serverList: ".guilds__5e434",
    channelColumn: ".sidebar__5e434",
    channelList: ".sidebarList__5e434",
    userPanel: ".panels__5e434",
    page: ".page__5e434",
    header: ".chat_f75fb0 > .subtitleContainer_f75fb0",
    chat: ".chatContent_f75fb0",
    memberList: ".container_c8ffbb",
    titleBar: ".bar_c38106",
    background: "#app-mount .bg__960e4",
};

function collect() {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const parts = Object.fromEntries(Object.entries(PARTS).map(([name, sel]) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) return [name, "missing"];
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return [name, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} ${cs.position}${cs.rotate !== "none" ? ` rotate ${cs.rotate}` : ""}`];
    }));
    const { profiles, ...terono } = Settings.plugins.Terono as Record<string, unknown>;

    return {
        terono: VERSION,
        vencord: gitHash,
        client: IS_DISCORD_DESKTOP ? "desktop" : IS_VESKTOP ? "vesktop" : "web",
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        releaseChannel: (window as any).GLOBAL_ENV?.RELEASE_CHANNEL,
        window: `${innerWidth}x${innerHeight} @${devicePixelRatio}x`,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        themeLinks: Settings.themeLinks,
        enabledThemes: Settings.enabledThemes,
        // set by the theme file: tells whether it loaded at all
        themeLoaded: body.getPropertyValue("--top-bar-height").trim() !== "",
        pluginRunning: document.documentElement.hasAttribute("data-dz-plugin"),
        attributes: Object.fromEntries(Object.entries(document.documentElement.dataset).filter(([k]) => k.startsWith("dz"))),
        vars: { topBar: body.getPropertyValue("--custom-app-top-bar-height").trim(), guildWidth: body.getPropertyValue("--custom-guild-list-width").trim(), accent: root.getPropertyValue("--dz-accent").trim() },
        parts,
        otherPlugins: Object.values(plugins).filter(p => !p.required && p.name !== "Terono" && isPluginEnabled(p.name)).map(p => p.name).sort(),
        errors,
        settings: terono,
    };
}

export function DebugInfo() {
    return (
        <div className="dz-debug">
            <p>Something doesn't work or looks broken? Copy this and paste it with a screenshot in the Terona Studios Discord. It lists your Terono, Vencord and Discord versions, your window size, your Terono settings and which parts of Discord Terono found. No messages, names or account details.</p>
            <Button size="small" onClick={async () => {
                await copyToClipboard("```json\n" + JSON.stringify(collect(), null, 1) + "\n```");
                showToast("Copied. Paste it in the Terona Studios Discord.", Toasts.Type.SUCCESS);
            }}>Copy debug info</Button>
        </div>
    );
}
