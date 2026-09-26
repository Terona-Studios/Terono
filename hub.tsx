/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { hasAnyVisibleSettings, isPluginEnabled, pluginRequiresRestart, plugins, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { Switch } from "@components/Switch";
import { Plugin } from "@utils/types";
import { showToast, Toasts, useState } from "@webpack/common";

// Official Vencord plugins that go well with Terono. They stay separate plugins (Vencord keeps them updated);
// this is one quick place to switch and set them up.
const SECTIONS: [string, string[]][] = [
    ["Chat", ["Translate", "MessageLogger", "SilentTyping", "PreviewMessage", "MessageClickActions", "CopyFileContents", "BlurNSFW"]],
    ["Direct messages & people", ["PinDMs", "CopyUserURLs", "IgnoreActivities", "FakeProfileThemes"]],
    ["Servers", ["ShowHiddenChannels", "MemberCount", "PermissionsViewer", "BetterRoleContext", "BetterRoleDot", "ForceOwnerCrown"]],
    ["Media & voice", ["ImageZoom", "FixImagesQuality", "BiggerStreamPreview", "VoiceDownload", "CallTimer", "YoutubeAdblock"]],
    ["Uploads & privacy", ["BetterUploadButton", "AnonymiseFileNames", "AlwaysTrust"]],
    ["Client", ["BetterSettings", "BetterSessions", "CrashHandler", "LoadingQuotes", "ThemeAttributes", "Experiments"]],
];

/* ================= switching =================
   Same rules as Vencord's own plugin list: plugins that patch Discord's code only change after a restart (the
   setting flips now, the Updates box offers the restart); the others start or stop right away. */

function toggle(p: Plugin): boolean {
    const settings = Settings.plugins[p.name];
    const was = isPluginEnabled(p.name);

    if (!was) {
        const { restartNeeded, failures } = startDependenciesRecursive(p);
        if (failures.length) {
            showToast(`Couldn't turn on what ${p.name} needs: ${failures.join(", ")}`, Toasts.Type.FAILURE);
            return was;
        }
        if (restartNeeded) {
            settings.enabled = true;
            return true;
        }
    }

    if (pluginRequiresRestart(p) || (was && !p.started)) {
        settings.enabled = !was;
        return !was;
    }

    const ok = was ? stopPlugin(p) : startPlugin(p);
    if (!ok) {
        settings.enabled = false;
        showToast(`${p.name} couldn't be ${was ? "turned off" : "turned on"}. Restart Discord and try again.`, Toasts.Type.FAILURE);
        return false;
    }
    settings.enabled = !was;
    return !was;
}

/* ================= list ================= */

function Row({ plugin }: { plugin: Plugin; }) {
    // shown right away; the plugin catches up in the background (or after the restart)
    const [on, setOn] = useState(() => isPluginEnabled(plugin.name));
    const locked = !!plugin.required;

    return (
        <div className={`dz-hub-row${on ? " dz-hub-on" : ""}`}>
            <div className="dz-hub-text">
                <div className="dz-hub-name">{plugin.name}</div>
                <div className="dz-hub-desc">{plugin.description}</div>
            </div>
            {hasAnyVisibleSettings(plugin) && (
                <button className="dz-hub-gear" aria-label={`${plugin.name} settings`} onClick={() => openPluginModal(plugin)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.7 7.7 0 0 0-1.7-1L15 3.2h-4l-.4 2.7a7.7 7.7 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.7h4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" /></svg>
                </button>
            )}
            <Switch checked={on} disabled={locked} onChange={() => setOn(toggle(plugin))} />
        </div>
    );
}

function Missing({ name }: { name: string; }) {
    return (
        <div className="dz-hub-row dz-hub-missing">
            <div className="dz-hub-text">
                <div className="dz-hub-name">{name}</div>
                <div className="dz-hub-desc">Not in this Vencord build.</div>
            </div>
        </div>
    );
}

export function PluginHub() {
    return (
        <div className="dz-hub">
            {SECTIONS.map(([title, names]) => (
                <section key={title} className="dz-set-group">
                    <h3 className="dz-set-group-title">{title}</h3>
                    <div className="dz-hub-list">
                        {names.map(name => plugins[name] ? <Row key={name} plugin={plugins[name]} /> : <Missing key={name} name={name} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}

/* ================= restart needed =================
   A plugin whose setting doesn't match what's running (turned on but not started, or turned off but still
   running) waits for a restart. Covers changes made here and in Vencord's own plugin list. */

export function pluginsWaitingForRestart() {
    return Object.values(plugins)
        .filter(p => !p.required && !p.isDependency && isPluginEnabled(p.name) !== !!p.started)
        .map(p => p.name)
        .sort();
}
