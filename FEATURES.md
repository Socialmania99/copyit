# Copyit 1.2.0 features

## Saving
- Save text, links, code, images and videos. Right-click selected text: "Save selected text to Copyit".
- Open with the toolbar icon or `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac).
- Popup for quick use. Dashboard for the full view.

## Page tools (new in 1.2.0, both off by default)
Turn them on in the popup (bottom left, "Tools") or in Settings. Chrome asks once to allow Copyit on websites; it only acts on a page after you hover or click.
- **Pop-out player (picture in picture).** Open a saved video or audio in the Copyit preview window and press the pop-out button. A small player floats on top with play/pause, seek, mute, Minimize and Maximize. It works only for media saved in Copyit, never on websites.
- **Movable preview.** Hold the right mouse button on the preview window to move it. Minimize and Maximize sit next to the rotate button.
- **Resizable preview.** Drag the bottom-right corner to make the preview window as big as your screen. The switch button next to the close button changes between a vertical mobile view and a wide desktop view.
- **Preview and edit.** Press Preview on any clip to open it in a window: text, code, links, pictures, videos and more. Pictures and videos also open from a click on the picture. Press Edit to change the text, **Discard** to drop the changes or **Save changes** to keep them. From the toolbar popup, Preview opens the dashboard first and shows the window there.
- **Right-click media.** On a website, right-click an image for **Copy image directly** (also saved as a clip in your list) and **Preview in Copyit**, or a video for **Copy video frame as image** and **Preview in Copyit**. Inside Copyit, right-click a saved picture or video for Preview and Copy image.
- **Click to copy.** Hover text, a dashed box shows what will be copied, click once, "Text copied" appears. Pick what a click copies: **Paragraph**, **Sentence** or **Selection** (highlight text and it copies itself). Option: also save each copy to your Copyit list. Links, buttons, inputs and editors are ignored. Hold **Alt** to click normally. **Esc** hides the box.
- **Copy text from images and videos.** Hover an image or a paused video, press **Copy text**. The text is read on your device and copied. Works on photos, screenshots, memes, slides, posters, video frames. Letters, numbers and common symbols (€ £ © ® ™ % @ #). Dark backgrounds are handled. Right-click an image or video and choose "Copy text from this image or video" to use it without the switch.
- **Limits:** English text. Emoji and decorative symbols are not recognised. Small, blurry or stylised text may come out wrong. Pause a video on a clear frame first. Needs a normal web page (not the Chrome Web Store or chrome:// pages).

## Finding
- Search clips and `#tags`.
- Filters: All, Links, Code, Multimedia.
- Folders. Favorite star.

## Copying
- Copy a clip in the format you need.
- **Preview** button opens links, videos and pages in a small viewer window. Some sites (YouTube, Vimeo, many others) block being shown inside another page; the viewer then opens them directly.

## Scan to open (QR)
- Each clip card has a QR button. Built on your device. No server, no short code, no expiry.
- **Links:** QR holds the URL. Phone opens it in its browser (internet needed to load the page).
- **Text:** QR holds the text. Works with no internet. Up to **5 KB**. Longer text is split into numbered QR codes (page i of n). Scan in order.
- **Not supported:** images, videos, files, empty clips, anything over 5 KB. The dialog says so.

## Settings
- **Its own full page** with a sidebar: General, Page tools, Privacy & security, Storage & clean-up, Import & export, Danger zone, plus Contact us and Docs & Guide. A Back to Dashboard button returns you. Desktop layout that folds into a menu on small windows.
- **Import and export:** JSON backup (full, with images and videos), CSV, TXT, Markdown. Import many files at once. JSON merges without duplicates.
- **Appearance:** Light, Dark or Auto, plus a one-tap light/dark button in the popup and dashboard. **Custom colour picker** (wheel, brightness, swatches, hex) recolours every Copyit page.
- **Donate:** PayPal, Ko-fi, Bitcoin, Ethereum, Solana. Fixed list.
- Danger zone for clearing data.

## Design
- Clean and still. No animations. Plain background.

## Privacy
- No account, no analytics, no server. Clips stay in Chrome storage on your computer.
- Page tools stay off until you switch them on. Then Copyit reads a page only when you hover or click. The text reader runs inside the extension. No image, text or screenshot is sent anywhere.

## Tested
Automated browser tests with a mocked Chrome API and a QR decoder: core, settings, previews, folders, donate, import/export, Scan to open (exact URL, UTF-8 text, numbered pages, 5 KB limit).
**Not tested:** real Chrome install, real phone camera.
