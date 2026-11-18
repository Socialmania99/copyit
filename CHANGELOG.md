# Changelog
## 1.1.0
- **Click to copy** (new, off by default). Hover any text and click once to copy it. Choose Paragraph, Sentence or Selection. Optional: also save each copy to your Copyit list. Links, buttons and text fields are left alone. Hold Alt to click normally. Switch it on in the popup or in Settings.
- **Copy text from images and videos** (new, off by default). Hover a picture or a paused video and press Copy text. A bundled offline reader finds the text, including numbers and symbols such as € © ™, and copies it. Right-click an image or video and pick "Copy text from this image or video" (works with the switch off).
- **Preview and edit window** (new). The Preview button on every clip opens a window in the dashboard: text, links, code and rich text clips (with Edit), and pictures, videos, vectors and media or web links (shown in the window, with Open in new tab, Download and Copy). Read the clip, press Edit to change it, then Discard to throw the changes away or Save changes to keep them. In the toolbar popup, Preview opens the dashboard and shows the window there.
- **Right-click on pictures and videos.** On any website: Copy image directly (straight to the clipboard), Copy video frame as image, and Preview in Copyit. "Save image address to Copyit" stays as it was. Inside Copyit, right-click a saved picture or video to get Preview, Copy image and the other copy options.
- Edit mode in the preview window has **Find** (Ctrl+F): type a word, see every match highlighted with a count, step with Enter or the arrows, and turn on match case.
- Web links in the preview window now run the page's scripts, so more sites show. Pages that need a sign-in or refuse to be framed (for example Google Docs) still need Open in new tab.
- **Preview window: drag the corner to resize** (up to full desktop size) and a **mobile / desktop** switch button next to the close button. Mobile is a vertical window, desktop is a wide landscape window. Your choice is remembered.
- **Website links now open in the preview window.** Copyit lifts the "do not show in a frame" block for its own preview frame only. Chrome asks once to allow website access (only when you press Allow website previews). New permission `declarativeNetRequestWithHostAccess`, which shows no extra install warning.
- The expand button and Settings now open one dashboard tab only. If it is already open, Copyit switches to it.
- Chrome asks once for permission to work on websites, only when you switch a page tool on. Turning both off gives the permission back.
- New permissions: `activeTab`, `scripting`, `offscreen`, optional access to all sites. No change to the install warning.
- Text reader files are inside the extension (Tesseract, Apache-2.0). Adds about 7 MB. Nothing is downloaded and no image leaves your computer.
- Known limit: emoji and many decorative symbols are not recognised by the reader.
## 1.0.0
- Save, search, tag and folder clips (text, links, code, images, videos).
- Preview button with small viewer window.
- Scan to open: offline QR for short text or links, up to 5 KB, numbered pages for longer text. No server.
- Donate dialog with fixed links.
- Settings: import and export (JSON, CSV, TXT, Markdown).
- Two themes: flat Multicolor, Black & White gradient. Light, Dark, Auto. No animations.
