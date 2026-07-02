
(function () {
  "use strict";

  
  const style = document.createElement("style");
  style.textContent = `
    /* ── SIDEBAR PANEL (burger menu) ── */
    #mg-panel {
      position: fixed;
      left: 20px;
      top: 20px;
      z-index: 800;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    /* burger toggle button */
    #mg-burger {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 16px;
      background: var(--surface, #111);
      border: 1px solid var(--border2, rgba(255,255,255,0.12));
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 18px rgba(0,0,0,0.25);
    }
    #mg-burger:hover {
      border-color: var(--accent-border, rgba(200,169,110,0.35));
      background: var(--surface2, #181818);
    }
    .mg-burger-icon {
      position: relative;
      width: 16px;
      height: 12px;
      flex-shrink: 0;
    }
    .mg-burger-icon span {
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      border-radius: 2px;
      background: var(--accent, #c8a96e);
      transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease;
    }
    .mg-burger-icon span:nth-child(1) { top: 0; }
    .mg-burger-icon span:nth-child(2) { top: 5px; }
    .mg-burger-icon span:nth-child(3) { top: 10px; }
    #mg-panel.open .mg-burger-icon span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
    #mg-panel.open .mg-burger-icon span:nth-child(2) { opacity: 0; }
    #mg-panel.open .mg-burger-icon span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

    .mg-burger-label {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent, #c8a96e);
    }

    /* dropdown list */
    #mg-games-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 5px;
      width: 320px;
      padding: 8px;
      background: var(--surface, #111);
      border: 1px solid var(--border2, rgba(255,255,255,0.12));
      border-radius: 12px;
      box-shadow: 0 12px 34px rgba(0,0,0,0.4);
      transform-origin: top left;
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.22,1,0.36,1);
      max-height: calc(100vh - 90px);
      overflow-y: auto;
    }

    /* category header — spans both columns */
    .mg-cat {
      grid-column: 1 / -1;
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted, rgba(240,237,232,0.4));
      padding: 7px 8px 3px;
      border-top: 1px solid var(--border, rgba(255,255,255,0.07));
      margin-top: 3px;
    }
    .mg-cat:first-child {
      border-top: none;
      margin-top: 0;
    }

    /* category divider inside the mobile picker sheet */
    .mg-picker-cat {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted, rgba(240,237,232,0.45));
      padding: 14px 4px 4px;
    }
    #mg-panel.open #mg-games-list {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .mg-panel-btn {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 8px 9px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.16s ease;
      white-space: nowrap;
      overflow: hidden;
      user-select: none;
      text-decoration: none;
      text-align: left;
    }
    .mg-panel-btn:hover {
      border-color: var(--accent-border, rgba(200,169,110,0.35));
      background: var(--surface2, #181818);
    }

    .mg-panel-icon {
      font-size: 16px;
      line-height: 1;
      flex-shrink: 0;
    }

    .mg-panel-name {
      font-family: 'DM Mono', monospace;
      font-size: 9.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent, #c8a96e);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── OVERLAY ── */
    #mg-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: rgba(5,5,5,0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
    }
    #mg-overlay.open {
      display: flex;
      animation: mgFadeIn 0.2s ease;
    }
    /* hide the page's theme controls while a game is open so they don't
       overlap the modal's Fullscreen / Close buttons */
    body.mg-open #themeControls { display: none !important; }
    @keyframes mgFadeIn { from{opacity:0} to{opacity:1} }

    /* ── MODAL ── */
    #mg-modal {
      position: relative;
      width: min(94vw, 920px);
      height: min(90vh, 740px);
      background: var(--surface, #111);
      border: 1px solid var(--accent-border, rgba(200,169,110,0.25));
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow:
        0 40px 100px rgba(0,0,0,0.7),
        0 0 0 1px rgba(200,169,110,0.06),
        inset 0 1px 0 rgba(255,255,255,0.04);
      animation: mgSlideUp 0.3s cubic-bezier(0.22,1,0.36,1);
    }
    @keyframes mgSlideUp {
      from { opacity:0; transform: translateY(20px) scale(0.97); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    #mg-modal.fullscreen {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
      border: none;
    }

    /* ── TOP BAR ── */
    #mg-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
      background: var(--surface2, #181818);
      flex-shrink: 0;
      gap: 12px;
    }
    #mg-game-label {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--accent, #c8a96e);
    }
    #mg-topbar-btns {
      display: flex;
      gap: 8px;
    }
    .mg-tb-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 7px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      border: 1px solid var(--border2, rgba(255,255,255,0.14));
      background: transparent;
      color: var(--muted, rgba(240,237,232,0.5));
      transition: all 0.18s ease;
    }
    .mg-tb-btn:hover {
      color: var(--text, #f0ede8);
      border-color: var(--accent-border, rgba(200,169,110,0.3));
    }
    .mg-tb-btn.close-btn:hover {
      color: #e06060;
      border-color: rgba(224,96,96,0.4);
    }

    /* ── IFRAME ── */
    #mg-frame-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
    #mg-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: var(--bg, #0a0a0a);
    }

    /* ── TOAST ── */
    #mg-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface, #111);
      border: 1px solid var(--accent-border, rgba(200,169,110,0.3));
      border-radius: 100px;
      padding: 9px 20px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.14em;
      color: var(--accent, #c8a96e);
      white-space: nowrap;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    #mg-toast.show { opacity: 1; }

    /* ── MOBILE FAB ── */
    #mg-fab {
      display: none;
      position: fixed;
      bottom: 28px;
      right: 20px;
      z-index: 850;
      height: 44px;
      padding: 0 18px 0 14px;
      border-radius: 100px;
      background: var(--surface, #111);
      border: 1px solid var(--accent-border, rgba(200,169,110,0.35));
      color: var(--accent, #c8a96e);
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      gap: 8px;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,169,110,0.08);
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #mg-fab:active {
      transform: scale(0.94);
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }

    /* ── RESPONSIVE: hide panel, show FAB on small screens ── */
    @media (max-width: 860px) {
      #mg-panel { display: none; }
      #mg-fab   { display: flex; }
    }

    /* ── MOBILE PICKER SHEET ── */
    #mg-picker-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 860;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px);
    }
    #mg-picker-backdrop.open { display: block; }

    #mg-picker {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 870;
      background: var(--surface, #111);
      border-top: 1px solid var(--border2, rgba(255,255,255,0.14));
      border-radius: 20px 20px 0 0;
      padding: 12px 20px 40px;
      transform: translateY(100%);
      transition: transform 0.32s cubic-bezier(0.22,1,0.36,1);
      max-height: 82vh;
      overflow-y: auto;
    }
    #mg-picker.open { transform: translateY(0); }

    #mg-picker-handle {
      width: 36px;
      height: 4px;
      background: var(--border2, rgba(255,255,255,0.18));
      border-radius: 100px;
      margin: 0 auto 18px;
    }
    #mg-picker-title {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted, rgba(240,237,232,0.45));
      margin-bottom: 14px;
    }
    .mg-picker-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 13px 4px;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .mg-picker-row:last-child { border-bottom: none; }
    .mg-picker-row:active { opacity: 0.65; }
    .mg-picker-icon { font-size: 22px; line-height: 1; }
    .mg-picker-name {
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      letter-spacing: 0.06em;
      color: var(--text, #f0ede8);
    }

    /* ── SCROLLBAR (modal frame wrapper) ── */
    #mg-frame-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
    #mg-frame-wrap::-webkit-scrollbar-track { background: var(--bg, #0a0a0a); }
    #mg-frame-wrap::-webkit-scrollbar-thumb {
      background: var(--border2, rgba(255,255,255,0.15));
      border-radius: 100px;
    }
    #mg-frame-wrap::-webkit-scrollbar-thumb:hover {
      background: var(--accent-border, rgba(200,169,110,0.3));
    }

    /* ── LIQUID GLASS: frost the launcher surfaces ── */
    #mg-burger, #mg-games-list, #mg-fab, #mg-picker, #mg-modal, #mg-topbar {
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
    }
    #mg-burger, #mg-games-list, #mg-fab, #mg-picker {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 30px rgba(0,0,0,0.32);
    }
  `;
  document.head.appendChild(style);

  
  const fab = document.createElement("button");
  fab.id = "mg-fab";
  fab.setAttribute("aria-label", "Open games");
  fab.innerHTML = `<span style="font-size:16px;line-height:1">🎮</span><span>Games</span>`;
  document.body.appendChild(fab);

  const pickerBackdrop = document.createElement("div");
  pickerBackdrop.id = "mg-picker-backdrop";
  document.body.appendChild(pickerBackdrop);

  const picker = document.createElement("div");
  picker.id = "mg-picker";
  picker.innerHTML = `
    <div id="mg-picker-handle"></div>
    <div id="mg-picker-title">Games</div>
    <div class="mg-picker-row" data-game="tetris"><span class="mg-picker-icon">🟧</span><span class="mg-picker-name">Tetris</span></div>
    <div class="mg-picker-row" data-game="snake"><span class="mg-picker-icon">🐍</span><span class="mg-picker-name">Snake</span></div>
    <div class="mg-picker-row" data-game="2048"><span class="mg-picker-icon">🔢</span><span class="mg-picker-name">2048</span></div>
    <div class="mg-picker-row" data-game="sudoku"><span class="mg-picker-icon">🔷</span><span class="mg-picker-name">Sudoku</span></div>
    <div class="mg-picker-row" data-game="chess"><span class="mg-picker-icon">♟</span><span class="mg-picker-name">Chess</span></div>
    <div class="mg-picker-row" data-game="wordle"><span class="mg-picker-icon">🔤</span><span class="mg-picker-name">Wordle</span></div>
    <div class="mg-picker-row" data-game="minesweeper"><span class="mg-picker-icon">💣</span><span class="mg-picker-name">Minesweeper</span></div>
    <div class="mg-picker-row" data-game="memory"><span class="mg-picker-icon">🧠</span><span class="mg-picker-name">Memory</span></div>
    <div class="mg-picker-row" data-game="tictactoe"><span class="mg-picker-icon">⭕</span><span class="mg-picker-name">Tic-Tac-Toe</span></div>
    <div class="mg-picker-row" data-game="nonograms"><span class="mg-picker-icon">🧩</span><span class="mg-picker-name">Nonograms</span></div>
    <div class="mg-picker-row" data-game="slots"><span class="mg-picker-icon">🎰</span><span class="mg-picker-name">Slots</span></div>
    <div class="mg-picker-row" data-game="blackjack"><span class="mg-picker-icon">🃏</span><span class="mg-picker-name">Blackjack</span></div>
    <div class="mg-picker-row" data-game="mahjong"><span class="mg-picker-icon">🀄</span><span class="mg-picker-name">Mahjong</span></div>
    <div class="mg-picker-row" data-game="candycrush"><span class="mg-picker-icon">🍬</span><span class="mg-picker-name">Candy Crush</span></div>
    <div class="mg-picker-cat">Retro · Emulated</div>
    <div class="mg-picker-row" data-game="doom"><span class="mg-picker-icon">👹</span><span class="mg-picker-name">DOOM</span></div>
    <div class="mg-picker-row" data-game="pacman"><span class="mg-picker-icon">🟡</span><span class="mg-picker-name">Pac-Man</span></div>
    <div class="mg-picker-row" data-game="dkong"><span class="mg-picker-icon">🦍</span><span class="mg-picker-name">Donkey Kong</span></div>
    <div class="mg-picker-row" data-game="pop"><span class="mg-picker-icon">🗡️</span><span class="mg-picker-name">Prince of Persia</span></div>
    <div class="mg-picker-row" data-game="simcity"><span class="mg-picker-icon">🏙️</span><span class="mg-picker-name">SimCity</span></div>
    <div class="mg-picker-row" data-game="oregon"><span class="mg-picker-icon">🐂</span><span class="mg-picker-name">Oregon Trail</span></div>
  `;
  document.body.appendChild(picker);

  function openPicker() {
    pickerBackdrop.classList.add("open");
    picker.classList.add("open");
  }
  function closePicker() {
    pickerBackdrop.classList.remove("open");
    picker.classList.remove("open");
  }

  fab.addEventListener("click", openPicker);
  pickerBackdrop.addEventListener("click", closePicker);
  picker.querySelectorAll(".mg-picker-row").forEach((row) => {
    row.addEventListener("click", () => {
      closePicker();
      window.mgOpen(row.dataset.game);
    });
  });

  
  const panel = document.createElement("div");
  panel.id = "mg-panel";
  panel.innerHTML = `
    <button id="mg-burger" aria-label="Toggle games menu">
      <span class="mg-burger-icon"><span></span><span></span><span></span></span>
      <span class="mg-burger-label">Games</span>
    </button>
    <div id="mg-games-list">
      <div class="mg-cat">Classics &amp; Puzzles</div>
      <button class="mg-panel-btn" onclick="window.mgOpen('snake')" title="Snake">
        <span class="mg-panel-icon">🐍</span>
        <span class="mg-panel-name">Snake</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('2048')" title="2048">
        <span class="mg-panel-icon">🔢</span>
        <span class="mg-panel-name">2048</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('sudoku')" title="Sudoku">
        <span class="mg-panel-icon">🔷</span>
        <span class="mg-panel-name">Sudoku</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('chess')" title="Chess">
        <span class="mg-panel-icon">♟</span>
        <span class="mg-panel-name">Chess</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('tetris')" title="Tetris">
        <span class="mg-panel-icon">🟧</span>
        <span class="mg-panel-name">Tetris</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('wordle')" title="Wordle">
        <span class="mg-panel-icon">🔤</span>
        <span class="mg-panel-name">Wordle</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('minesweeper')" title="Minesweeper">
        <span class="mg-panel-icon">💣</span>
        <span class="mg-panel-name">Minesweeper</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('memory')" title="Memory">
        <span class="mg-panel-icon">🧠</span>
        <span class="mg-panel-name">Memory</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('tictactoe')" title="Tic-Tac-Toe">
        <span class="mg-panel-icon">⭕</span>
        <span class="mg-panel-name">Tic-Tac-Toe</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('nonograms')" title="Nonograms">
        <span class="mg-panel-icon">🧩</span>
        <span class="mg-panel-name">Nonograms</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('slots')" title="Slots">
        <span class="mg-panel-icon">🎰</span>
        <span class="mg-panel-name">Slots</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('blackjack')" title="Blackjack">
        <span class="mg-panel-icon">🃏</span>
        <span class="mg-panel-name">Blackjack</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('mahjong')" title="Mahjong">
        <span class="mg-panel-icon">🀄</span>
        <span class="mg-panel-name">Mahjong</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('candycrush')" title="Candy Crush">
        <span class="mg-panel-icon">🍬</span>
        <span class="mg-panel-name">Candy Crush</span>
      </button>

      <div class="mg-cat">Retro · Emulated</div>
      <button class="mg-panel-btn" onclick="window.mgOpen('doom')" title="DOOM">
        <span class="mg-panel-icon">👹</span>
        <span class="mg-panel-name">DOOM</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('pacman')" title="Pac-Man">
        <span class="mg-panel-icon">🟡</span>
        <span class="mg-panel-name">Pac-Man</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('dkong')" title="Donkey Kong">
        <span class="mg-panel-icon">🦍</span>
        <span class="mg-panel-name">Donkey Kong</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('pop')" title="Prince of Persia">
        <span class="mg-panel-icon">🗡️</span>
        <span class="mg-panel-name">Prince of Persia</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('simcity')" title="SimCity">
        <span class="mg-panel-icon">🏙️</span>
        <span class="mg-panel-name">SimCity</span>
      </button>
      <button class="mg-panel-btn" onclick="window.mgOpen('oregon')" title="Oregon Trail">
        <span class="mg-panel-icon">🐂</span>
        <span class="mg-panel-name">Oregon Trail</span>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  
  const burger = panel.querySelector("#mg-burger");
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });
  
  panel
    .querySelectorAll(".mg-panel-btn")
    .forEach((b) =>
      b.addEventListener("click", () => panel.classList.remove("open")),
    );
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target)) panel.classList.remove("open");
  });

  
  const overlay = document.createElement("div");
  overlay.id = "mg-overlay";
  overlay.innerHTML = `
    <div id="mg-modal">
      <div id="mg-topbar">
        <span id="mg-game-label">🎮 Game</span>
        <div id="mg-topbar-btns">
          <button class="mg-tb-btn" id="mg-full-btn" onclick="window.mgToggleFull()">⛶ Fullscreen</button>
          <button class="mg-tb-btn close-btn" onclick="window.mgClose()">✕ Close</button>
        </div>
      </div>
      <div id="mg-frame-wrap">
        <iframe id="mg-frame" src="about:blank"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  
  const toast = document.createElement("div");
  toast.id = "mg-toast";
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  
  const modal = document.getElementById("mg-modal");
  const frame = document.getElementById("mg-frame");
  const label = document.getElementById("mg-game-label");
  let isFullscreen = false;

  
  function syncFrameTheme() {
    try {
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      const doc = frame.contentDocument;
      if (doc && doc.documentElement) doc.documentElement.setAttribute("data-theme", theme);
    } catch (e) {}
  }
  frame.addEventListener("load", syncFrameTheme);
  
  new MutationObserver(syncFrameTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const GAMES = {
    snake: { icon: "🐍", name: "Snake", file: "snake.html" },
    2048: { icon: "🔢", name: "2048", file: "2048.html" },
    sudoku: { icon: "🔷", name: "Sudoku", file: "sudoku.html" },
    chess: { icon: "♟", name: "Chess", file: "chess.html" },
    tetris: { icon: "🟧", name: "Tetris", file: "tetris.html" },
    wordle: { icon: "🔤", name: "Wordle", file: "wordle.html" },
    minesweeper: { icon: "💣", name: "Minesweeper", file: "minesweeper.html" },
    memory: { icon: "🧠", name: "Memory", file: "memory.html" },
    tictactoe: { icon: "⭕", name: "Tic-Tac-Toe", file: "tictactoe.html" },
    nonograms: { icon: "🧩", name: "Nonograms", file: "nonograms.html" },
    slots: { icon: "🎰", name: "Slots", file: "slots.html" },
    blackjack: { icon: "🃏", name: "Blackjack", file: "blackjack.html" },
    mahjong: { icon: "🀄", name: "Mahjong", file: "mahjong.html" },
    candycrush: { icon: "🍬", name: "Candy Crush", file: "candycrush.html" },
    
    doom: { icon: "👹", name: "DOOM", file: "doom.html", retro: true },
    pacman: {
      icon: "🟡",
      name: "Pac-Man",
      retro: true,
      file: "retro.html?id=msdos_Pac-Man_1983&name=Pac-Man&year=1983",
    },
    dkong: {
      icon: "🦍",
      name: "Donkey Kong",
      retro: true,
      file: "retro.html?id=msdos_Donkey_Kong_1983&name=Donkey%20Kong&year=1983",
    },
    pop: {
      icon: "🗡️",
      name: "Prince of Persia",
      retro: true,
      file: "retro.html?id=msdos_Prince_of_Persia_1990&name=Prince%20of%20Persia&year=1990",
    },
    simcity: {
      icon: "🏙️",
      name: "SimCity",
      retro: true,
      file: "retro.html?id=msdos_SimCity_1989&name=SimCity&year=1989",
    },
    oregon: {
      icon: "🐂",
      name: "Oregon Trail",
      retro: true,
      file: "retro.html?id=msdos_Oregon_Trail_The_1990&name=Oregon%20Trail&year=1990",
    },
  };

  window.mgOpen = function (game) {
    const g = GAMES[game];
    if (!g) return;
    label.textContent = g.icon + " " + g.name;
    frame.src = g.file;
    overlay.classList.add("open");
    document.body.classList.add("mg-open");
    document.body.style.overflow = "hidden";
    
    
    if ((window.innerWidth <= 860 || g.retro) && !isFullscreen)
      window.mgToggleFull();
    showToast(g.icon + " " + g.name + " — tap ✕ to close");
  };

  window.mgClose = function () {
    overlay.classList.remove("open");
    document.body.classList.remove("mg-open");
    setTimeout(() => {
      frame.src = "about:blank";
    }, 250);
    document.body.style.overflow = "";
    if (isFullscreen) {
      modal.classList.remove("fullscreen");
      isFullscreen = false;
      document.getElementById("mg-full-btn").textContent = "⛶ Fullscreen";
    }
  };

  window.mgToggleFull = function () {
    isFullscreen = !isFullscreen;
    modal.classList.toggle("fullscreen", isFullscreen);
    document.getElementById("mg-full-btn").textContent = isFullscreen
      ? "⛶ Exit Full"
      : "⛶ Fullscreen";
  };

  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open"))
      window.mgClose();
  });

  
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) window.mgClose();
  });
})();
