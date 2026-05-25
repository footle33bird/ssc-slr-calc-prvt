/**
 * THEME STUDIO — let visitors create, preview, save & reuse custom themes.
 *
 * A custom theme = a base (light/dark, which supplies the neutral/glass
 * tokens) + user-chosen Accent, Background and Text colours. Those are
 * applied as inline CSS custom properties on <html>, which override the
 * stylesheet's [data-theme] values. Everything (calculator, games, video
 * player) reads the same variables, so the whole site re-themes at once.
 *
 * Saved themes + the active selection persist in localStorage. The built-in
 * light/dark toggle still works — using it clears any custom overrides.
 */
(function () {
  "use strict";

  const html = document.documentElement;
  const LS_ACTIVE = "salary-theme-active";
  const LS_SAVED = "salary-theme-saved";

  const CUSTOM_VARS = [
    "--accent",
    "--accent-border",
    "--accent-dim",
    "--accent-text",
    "--bg",
    "--canvas",
    "--text",
    "--muted",
    "--aurora-1",
  ];

  const PRESETS = [
    { name: "Midnight Gold", base: "dark", accent: "#c8a96e", bg: "#0a0a0a", text: "#f0ede8" },
    { name: "Daylight", base: "light", accent: "#9e7a3f", bg: "#eae7f0", text: "#1a1814" },
    { name: "Ocean", base: "dark", accent: "#4fb6c8", bg: "#08131a", text: "#e6f1f4" },
    { name: "Forest", base: "dark", accent: "#6ec88a", bg: "#0b140e", text: "#e8f2ea" },
    { name: "Rosé", base: "light", accent: "#c2557a", bg: "#f4e9ee", text: "#2a1820" },
    { name: "Grape", base: "dark", accent: "#a78bdb", bg: "#120f1c", text: "#efeaf7" },
  ];

  /* ── colour helpers ─────────────────────────────────── */
  function hx(h) {
    h = (h || "").trim().replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0,
    };
  }
  function rgba(h, a) {
    const { r, g, b } = hx(h);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function mix(h, t, amt) {
    const a = hx(h),
      b = hx(t);
    const m = (x, y) => Math.round(x + (y - x) * amt);
    return (
      "#" +
      [m(a.r, b.r), m(a.g, b.g), m(a.b, b.b)]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  function lum(h) {
    const { r, g, b } = hx(h);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  // normalise any css colour (hex or rgb()) to #rrggbb for <input type=color>
  function toHex(v) {
    v = (v || "").trim();
    if (v[0] === "#") return mix(v, v, 0); // round-trips 3-digit → 6-digit
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b] = m[1].split(",").map((n) => parseInt(n, 10));
      return (
        "#" +
        [r, g, b].map((x) => (x || 0).toString(16).padStart(2, "0")).join("")
      );
    }
    return "#888888";
  }

  /* ── apply / clear ──────────────────────────────────── */
  function setBaseAttr(base) {
    // the merged button is a static "🎨 THEME" launcher now, so we only set
    // the data-theme attribute and leave the button's icon/label alone.
    html.setAttribute("data-theme", base);
  }
  function applyVars(t) {
    setBaseAttr(t.base);
    const s = html.style;
    s.setProperty("--accent", t.accent);
    s.setProperty("--accent-border", rgba(t.accent, 0.4));
    s.setProperty("--accent-dim", rgba(t.accent, 0.14));
    s.setProperty("--accent-text", lum(t.accent) > 0.6 ? "#12100c" : "#ffffff");
    s.setProperty("--bg", t.bg);
    s.setProperty(
      "--canvas",
      "radial-gradient(125% 125% at 0% 0%, " +
        mix(t.bg, "#ffffff", 0.06) +
        " 0%, " +
        t.bg +
        " 55%, " +
        mix(t.bg, "#000000", 0.06) +
        " 100%)",
    );
    s.setProperty("--text", t.text);
    s.setProperty("--muted", rgba(t.text, 0.55));
    s.setProperty("--aurora-1", rgba(t.accent, 0.3));
    updateSelectArrows();
  }
  function clearVars() {
    CUSTOM_VARS.forEach((v) => html.style.removeProperty(v));
  }

  /* ── persistence ────────────────────────────────────── */
  const load = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch (e) {
      return d;
    }
  };
  const save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  };

  let saved = load(LS_SAVED, []);
  let activeName = null; // name of the saved/preset theme currently applied

  /* ── STYLES ─────────────────────────────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    /* the merged control group: quick light/dark toggle + Theme button */
    #themeControls {
      position: fixed; top: 20px; right: 20px; z-index: 9302;
      display: flex; align-items: center; gap: 8px;
    }
    #themeControls .theme-toggle { position: static; top: auto; right: auto; }
    #thm-quick {
      display: flex; align-items: center; justify-content: center;
      width: 38px; height: 35px; padding: 0; cursor: pointer; user-select: none;
      border-radius: 100px; font-size: 14px; line-height: 1;
      color: var(--accent, #c8a96e);
      background: var(--surface, #111);
      border: 1px solid var(--border2, rgba(255,255,255,0.15));
      -webkit-backdrop-filter: var(--glass-blur, blur(20px));
      backdrop-filter: var(--glass-blur, blur(20px));
      box-shadow: var(--glass-hi, inset 0 1px 0 rgba(255,255,255,0.16));
      transition: all 0.18s ease;
    }
    #thm-quick:hover { border-color: var(--accent-border, rgba(200,169,110,0.4)); }
    #thm-quick:active { transform: scale(0.94); }

    /* click-away layer (transparent — this is a dropdown, not a modal) */
    #thm-backdrop {
      position: fixed; inset: 0; z-index: 9300; display: none; background: transparent;
    }
    #thm-backdrop.open { display: block; }

    /* dropdown anchored under the control group */
    #thm-panel {
      position: fixed; top: 64px; right: 20px; z-index: 9301;
      width: min(330px, 92vw);
      max-height: calc(100vh - 84px); overflow-y: auto;
      display: flex; flex-direction: column;
      background: var(--surface2, #181818);
      border: 1px solid var(--accent-border, rgba(200,169,110,0.3));
      border-radius: 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.4);
      -webkit-backdrop-filter: blur(24px) saturate(170%); backdrop-filter: blur(24px) saturate(170%);
      font-family: 'DM Mono', monospace; color: var(--text, #f0ede8);
      transform-origin: top right;
      opacity: 0; visibility: hidden; pointer-events: none;
      transform: translateY(-8px) scale(0.97);
      transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1), visibility 0.18s;
    }
    #thm-panel.open {
      opacity: 1; visibility: visible; pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .thm-head {
      display: flex; align-items: center; justify-content: flex-end;
      padding: 9px 9px 0; position: sticky; top: 0; z-index: 2;
    }
    .thm-title {
      font-family: 'Cormorant Garamond', serif; font-style: italic;
      font-size: 22px; color: var(--accent, #c8a96e); font-weight: 400;
    }
    .thm-x {
      width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
      border: 1px solid transparent; background: transparent;
      color: var(--muted, rgba(240,237,232,0.5)); font-size: 15px;
    }
    .thm-x:hover { color: #e06060; border-color: rgba(224,96,96,0.4); }

    .thm-body { padding: 4px 18px 28px; display: flex; flex-direction: column; gap: 20px; }
    .thm-sec-label {
      font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--muted, rgba(240,237,232,0.45)); margin-bottom: 9px;
    }

    .thm-seg { display: flex; gap: 6px; }
    .thm-seg button {
      flex: 1; padding: 9px; border-radius: 8px; cursor: pointer;
      font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--muted, rgba(240,237,232,0.5));
      background: var(--surface, #111); border: 1px solid var(--border2, rgba(255,255,255,0.14));
      transition: all 0.15s ease;
    }
    .thm-seg button.on {
      color: var(--accent, #c8a96e); border-color: var(--accent-border, rgba(200,169,110,0.4));
      background: var(--accent-dim, rgba(200,169,110,0.14));
    }

    .thm-color {
      display: flex; align-items: center; gap: 12px; padding: 9px 0;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
    }
    .thm-color:last-child { border-bottom: none; }
    .thm-color .name { flex: 1; font-size: 11px; letter-spacing: 0.04em; }
    .thm-color .hex { font-size: 10px; color: var(--muted, rgba(240,237,232,0.5)); width: 64px; text-align: right; }
    .thm-color input[type="color"] {
      width: 38px; height: 30px; padding: 0; border: 1px solid var(--border2, rgba(255,255,255,0.18));
      border-radius: 7px; background: transparent; cursor: pointer;
    }
    .thm-color input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
    .thm-color input[type="color"]::-webkit-color-swatch { border: none; border-radius: 5px; }

    .thm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .thm-chip {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 10px 6px 7px; border-radius: 100px; cursor: pointer;
      background: var(--surface, #111); border: 1px solid var(--border2, rgba(255,255,255,0.14));
      font-size: 10px; letter-spacing: 0.04em; color: var(--text, #f0ede8);
      transition: all 0.15s ease;
    }
    .thm-chip:hover { border-color: var(--accent-border, rgba(200,169,110,0.4)); }
    .thm-chip.on { border-color: var(--accent, #c8a96e); background: var(--accent-dim, rgba(200,169,110,0.14)); }
    .thm-swatch { width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); }
    .thm-chip .del { color: var(--muted, rgba(240,237,232,0.5)); font-size: 12px; margin-left: 1px; }
    .thm-chip .del:hover { color: #e06060; }

    .thm-save { display: flex; gap: 7px; margin-top: 10px; }
    .thm-save input {
      flex: 1; min-width: 0; background: var(--input-bg, #111);
      border: 1px solid var(--border2, rgba(255,255,255,0.16)); border-radius: 7px;
      padding: 8px 11px; color: var(--text, #f0ede8); font-family: 'DM Mono', monospace; font-size: 11px; outline: none;
    }
    .thm-save input:focus { border-color: var(--accent-border, rgba(200,169,110,0.4)); }
    .thm-btn {
      padding: 8px 14px; border-radius: 7px; cursor: pointer; border: 1px solid;
      font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    }
    .thm-btn-primary { background: var(--accent, #c8a96e); border-color: var(--accent, #c8a96e); color: var(--accent-text, #0a0a0a); font-weight: 600; }
    .thm-btn-primary:hover { opacity: 0.85; }
    .thm-btn-ghost { background: transparent; border-color: var(--border2, rgba(255,255,255,0.16)); color: var(--muted, rgba(240,237,232,0.6)); width: 100%; margin-top: 4px; }
    .thm-btn-ghost:hover { color: var(--text, #f0ede8); border-color: var(--accent-border, rgba(200,169,110,0.4)); }
    .thm-empty { font-size: 10px; color: var(--muted, rgba(240,237,232,0.45)); letter-spacing: 0.04em; }
  `;
  document.head.appendChild(style);

  /* ── DOM ────────────────────────────────────────────── */
  // the launcher is the existing top-right button (now merged: 🎨 THEME)
  const themeBtn = document.getElementById("themeBtn");
  const themeControls = document.getElementById("themeControls");

  // quick light/dark toggle, sitting just left of the Theme button
  const quick = document.createElement("button");
  quick.id = "thm-quick";
  quick.setAttribute("aria-label", "Toggle light / dark");
  if (themeControls) themeControls.insertBefore(quick, themeControls.firstChild);

  function updateQuickIcon() {
    const dark = html.getAttribute("data-theme") === "dark";
    quick.textContent = dark ? "☀" : "☾";
    quick.title = dark ? "Switch to light" : "Switch to dark";
  }

  // recolour the <select> dropdown arrows to match the current accent
  function updateSelectArrows() {
    const accent =
      getComputedStyle(html).getPropertyValue("--accent").trim() || "#c8a96e";
    const svg =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='" +
      encodeURIComponent(accent) +
      "' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")";
    document.querySelectorAll("select").forEach((s) => (s.style.backgroundImage = svg));
  }

  // apply a clean built-in light/dark theme (drops custom overrides)
  function applyBase(next) {
    clearVars();
    setBaseAttr(next);
    activeName = null;
    save(LS_ACTIVE, { mode: "builtin", base: next });
    updateQuickIcon();
    updateSelectArrows();
  }

  // read the background a given base theme would render (so the wave matches)
  function themeBackground(base) {
    const probe = document.createElement("div");
    probe.setAttribute("data-theme", base);
    probe.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;visibility:hidden;";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    let bg = cs.getPropertyValue("--canvas").trim();
    if (!bg) bg = cs.getPropertyValue("--bg").trim();
    probe.remove();
    return bg || (base === "dark" ? "#0a0a0a" : "#eae7f0");
  }

  // Circular "wave" reveal expanding from `originEl`.
  //
  // Primary path uses the View Transitions API so the circle unveils the
  // REAL new-themed page (cards, text, everything) — not a flat disc.
  // Always animates (no reduce-motion gate — it's an explicit request).
  // Browsers without View Transitions fall back to an overlay colour wave.
  let revealing = false;
  function switchWithReveal(originEl, next) {
    if (revealing) {
      applyBase(next);
      syncPanel();
      return;
    }
    const r = originEl.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const R =
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      ) + 6;
    const start = `circle(0px at ${x}px ${y}px)`;
    const end = `circle(${R}px at ${x}px ${y}px)`;

    /* ---- real content reveal via View Transitions ---- */
    if (document.startViewTransition) {
      revealing = true;
      html.classList.add("theme-switching");
      const vt = document.startViewTransition(() => {
        applyBase(next);
        syncPanel();
      });
      vt.ready
        .then(() => {
          html.animate(
            { clipPath: [start, end] },
            {
              duration: 600,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {});
      vt.finished.finally(() => {
        html.classList.remove("theme-switching");
        revealing = false;
      });
      return;
    }

    /* ---- fallback: overlay colour wave ---- */
    revealing = true;
    const ov = document.createElement("div");
    ov.style.position = "fixed";
    ov.style.inset = "0";
    ov.style.zIndex = "100000";
    ov.style.pointerEvents = "none";
    ov.style.background = themeBackground(next);
    document.body.appendChild(ov);
    let swapped = false;
    const finish = () => {
      if (swapped) return;
      swapped = true;
      applyBase(next);
      syncPanel();
      const fade = ov.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 260,
        easing: "ease",
        fill: "forwards",
      });
      const cleanup = () => {
        ov.remove();
        revealing = false;
      };
      if (fade && fade.finished) fade.finished.then(cleanup, cleanup);
      else setTimeout(cleanup, 280);
    };
    if (typeof ov.animate === "function") {
      const a = ov.animate(
        [
          { clipPath: start, webkitClipPath: start },
          { clipPath: end, webkitClipPath: end },
        ],
        { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
      a.onfinish = finish;
      setTimeout(finish, 700);
    } else {
      ov.style.clipPath = start;
      ov.style.transition = "clip-path 600ms cubic-bezier(0.22,1,0.36,1)";
      void ov.offsetWidth;
      ov.style.clipPath = end;
      setTimeout(finish, 640);
    }
  }

  quick.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    switchWithReveal(quick, next);
  });

  const backdrop = document.createElement("div");
  backdrop.id = "thm-backdrop";
  document.body.appendChild(backdrop);

  const panel = document.createElement("div");
  panel.id = "thm-panel";
  panel.innerHTML = `
    <div class="thm-head">
      <button class="thm-x" data-x aria-label="Close">✕</button>
    </div>
    <div class="thm-body">
      <div>
        <div class="thm-sec-label">Base</div>
        <div class="thm-seg" id="thm-base">
          <button data-base="light">☾ Light</button>
          <button data-base="dark">☀ Dark</button>
        </div>
      </div>
      <div>
        <div class="thm-sec-label">Colours</div>
        <div class="thm-color">
          <span class="name">Accent</span>
          <span class="hex" id="thm-hx-accent"></span>
          <input type="color" id="thm-accent" />
        </div>
        <div class="thm-color">
          <span class="name">Background</span>
          <span class="hex" id="thm-hx-bg"></span>
          <input type="color" id="thm-bg" />
        </div>
        <div class="thm-color">
          <span class="name">Text</span>
          <span class="hex" id="thm-hx-text"></span>
          <input type="color" id="thm-text" />
        </div>
      </div>
      <div>
        <div class="thm-sec-label">Presets</div>
        <div class="thm-chips" id="thm-presets"></div>
      </div>
      <div>
        <div class="thm-sec-label">My themes</div>
        <div class="thm-chips" id="thm-saved"></div>
        <div class="thm-save">
          <input type="text" id="thm-name" placeholder="Name this theme…" maxlength="22" />
          <button class="thm-btn thm-btn-primary" id="thm-save">Save</button>
        </div>
        <button class="thm-btn thm-btn-ghost" id="thm-reset">Reset to default</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const $ = (id) => document.getElementById(id);
  const accentIn = $("thm-accent"),
    bgIn = $("thm-bg"),
    textIn = $("thm-text");
  const baseSeg = $("thm-base");

  let curBase = html.getAttribute("data-theme") === "dark" ? "dark" : "light";

  /* ── open / close ───────────────────────────────────── */
  function open() {
    syncPanel();
    backdrop.classList.add("open");
    panel.classList.add("open");
  }
  function close() {
    backdrop.classList.remove("open");
    panel.classList.remove("open");
  }
  function toggle() {
    panel.classList.contains("open") ? close() : open();
  }
  if (themeBtn) themeBtn.addEventListener("click", toggle);
  backdrop.addEventListener("click", close);
  panel.querySelector("[data-x]").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) close();
  });

  /* ── current picker → theme object ──────────────────── */
  function current() {
    return {
      base: curBase,
      accent: accentIn.value,
      bg: bgIn.value,
      text: textIn.value,
    };
  }
  function updateHex() {
    $("thm-hx-accent").textContent = accentIn.value;
    $("thm-hx-bg").textContent = bgIn.value;
    $("thm-hx-text").textContent = textIn.value;
  }

  // apply whatever the pickers currently say (a live, unsaved custom theme)
  function applyCurrent() {
    const t = current();
    applyVars(t);
    activeName = null;
    save(LS_ACTIVE, Object.assign({ mode: "custom" }, t));
    updateHex();
    highlightChips();
  }

  [accentIn, bgIn, textIn].forEach((inp) =>
    inp.addEventListener("input", applyCurrent),
  );
  baseSeg.querySelectorAll("[data-base]").forEach((b) =>
    b.addEventListener("click", () => {
      // switching base gives the clean built-in light/dark theme
      // (drops any custom colour overrides); tweak a colour to go custom.
      // Same circular-wave reveal, expanding from the clicked button.
      switchWithReveal(b, b.dataset.base);
    }),
  );

  /* ── apply a full preset / saved theme ──────────────── */
  function applyTheme(t, name) {
    curBase = t.base;
    accentIn.value = toHex(t.accent);
    bgIn.value = toHex(t.bg);
    textIn.value = toHex(t.text);
    applyVars(t);
    activeName = name || null;
    save(LS_ACTIVE, Object.assign({ mode: "custom", name: activeName }, t));
    syncPanel();
  }

  /* ── render preset + saved chips ────────────────────── */
  function chip(t, opts) {
    const el = document.createElement("button");
    el.className = "thm-chip";
    el.innerHTML =
      `<span class="thm-swatch" style="background:${t.accent}"></span>` +
      `<span class="nm"></span>` +
      (opts.deletable ? `<span class="del" title="Delete">✕</span>` : "");
    el.querySelector(".nm").textContent = t.name;
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("del")) {
        e.stopPropagation();
        saved = saved.filter((x) => x.name !== t.name);
        save(LS_SAVED, saved);
        renderSaved();
        return;
      }
      applyTheme(t, t.name);
    });
    return el;
  }
  function renderPresets() {
    const wrap = $("thm-presets");
    wrap.innerHTML = "";
    PRESETS.forEach((p) => wrap.appendChild(chip(p, { deletable: false })));
  }
  function renderSaved() {
    const wrap = $("thm-saved");
    wrap.innerHTML = "";
    if (!saved.length) {
      wrap.innerHTML = `<span class="thm-empty">No saved themes yet — tweak the colours and hit Save.</span>`;
      return;
    }
    saved.forEach((t) => wrap.appendChild(chip(t, { deletable: true })));
    highlightChips();
  }
  function highlightChips() {
    panel.querySelectorAll(".thm-chip").forEach((c) => {
      const nm = c.querySelector(".nm");
      c.classList.toggle("on", !!activeName && nm && nm.textContent === activeName);
    });
  }

  /* ── save current as a named theme ──────────────────── */
  $("thm-save").addEventListener("click", () => {
    const nameInput = $("thm-name");
    let name = (nameInput.value || "").trim();
    if (!name) name = "My theme " + (saved.length + 1);
    const t = Object.assign({ name }, current());
    const i = saved.findIndex((x) => x.name === name);
    if (i >= 0) saved[i] = t;
    else saved.push(t);
    save(LS_SAVED, saved);
    nameInput.value = "";
    activeName = name;
    save(LS_ACTIVE, Object.assign({ mode: "custom", name }, current()));
    renderSaved();
  });

  /* ── reset to default light theme ───────────────────── */
  $("thm-reset").addEventListener("click", () => {
    clearVars();
    curBase = "light";
    setBaseAttr("light");
    activeName = null;
    save(LS_ACTIVE, { mode: "builtin", base: "light" });
    syncPanel();
  });

  /* ── keep the panel widgets in sync with the live theme ── */
  function syncPanel() {
    curBase = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
    baseSeg
      .querySelectorAll("button")
      .forEach((x) => x.classList.toggle("on", x.dataset.base === curBase));
    const cs = getComputedStyle(html);
    accentIn.value = toHex(cs.getPropertyValue("--accent"));
    bgIn.value = toHex(cs.getPropertyValue("--bg"));
    textIn.value = toHex(cs.getPropertyValue("--text"));
    updateHex();
    highlightChips();
    updateQuickIcon();
  }

  /* ── restore the last active theme on load ──────────── */
  const active = load(LS_ACTIVE, null);
  if (active && active.mode === "custom" && active.accent) {
    applyVars(active);
    activeName = active.name || null;
  } else if (active && active.mode === "builtin" && active.base) {
    setBaseAttr(active.base);
  }
  renderPresets();
  renderSaved();
  syncPanel();
})();
