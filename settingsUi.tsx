/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The Terono settings screen: tabs by topic instead of one long list. Every option is still a normal Vencord
// setting (so profiles, reset and live apply work as before); this only decides where each one is shown, and
// draws it with Vencord's own setting controls.

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionComponentMap } from "@components/settings/tabs/plugins/components";
import { Alerts, showToast, Toasts, useEffect, useState } from "@webpack/common";

import { applyPreset, Preset, presetMatches, PRESETS,presetValues } from "./presets";
import { settings, useSettingsRevision } from "./settings";
import { UpdatePanel } from "./updater";
import { VERSION } from "./version";

interface Group { title?: string; keys: string[]; }
interface Tab { id: string; label: string; intro: string; groups?: Group[]; }

const TABS: Tab[] = [
    { id: "presets", label: "Presets", intro: "Complete looks in one click. Apply one, then change anything you like in the other tabs." },
    {
        id: "colors", label: "Colors", intro: "The primary color used for buttons, links, mentions and glow, plus status and window colors.",
        groups: [
            { title: "Primary color", keys: ["accentPreset", "accent"] },
            { title: "Status & window buttons", keys: ["voice", "close", "minimize", "maximize"] },
        ],
    },
    {
        id: "cards", label: "Cards", intro: "The panels: their color, corners, glass effect and an optional picture or video inside them.",
        groups: [
            { title: "Card colors", keys: ["cardPreset", "cardFill", "cardColor", "cardColor2", "cardAngle", "textColor"] },
            { title: "Shape & material", keys: ["cardShape", "cardStyle", "glassOpacity", "glassBlur"] },
            { title: "Picture or video in the cards", keys: ["cardMedia", "cardMediaUrl", "cardMediaFile", "cardMediaDim"] },
        ],
    },
    {
        id: "background", label: "Background", intro: "What's behind the panels.",
        groups: [
            { title: "Type", keys: ["background"] },
            { title: "Picture, GIF or video", keys: ["bgMediaSource", "bgMediaUrl", "bgMediaFile", "bgMediaDim"] },
            { title: "Colors", keys: ["bgBase", "bgColor1", "bgColor2"] },
        ],
    },
    {
        id: "layout", label: "Layout", intro: "Where the server list, channel list and member list sit.",
        groups: [{ keys: ["serverList", "channelsSide", "membersSide"] }],
    },
    {
        id: "header", label: "Header", intro: "The bar above the chat: channel name, buttons and search, separately for servers and DMs.",
        groups: [
            { title: "In servers", keys: ["headerName", "headerHash", "headerButtons", "headerSearch", "headerFollow"] },
            { title: "In DMs", keys: ["dmHeaderName", "dmHeaderButtons", "dmHeaderSearch"] },
            { title: "Hidden buttons", keys: ["headerHiddenButtons"] },
        ],
    },
    {
        id: "chat", label: "Chat & Members", intro: "Chat bar buttons, the member list and activities.",
        groups: [
            { title: "Chat bar buttons", keys: ["chatTranslate", "chatGif", "chatEmoji", "chatSticker", "chatGift", "chatApps", "chatOtherVencord"] },
            { title: "Member list", keys: ["roleCount", "roleCountCustom"] },
            { title: "Activities", keys: ["showActivities"] },
        ],
    },
    {
        id: "branding", label: "Font & Logo", intro: "Font, home logo, the quick settings icon and loading screens.",
        groups: [
            { title: "Font", keys: ["font", "fontFile"] },
            { title: "Home logo", keys: ["logoSource", "logoUrl", "logoFile", "logoSize"] },
            { title: "Icon & loading screens", keys: ["quickIcon", "loadingScreen"] },
        ],
    },
    {
        id: "menus", label: "Menus", intro: "Hide right-click menu items by their name, comma separated.",
        groups: [{ keys: ["hiddenMenuItems", "hiddenServerMenu", "hiddenUserMenu"] }],
    },
    {
        id: "extras", label: "Extras", intro: "Auto-translate, performance and updates.",
        groups: [
            { title: "Translate", keys: ["autoTranslate", "keepLanguages"] },
            { title: "Performance", keys: ["lite"] },
            { title: "Updates", keys: ["autoUpdateCheck"] },
        ],
    },
    { id: "profiles", label: "Profiles", intro: "Save your look, switch between saved looks, share them as files.", groups: [{ keys: ["profiles"] }] },
    { id: "plugins", label: "Plugins", intro: "Vencord plugins that go well with Terono, in one place.", groups: [{ keys: ["pluginHub"] }] },
];

let lastTab = "presets";

/* ================= screen ================= */

export function TeronoSettings() {
    const [tab, setTab] = useState(lastTab);
    const rev = useSettingsRevision();
    settings.use(); // re-render on every change so options that depend on others appear and disappear
    useEffect(ensureCss, []);

    const current = TABS.find(t => t.id === tab) ?? TABS[0];
    const pick = (id: string) => { lastTab = id; setTab(id); };

    return (
        <div className="dz-set">
            <UpdatePanel />
            <nav className="dz-set-tabs" role="tablist">
                {TABS.map(t => (
                    <button key={t.id} role="tab" aria-selected={t.id === current.id} className="dz-set-tab" onClick={() => pick(t.id)}>{t.label}</button>
                ))}
            </nav>
            <p className="dz-set-intro">{current.intro}</p>
            <div key={`${current.id}:${rev}`} className="dz-set-body">
                {current.id === "presets" ? <PresetGallery /> : current.groups!.map((g, i) => <GroupBox key={i} group={g} />)}
            </div>
        </div>
    );
}

function GroupBox({ group }: { group: Group; }) {
    const keys = group.keys.filter(visible);
    if (!keys.length) return null;
    return (
        <section className="dz-set-group">
            {group.title && <h3 className="dz-set-group-title">{group.title}</h3>}
            <div className="vc-plugins-settings">{keys.map(k => <Option key={k} id={k} />)}</div>
        </section>
    );
}

// each option keeps its own "show only when…" rule (moved to dzHidden, since `hidden` now keeps it out of the plain list)
function visible(id: string) {
    const def = (settings.def as Record<string, any>)[id];
    if (!def) return false;
    const rule = def.dzHidden;
    return !(typeof rule === "function" ? rule() : rule);
}

function Option({ id }: { id: string; }) {
    const def = (settings.def as Record<string, any>)[id];
    const Component = OptionComponentMap[def.type as keyof typeof OptionComponentMap] as any;
    return (
        <ErrorBoundary noop>
            <Component
                id={id}
                setting={def}
                onChange={(v: unknown) => { (settings.store as Record<string, unknown>)[id] = v; }}
                pluginSettings={settings.store}
                definedSettings={settings}
                closePluginSettings={() => { }}
            />
        </ErrorBoundary>
    );
}

/* ================= presets ================= */

// screenshots of each preset, from the release this plugin is (jsDelivr is on Vencord's default allow-list)
const thumb = (id: string) => `https://cdn.jsdelivr.net/gh/Terona-Studios/Terono@v${VERSION}/assets/presets/${id}.jpg`;

function PresetGallery() {
    const basedOn = (settings.store as Record<string, unknown>).presetId as string | undefined;
    return (
        <div className="dz-presets">
            {PRESETS.map(p => {
                const active = presetMatches(p);
                const tag = active ? "In use" : p.id === basedOn ? "Customized" : null;
                return (
                    <div key={p.id} className={`dz-preset${active ? " dz-preset-active" : ""}`}>
                        <div className="dz-preset-img" style={{ background: swatch(p) }}>
                            <img src={thumb(p.id)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />
                            {tag && <span className="dz-preset-tag">{tag}</span>}
                        </div>
                        <div className="dz-preset-body">
                            <div className="dz-preset-name">{p.name}</div>
                            <div className="dz-preset-desc">{p.description}</div>
                        </div>
                        <Button size="small" variant={active ? "secondary" : "primary"} onClick={() => confirmApply(p)}>
                            {active ? "Re-apply" : "Apply"}
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

// shown while the screenshot loads (or if it can't): the preset's own colors
function swatch(p: Preset) {
    const v = presetValues(p) as Record<string, string>;
    const card = v.cardPreset === "white" ? "#f4f5f7" : v.cardPreset === "gray" ? "#1e1f22" : v.cardPreset === "custom" ? v.cardColor : "#070708";
    return `radial-gradient(circle at 25% 30%, ${v.bgColor1}55, transparent 55%), radial-gradient(circle at 80% 75%, ${v.bgColor2}, transparent 60%), linear-gradient(${card}, ${card}) 12% 22% / 76% 60% no-repeat, ${v.bgBase}`;
}

function confirmApply(p: Preset) {
    Alerts.show({
        title: `Apply ${p.name}?`,
        body: "This replaces your colors, cards, background, layout, header and font with the preset's. Your logo, menus, chat bar buttons and other options stay. To keep your current look, save it under Profiles first.",
        confirmText: "Apply",
        cancelText: "Cancel",
        onConfirm() {
            applyPreset(p);
            showToast(`${p.name} applied. Change anything you like in the other tabs.`, Toasts.Type.SUCCESS);
        },
    });
}

/* ================= styles ================= */

let css: HTMLStyleElement | null = null;

function ensureCss() {
    if (css?.isConnected) return;
    css = document.createElement("style");
    css.id = "terono-settings-ui";
    css.textContent = CSS;
    document.head.append(css);
}

const CSS = `
.dz-set { display: flex; flex-direction: column; gap: 12px; }
.dz-set-tabs { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0;
    background: var(--modal-background, var(--background-base-low, #111)); }
.dz-set-tab { padding: 7px 13px; border-radius: 999px; cursor: pointer; font: 600 13px var(--font-primary, "gg sans", sans-serif);
    color: var(--text-muted, #aaa); background: color-mix(in srgb, var(--dz-text, #f1f2f4) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 8%, transparent); transition: background 140ms ease, color 140ms ease, transform 140ms ease; }
.dz-set-tab:hover { color: var(--text-default, #fff); background: color-mix(in srgb, var(--dz-text, #f1f2f4) 11%, transparent); }
.dz-set-tab:active { transform: scale(.97); }
.dz-set-tab[aria-selected="true"] { color: #fff; border-color: transparent; background: var(--dz-accent, #429cff);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--dz-accent, #429cff) 35%, transparent); }
.dz-set-tab:focus-visible { outline: 2px solid var(--dz-accent, #429cff); outline-offset: 2px; }
.dz-set-intro { margin: 0; color: var(--text-muted, #aaa); font-size: 14px; }
.dz-set-body { display: flex; flex-direction: column; gap: 14px; animation: dz-set-in 180ms ease both; }
.dz-set-group { padding: 4px 16px 8px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 8%, transparent);
    background: color-mix(in srgb, var(--dz-text, #f1f2f4) 2.5%, transparent); }
.dz-set-group-title { margin: 12px 0 2px; font: 700 12px var(--font-primary, "gg sans", sans-serif); letter-spacing: .06em; text-transform: uppercase;
    color: var(--dz-accent, #429cff); }

.dz-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.dz-preset { display: flex; flex-direction: column; gap: 10px; padding: 10px; border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--dz-text, #f1f2f4) 8%, transparent); background: color-mix(in srgb, var(--dz-text, #f1f2f4) 3%, transparent);
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
.dz-preset:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dz-accent, #429cff) 45%, transparent);
    box-shadow: 0 10px 26px rgb(0 0 0 / 30%); }
.dz-preset-active { border-color: var(--dz-accent, #429cff); box-shadow: 0 0 0 1px var(--dz-accent, #429cff) inset; }
.dz-preset-img { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; }
.dz-preset-img img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dz-preset-tag { position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: 999px; font: 700 11px var(--font-primary, "gg sans", sans-serif);
    color: #fff; background: var(--dz-accent, #429cff); box-shadow: 0 2px 8px rgb(0 0 0 / 35%); }
.dz-preset-body { flex: 1; min-height: 0; }
.dz-preset-name { font: 700 15px var(--font-primary, "gg sans", sans-serif); color: var(--text-default, #fff); }
.dz-preset-desc { margin-top: 3px; font-size: 13px; line-height: 1.4; color: var(--text-muted, #aaa); }
.dz-preset > button { align-self: stretch; }

@keyframes dz-set-in { from { opacity: 0; transform: translateY(4px); } }
@media (prefers-reduced-motion: reduce) { .dz-set-body { animation: none; } .dz-preset, .dz-set-tab { transition: none; } }`;
