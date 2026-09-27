/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* The Terono overlay's page: its own see-through window over games and other apps (see native.ts).
   It only shows what Discord sends it (the call, notifications) and asks Discord to act by logging
   "dz:{json}", which the main process forwards. No Node, no network besides the avatar pictures. */

export const OVERLAY_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Terono overlay</title><style>
:root { --accent: #429cff; --card: rgb(12 13 17 / 88%); --text: #f1f2f4; --muted: #a6a9b1; --opacity: 1; }
* { box-sizing: border-box; margin: 0; }
html, body { background: transparent; overflow: hidden; height: 100%; font: 500 14px "gg sans", "Segoe UI", system-ui, sans-serif; color: var(--text); user-select: none; }
body { opacity: var(--opacity); }
#shade { position: fixed; inset: 0; background: rgb(0 0 0 / 38%); opacity: 0; transition: opacity .18s; pointer-events: none; }
body.live #shade { opacity: 1; pointer-events: auto; }
#dock { position: fixed; display: flex; flex-direction: column; gap: 8px; width: 300px; }
body[data-corner^="top"] #dock { top: 16px; } body[data-corner^="bottom"] #dock { bottom: 16px; flex-direction: column-reverse; }
body[data-corner$="left"] #dock { left: 16px; } body[data-corner$="right"] #dock { right: 16px; }
.card { background: var(--card); border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 16px; box-shadow: 0 10px 30px rgb(0 0 0 / 40%); overflow: hidden; }
#call { padding: 10px; display: none; } body.voice #call { display: block; }
.head { display: flex; align-items: center; gap: 8px; padding: 2px 4px 8px; }
.head .logo { width: 18px; height: 18px; border-radius: 5px; background: var(--accent); display: grid; place-items: center; font-weight: 900; font-size: 12px; color: #fff; }
.head .name { font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.head .where { color: var(--muted); font-size: 11px; }
.who { display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow: hidden; }
.p { display: flex; align-items: center; gap: 9px; padding: 3px 4px; border-radius: 10px; }
.p img { width: 28px; height: 28px; border-radius: 50%; box-shadow: 0 0 0 2px transparent; transition: box-shadow .12s; flex: none; background: #2b2d31; }
.p.talk img { box-shadow: 0 0 0 2px var(--accent), 0 0 12px var(--accent); }
.p .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.p.talk .n { color: #fff; font-weight: 700; }
.p .i { color: #f23f43; font-size: 12px; display: flex; gap: 3px; }
.p .live { font-size: 9px; font-weight: 800; letter-spacing: .1em; padding: 1px 6px; border-radius: 999px; background: var(--accent); color: #fff; }
body:not(.live) .p:not(.talk) { opacity: .82; }
body:not(.live).compact .p:not(.talk):not(.me) { display: none; }
.ctl { display: none; gap: 6px; padding-top: 10px; } body.live .ctl { display: flex; }
.ctl button { flex: 1; height: 34px; border: 0; border-radius: 10px; cursor: pointer; color: var(--text); font-weight: 600; font-size: 12px; font-family: inherit; background: rgb(255 255 255 / 8%); }
.ctl button:hover { background: color-mix(in srgb, var(--accent) 35%, transparent); }
.ctl button.on { background: #f23f43; color: #fff; }
.ctl button.leave { background: rgb(242 63 67 / 22%); color: #ff8a8d; }
.ctl button.leave:hover { background: #f23f43; color: #fff; }
#toasts { display: flex; flex-direction: column; gap: 8px; }
body[data-corner^="bottom"] #toasts { flex-direction: column-reverse; }
.t { display: flex; gap: 10px; padding: 10px 12px; animation: in .22s ease-out both; cursor: default; }
body.live .t { cursor: pointer; } body.live .t:hover { border-color: var(--accent); }
.t img { width: 34px; height: 34px; border-radius: 50%; flex: none; background: #2b2d31; }
.t .b { min-width: 0; flex: 1; } .t .a { font-weight: 700; font-size: 13px; } .t .w { color: var(--muted); font-size: 11px; margin-left: 4px; font-weight: 500; }
.t .m { font-size: 13px; color: #dbdee1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-break: break-word; }
.t.out { animation: out .25s ease-in both; }
#hint { display: none; text-align: center; font-size: 11px; color: var(--muted); padding: 4px; } body.live #hint { display: block; }
#empty { display: none; padding: 14px; text-align: center; color: var(--muted); font-size: 13px; } body.live:not(.voice) #empty { display: block; }
@keyframes in { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
@keyframes out { to { opacity: 0; transform: scale(.97); } }
</style></head><body data-corner="top-left">
<div id="shade"></div>
<div id="dock">
  <div id="call" class="card">
    <div class="head"><div class="logo">T</div><div class="name" id="cname"></div><div class="where" id="gname"></div></div>
    <div class="who" id="who"></div>
    <div class="ctl">
      <button id="mute">Mute</button><button id="deaf">Deafen</button><button id="open">Open</button><button id="leave" class="leave">Leave</button>
    </div>
  </div>
  <div id="empty" class="card">Not in a call. New messages show up here.</div>
  <div id="toasts"></div>
  <div id="hint" class="card">Press your overlay hotkey or Esc to go back to your game</div>
</div>
<script>
const $ = id => document.getElementById(id);
const send = a => console.log("dz:" + JSON.stringify(a));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let state = {};
window.dz = {
  config(c) {
    document.body.dataset.corner = c.corner || "top-left";
    document.body.classList.toggle("compact", !!c.compact);
    document.documentElement.style.setProperty("--accent", c.accent || "#429cff");
    document.documentElement.style.setProperty("--opacity", String(c.opacity ?? 1));
  },
  live(on) { document.body.classList.toggle("live", on); },
  call(s) {
    state = s || {};
    document.body.classList.toggle("voice", !!s);
    if (!s) return;
    if (s.accent) document.documentElement.style.setProperty("--accent", s.accent);
    $("cname").textContent = s.channel || "Voice";
    $("gname").textContent = s.guild || "";
    $("who").innerHTML = s.people.map(p => '<div class="p' + (p.talk ? " talk" : "") + (p.me ? " me" : "") + '"><img src="' + esc(p.avatar) + '"><div class="n">' + esc(p.name) + '</div>' +
      (p.live ? '<span class="live">LIVE</span>' : "") + '<span class="i">' + (p.deaf ? "🔇" : p.mute ? "🎙️" : "") + '</span></div>').join("");
    $("mute").classList.toggle("on", !!s.selfMute); $("mute").textContent = s.selfMute ? "Unmute" : "Mute";
    $("deaf").classList.toggle("on", !!s.selfDeaf); $("deaf").textContent = s.selfDeaf ? "Undeafen" : "Deafen";
  },
  talk(ids) {
    const set = new Set(ids);
    (state.people || []).forEach((p, i) => { const el = $("who").children[i]; if (el) el.classList.toggle("talk", set.has(p.id)); });
  },
  toast(t) {
    const el = document.createElement("div");
    el.className = "card t";
    el.innerHTML = '<img src="' + esc(t.avatar) + '"><div class="b"><div class="a">' + esc(t.author) + '<span class="w">' + esc(t.where) + '</span></div><div class="m">' + esc(t.text) + '</div></div>';
    el.onclick = () => send({ a: "open", channel: t.channel, guild: t.guild, message: t.id });
    $("toasts").prepend(el);
    while ($("toasts").children.length > 4) $("toasts").lastChild.remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); }, t.ms || 7000);
  },
};
$("mute").onclick = () => send({ a: "mute" });
$("deaf").onclick = () => send({ a: "deaf" });
$("leave").onclick = () => send({ a: "leave" });
$("open").onclick = () => send({ a: "open" });
$("shade").onclick = () => send({ a: "close" });
addEventListener("keydown", e => { if (e.key === "Escape") send({ a: "close" }); });
send({ a: "ready" });
</script></body></html>`;
