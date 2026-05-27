# 🧑‍💻 Code Compiler — Full Guide

A walkthrough of every feature in the in-browser code compiler.

## Opening it
From the calculator home page, click the **💻** button (top-right). You land in the
compiler: **editor on the left, output on the right**, a toolbar on top.

## 1. Files & languages (tabs)
- Each **tab is a file**, and its **extension sets the language** — name a tab
  `main.py` for Python, `index.html` for HTML, `app.js` for JavaScript, `Main.java`,
  `prog.cpp`, `styles.css`, etc.
- **+** (on the tab strip) makes a new file · **✎** or double-click a tab to **rename**
  it · **×** closes it.
- Supported run languages: **Python, JavaScript, Java, C++, C**, plus **HTML/CSS/JS**
  for web pages.

## 2. Write & run
- Type in the editor. As you type, **grey ghost suggestions** appear — press **Tab** to
  accept (Esc to dismiss). Try `!` in an HTML file (full HTML5 skeleton), or `clg`,
  `for`, `main`, `sout`, `cout`, etc.
- **Ctrl/⌘ + Space** opens the full autocomplete menu (type to filter).
- Click **▶ Run** (or **Ctrl/⌘ + Enter**). Output appears on the right; the button
  becomes **■ Stop** while running, and any error lines get **marked red in your code**
  (click the gutter dot to jump to them).

## 3. Giving input
Open the **📥** button (editor header) to reveal:
- **Arguments** — command-line args passed to your program.
- **stdin** — what your code reads (`input()`, `cin`, `scanf`).
- **Presets** — save/reload named input + args combos.

## 4. Web pages (HTML / CSS / JS)
- Make an `index.html` plus CSS/JS files and link them with normal tags —
  `<link href="styles.css">`, `<script src="app.js">` — or the **🔗** button.
- The **live preview** updates as you type; **console.log / errors** show in the console
  panel beneath it.
- **⧉** pops the preview into a **floating window** (drag, resize, minimize).

## 5. AI help (🤖)
- **Right-click 🤖** to set up your own **OpenAI or Gemini** key (stored only in your
  browser — see the **?** overlay for where to get a key).
- **Click 🤖** to open the **Ask AI chat** — ask it to write/explain code; replies come
  as code blocks with **⤵ Insert** and **📋 Copy**. The window is draggable, resizable,
  and minimizable.
- **Ctrl/⌘ + \** gives an **inline AI completion** at your cursor (Tab to accept).

> Note: AI uses *your* API key. Your prompt and current code are sent to the provider
> you choose (OpenAI/Google), so don't use it on anything sensitive.

## 6. Make it yours (🎨)
The **🎨** styles panel includes:
- **Editor theme** — presets (Dracula, Monokai, Solarized…), **custom colours**, or
  follow the site's light/dark.
- **Keybindings** — Default, **Sublime**, or **Vim**.
- Plus all the site-wide theme presets / custom themes.

Also: drag the **middle divider** to resize editor vs output, use **− / +** to zoom each
panel, **⛶** to maximize a panel, **✨** to format (JS/HTML/CSS), and **⭿** to toggle
word wrap.

## 7. Files menu (📁)
One dropdown for everything file-related:
- **💾 Save workspace** (all open tabs) · **📂 Open saved** (reload them)
- **⬇ Download this file** · **📦 Download project (.zip)** · **⬆ Open file(s)**
  (you can also drag-drop files onto the editor).

## 8. Focus & help
- **▾** hides the toolbar for a clean, full-screen coding view (a small handle brings it
  back).
- **❓** (or press **?**) opens the help overlay with the tutorial, the full
  **keyboard-shortcut list**, and the **AI key setup** guide.
- **🏠** returns to the calculator.

## Keyboard shortcuts
| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ + Enter` | Run code |
| `Ctrl/⌘ + Space` | Autocomplete menu |
| `Tab` | Accept the grey ghost suggestion |
| `Ctrl/⌘ + \` | AI completion |
| `Ctrl/⌘ + F` | Find |
| `Ctrl + G` | Find next |
| `Ctrl + H` | Replace |
| `Shift + Alt + F` | Format code (JS/HTML/CSS) |
| `Ctrl/⌘ + Q` | Fold / unfold block at cursor |
| `Esc` | Dismiss ghost / close dialogs / restore a maximized pane |
| `?` | Open the help overlay |

## Notes
- Everything runs in your browser. Python/JS/Java/C/C++ execute via the public **Piston**
  API; HTML/CSS/JS render locally in a sandboxed preview.
- Open tabs, saved workspaces, snippets, editor theme, and keybindings persist in your
  browser (localStorage).
