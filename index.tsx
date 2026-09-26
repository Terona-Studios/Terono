/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { addGlobalContextMenuPatch, GlobalContextMenuPatchCallback, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { plugins } from "@api/PluginManager";
import { Settings, SettingsStore } from "@api/Settings";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { GoogleLanguages } from "@plugins/translate/languages";
import { handleTranslate } from "@plugins/translate/TranslationAccessory";
import type { TranslationValue } from "@plugins/translate/utils";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, SelectedChannelStore, useEffect, UserStore } from "@webpack/common";

import { CREATOR_BADGE, VROCA_BADGE } from "./assets";
import { attachHeader, detachHeader, onHeaderClick } from "./header";
import { ACCENTS, applyAll, applyDarkerPalette, CARDS, DEFAULT_LOGO, loadStoredFiles, loadUploadedLogo, removeAll, settings } from "./settings";
import { announceUpdated, startAutoCheck, stopAutoCheck } from "./updater";
import { VERSION } from "./version";

/* ================= quick settings icon + header popouts =================
   The icon is a CSS ::after on the back/forward group (survives every re-render); a click on the
   group itself, right of the last arrow, can only be that icon. */

function onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.classList?.contains("backForwardButtons__63abb")) {
        const last = t.lastElementChild?.getBoundingClientRect();
        if (settings.store.quickIcon && (!last || e.clientX > last.right)) openPluginModal(plugins.Terono);
        return;
    }
    onHeaderClick(e);
}

/* ================= DM vs server (header layouts differ) ================= */

function syncChannelKind(channelId?: string | null) {
    const ch = channelId ? ChannelStore.getChannel(channelId) : null;
    const d = document.documentElement.dataset;
    if (ch && !ch.guild_id) d.dzDm = "";
    else delete d.dzDm;
    requestAnimationFrame(() => requestAnimationFrame(attachHeader));
}

/* ================= profile connections: dark-theme logos, favicons for custom domains ================= */

const faviconFallback = new Map<string, string>();

function isLightCard() {
    const s = settings.store;
    const text = s.cardPreset === "custom" ? s.textColor : CARDS[s.cardPreset]?.text ?? "#ffffff";
    const n = parseInt(text.slice(1), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
}

function connectionIcon(platform: any, account: any) {
    const icon = platform?.icon;
    if (!icon) return undefined;
    const themed = isLightCard() ? icon.lightPNG : icon.darkPNG ?? icon.lightPNG;
    if (account?.type !== "domain" || typeof account.name !== "string" || !/^[a-z0-9.-]{1,253}$/i.test(account.name)) return themed;

    // DuckDuckGo's favicon API is on Vencord's default allow-list, so every user of the plugin can load it
    const url = `https://icons.duckduckgo.com/ip3/${account.name.toLowerCase()}.ico`;
    faviconFallback.set(url, themed);
    return url;
}

// DuckDuckGo answers unknown domains with a 48x48 placeholder; show Discord's own icon instead
function connectionIconLoaded(e: { currentTarget: HTMLImageElement; type: string; }) {
    const img = e.currentTarget;
    const fallback = faviconFallback.get(img.src);
    if (fallback && (e.type === "error" || (img.naturalWidth === 48 && img.naturalHeight === 48))) img.src = fallback;
}

/* ================= context menus ================= */

const labelSet = (list: string) => new Set(list.split(",").map(x => x.trim().toLowerCase()).filter(Boolean));

function prune(children: any[], hide: Set<string>) {
    for (let i = children.length - 1; i >= 0; i--) {
        const c = children[i];
        if (!c) continue;
        if (Array.isArray(c)) { prune(c, hide); continue; }

        const { label } = c.props ?? {};
        if (typeof label === "string" && hide.has(label.toLowerCase())) {
            children.splice(i, 1);
            continue;
        }

        const sub = c.props?.children;
        if (Array.isArray(sub)) prune(sub, hide);
        else if (typeof sub?.props?.label === "string" && hide.has(sub.props.label.toLowerCase())) c.props.children = null;
    }
}

// global patches run after every per-menu patch, so items added by other plugins are caught too
const menuPatch: GlobalContextMenuPatchCallback = (navId, children) => {
    const s = settings.store;
    const scoped = navId === "guild-context" ? s.hiddenServerMenu
        : navId === "user-context" || navId === "gdm-context" ? s.hiddenUserMenu
            : "";
    const hide = labelSet(`${s.hiddenMenuItems},${scoped}`);
    if (hide.size) prune(children, hide);
};

/* ================= auto translate ================= */

const translated = new Map<string, TranslationValue | null>();
let queue: Promise<unknown> = Promise.resolve();

async function detectAndTranslate(text: string): Promise<TranslationValue | null> {
    // same public endpoint the Translate plugin uses
    const res = await fetch("https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
        "query.sourceLanguage": "auto",
        "query.targetLanguage": "en",
        "query.text": text,
    }));
    if (!res.ok) return null;

    const { sourceLanguage, translation }: { sourceLanguage?: string; translation?: string; } = await res.json();
    if (!sourceLanguage || labelSet(settings.store.keepLanguages).has(sourceLanguage.toLowerCase().split("-")[0])) return null;
    if (!translation || translation.trim().toLowerCase() === text.trim().toLowerCase()) return null;

    return { sourceLanguage: GoogleLanguages[sourceLanguage] ?? sourceLanguage, text: translation };
}

function show(id: string, value: TranslationValue) {
    try {
        handleTranslate(id, value);
    } catch {
        // Translate plugin disabled, or the message scrolled away
    }
}

function AutoTranslate({ message }: { message: Message; }) {
    useEffect(() => {
        if (!settings.store.autoTranslate || !message.content) return;
        if (message.author?.id === UserStore.getCurrentUser()?.id) return;

        const words = message.content.replace(/<[^>]+>|https?:\/\/\S+|:\w+:/g, "");
        if (!/\p{L}{2,}/u.test(words)) return;

        if (translated.has(message.id)) {
            const cached = translated.get(message.id);
            if (cached) show(message.id, cached);
            return;
        }

        let alive = true;
        // one request at a time so opening a busy channel doesn't hit Google's rate limit
        queue = queue.then(async () => {
            if (!alive) return;
            const result = await detectAndTranslate(message.content).catch(() => null);
            translated.set(message.id, result);
            if (result && alive) show(message.id, result);
        });
        return () => { alive = false; };
    }, [message.id]);

    return null;
}

/* ================= member list role header count ================= */

const ROLE_COUNT: Record<string, (n: string) => string> = {
    paren: n => `(${n})`,
    dot: n => `· ${n}`,
    bracket: n => `[${n}]`,
    space: n => n,
    dash: n => `— ${n}`,
};

function RoleCount({ count }: { count: string; }) {
    const { roleCount, roleCountCustom } = settings.use(["roleCount", "roleCountCustom"]);
    const text = roleCount === "custom"
        ? (roleCountCustom.includes("%users%") ? roleCountCustom.replaceAll("%users%", count) : "")
        : ROLE_COUNT[roleCount]?.(count) ?? "";
    return text ? <span className="dz-role-count">{text}</span> : null;
}

/* ================= creator badge ================= */

const CREATOR_ID = "1364930123656335402";

const creatorBadge: ProfileBadge = {
    id: "terono-creator",
    description: "Terono creator: made the theme & plugin you're using",
    iconSrc: CREATOR_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => userId === CREATOR_ID,
    props: { "data-dz-creator": "" } as ProfileBadge["props"],
};

const VROCA_ID = "899345095982194688";

const vrocaBadge: ProfileBadge = {
    id: "terono-vroca",
    description: "Vroca Macka",
    iconSrc: VROCA_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => userId === VROCA_ID,
    props: { "data-dz-vroca": "" } as ProfileBadge["props"],
};

// the glow ships with the plugin, so it works without waiting for the theme file to update
const BADGE_CSS = `
[data-dz-vroca] {
    border-radius: 50%;
    animation: dz-vroca-glow 2.4s ease-in-out infinite;
}
@keyframes dz-vroca-glow {
    0%, 100% { filter: drop-shadow(0 0 2px rgb(168 85 247 / 70%)); }
    50% { filter: drop-shadow(0 0 6px rgb(168 85 247 / 100%)) drop-shadow(0 0 3px rgb(217 70 239 / 85%)); }
}
html[data-dz-lite] [data-dz-vroca] {
    animation: none;
    filter: drop-shadow(0 0 3px rgb(168 85 247 / 90%));
}`;

let badgeStyle: HTMLStyleElement | null = null;

/* ================= live settings =================
   This Vencord build never calls a setting's onChange, so listen to the store and re-apply.
   Every apply step skips work when its output is unchanged, so this stays cheap. */

let pendingApply = 0;
function onSettingsChange(value: unknown, path: string) {
    if (path === "plugins.Terono.accentPreset" && typeof value === "string" && ACCENTS[value]) settings.store.accent = ACCENTS[value];
    if (!path.startsWith("plugins.Terono.") || pendingApply) return;
    pendingApply = requestAnimationFrame(() => {
        pendingApply = 0;
        applyAll();
    });
}

/* ================= migration from earlier versions ================= */

// The theme is loaded from the release tag that matches this plugin, not from @main: jsDelivr caches @main for up
// to 12 hours, so theme fixes reached people late and the theme could be newer or older than the plugin.
// The tag is v + VERSION (version.ts), bumped together with each release.
const THEME_VERSION = `v${VERSION}`;
const THEME_LINK = `https://cdn.jsdelivr.net/gh/Terona-Studios/Terono@${THEME_VERSION}/theme/Terono.theme.css`;
const THEME_LINK_RE = /^https:\/\/cdn\.jsdelivr\.net\/gh\/Terona-Studios\/Terono@[\w.-]+\/theme\/Terono\.theme\.css$/;

async function migrate() {
    const raw = Settings.plugins.Terono as Record<string, any>;
    if (raw.dzVersion === 7) return;
    if (raw.dzVersion !== 6) await migrateLegacy(raw);

    // first start: add the theme once (the browser extension has no installer to do it);
    // removing it afterwards sticks
    if (!Settings.themeLinks.some(l => THEME_LINK_RE.test(l))) Settings.themeLinks = [...Settings.themeLinks, THEME_LINK];
    raw.dzVersion = 7;
}

// every start: point an existing Terono theme link at this version (never adds one back)
function pinThemeLink() {
    const links = Settings.themeLinks;
    if (links.some(l => THEME_LINK_RE.test(l) && l !== THEME_LINK)) {
        const pinned = links.map(l => THEME_LINK_RE.test(l) ? THEME_LINK : l);
        Settings.themeLinks = pinned.filter((l, i) => pinned.indexOf(l) === i);
    }

    // an old local copy (from earlier setups) next to the link loads the whole theme twice: double the style
    // work on every page switch, and its outdated rules win over the link's
    const local = /^(terono|darkness)\.theme\.css$/i;
    if (Settings.themeLinks.some(l => THEME_LINK_RE.test(l)) && Settings.enabledThemes.some(t => local.test(t)))
        Settings.enabledThemes = Settings.enabledThemes.filter(t => !local.test(t));
}

async function migrateLegacy(raw: Record<string, any>) {
    // settings from the old "Darkness" plugin name
    const old = Settings.plugins.Darkness as Record<string, any> | undefined;
    if (old && typeof old.dzVersion === "number" && raw.dzVersion === undefined) {
        for (const [k, v] of Object.entries(old)) if (k !== "enabled") raw[k] = v;
        for (const key of ["homeLogo", "profiles"]) {
            const v = await DataStore.get(`Darkness_${key}`);
            if (v !== undefined) await DataStore.set(`Terono_${key}`, v);
        }
    }

    if (typeof raw.homeLogo === "string") raw.logoUrl = raw.homeLogo;
    if (typeof raw.secondary === "string") raw.bgColor2 = raw.secondary;
    if (raw.animatedBackground === false) raw.background = "static";
    if (typeof raw.accent === "string" && !Object.values(ACCENTS).includes(raw.accent.toLowerCase())) raw.accentPreset ??= "custom";
    if (typeof raw.cardColor === "string" && !Object.values(CARDS).some(c => c.card === raw.cardColor.toLowerCase())) raw.cardPreset ??= "custom";

    // DM header got its own layout
    if (raw.dmHeaderName === undefined) {
        raw.dmHeaderName = raw.hideDmName === false ? raw.headerName ?? "left" : "hidden";
        raw.dmHeaderButtons = raw.headerButtons ?? "left";
        raw.dmHeaderSearch = raw.headerSearch ?? "right";
    }

    if (typeof raw.logoUrl !== "string" || /postimg\.cc\/(0yPDxpRb|Sxd1C6WT|6py1Lxtb)\//.test(raw.logoUrl) || raw.logoUrl === DEFAULT_LOGO) raw.logoUrl = "";
    if (raw.dzVersion === undefined || raw.dzVersion < 4) raw.logoSource = "url";
    if (raw.serverList === "horizontal") raw.serverList = "top";
    else if (raw.serverList === "vertical") raw.serverList = "left";

    for (const k of ["homeLogo", "secondary", "animatedBackground", "gifFirst", "preset", "hideDmName"]) delete raw[k];
}

/* ================= plugin ================= */

export default definePlugin({
    name: "Terono",
    description: "Companion for the Terono theme by Terona Studios: colors, cards, card media, background, layout, header, home logo, loading screens, chat bar, activities, menu cleanup, auto-translate, profiles and a hub for the plugins it pairs with.",
    authors: [{ name: "Terona Studios", id: 0n }],
    enabledByDefault: true,
    settings,

    // "Start an Activity": conditional renders at the call sites (toggling never breaks hook order)
    patches: [
        {
            // call view control tray
            find: "CenterControlTray",
            replacement: {
                match: /!(\i)&&(\(0,\i\.jsx\)\(\i,\{channel:\i,idle:)/,
                replace: "!$1&&$self.showActivities()&&$2",
            },
        },
        {
            // voice panel button row
            find: /canGoLive:\i,enableActivities:\i,disabled:/,
            replacement: {
                match: /(\i)&&(\(0,\i\.jsx\)\(\i,\{channel:\i,enableActivities:\i\}\))/,
                replace: "$1&&$self.showActivities()&&$2",
            },
        },
        {
            // "Choose Activity" tile in the call grid
            find: /\{dismissedActivityEntryPointTileChannel:\i\}=/,
            replacement: [
                {
                    match: /\i>=2&&\i&&!\i&&!\i\?/,
                    replace: "$self.showActivities()&&$&",
                },
                {
                    match: /\i&&1===\i&&\i&&\i\.push/,
                    replace: "$self.showActivities()&&$&",
                },
            ],
        },
        {
            // member list role header: "Founder — 1" -> configurable format
            find: /title:\i,count:\i,guildId:\i,className:\i\}=\i/,
            replacement: {
                match: /null==(\i)\?null:\(0,(\i)\.jsxs\)\("span",\{children:\["\\xa0\\u2014 ",\i\]\}\)/,
                replace: "null==$1?null:(0,$2.jsx)($self.RoleCount,{count:$1})",
            },
        },
        {
            // profile connections: Discord always uses the logo made for a white circle
            find: /platformIcon:\i\?\.icon\.lightPNG/,
            replacement: [
                {
                    match: /platformIcon:(\i)\?\.icon\.lightPNG/,
                    replace: "platformIcon:$self.connectionIcon($1,arguments[0]?.account)",
                },
                {
                    match: /(className:\i\(\)\(\i\.\i,\i\?\i\.\i:null\),src:\i)\}/,
                    replace: "$1,onLoad:$self.connectionIconLoaded,onError:$self.connectionIconLoaded}",
                },
            ],
        },
    ],

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string | null; }) {
            syncChannelKind(channelId);
        },
    },

    showActivities: () => settings.store.showActivities,
    connectionIcon,
    connectionIconLoaded,
    RoleCount,

    renderMessageAccessory: props => <AutoTranslate message={props.message} />,

    async start() {
        await migrate();
        pinThemeLink();
        applyAll();
        applyDarkerPalette();
        loadUploadedLogo();
        loadStoredFiles();
        SettingsStore.addGlobalChangeListener(onSettingsChange);
        addProfileBadge(creatorBadge);
        addProfileBadge(vrocaBadge);
        badgeStyle = Object.assign(document.createElement("style"), { id: "terono-badges", textContent: BADGE_CSS });
        document.head.append(badgeStyle);
        addGlobalContextMenuPatch(menuPatch);
        document.addEventListener("click", onDocClick, true);
        syncChannelKind(SelectedChannelStore.getChannelId());

        announceUpdated(settings.store.lastVersion);
        settings.store.lastVersion = VERSION;
        startAutoCheck(() => settings.store.autoUpdateCheck);
    },

    stop() {
        removeGlobalContextMenuPatch(menuPatch);
        SettingsStore.removeGlobalChangeListener(onSettingsChange);
        removeProfileBadge(creatorBadge);
        removeProfileBadge(vrocaBadge);
        badgeStyle?.remove();
        badgeStyle = null;
        document.removeEventListener("click", onDocClick, true);
        detachHeader();
        stopAutoCheck();
        removeAll();
    },
});
