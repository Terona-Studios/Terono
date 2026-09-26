/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { useState } from "@webpack/common";

const SECTIONS: [string, string[]][] = [
    ["Chat", ["Translate", "MessageLogger", "SilentTyping", "PreviewMessage", "MessageClickActions", "CopyFileContents", "iLoveSpam", "BlurNSFW"]],
    ["Direct messages & people", ["PinDMs", "CopyUserURLs", "IgnoreActivities", "FakeProfileThemes"]],
    ["Servers", ["ShowHiddenChannels", "MemberCount", "PermissionsViewer", "BetterRoleContext", "BetterRoleDot", "ForceOwnerCrown"]],
    ["Media & voice", ["ImageZoom", "FixImagesQuality", "BiggerStreamPreview", "VoiceDownload", "CallTimer", "YoutubeAdblock"]],
    ["Uploads & privacy", ["BetterUploadButton", "AnonymiseFileNames", "AlwaysTrust"]],
    ["Client", ["BetterSettings", "BetterSessions", "CrashHandler", "LoadingQuotes", "ThemeAttributes", "Experiments"]],
];

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12, marginBottom: 20 } as const;

function MissingCard({ name }: { name: string; }) {
    return (
        <div style={{ padding: 12, borderRadius: 8, border: "1px dashed var(--border-subtle)", opacity: 0.6 }}>
            <HeadingTertiary>{name}</HeadingTertiary>
            <Paragraph>Not installed in this Vencord build. Settings are locked until it is installed and Discord is restarted.</Paragraph>
        </div>
    );
}

export function PluginHub() {
    const [restart, setRestart] = useState<string[]>([]);
    const pending = Object.values(plugins).filter(p => isPluginEnabled(p.name) && !p.started).map(p => p.name);
    const needsRestart = [...new Set([...restart, ...pending.filter(n => SECTIONS.some(([, l]) => l.includes(n)))])];

    return (
        <div>
            <Paragraph style={{ marginBottom: 12 }}>
                These are the official Vencord plugins Darkness is built around. They stay separate plugins (so Vencord keeps them updated); this is one place to switch and configure them.
            </Paragraph>

            {needsRestart.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, marginBottom: 16, borderRadius: 8, background: "color-mix(in srgb, var(--status-warning) 15%, transparent)" }}>
                    <Paragraph style={{ flex: 1 }}>Restart required to apply: {needsRestart.join(", ")}</Paragraph>
                    <button
                        onClick={() => location.reload()}
                        style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: "var(--dz-accent)", color: "#fff", fontWeight: 600 }}
                    >
                        Restart now
                    </button>
                </div>
            )}

            {SECTIONS.map(([title, names]) => (
                <div key={title}>
                    <HeadingTertiary style={{ marginBottom: 8 }}>{title}</HeadingTertiary>
                    <div style={grid}>
                        {names.map(name => {
                            const plugin = plugins[name];
                            return plugin
                                ? <PluginCard
                                    key={name}
                                    plugin={plugin}
                                    disabled={false}
                                    onRestartNeeded={n => setRestart(r => r.includes(n) ? r : [...r, n])}
                                />
                                : <MissingCard key={name} name={name} />;
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
