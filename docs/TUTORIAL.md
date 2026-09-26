# Terono tutorial

Everything from installing to building your own look, step by step.

- [1. Which install is for me?](#1-which-install-is-for-me)
- [2. Install on the Discord app (Windows, macOS, Linux)](#2-install-on-the-discord-app)
- [3. Install in your browser (Chrome, Brave, Edge, Opera, Firefox)](#3-install-in-your-browser)
- [4. Open the Terono settings](#4-open-the-terono-settings)
- [5. Make it yours](#5-make-it-yours)
- [6. Save looks as profiles](#6-save-looks-as-profiles)
- [7. Extra features](#7-extra-features)
- [8. Updating](#8-updating)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Uninstalling](#10-uninstalling)

---

## 1. Which install is for me?

| You use Discord in... | Do this |
| --- | --- |
| The Discord app on **Windows** | [Terono-Setup.exe](#windows) |
| The Discord app on **macOS / Linux** | [One command](#macos--linux) |
| **Chrome, Brave, Edge, Opera, Vivaldi** | [Browser extension](#chrome-brave-edge-opera-vivaldi) |
| **Firefox** | [Firefox add-on](#firefox) |
| Only want the look, no settings | [Theme only](#theme-only) |

---

## 2. Install on the Discord app

### Windows

1. Download **[Terono-Setup.exe](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono-Setup.exe)**.
2. Double-click it. The file isn't code-signed yet, so Windows may say *"Windows protected your PC"*: click **More info → Run anyway**.
3. Wait for the green *Terono is installed* line. The first run takes a few minutes because it downloads Git and Node.js if you don't have them.
4. Discord closes and opens again with Terono on.

To check the file: right-click it → **Properties → Details** shows *Terono Setup* by *Terona Studios*. If something goes wrong, the steps it took are in `%TEMP%\Terono-Setup.log`.

### macOS / Linux

Open **Terminal** and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/Terona-Studios/Terono/main/install.sh | bash
```

On macOS, [Homebrew](https://brew.sh) installs Git and Node.js if they're missing. On Linux, install `git` and `nodejs` with your package manager first (for example `sudo apt install git nodejs npm`).

> **Why an installer?** Vencord only runs extra plugins from a copy built on your own PC. The installer builds that copy in a `Terono` folder in your home folder and puts it into Discord. Your other Vencord plugins, themes and settings stay as they are.

---

## 3. Install in your browser

Works on `discord.com/app`. Everything the app version has is included, except the window buttons (the browser has its own).

### Chrome, Brave, Edge, Opera, Vivaldi

1. Download **[Terono-Chromium.zip](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono-Chromium.zip)** and unzip it (right-click → **Extract All**). Put the folder somewhere you'll keep it, for example in Documents. The browser loads it from there.
2. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
3. Turn on **Developer mode** (top right; on Edge it's on the left).
4. If you already have the normal **Vencord** extension, switch it **off**. Terono's extension already contains Vencord, and two copies would load twice.
5. Click **Load unpacked** and pick the unzipped folder, the one that contains `manifest.json`.
6. Open or refresh [discord.com/app](https://discord.com/app).

Terono turns itself on and adds its theme on the first start. There's nothing else to set up.

### Firefox

Firefox only keeps extensions signed by Mozilla, so this one loads until you close Firefox:

1. Download **[Terono-Firefox.zip](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono-Firefox.zip)** (don't unzip it).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick the zip.
4. Refresh [discord.com/app](https://discord.com/app).

To keep it permanently, use **Firefox Developer Edition** or **Nightly**: set `xpinstall.signatures.required` to `false` in `about:config`, then install the zip from `about:addons` → ⚙ → **Install Add-on From File…**

### Theme only

If you already use Vencord (app or browser) and only want the look:

1. **Settings → Vencord → Themes → Online Themes**
2. Paste and save:

```
https://cdn.jsdelivr.net/gh/Terona-Studios/Terono@main/theme/Terono.theme.css
```

The theme alone uses the default Terono look: blue, dark cards, top server list. All the options below need the plugin.

**BetterDiscord:** put [Terono.theme.css](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono.theme.css) in your BetterDiscord `themes` folder.

---

## 4. Open the Terono settings

Either:

- click the **Terono icon** next to the ← → arrows at the top left, or
- **User Settings** (⚙ next to your name) → **Vencord** → **Plugins** → search **Terono** → ⚙.

At the top is the **Updates** box. Below it are the tabs: **Presets, Colors, Cards, Background, Layout, Header, Chat & Members, Font & Logo, Menus, Extras, Profiles, Plugins**. Every change shows up straight away; there's nothing to save or restart.

---

## 5. Make it yours

### Presets: a whole look in one click

The **Presets** tab has 11 complete looks, the same ones as the pictures in the [README](../README.md): Terono Classic, Frosted Glass, Paper White, Crimson Edge, Emerald, Sakura Glass, Amber Dock, Deep Lagoon, Mirror White, Violet Focus and Minimal.

1. Click **Apply** on one and confirm. It sets the colors, cards, background, layout, header and font exactly like its picture.
2. Change anything you like in the other tabs. The preset gets a **Customized** tag, and **Re-apply** brings the original back.

Your logo, menus, chat bar buttons, translate and performance settings are never touched by a preset. To keep your current look, save it under **Profiles** before applying one.

### Colors

- **Color preset:** Blue, Red, Purple, Green, Pink or Orange, or use the **Primary color** picker under it for any color. It's used for buttons, links, mentions, selection and glow.
- **Status & window buttons:** the **Voice & online** color and the **Close**, **Minimize** and **Maximize** button colors.

### Cards (the panels)

- **Card colors:** **Dark**, **Gray**, **White** or **Custom**. Custom adds **Fill** (**Solid color** or **Gradient**, with **Gradient end** and **Gradient angle**), **Card color** and **Text color**.
- **Shape & material:**
  - **Corners:** **Sharp**, **Soft**, **Curved** or **Round**.
  - **Material:** **Solid** or **Glass**. Glass is see-through; set it with **Glass opacity** and turn **Glass blur** on or off. Menus, popups and buttons always stay solid so they stay readable.
- **Picture or video in the cards:** an image, GIF or video inside the panels, separate from the background.
  - Choose **URL** and paste a direct link in **Link**, or **File** and upload one (up to 100 MB).
  - It runs across all panels as one picture; the gaps between the panels keep the background.
  - **Card color over it** sets how much of the card color lies on top. Higher is easier to read.

### Background (behind the panels)

- **Background:** **Animated gradient** (default), **Static gradient**, **Solid color**, or **Image / GIF / Video**.
- **Picture, GIF or video:** choose **URL** and paste a direct `https://` link, or **File** and upload one (up to 100 MB). **Darken** keeps text readable. GIFs and videos use the most power; see [Performance](#performance).
- **Colors:** **Base color** (the whole background when Solid) and **Glow color 1 / 2** for the gradients.

### Layout

| Setting | Options |
| --- | --- |
| **Server list** | Left (Discord default), Top, Bottom, Right |
| **Channel list side** | Left, Right |
| **Member list side** | Right, Left |

You can combine them freely. For example, Server list **Right** + Channel list side **Right** + Member list side **Left** mirrors the whole app.

### Header (the bar above the chat)

- **In servers:** **Channel name** (Left, Middle, Right or Hidden), **# icon**, **Buttons** (pins, threads, notifications…) and **Search bar**, each Left, Middle or Right, plus the **Follow button** in announcement channels.
- **In DMs:** **Name & avatar**, **Buttons** and **Search bar**, set separately from servers.
- **Hidden buttons:** type words from button names, comma separated (e.g. `Threads, Inbox`), and matching buttons disappear.

### Chat & Members

- **Chat bar buttons:** turn **Translate**, **GIF**, **Emoji**, **Sticker**, **Gift**, **Apps** and **Other plugins' buttons** on or off.
- **Member list:** **Role count** as `Role (1)`, `Role · 1`, `Role [1]`, `Role 1`, `Role — 1`, no count, or **Custom**. With Custom, write your own text in **Custom role count**; `%users%` is replaced with the number (e.g. `• %users% online`).
- **Activities:** turn off **Show activities** to hide *Start an Activity* everywhere: voice panel, call buttons and call grid.

### Font & Logo

- **Font:** 22 fonts, or **Custom (upload)** to use your own `.ttf`, `.otf`, `.woff` or `.woff2` file.
- **Home logo:** the Terono logo sits on the Home button by default. Set **Logo source** to **URL** and paste a **Logo link**, or to **File** and upload an image. **Logo size** makes it bigger or smaller; an empty link brings the Terono logo back.
- **Quick settings icon:** the Terono icon next to the arrows that opens these settings.
- **Terono loading screens:** the Terono logo and "Terono Discord" instead of Discord's logo while Discord starts, updates and connects, in your colors. The small update window ("Checking for updates…") changes from the next start.

---

## 6. Save looks as profiles

In the **Profiles** tab:

1. Set everything up the way you like.
2. Type a name, choose which parts to include (everything, or only some sections like colors or layout), and click **Save current**.
3. Click **Apply** on a profile to switch to it in one go.
4. **Export** saves a profile as a file you can share. **Import JSON** loads one someone sent you.
5. **Reset to defaults** puts every Terono setting back to the defaults. Your saved profiles are kept.

---

## 7. Extra features

- **Menus tab:** hide right-click menu items by typing their exact names, comma separated: **In every menu**, **In the server menu** and **In user & DM menus**.
- **Extras → Translate:** **Auto-translate** (off by default) translates messages you receive into English, using Vencord's Translate plugin (keep that plugin on). Add language codes to **Never translate** for languages you read yourself. Message text is sent to Google Translate while this is on.
- **Extras → Updates:** **Check for updates automatically** at start and every few hours.
- **Plugins tab:** turn on and set up Vencord plugins that go well with Terono from one list, e.g. MessageLogger, ShowHiddenChannels, PinDMs and more.

### Performance

On a slow PC or a laptop on battery, turn on **Performance mode** (Extras tab). It stops the background animation, blur, pulsing badges and hover animations. If you want to keep your look, these help most:

- **Background** set to **Static gradient** or **Solid color**, instead of Animated or a GIF/video.
- **Material** set to **Solid**, or Glass with **Glass blur** off.

---

## 8. Updating

- **Discord app, inside Discord:** open the Terono settings. The **Updates** box at the top shows your version; click **Check for updates**. If a new version is out, you see what's new and an **Update** button. The update screen downloads and builds it (you can hide it and keep chatting), then click **Restart Discord**. Terono also checks by itself when Discord starts and every few hours, and shows a notification when an update is out. Turn that off with **Check for updates automatically** (Extras tab).
- **Discord app, with the installer:** run **Terono-Setup.exe** again (macOS / Linux: the install command). It downloads the newest Terono and Vencord and rebuilds. If the download folder got damaged, it downloads it fresh by itself.
- **Browser:**
  1. Download the newest zip from [Releases](https://github.com/Terona-Studios/Terono/releases/latest).
  2. Replace the files in your folder.
  3. Click **↻ reload** on the extension card and refresh Discord.
- **Theme only:** updates by itself.

---

## 9. Troubleshooting

**My antivirus flagged `Install-Terono.cmd`.**
That was the old installer. It downloaded and ran a PowerShell script in one go, which Windows Defender treats as suspicious (`Trojan:Win32/Commando.A!ml`), even though the script itself was harmless. Delete it and use **[Terono-Setup.exe](https://github.com/Terona-Studios/Terono/releases/latest/download/Terono-Setup.exe)** instead. It updates the same install, so your settings are kept.

**Terono disappeared after a Discord update (app).**
Discord's big updates sometimes remove Vencord. Run the installer again; your settings are kept.

**The look is there but the Terono settings aren't (or the other way round).**

- *Settings are there, look is missing:* check that the theme link is in **Settings → Vencord → Themes → Online Themes**, and that its switch is on.
- *Look is there, settings are missing:* you have the theme only. Install the app or browser version.

**Everything shows up twice / looks broken in the browser.**
You have both the normal Vencord extension and the Terono one turned on. Switch the normal Vencord extension off.

**My background or logo link doesn't show.**
Vencord only loads images from sites it allows, for example Discord's CDN, Imgur, GitHub and Tenor. Upload the file instead (**File** as the source), or use a link from one of those sites.

**Something looks off after a Discord update.**
Discord sometimes renames its internal parts. Update Terono (step 8); if it's still off, [open an issue](https://github.com/Terona-Studios/Terono/issues) with a screenshot.

**Hiding header buttons or menu items by name doesn't work.**
Those match Discord's English names. Set Discord to English, or type the names exactly as your language shows them.

---

## 10. Uninstalling

- **Discord app, Windows:** run in PowerShell:

  ```powershell
  cd ~\Terono\Vencord; node scripts/runInstaller.mjs -- --uninstall
  ```

  Then delete the `Terono` folder in your home folder.
- **Discord app, macOS / Linux:** run:

  ```bash
  cd ~/Terono/Vencord && node scripts/runInstaller.mjs -- --uninstall
  ```

  Then delete `~/Terono`.
- **Browser:** remove the extension on the extensions page. If you had the normal Vencord extension, switch it back on.
- **Theme only:** remove the link in **Online Themes**.

