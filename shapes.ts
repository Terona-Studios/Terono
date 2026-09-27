/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore } from "@webpack/common";

/* ================= mention glow follows the icon's shape =================
   The glow around server-list icons with unread mentions was always a rounded square. DMs (user avatars, which
   Discord shows as circles) get a round one, and so do server icons whose picture is round itself (transparent
   corners); everything else keeps the rounded square. Only icons that have a mention badge are looked at. */

const shapeOf = new Map<string, "round" | "square" | "pending">();
let observer: MutationObserver | null = null;
let timer = 0;

async function pictureShape(src: string) {
    try {
        const url = new URL(src, location.href);
        url.searchParams.set("size", "32");
        const bmp = await createImageBitmap(await (await fetch(url)).blob());
        const c = new OffscreenCanvas(16, 16);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0, 16, 16);
        bmp.close();
        const a = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
        // transparent corners, solid middle of each edge: a round picture
        const corners = [a(0, 0), a(15, 0), a(0, 15), a(15, 15)].every(v => v < 60);
        const edges = [a(8, 0), a(0, 8), a(15, 8), a(8, 15)].some(v => v > 120);
        return corners && edges ? "round" : "square";
    } catch {
        return "square";
    }
}

function scan() {
    timer = 0;
    for (const badge of document.querySelectorAll(".guilds__5e434 .numberBadge__463b7")) {
        const item = badge.closest<HTMLElement>(".listItem__650eb");
        if (!item) continue;
        const id = item.querySelector<HTMLElement>("[data-list-item-id]")?.dataset.listItemId?.replace("guildsnav___", "");
        // a DM or group DM: shown round
        if (id && ChannelStore.getChannel(id)?.isPrivate?.()) {
            item.dataset.dzShape = "round";
            continue;
        }
        const src = item.querySelector("img")?.getAttribute("src");
        if (!src) continue;
        const known = shapeOf.get(src);
        if (known === "round" || known === "square") item.dataset.dzShape = known;
        else if (!known) {
            shapeOf.set(src, "pending");
            pictureShape(src).then(s => { shapeOf.set(src, s); schedule(); });
        }
    }
}

const schedule = () => { if (!timer) timer = window.setTimeout(scan, 250); };

export function startShapes() {
    observer = new MutationObserver(schedule);
    const attach = () => {
        const list = document.querySelector(".guilds__5e434");
        if (!list) return void setTimeout(attach, 2000);
        observer!.observe(list, { childList: true, subtree: true });
        schedule();
    };
    attach();
}

export function stopShapes() {
    observer?.disconnect();
    observer = null;
    clearTimeout(timer);
    timer = 0;
    for (const el of document.querySelectorAll<HTMLElement>("[data-dz-shape]")) delete el.dataset.dzShape;
}

export const SHAPES_CSS = `
html[data-dz-plugin] .listItem__650eb[data-dz-shape="round"]::after {
    border-radius: 50% !important;
}`;
