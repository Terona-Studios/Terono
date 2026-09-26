// Resolves Midnight's `@container body|root style(--x: v)` switches for Terono's fixed configuration:
// matching blocks are unwrapped, non-matching ones dropped, @property registrations for switches removed.
// --small-user-panel stays a live container query (Terono toggles it per layout).
const fs = require("fs");
const [src, out] = process.argv.slice(2);
let css = fs.readFileSync(src, "utf8");

const CONFIG = {
    "--colors": "on",
    "--animations": "off",
    "--top-bar-button-position": "hide",
    "--top-bar-title-position": "hide",
    "--subtle-top-bar-title": "on",
    "--custom-window-controls": "on",
    "--custom-dms-icon": "hide",
    "--custom-dms-background": "off",
    "--background-image": "off",
    "--transparency-tweaks": "off",
    "--remove-bg-layer": "off",
    "--panel-blur": "off",
    "--custom-chatbar": "off",
};
const LIVE = new Set(["--small-user-panel"]);

// find the matching closing brace for the block opening at `open` (index of "{")
function blockEnd(s, open) {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
        const c = s[i];
        if (c === "/" && s[i + 1] === "*") { i = s.indexOf("*/", i + 2) + 1; continue; }
        if (c === "'" || c === '"') { i = s.indexOf(c, i + 1); continue; }
        if (c === "{") depth++;
        else if (c === "}" && --depth === 0) return i;
    }
    throw new Error("unbalanced braces at " + open);
}

function evalCondition(cond) {
    const parts = [...cond.matchAll(/style\(\s*(--[\w-]+)\s*:\s*([\w-]+)\s*\)/g)];
    if (!parts.length) return null;
    let live = false;
    for (const [, name, value] of parts) {
        if (LIVE.has(name)) { live = true; continue; }
        if (!(name in CONFIG)) throw new Error("unknown switch " + name);
        if (CONFIG[name] !== value) return false;
    }
    return live ? "live" : true;
}

function transform(s) {
    let result = "";
    let i = 0;
    const re = /@container\s+(?:body|root)\s+([^{]+)\{|@property\s+(--[\w-]+)\s*\{/g;
    let m;
    while ((m = re.exec(s))) {
        const open = m.index + m[0].length - 1;
        const end = blockEnd(s, open);
        result += s.slice(i, m.index);
        if (m[2]) {
            // @property for a switch: drop; anything else: keep
            if (!(m[2] in CONFIG) && !LIVE.has(m[2])) result += s.slice(m.index, end + 1);
        } else {
            const verdict = evalCondition(m[1]);
            const inner = transform(s.slice(open + 1, end));
            if (verdict === true) result += inner;
            else if (verdict === "live" || verdict === null) result += s.slice(m.index, open + 1) + inner + "}";
        }
        i = end + 1;
        re.lastIndex = i;
    }
    return result + s.slice(i);
}

const trimmed = transform(css)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
fs.writeFileSync(out, trimmed + "\n");
console.log(`in ${css.length} bytes -> out ${trimmed.length} bytes; containers left: ${(trimmed.match(/@container/g) || []).length}`);
