
(function () {
  "use strict";

  
  const YT_API_KEY = "";

  
  const PIPED = [
    "https://api.piped.private.coffee",
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.reallyaweso.me",
    "https://piped-api.lunar.icu",
  ];

  const SUGGESTIONS = [
    "lofi hip hop radio",
    "relaxing nature 4k",
    "rain sounds",
    "synthwave mix",
    "fireplace 4k",
    "jazz cafe music",
  ];

  
  const style = document.createElement("style");
  style.textContent = `
    #yt-launch {
      position: fixed;
      /* sits in the same row as the theme controls, just to their left.
         theme controls = two 38px pills + 8px gap = 84px, anchored right:20 */
      top: 20px;
      right: 112px;
      z-index: 8800;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 35px;
      padding: 0;
      background: var(--surface, #111);
      border: 1px solid var(--border2, rgba(255,255,255,0.15));
      border-radius: 100px;
      cursor: pointer;
      user-select: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 18px rgba(0,0,0,0.25);
      transition: all 0.2s ease;
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
    }
    #yt-launch:hover {
      border-color: var(--accent-border, rgba(200,169,110,0.35));
      background: var(--surface2, #181818);
    }
    #yt-launch .yt-l-icon { font-size: 15px; line-height: 1; }

    #yt-pip {
      position: fixed;
      z-index: 9500;
      width: 384px;
      height: 300px;
      min-width: 264px;
      min-height: 188px;
      display: none;
      flex-direction: column;
      background: var(--surface, #111);
      border: 1px solid var(--accent-border, rgba(200,169,110,0.3));
      border-radius: 14px;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,169,110,0.05);
      font-family: 'DM Mono', monospace;
      -webkit-backdrop-filter: blur(22px) saturate(180%);
      backdrop-filter: blur(22px) saturate(180%);
    }
    #yt-pip.open { display: flex; }
    #yt-pip.minimized { height: auto !important; min-height: 0; }
    #yt-pip.minimized .yt-body { display: none; }

    .yt-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 12px;
      background: var(--surface2, #181818);
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
      cursor: grab;
      flex-shrink: 0;
      touch-action: none;
    }
    .yt-head:active { cursor: grabbing; }
    .yt-title {
      flex: 1;
      min-width: 0;
      font-size: 10.5px;
      letter-spacing: 0.04em;
      color: var(--text, #f0ede8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .yt-title .dot { color: var(--accent, #c8a96e); margin-right: 6px; }
    .yt-btn {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--muted, rgba(240,237,232,0.5));
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s ease;
    }
    .yt-btn:hover {
      color: var(--text, #f0ede8);
      border-color: var(--accent-border, rgba(200,169,110,0.3));
    }
    .yt-btn.close:hover { color: #e06060; border-color: rgba(224,96,96,0.4); }

    .yt-body { flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative; }

    .yt-search {
      display: flex;
      gap: 6px;
      padding: 8px;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
      flex-shrink: 0;
    }
    .yt-search input {
      flex: 1;
      min-width: 0;
      background: var(--bg, #0a0a0a);
      border: 1px solid var(--border2, rgba(255,255,255,0.14));
      border-radius: 7px;
      padding: 7px 10px;
      color: var(--text, #f0ede8);
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      outline: none;
    }
    .yt-search input:focus { border-color: var(--accent-border, rgba(200,169,110,0.4)); }
    .yt-search button {
      flex-shrink: 0;
      padding: 0 12px;
      background: var(--accent, #c8a96e);
      color: var(--accent-text, #0a0a0a);
      border: none;
      border-radius: 7px;
      cursor: pointer;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      font-weight: 500;
    }
    .yt-search button:hover { opacity: 0.85; }

    .yt-stage { flex: 1; position: relative; min-height: 0; background: #000; }
    .yt-stage iframe { width: 100%; height: 100%; border: none; display: block; }

    /* results overlay */
    .yt-results {
      position: absolute;
      inset: 0;
      background: var(--bg, #0a0a0a);
      overflow-y: auto;
      display: none;
      flex-direction: column;
    }
    .yt-results.show { display: flex; }
    .yt-res-row {
      display: flex;
      gap: 9px;
      padding: 7px 8px;
      cursor: pointer;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
      transition: background 0.12s ease;
    }
    .yt-res-row:hover { background: var(--surface2, #181818); }
    .yt-res-thumb {
      width: 86px;
      height: 48px;
      flex-shrink: 0;
      border-radius: 5px;
      object-fit: cover;
      background: #000;
      position: relative;
    }
    .yt-res-meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; justify-content: center; }
    .yt-res-title {
      font-size: 10.5px;
      line-height: 1.35;
      color: var(--text, #f0ede8);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .yt-res-author { font-size: 9px; color: var(--muted, rgba(240,237,232,0.45)); letter-spacing: 0.04em; }

    /* empty / status state */
    .yt-msg {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      padding: 20px;
      color: var(--muted, rgba(240,237,232,0.5));
      font-size: 11px;
      letter-spacing: 0.06em;
      line-height: 1.7;
    }
    .yt-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .yt-chip {
      padding: 5px 11px;
      border: 1px solid var(--border2, rgba(255,255,255,0.14));
      border-radius: 100px;
      background: var(--surface, #111);
      color: var(--accent, #c8a96e);
      font-size: 9px;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .yt-chip:hover { border-color: var(--accent-border, rgba(200,169,110,0.4)); background: var(--accent-dim, rgba(200,169,110,0.12)); }
    .yt-spin {
      width: 26px; height: 26px;
      border: 3px solid rgba(200,169,110,0.18);
      border-top-color: var(--accent, #c8a96e);
      border-radius: 50%;
      animation: yt-spin 0.9s linear infinite;
    }
    @keyframes yt-spin { to { transform: rotate(360deg); } }

    /* drag/resize shield so the iframe doesn't swallow pointer events */
    .yt-shield {
      position: fixed; inset: 0; z-index: 9600; display: none; cursor: grabbing;
    }
    .yt-shield.show { display: block; }

    /* resize handles on every edge + corner */
    .yt-rz { position: absolute; z-index: 7; }
    .yt-rz.corner { z-index: 8; width: 16px; height: 16px; }
    .yt-rz-n { top: 0; left: 0; right: 0; height: 8px; cursor: ns-resize; }
    .yt-rz-s { bottom: 0; left: 0; right: 0; height: 8px; cursor: ns-resize; }
    .yt-rz-e { top: 0; bottom: 0; right: 0; width: 8px; cursor: ew-resize; }
    .yt-rz-w { top: 0; bottom: 0; left: 0; width: 8px; cursor: ew-resize; }
    .yt-rz-ne { top: 0; right: 0; cursor: nesw-resize; }
    .yt-rz-nw { top: 0; left: 0; cursor: nwse-resize; }
    .yt-rz-se { bottom: 0; right: 0; cursor: nwse-resize; }
    .yt-rz-sw { bottom: 0; left: 0; cursor: nesw-resize; }
    /* subtle grip mark in the bottom-right corner */
    .yt-rz-se::after {
      content: "";
      position: absolute;
      right: 3px; bottom: 3px;
      width: 7px; height: 7px;
      border-right: 2px solid var(--muted, rgba(240,237,232,0.4));
      border-bottom: 2px solid var(--muted, rgba(240,237,232,0.4));
    }
    /* header sits below the resize handles, but its buttons sit above them,
       so the top edge resizes while the buttons stay clickable */
    .yt-head { position: relative; }
    .yt-head .yt-btn { position: relative; z-index: 20; }

    @media (max-width: 560px) {
      #yt-launch { top: auto; bottom: 84px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  
  const launch = document.createElement("button");
  launch.id = "yt-launch";
  launch.setAttribute("aria-label", "Open video player");
  launch.innerHTML = `<span class="yt-l-icon">📺</span>`;
  document.body.appendChild(launch);

  const shield = document.createElement("div");
  shield.className = "yt-shield";
  document.body.appendChild(shield);

  const pip = document.createElement("div");
  pip.id = "yt-pip";
  pip.innerHTML = `
    <div class="yt-head">
      <span class="yt-title"><span class="dot">▶</span><span class="yt-title-text">Videos</span></span>
      <button class="yt-btn" data-act="search" title="Search">🔍</button>
      <button class="yt-btn" data-act="min" title="Minimize">—</button>
      <button class="yt-btn close" data-act="close" title="Close">✕</button>
    </div>
    <div class="yt-body">
      <div class="yt-search">
        <input type="text" placeholder="Search YouTube, or paste a link…" />
        <button data-act="go">Go</button>
      </div>
      <div class="yt-stage">
        <iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
        <div class="yt-results"></div>
      </div>
    </div>
  `;
  document.body.appendChild(pip);

  
  ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach((dir) => {
    const h = document.createElement("div");
    h.className = "yt-rz yt-rz-" + dir + (dir.length === 2 ? " corner" : "");
    h.dataset.dir = dir;
    pip.appendChild(h);
  });

  const head = pip.querySelector(".yt-head");
  const titleText = pip.querySelector(".yt-title-text");
  const searchBar = pip.querySelector(".yt-search");
  const input = pip.querySelector(".yt-search input");
  const iframe = pip.querySelector(".yt-stage iframe");
  const results = pip.querySelector(".yt-results");

  
  const LS = "yt-pip-state";
  function saveState() {
    try {
      localStorage.setItem(
        LS,
        JSON.stringify({
          left: pip.style.left,
          top: pip.style.top,
          width: pip.style.width,
          height: pip.style.height,
        }),
      );
    } catch (e) {}
  }
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "{}");
      if (s.width) pip.style.width = s.width;
      if (s.height) pip.style.height = s.height;
      if (s.left) pip.style.left = s.left;
      if (s.top) pip.style.top = s.top;
    } catch (e) {}
    
    if (!pip.style.left) {
      pip.style.left = Math.max(12, window.innerWidth - 384 - 24) + "px";
      pip.style.top = Math.max(12, window.innerHeight - 300 - 24) + "px";
    }
  }

  
  function openPip() {
    loadState();
    pip.classList.add("open");
    launch.style.display = "none";
    if (!iframe.src || iframe.src === "about:blank") showWelcome();
    clampIntoView();
  }
  function closePip() {
    pip.classList.remove("open");
    iframe.src = "about:blank"; 
    launch.style.display = "flex";
  }
  function toggleMin() {
    pip.classList.toggle("minimized");
  }

  launch.addEventListener("click", openPip);
  head.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") closePip();
    else if (act === "min") toggleMin();
    else if (act === "search") {
      searchBar.style.display = searchBar.style.display === "none" ? "flex" : "none";
      if (searchBar.style.display !== "none") input.focus();
    }
  });

  
  pip.querySelector('[data-act="go"]').addEventListener("click", runQuery);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runQuery();
  });

  function runQuery() {
    const q = input.value.trim();
    if (!q) return;
    const id = parseYouTube(q);
    if (id) {
      playVideo(id, "Now playing");
      input.value = "";
      return;
    }
    doSearch(q);
  }

  
  function parseYouTube(text) {
    text = text.trim();
    let m =
      text.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})/) ||
      text.match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : null;
  }

  
  function playVideo(id, title) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    iframe.src =
      "https://www.youtube.com/embed/" +
      id +
      "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
    titleText.textContent = title || "Now playing";
    results.classList.remove("show");
    pip.classList.remove("minimized");
  }

  
  async function fetchTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    } finally {
      clearTimeout(t);
    }
  }

  async function searchVideos(q) {
    const enc = encodeURIComponent(q);
    if (YT_API_KEY) {
      const r = await fetchTimeout(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=18&q=${enc}&key=${YT_API_KEY}`,
        9000,
      );
      const j = await r.json();
      return (j.items || [])
        .filter((it) => it.id && it.id.videoId)
        .map((it) => ({
          id: it.id.videoId,
          title: decodeEntities(it.snippet.title),
          author: it.snippet.channelTitle,
        }));
    }
    
    for (const base of PIPED) {
      try {
        const r = await fetchTimeout(`${base}/search?q=${enc}&filter=videos`, 7000);
        if (!r.ok) continue;
        const j = await r.json();
        const items = (j.items || [])
          .filter((i) => i.url && i.url.includes("v="))
          .map((i) => ({
            id: i.url.split("v=")[1].split("&")[0],
            title: i.title,
            author: i.uploaderName,
          }))
          .filter((i) => /^[A-Za-z0-9_-]{11}$/.test(i.id));
        if (items.length) return items;
      } catch (e) {
        
      }
    }
    throw new Error("no-provider");
  }

  function decodeEntities(s) {
    const el = document.createElement("textarea");
    el.innerHTML = s || "";
    return el.value;
  }

  async function doSearch(q) {
    showSpinner();
    try {
      const items = await searchVideos(q);
      if (!items.length) {
        showMessage("No results found. Try a different search, or paste a video link.");
        return;
      }
      renderResults(items);
    } catch (e) {
      showMessage(
        "Search service is unavailable right now.<br>You can still <b>paste a YouTube link or video ID</b> above to play it.",
      );
    }
  }

  
  function renderResults(items) {
    results.innerHTML = "";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "yt-res-row";

      const img = document.createElement("img");
      img.className = "yt-res-thumb";
      img.loading = "lazy";
      img.src = `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`;
      img.onerror = () => {
        img.style.visibility = "hidden";
      };

      const meta = document.createElement("div");
      meta.className = "yt-res-meta";
      const t = document.createElement("div");
      t.className = "yt-res-title";
      t.textContent = it.title || "Untitled";
      const a = document.createElement("div");
      a.className = "yt-res-author";
      a.textContent = it.author || "";
      meta.appendChild(t);
      meta.appendChild(a);

      row.appendChild(img);
      row.appendChild(meta);
      row.addEventListener("click", () => playVideo(it.id, it.title));
      results.appendChild(row);
    });
    results.classList.add("show");
  }

  function showSpinner() {
    results.innerHTML = `<div class="yt-msg"><div class="yt-spin"></div><div>Searching…</div></div>`;
    results.classList.add("show");
  }
  function showMessage(html) {
    results.innerHTML = `<div class="yt-msg"><div>${html}</div></div>`;
    results.classList.add("show");
  }
  function showWelcome() {
    const chips = SUGGESTIONS.map(
      (s) => `<button class="yt-chip" data-q="${s.replace(/"/g, "&quot;")}">${s}</button>`,
    ).join("");
    results.innerHTML = `
      <div class="yt-msg">
        <div>🎬 Search YouTube or paste a link to start.<br>Drag me by the title bar; resize from the corner.</div>
        <div class="yt-chips">${chips}</div>
      </div>`;
    results.classList.add("show");
    results.querySelectorAll(".yt-chip").forEach((c) =>
      c.addEventListener("click", () => {
        input.value = c.dataset.q;
        doSearch(c.dataset.q);
      }),
    );
  }

  
  const SNAP = 130; 
  const DOCK_M = 16; 
  const DOCK_W = 300, 
    DOCK_H = 196;

  
  const dzWrap = document.createElement("div");
  dzWrap.id = "yt-dropzones";
  dzWrap.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9490;display:none;";
  const dzEls = {};
  ["tl", "tr", "bl", "br"].forEach((c) => {
    const d = document.createElement("div");
    d.style.cssText =
      "position:absolute;width:104px;height:74px;border:2px dashed rgba(200,169,110,0.4);" +
      "border-radius:12px;transition:background .12s ease,border-color .12s ease;";
    d.style[c[0] === "t" ? "top" : "bottom"] = "14px";
    d.style[c[1] === "l" ? "left" : "right"] = "14px";
    dzWrap.appendChild(d);
    dzEls[c] = d;
  });
  document.body.appendChild(dzWrap);

  function nearCorner() {
    const r = pip.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const v = r.top <= SNAP ? "t" : (H - r.bottom <= SNAP ? "b" : null);
    const h = r.left <= SNAP ? "l" : (W - r.right <= SNAP ? "r" : null);
    return v && h ? v + h : null;
  }
  function highlightZones(active) {
    Object.keys(dzEls).forEach((k) => {
      const on = k === active;
      dzEls[k].style.background = on ? "rgba(200,169,110,0.22)" : "transparent";
      dzEls[k].style.borderColor = on
        ? "var(--accent, #c8a96e)"
        : "rgba(200,169,110,0.4)";
    });
  }

  let drag = null;
  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-act]")) return; 
    const r = pip.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    pip.style.transition = ""; 
    shield.classList.add("show");
    shield.style.cursor = "grabbing";
    dzWrap.style.display = "block";
    highlightZones(null);
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", endDrag);
  });
  function onDrag(e) {
    if (!drag) return;
    let x = e.clientX - drag.dx;
    let y = e.clientY - drag.dy;
    const w = pip.offsetWidth,
      h = pip.offsetHeight;
    x = Math.max(4, Math.min(x, window.innerWidth - w - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - h - 4));
    pip.style.left = x + "px";
    pip.style.top = y + "px";
    highlightZones(nearCorner());
  }
  function endDrag() {
    drag = null;
    shield.classList.remove("show");
    dzWrap.style.display = "none";
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", endDrag);

    
    const c = nearCorner();
    if (c) {
      const W = window.innerWidth, H = window.innerHeight;
      pip.style.transition =
        "left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease";
      pip.style.width = DOCK_W + "px";
      pip.style.height = DOCK_H + "px";
      pip.style.left = (c[1] === "l" ? DOCK_M : W - DOCK_W - DOCK_M) + "px";
      pip.style.top = (c[0] === "t" ? DOCK_M : H - DOCK_H - DOCK_M) + "px";
      setTimeout(() => { pip.style.transition = ""; saveState(); }, 200);
    } else {
      saveState();
    }
  }

  
  const MIN_W = 264,
    MIN_H = 188,
    MARGIN = 4;
  let rez = null;
  pip.querySelectorAll(".yt-rz").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = pip.getBoundingClientRect();
      rez = {
        dir: handle.dataset.dir,
        sx: e.clientX,
        sy: e.clientY,
        left: r.left,
        top: r.top,
        w: r.width,
        h: r.height,
      };
      shield.classList.add("show");
      shield.style.cursor = getComputedStyle(handle).cursor;
      window.addEventListener("pointermove", onResize);
      window.addEventListener("pointerup", endResize);
    });
  });
  function onResize(e) {
    if (!rez) return;
    const d = rez.dir;
    const dx = e.clientX - rez.sx;
    const dy = e.clientY - rez.sy;
    const right = rez.left + rez.w;
    const bottom = rez.top + rez.h;
    let left = rez.left,
      top = rez.top,
      w = rez.w,
      h = rez.h;

    if (d.includes("e")) {
      w = Math.min(rez.w + dx, window.innerWidth - rez.left - MARGIN);
      w = Math.max(MIN_W, w);
    }
    if (d.includes("s")) {
      h = Math.min(rez.h + dy, window.innerHeight - rez.top - MARGIN);
      h = Math.max(MIN_H, h);
    }
    if (d.includes("w")) {
      
      left = Math.max(MARGIN, Math.min(rez.left + dx, right - MIN_W));
      w = right - left;
    }
    if (d.includes("n")) {
      
      top = Math.max(MARGIN, Math.min(rez.top + dy, bottom - MIN_H));
      h = bottom - top;
    }
    pip.style.width = w + "px";
    pip.style.height = h + "px";
    pip.style.left = left + "px";
    pip.style.top = top + "px";
  }
  function endResize() {
    rez = null;
    shield.classList.remove("show");
    window.removeEventListener("pointermove", onResize);
    window.removeEventListener("pointerup", endResize);
    saveState();
  }

  
  function clampIntoView() {
    const r = pip.getBoundingClientRect();
    let x = Math.min(r.left, window.innerWidth - pip.offsetWidth - 4);
    let y = Math.min(r.top, window.innerHeight - pip.offsetHeight - 4);
    pip.style.left = Math.max(4, x) + "px";
    pip.style.top = Math.max(4, y) + "px";
  }
  window.addEventListener("resize", () => {
    if (pip.classList.contains("open")) clampIntoView();
  });

  
  
})();
