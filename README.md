<p align="center">
  <img src="assets/terono.png" width="120" alt="Terono logo">
</p>

<h1 align="center">Terono</h1>

<p align="center">A fast, customizable Discord theme and Vencord plugin by <b>Terona Studios</b>.</p>

---

## Install

### Theme + plugin (recommended)

One command builds Vencord with the Terono plugin, installs it into Discord and turns on the theme. Run the same command again later to update.

**Windows** (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Terona-Studios/Terono/main/install.ps1 | iex
```

**macOS / Linux** (terminal):

```bash
curl -fsSL https://raw.githubusercontent.com/Terona-Studios/Terono/main/install.sh | bash
```

You need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/) (LTS) installed. The installer closes Discord while it works and opens it again at the end. Everything goes into a `Terono` folder in your home directory.

Then open **Settings → Vencord → Plugins → Terono** to customize everything.

> Third-party Vencord plugins can only be used with a Vencord build made on your PC. That's what the installer does for you. It replaces the normal Vencord install; your Vencord settings, themes and plugins are kept.

### Theme only

Works on normal Vencord, no installer needed:

1. **Settings → Vencord → Themes → Online Themes**
2. Paste this link and save:

```
https://cdn.jsdelivr.net/gh/Terona-Studios/Terono@main/theme/Terono.theme.css
```

**BetterDiscord:** download [Terono.theme.css](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono.theme.css) and put it in your BetterDiscord `themes` folder.

## What you can customize (plugin)

- **Profiles:** save your setup or parts of it, switch between looks, export and import them as files, reset to defaults.
- **Colors:** primary color (presets or any color), voice/online color, window button colors.
- **Cards:** Dark, Gray, White or Custom (solid or gradient). Sharp, Soft, Curved or Round corners. Solid or glass, with opacity and blur.
- **Background:** animated gradient, static gradient, solid color, or your own image, GIF or video.
- **Fonts:** 22 built-in fonts or your own font file.
- **Layout:** server list left, top, bottom or right. Channel list and member list/profile on either side.
- **Channel header:** name, buttons and search placed left, middle or right, separately for servers and DMs. Hide any header button.
- **Chat bar:** pick which buttons show (translate, GIF, emoji, sticker, gift, apps).
- **Member list:** role count style, e.g. `Role (1)`, `Role · 1`, or your own format with `%users%`.
- **Right-click menus:** hide any item by its name.
- **Activities:** hide "Start an Activity" everywhere.
- **Quick settings button** next to the back/forward arrows.
- **Plugin hub:** turn on and set up related Vencord plugins (MessageLogger, ShowHiddenChannels, PinDMs and more) from one place.
- **Performance mode** for slower PCs.

## Updating

Run the install command again. Or, if you installed by hand:

```bash
git -C src/userplugins/terono pull
npx pnpm build
```

## Manual install

```bash
git clone https://github.com/Vendicated/Vencord
cd Vencord
git clone https://github.com/Terona-Studios/Terono src/userplugins/terono
npx pnpm install --frozen-lockfile
npx pnpm build
npx pnpm inject
```

Restart Discord, enable **Terono** in Vencord → Plugins and add the theme link above.

## Privacy

Terono only talks to these services, and only for the features that use them:

- **Google Translate:** only with *Auto-translate* turned on (off by default). The text of received messages is sent for translation.
- **DuckDuckGo:** website icons for "domain" connections on profiles.
- **Google Fonts:** when you pick a font other than Discord's own or Figtree.
- **jsDelivr:** serves the theme file.

Your uploaded logos, fonts and backgrounds stay on your PC.

## Notes

- Discord renames its internal class names now and then. If something looks off after a Discord update, update Terono.
- Some options match Discord's English labels (like hiding header buttons by name), so they work best with Discord set to English.

## License

[GPL-3.0](LICENSE). Third-party parts and their licenses are listed in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
