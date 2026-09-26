<p align="center">
  <img src="assets/terono.png" width="120" alt="Terono logo">
</p>

<h1 align="center">Terono</h1>

<p align="center">A fast, customizable Discord theme and companion Vencord plugin by <b>Terona Studios</b>.</p>

---

Terono comes in two parts:

| Part | What it does | Works on stock Vencord? |
| --- | --- | --- |
| **Theme** | The look: cards, colors, shapes, spacing, cleaned-up header and chat bar, themed call view, popouts and menus. | ✅ Yes, install by link |
| **Plugin** | Settings for everything (colors, cards, glass, backgrounds incl. image/GIF/video, fonts, server list position, layout sides, header layout, role counts…), profiles, and a hub for related Vencord plugins. | ⚠️ Needs a Vencord source build (as with every third-party Vencord plugin) |

The theme works on its own. The plugin makes it configurable.

## Install the theme

1. Open Discord → **User Settings → Vencord → Themes → Online Themes**.
2. Paste this link and save:

```
https://cdn.jsdelivr.net/gh/Terona-Studios/Terono@main/theme/Terono.theme.css
```

The theme builds on [Midnight](https://github.com/refact0r/midnight-discord) (loaded automatically). Don't enable Midnight separately.

## Install the plugin

Vencord only loads third-party plugins from a source build. You need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/) (LTS).

```bash
git clone https://github.com/Vendicated/Vencord
cd Vencord
git clone https://github.com/Terona-Studios/Terono src/userplugins/terono
npx pnpm install --frozen-lockfile
npx pnpm build
npx pnpm inject
```

Pick your Discord install when asked. Fully close Discord (tray icon → Quit) and reopen it, then enable **Terono** in **Vencord → Plugins**.

To use the plugin, install the theme too (above). You can also use the local copy at `src/userplugins/terono/theme/Terono.theme.css`.

### Updating

```bash
cd Vencord
git pull
git -C src/userplugins/terono pull
npx pnpm build
```

Then restart Discord.

## Features (plugin settings)

- **Profiles:** save your whole setup (or only some sections), switch between saved looks, export and import them as JSON, or reset to defaults.
- **Colors:** primary color (presets or any color), voice/online color, window-button colors.
- **Cards:** Dark / Gray / White / Custom (solid or gradient). Shapes: Sharp, Soft, Curved or Round. Solid or Glass with an opacity slider and optional blur.
- **Background:** animated gradient, static gradient, solid color, or an image, GIF or video (from a link or a file stored on your PC).
- **Fonts:** 22 fonts (Discord's own, Figtree, Inter, Poppins, …) or upload your own.
- **Layout:** server list left, top, bottom or right. Channel list left or right. Member list / profile left or right.
- **Channel header:** name, buttons and search each placed left, middle or right, separately for servers and DMs. Hide any header button by name.
- **Chat bar:** choose which buttons are shown (translate, GIF, emoji, sticker, gift, apps).
- **Member list:** role count style (`Role (1)`, `Role · 1`, … or your own `%users%` template).
- **Menus:** hide any right-click item by its label.
- **Activities:** hide "Start an Activity" everywhere.
- **Quick settings icon** next to the back/forward arrows.
- **Plugin hub:** switch and configure related Vencord plugins (MessageLogger, ShowHiddenChannels, PinDMs, …) in one place.
- **Performance mode** for weaker PCs.

## Privacy

Terono only contacts these services, and only for the features that need them:

- **Google Translate:** only if *Auto-translate* is enabled (off by default). The text of received messages is sent to translate them.
- **DuckDuckGo favicons:** loads the website icon for "domain" connections on profiles.
- **Google Fonts:** only when you pick a font other than Discord's own or Figtree.
- **jsDelivr / GitHub Pages:** serve the theme and Midnight.

Uploaded logos, fonts and background files are stored locally on your PC (Vencord's IndexedDB) and never uploaded.

## Notes

- Discord changes its class names from time to time. If something looks off after a Discord update, update Terono (and Midnight updates itself).
- A few options match Discord's English labels (for example hiding header buttons by name). They're meant for an English Discord client.

## License

[GPL-3.0](LICENSE), like Vencord.

Built on [Midnight](https://github.com/refact0r/midnight-discord) by refact0r. The horizontal server list is based on [HorizontalServerList](https://github.com/DiscordStyles/HorizontalServerList) by DiscordStyles.
