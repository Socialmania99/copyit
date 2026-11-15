# Copyit 1.1.0 features

## Saving
- Save text, links, code, images and videos. Right-click selected text: "Save selected text to Copyit".
- Open with the toolbar icon or `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac).
- Popup for quick use. Dashboard for the full view.

## Page tools (new in 1.1.0, both off by default)
Turn them on in the popup ("Page tools") or in Settings. Chrome asks once to allow Copyit on websites; it only acts on a page after you hover or click.
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
- **Import and export:** JSON backup (full, with images and videos), CSV, TXT, Markdown. Import many files at once. JSON merges without duplicates.
- **Themes:** Multicolor (flat) and Black & White (gradient). Light, Dark or Auto.
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
