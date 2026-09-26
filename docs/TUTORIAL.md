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
- [Phones: Android and iPhone](#phones-android-and-iphone)

---

## 1. Which install is for me?

| You use Discord in... | Do this |
| --- | --- |
| The Discord app on **Windows** | [Double-click installer](#windows) |
| The Discord app on **macOS / Linux** | [One command](#macos--linux) |
| **Chrome, Brave, Edge, Opera, Vivaldi** | [Browser extension](#chrome-brave-edge-opera-vivaldi) |
| **Firefox** | [Firefox add-on](#firefox) |
| Only want the look, no settings | [Theme only](#theme-only) |
| An **Android** phone | [VendroidEnhanced app](#android) |
| An **iPhone** | Not possible, see [iPhone](#iphone) |

---

## 2. Install on the Discord app

### Windows

1. Download **[Install-Terono.cmd](https://github.com/Terona-Studios/Terono/releases/latest/download/Install-Terono.cmd)**.
2. Double-click it. If Windows says *"Windows protected your PC"*, click **More info → Run anyway**.
3. Wait for the green *Terono is installed* line. The first run takes a few minutes because it downloads Git and Node.js if you don't have them.
4. Discord closes and opens again with Terono on.

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

Every change shows up straight away; there's nothing to save or restart.

---

## 5. Make it yours

The screenshots in the [README gallery](../README.md) were all made with these settings.

### Colors

- **Accent Preset:** the primary color. Pick Blue, Red, Purple, Green, Pink or Orange, or use the color picker under it for any color. Used for buttons, links, mentions, selection and glow.
- **Voice / online color** and the three **window button** colors (close, minimize, maximize) sit right under it.

### Cards (the panels)

- **Card Preset:** **Dark**, **Gray**, **White**, or **Custom**.
- **Custom** unlocks:
  - **Card Fill:** **Solid color** or **Gradient**, using two colors plus **Card Angle**.
  - **Text color.**
- **Card Shape:** **Sharp**, **Soft**, **Curved** or **Round** corners.
- **Card Style:**
  - **Solid**, or
  - **Glass** (see-through): set how see-through it is with **Glass Opacity**, and turn **Glass Blur** on or off. Menus, popups and buttons always stay solid so they stay readable.
- **Card Media:** an image, GIF or video inside the panels, separate from the app background.
  - Set it to **URL** and paste a direct link in **Card Media Url**, or to **File** and upload one in **Card Media File** (up to 100 MB).
  - The media runs across all panels as one picture; the gaps between the panels keep the app background.
  - **Card Media Dim** sets how much of the card color lies over it. Higher is easier to read.
  - Works together with every card preset, gradient and glass.

### Background (behind the panels)

Set with **Background**:

- **Animated gradient** (default) or **Static gradient:** uses the two background colors.
- **Solid color:** uses only the base color.
- **Image / GIF / Video:**
  - Paste a direct `https://` link in **Bg Media Url**, or set **Bg Media Source** to **File** and upload one (up to 100 MB).
  - **Bg Media Dim** darkens it so text stays readable.
  - GIFs and videos use the most power; see [Performance](#performance).

### Layout

| Setting | Options |
| --- | --- |
| **Server List** | Left (Discord default), Top, Bottom, Right |
| **Channels Side** | Left, Right |
| **Members Side** | Right, Left |

You can combine them freely. For example, Server List **Right** + Channels Side **Right** + Members Side **Left** mirrors the whole app.

### Channel header (the bar above the chat)

Servers and DMs are set separately. The DM settings start with **Dm**:

- **Header Name** / **Dm Header Name:** the channel name: Left, Middle, Right or Hidden. **Header Hash** shows or hides the **#** icon.
- **Header Buttons** / **Dm Header Buttons** (pins, threads, notifications…): Left, Middle or Right.
- **Header Search** / **Dm Header Search:** the search bar: Left, Middle, Right or Hidden.
- **Header Follow:** the Follow button in announcement channels.
- **Header Hidden Buttons:** type words from button names, comma separated (e.g. `Threads, Inbox`), and matching buttons disappear.

### Chat bar

Turn each button on or off with the **Chat …** switches: **Chat Translate**, **Chat Gif**, **Chat Emoji**, **Chat Sticker**, **Chat Gift**, **Chat Apps**, and **Chat Other Vencord** for buttons added by other plugins.

### Member list

**Role Count:** `Role (1)`, `Role · 1`, `Role [1]`, `Role 1`, `Role — 1`, no count, or **Custom**. With **Custom**, write your own text in **Role Count Custom**; `%users%` is replaced with the number (e.g. `• %users% online`).

### Font

Pick one of 22 fonts in **Font**, or **Custom (upload)** and **Font File** to use your own `.ttf`, `.otf`, `.woff` or `.woff2` file.

### Home logo

The Terono logo sits on the Home button by default.

- To use your own, set **Logo Source** to **URL** and paste a link in **Logo Url**, or to **File** and upload an image in **Logo File**.
- **Logo Size** makes it bigger or smaller.
- Leave **Logo Url** empty to go back to the Terono logo.

---

## 6. Save looks as profiles

At the top of the Terono settings:

1. Set everything up the way you like.
2. Type a name under **Profiles**, choose which parts to include (everything, or only some sections like colors or layout), and click **Save current**.
3. Click **Apply** on a profile to switch to it in one go.
4. **Export** saves a profile as a file you can share. **Import JSON** loads one someone sent you.
5. **Reset to defaults** puts every Terono setting back to the defaults. Your saved profiles are kept.

---

## 7. Extra features

- **Right-click menus:** hide any item by typing its exact name, comma separated. Use **Hidden Menu Items** for every menu, **Hidden Server Menu** for the server menu and **Hidden User Menu** for the user/DM menu.
- **Activities:** turn off **Show Activities** to hide *Start an Activity* everywhere: voice panel, call buttons and call grid.
- **Auto Translate** (off by default): translates messages you receive into English, using Vencord's Translate plugin (keep that plugin on). Add language codes to **Keep Languages** for languages you read yourself. Message text is sent to Google Translate while this is on.
- **Plugin Hub:** turn on and set up Vencord plugins that go well with Terono from one list, e.g. MessageLogger, ShowHiddenChannels, PinDMs and more.
- **Quick settings icon:** turn off **Quick Icon** if you don't want the Terono icon next to the arrows.
- **Loading screens:** while Discord starts, updates and connects, you see the Terono logo and "Terono Discord" instead of Discord's logo, in your colors. Turn off **Loading Screen** to get Discord's back. The small update window ("Checking for updates…") changes from the next start.

### Performance

On a slow PC or a laptop on battery, turn on **Lite** (performance mode). It stops the background animation, blur, pulsing badges and hover animations. If you want to keep your look, these help most:

- **Background** set to **Static gradient** or **Solid color**, instead of Animated or a GIF/video.
- **Card Style** set to **Solid**, or Glass with **Glass Blur** off.

---

## 8. Updating

- **Discord app:** run the installer again (the same `Install-Terono.cmd` or command). It downloads the newest Terono and Vencord and rebuilds.
- **Browser:**
  1. Download the newest zip from [Releases](https://github.com/Terona-Studios/Terono/releases/latest).
  2. Replace the files in your folder.
  3. Click **↻ reload** on the extension card and refresh Discord.
- **Android (VendroidEnhanced):** updates by itself. The app downloads the newest Terono build every time it starts.
- **Theme only:** updates by itself.

---

## 9. Troubleshooting

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
- **Android:** in the Terono settings, scroll to the bottom and tap **Use VendroidEnhanced's build**, then close and reopen the app.
- **Theme only:** remove the link in **Online Themes**.

---

## Phones: Android and iPhone

### Android

Discord's own Android app can't load Vencord. **VendroidEnhanced** can: it's an Android app that opens Discord's website with Vencord inside, and it can load the Terono build instead of its normal one.

1. Install **VendroidEnhanced** from [vendroid.nin0.dev](https://vendroid.nin0.dev/download) and log in to Discord in it.
2. Open **User Settings** (the ⚙ at the bottom of the **☰** menu), go to the **VendroidEnhanced** section, and under **Other** tap **Open developer settings**.
3. In **Vencord location**, paste:

   ```
   https://github.com/Terona-Studios/Terono/releases/latest/download/Terono-Android.js
   ```

4. Close the app completely (swipe it away in recent apps) and open it again.

That's it. Terono turns itself on and adds its theme. On every start the app shows a short message that the build is being downloaded again. That's how it keeps Terono up to date, and it's normal.

**What's different on a phone:**

- Discord uses its own phone layout: one column at a time, the **☰** button opens the server and channel list, and the member list button opens the members over the chat. Terono follows that layout, so **Server List**, **Channels Side**, **Members Side** and the header positions only apply on desktop.
- Everything else works the same: colors, cards (glass, gradient, card media), backgrounds, fonts, logo, role counts, chat bar, menus, loading screen, profiles.
- The **VendroidEnhanced** settings tab belongs to VendroidEnhanced's own build, so it isn't there while Terono is loaded. To go back, open the Terono settings, scroll to the bottom and tap **Use VendroidEnhanced's build**, then restart the app.
- VendroidEnhanced is a community app, not made by Discord or Vencord. It has no voice chat yet.

#### Test it on your phone

After step 4, go through this list:

1. **Start-up:** the loading screen shows the Terono logo and "Terono Discord".
2. **Look:** panels have Terono's rounded cards and your colors, and the chat has even gaps on both sides.
3. **Navigation:** tap **☰**, the server and channel list slides in. Pick a channel and the chat opens. The Android back button brings the list back.
4. **Members:** tap the member list button in the channel header. The list fills the screen; tap it again to get back to the chat.
5. **Settings:** **Settings → Vencord → Plugins → Terono**. Change **Accent Preset**: the color changes straight away.
6. **Profiles:** apply a profile you exported on your PC (**Import JSON**). Your desktop look shows up on the phone.

If something looks wrong, take a screenshot and [open an issue](https://github.com/Terona-Studios/Terono/issues).

### iPhone

There's no Vencord app for iPhone, and Discord's iPhone app can't be modded without sideloading, so Terono can't run there. On an iPhone you'll see Discord's normal look.
