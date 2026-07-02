
      (function () {
        "use strict";

        var PISTON = "https://emkc.org/api/v2/piston";
        var LS_SNIPPETS = "compiler-snippets";
        var LS_PERLANG = "compiler-perlang"; 

        
        var LANGS = {
          python:     { cm: "python",            piston: "python",     ver: "3.10.0", file: "main.py" },
          javascript: { cm: "javascript",        piston: "javascript", ver: "18.15.0", file: "main.js" },
          java:       { cm: "text/x-java",        piston: "java",       ver: "15.0.2", file: "Main.java" },
          cpp:        { cm: "text/x-c++src",      piston: "c++",        ver: "10.2.0", file: "main.cpp" },
          c:          { cm: "text/x-csrc",        piston: "c",          ver: "10.2.0", file: "main.c" },
          html:       { cm: "htmlmixed",          piston: null,         ver: null,     file: "index.html" },
          css:        { cm: "css",                piston: null,         ver: null,     file: "styles.css" },
          web:        { cm: "htmlmixed",          piston: null,         ver: null,     file: "page.html" },
        };

        var STARTERS = {
          python: 'name = input("Your name: ")\nprint(f"Hello, {name}!")\n\nfor i in range(1, 6):\n    print(i, i * i)\n',
          javascript: 'const name = "world";\nconsole.log(`Hello, ${name}!`);\n\n[1, 2, 3, 4, 5].forEach(n => console.log(n, n * n));\n',
          java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n        for (int i = 1; i <= 5; i++) {\n            System.out.println(i + " " + (i * i));\n        }\n    }\n}\n',
          cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, world!" << endl;\n    for (int i = 1; i <= 5; i++) cout << i << " " << i * i << endl;\n    return 0;\n}\n',
          c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    for (int i = 1; i <= 5; i++) printf("%d %d\\n", i, i * i);\n    return 0;\n}\n',
          web: '<!doctype html>\n<html>\n  <head>\n    <style>\n      body { font-family: sans-serif; text-align: center; padding: 40px; }\n      h1 { color: #c8a96e; }\n    </style>\n  </head>\n  <body>\n    <h1>Hello, web!</h1>\n    <button onclick="count()">Clicked <span id="n">0</span></button>\n    <script>\n      let n = 0;\n      function count() {\n        document.getElementById("n").textContent = ++n;\n        console.log("clicked", n);\n      }\n    <\/script>\n  </body>\n</html>\n',
          html: '<!doctype html>\n<html>\n  <head>\n    <title>My Page</title>\n    <!-- Use the 🔗 button to link a CSS / JS tab into this page -->\n  </head>\n  <body>\n    <h1>Hello!</h1>\n    <button onclick="greet()">Click me</button>\n  </body>\n</html>\n',
          css: '/* Link this stylesheet to an HTML tab with the 🔗 button */\nbody {\n  font-family: sans-serif;\n  text-align: center;\n  padding: 40px;\n}\nh1 { color: #c8a96e; }\n',
        };

        var $ = function (id) { return document.getElementById(id); };
        var runtimeVersions = {}; 

        
        var LS_KEYMAP = "compiler-keymap";
        var keymapPref = "default";
        try { keymapPref = localStorage.getItem(LS_KEYMAP) || "default"; } catch (e) {}
        var editor = CodeMirror.fromTextArea($("cmp-code"), {
          mode: LANGS.python.cm,
          theme: "material-darker",
          lineNumbers: true,
          gutters: ["CodeMirror-linenumbers", "cmp-errors", "CodeMirror-foldgutter"],
          foldGutter: true,
          foldOptions: { rangeFinder: CodeMirror.fold.auto },
          keyMap: keymapPref,
          indentUnit: 4,
          tabSize: 4,
          autoCloseBrackets: true,
          matchBrackets: true,
          styleActiveLine: true,
          lineWrapping: false,
          extraKeys: {
            "Ctrl-Space": function (cm) { cm.showHint({ hint: CodeMirror.hint.auto, completeSingle: false }); },
            "Cmd-Space": function (cm) { cm.showHint({ hint: CodeMirror.hint.auto, completeSingle: false }); },
            "Ctrl-F": "findPersistent",
            "Cmd-F": "findPersistent",
            "Ctrl-G": "findNext",
            "Cmd-G": "findNext",
            "Shift-Ctrl-G": "findPrev",
            "Shift-Cmd-G": "findPrev",
            "Ctrl-H": "replace",
            "Shift-Ctrl-F": "replace",
            "Shift-Cmd-F": "replace",
            "Shift-Ctrl-R": "replaceAll",
            "Shift-Alt-F": function () { formatActive(); },
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            "Cmd-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            
            "Tab": function (cm) {
              if (cm.state.completionActive) return CodeMirror.Pass;
              if (acceptGhost()) return;
              return CodeMirror.Pass;
            },
            "Esc": function () { if (ghost) { clearGhost(); return; } return CodeMirror.Pass; },
            
            "Alt-\\": function () { aiComplete(); },
            "Ctrl-\\": function () { aiComplete(); },
          },
        });

        
        
        
        var LS_CODETHEME = "compiler-code-theme";
        var LS_CODELIVE = "compiler-code-live";     
        var LS_CODECUSTOM = "compiler-code-customs"; 
        var codePref = "auto";
        try { codePref = localStorage.getItem(LS_CODETHEME) || "auto"; } catch (e) {}
        var liveCustom = { bg: "#1e1e1e", fg: "#d4d4d4", accent: "#c8a96e" };
        try { liveCustom = JSON.parse(localStorage.getItem(LS_CODELIVE)) || liveCustom; } catch (e) {}
        var savedCustoms = [];
        try { savedCustoms = JSON.parse(localStorage.getItem(LS_CODECUSTOM)) || []; } catch (e) {}

        
        function hx(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/(.)/g, "$1$1"); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }
        function lum(h) { var c = hx(h); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255; }
        function mix(a, b, t) { var x = hx(a), y = hx(b); var m = function (p, q) { return Math.round(p + (q - p) * t); }; return "#" + [m(x.r, y.r), m(x.g, y.g), m(x.b, y.b)].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); }
        function rgba(h, a) { var c = hx(h); return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")"; }
        function customEntry(c) {
          var dark = lum(c.bg) < 0.5;
          return {
            base: dark ? "dark" : "light",
            cm: dark ? "material-darker" : "default",
            pal: {
              bg: c.bg, fg: c.fg,
              gutter: mix(c.bg, c.fg, 0.16),
              ln: mix(c.bg, c.fg, 0.45),
              panel: mix(c.bg, dark ? "#000000" : "#000000", dark ? 0.28 : 0.05),
              line: mix(c.bg, c.fg, 0.18),
              sel: rgba(c.accent, 0.3),
              al: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            },
          };
        }
        
        
        var CODE_THEMES = [
          { key: "auto", label: "Follow site", base: null, sw: "linear-gradient(135deg,#f0ede8 50%,#1e1e1e 50%)" },
          { key: "light", label: "Light", cm: "default", base: "light", sw: "linear-gradient(135deg,#ffffff 50%,#1f6feb 50%)" },
          { key: "dark", label: "Dark", cm: "material-darker", base: "dark", sw: "linear-gradient(135deg,#1e1e1e 50%,#c792ea 50%)" },
          { key: "dracula", label: "Dracula", cm: "dracula", base: "dark", sw: "linear-gradient(135deg,#282a36 50%,#bd93f9 50%)",
            pal: { bg: "#282a36", fg: "#f8f8f2", gutter: "#343746", ln: "#6272a4", panel: "#21222c", line: "#343746", sel: "#44475a", al: "rgba(255,255,255,0.06)" } },
          { key: "monokai", label: "Monokai", cm: "monokai", base: "dark", sw: "linear-gradient(135deg,#272822 50%,#a6e22e 50%)",
            pal: { bg: "#272822", fg: "#f8f8f2", gutter: "#34352c", ln: "#75715e", panel: "#1f201a", line: "#34352c", sel: "#49483e", al: "rgba(255,255,255,0.06)" } },
          { key: "solarized-light", label: "Solarized Light", cm: "solarized light", base: "light", sw: "linear-gradient(135deg,#fdf6e3 50%,#268bd2 50%)",
            pal: { bg: "#fdf6e3", fg: "#586e75", gutter: "#eee8d5", ln: "#93a1a1", panel: "#f4eeda", line: "#e6dfc4", sel: "#e6dfcf", al: "rgba(0,0,0,0.04)" } },
          { key: "solarized-dark", label: "Solarized Dark", cm: "solarized dark", base: "dark", sw: "linear-gradient(135deg,#002b36 50%,#b58900 50%)",
            pal: { bg: "#002b36", fg: "#93a1a1", gutter: "#0a3f4c", ln: "#586e75", panel: "#00252e", line: "#0a3f4c", sel: "#073642", al: "rgba(255,255,255,0.06)" } },
          { key: "eclipse", label: "Eclipse", cm: "eclipse", base: "light", sw: "linear-gradient(135deg,#ffffff 50%,#7000e0 50%)",
            pal: { bg: "#ffffff", fg: "#1f2328", gutter: "#eef0f3", ln: "#9aa0a6", panel: "#f3f4f6", line: "#dadde1", sel: "#d7d4f0", al: "rgba(0,0,0,0.04)" } },
        ];
        
        var C_VARS = ["--c-edit-bg", "--c-edit-fg", "--c-gutter", "--c-ln", "--c-ln-active",
          "--c-activeline", "--c-cursor", "--c-sel", "--c-out-bg", "--c-out-fg", "--c-con-bg",
          "--c-con-line", "--c-panel-bg", "--c-panel-line", "--c-tab-fg", "--c-tab-hover",
          "--c-tab-active-bg", "--c-tab-active-fg"];
        function clearPal() { C_VARS.forEach(function (v) { document.body.style.removeProperty(v); }); }
        function applyPal(p, light) {
          var s = document.body.style, hover = light ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
          s.setProperty("--c-edit-bg", p.bg); s.setProperty("--c-edit-fg", p.fg);
          s.setProperty("--c-gutter", p.gutter); s.setProperty("--c-ln", p.ln); s.setProperty("--c-ln-active", p.fg);
          s.setProperty("--c-activeline", p.al); s.setProperty("--c-cursor", p.fg); s.setProperty("--c-sel", p.sel);
          s.setProperty("--c-out-bg", p.bg); s.setProperty("--c-out-fg", p.fg);
          s.setProperty("--c-con-bg", p.panel); s.setProperty("--c-con-line", p.line);
          s.setProperty("--c-panel-bg", p.panel); s.setProperty("--c-panel-line", p.line);
          s.setProperty("--c-tab-fg", p.ln); s.setProperty("--c-tab-hover", hover);
          s.setProperty("--c-tab-active-bg", p.bg); s.setProperty("--c-tab-active-fg", p.fg);
        }
        function themeByKey(k) { return CODE_THEMES.filter(function (t) { return t.key === k; })[0]; }
        function siteTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
        function savedByName(n) { return savedCustoms.filter(function (s) { return s.name === n; })[0]; }
        function resolveCode() {
          if (codePref === "auto") return themeByKey(siteTheme()); 
          if (codePref === "custom") return customEntry(liveCustom);
          if (codePref.indexOf("custom:") === 0) {
            var s = savedByName(codePref.slice(7));
            if (s) return customEntry(s);
          }
          return themeByKey(codePref) || themeByKey("dark");
        }
        var codeAnimT;
        function applyCodeTheme(animate) {
          var r = resolveCode();
          clearPal();                                      
          if (r.pal) applyPal(r.pal, r.base === "light");  
          document.body.setAttribute("data-code", r.base); 
          editor.setOption("theme", r.cm);                 
          editor.refresh();
          
          document.querySelectorAll("#cmp-theme-chips .thm-chip, #cmp-custom-chips .thm-chip").forEach(function (c) {
            c.classList.toggle("on", c.getAttribute("data-key") === codePref);
          });
          if (animate) {
            document.body.classList.add("code-anim");
            clearTimeout(codeAnimT);
            codeAnimT = setTimeout(function () { document.body.classList.remove("code-anim"); }, 450);
          }
        }
        function setCodePref(k) {
          codePref = k;
          try {
            localStorage.setItem(LS_CODETHEME, k);
            if (k === "custom") localStorage.setItem(LS_CODELIVE, JSON.stringify(liveCustom));
          } catch (e) {}
          applyCodeTheme(true);
        }
        
        new MutationObserver(function () { if (codePref === "auto") applyCodeTheme(true); })
          .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        function markKeymapChips() {
          document.querySelectorAll("#cmp-keymap-chips .thm-chip").forEach(function (c) {
            c.classList.toggle("on", c.getAttribute("data-km") === keymapPref);
          });
        }
        function setKeymap(k) {
          keymapPref = k;
          try { localStorage.setItem(LS_KEYMAP, k); } catch (e) {}
          editor.setOption("keyMap", k);
          markKeymapChips();
          editor.focus();
          toast(k === "default" ? "Default keybindings" : k.charAt(0).toUpperCase() + k.slice(1) + " mode");
        }

        function renderCustomChips() {
          var wrap = document.getElementById("cmp-custom-chips");
          if (!wrap) return;
          wrap.innerHTML = "";
          if (!savedCustoms.length) {
            wrap.innerHTML = '<span class="thm-empty">No custom editor themes yet.</span>';
            return;
          }
          savedCustoms.forEach(function (s) {
            var key = "custom:" + s.name;
            var c = document.createElement("button");
            c.className = "thm-chip";
            c.setAttribute("data-key", key);
            c.innerHTML =
              '<span class="thm-swatch" style="background:linear-gradient(135deg,' + s.bg + ' 50%,' + s.accent + ' 50%)"></span>' +
              s.name + '<span class="del" title="Delete">✕</span>';
            c.addEventListener("click", function (e) {
              if (e.target.classList.contains("del")) {
                savedCustoms = savedCustoms.filter(function (x) { return x.name !== s.name; });
                try { localStorage.setItem(LS_CODECUSTOM, JSON.stringify(savedCustoms)); } catch (er) {}
                if (codePref === key) codePref = "auto";
                renderCustomChips();
                applyCodeTheme(false);
                return;
              }
              setCodePref(key);
            });
            wrap.appendChild(c);
          });
        }

        
        function injectEditorThemeSection() {
          var body = document.querySelector("#thm-panel .thm-body");
          if (!body || document.getElementById("cmp-theme-chips")) return;
          var sec = document.createElement("div");
          sec.innerHTML =
            '<div class="thm-sec-label">Editor theme</div>' +
            '<div class="thm-chips" id="cmp-theme-chips"></div>' +
            '<div class="thm-sec-label" style="margin-top:14px">Custom editor theme</div>' +
            '<div class="thm-color"><span class="name">Background</span><span class="hex" id="cmp-hx-bg"></span><input type="color" id="cmp-c-bg"></div>' +
            '<div class="thm-color"><span class="name">Text</span><span class="hex" id="cmp-hx-fg"></span><input type="color" id="cmp-c-fg"></div>' +
            '<div class="thm-color"><span class="name">Accent</span><span class="hex" id="cmp-hx-ac"></span><input type="color" id="cmp-c-accent"></div>' +
            '<div class="thm-save"><input type="text" id="cmp-c-name" placeholder="Name this editor theme…" maxlength="22"><button class="thm-btn thm-btn-primary" id="cmp-c-save">Save</button></div>' +
            '<div class="thm-chips" id="cmp-custom-chips" style="margin-top:8px"></div>' +
            '<div class="thm-sec-label" style="margin-top:14px">Editor keybindings</div>' +
            '<div class="thm-chips" id="cmp-keymap-chips"></div>';
          
          var kmWrap = sec.querySelector("#cmp-keymap-chips");
          [["default", "Default"], ["sublime", "Sublime"], ["vim", "Vim"]].forEach(function (km) {
            var c = document.createElement("button");
            c.className = "thm-chip";
            c.setAttribute("data-km", km[0]);
            c.textContent = km[1];
            c.addEventListener("click", function () { setKeymap(km[0]); });
            kmWrap.appendChild(c);
          });
          var chips = sec.querySelector("#cmp-theme-chips");
          CODE_THEMES.forEach(function (t) {
            var c = document.createElement("button");
            c.className = "thm-chip";
            c.setAttribute("data-key", t.key);
            c.innerHTML = '<span class="thm-swatch" style="background:' + t.sw + '"></span>' + t.label;
            c.addEventListener("click", function () { setCodePref(t.key); });
            chips.appendChild(c);
          });
          
          body.insertBefore(sec, body.firstChild);

          var bgIn = sec.querySelector("#cmp-c-bg"), fgIn = sec.querySelector("#cmp-c-fg"), acIn = sec.querySelector("#cmp-c-accent");
          function syncPickers() {
            bgIn.value = liveCustom.bg; fgIn.value = liveCustom.fg; acIn.value = liveCustom.accent;
            sec.querySelector("#cmp-hx-bg").textContent = liveCustom.bg;
            sec.querySelector("#cmp-hx-fg").textContent = liveCustom.fg;
            sec.querySelector("#cmp-hx-ac").textContent = liveCustom.accent;
          }
          function onPick() {
            liveCustom = { bg: bgIn.value, fg: fgIn.value, accent: acIn.value };
            syncPickers();
            setCodePref("custom"); 
          }
          bgIn.addEventListener("input", onPick);
          fgIn.addEventListener("input", onPick);
          acIn.addEventListener("input", onPick);
          sec.querySelector("#cmp-c-save").addEventListener("click", function () {
            var nameIn = sec.querySelector("#cmp-c-name");
            var name = (nameIn.value || "").trim() || "My editor theme " + (savedCustoms.length + 1);
            var entry = { name: name, bg: liveCustom.bg, fg: liveCustom.fg, accent: liveCustom.accent };
            var i = savedCustoms.findIndex(function (s) { return s.name === name; });
            if (i >= 0) savedCustoms[i] = entry; else savedCustoms.push(entry);
            try { localStorage.setItem(LS_CODECUSTOM, JSON.stringify(savedCustoms)); } catch (e) {}
            nameIn.value = "";
            renderCustomChips();
            setCodePref("custom:" + name);
            toast("Saved editor theme “" + name + "”");
          });

          syncPickers();
          renderCustomChips();
          markKeymapChips();
          applyCodeTheme(false); 
        }

        var currentLang = "python";

        function labelFor(lang) {
          return { python: "Python", javascript: "JavaScript", java: "Java",
                   cpp: "C++", c: "C", html: "HTML", css: "CSS", web: "Web" }[lang] || lang;
        }
        
        function isWebHost(lang) { return lang === "html" || lang === "web"; }
        function updateRuntimeLabel() {
          var cfg = LANGS[currentLang];
          if (!cfg.piston) {
            $("cmp-runtime").textContent = isWebHost(currentLang) ? "live preview" : "linked file";
            return;
          }
          var v = runtimeVersions[cfg.piston] || cfg.ver;
          $("cmp-runtime").textContent = cfg.piston + " " + v;
        }

        
        var LS_TABS = "compiler-tabs";
        var tabs = [];
        var activeId = null;
        var tabSeq = 0;

        function tabById(id) { return tabs.filter(function (t) { return t.id === id; })[0]; }
        function modeOf(lang) { return LANGS[lang].cm; }
        function fileName(lang) { return LANGS[lang].file || "untitled"; }

        function renderTabs() {
          var bar = $("cmp-tabs");
          bar.innerHTML = "";
          tabs.forEach(function (t) {
            var el = document.createElement("div");
            el.className = "cmp-tab" + (t.id === activeId ? " active" : "");
            var nm = document.createElement("span");
            nm.className = "cmp-tab-name";
            nm.textContent = t.name;
            nm.addEventListener("dblclick", function (e) { e.stopPropagation(); startRename(t, nm); });
            el.appendChild(nm);
            var ed = document.createElement("button");
            ed.className = "cmp-tab-edit";
            ed.innerHTML = "&#9998;"; 
            ed.title = "Rename file";
            ed.addEventListener("click", function (e) { e.stopPropagation(); startRename(t, nm); });
            el.appendChild(ed);
            var x = document.createElement("button");
            x.className = "cmp-tab-x";
            x.innerHTML = "&times;";
            x.title = "Close file";
            x.addEventListener("click", function (e) { e.stopPropagation(); closeTab(t.id); });
            el.appendChild(x);
            el.addEventListener("click", function () { switchTab(t.id); });
            bar.appendChild(el);
          });
          var add = document.createElement("button");
          add.className = "cmp-tab-add";
          add.textContent = "+";
          add.title = "New file";
          add.addEventListener("click", function () { newTab(currentLang || "python"); });
          bar.appendChild(add);
        }

        
        function langFromName(name) {
          var m = /\.([a-z0-9+]+)\s*$/i.exec(name || "");
          if (!m) return null;
          var map = {
            py: "python", js: "javascript", mjs: "javascript", java: "java",
            cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", c: "c", h: "c",
            html: "html", htm: "html", css: "css",
          };
          return map[m[1].toLowerCase()] || null;
        }

        
        function startRename(t, nmEl) {
          var input = document.createElement("input");
          input.className = "cmp-tab-rename";
          input.value = t.name;
          nmEl.replaceWith(input);
          input.focus();
          input.select();
          input.addEventListener("click", function (e) { e.stopPropagation(); });
          function commit() {
            var v = input.value.trim();
            if (v) {
              t.name = v;
              t.renamed = true;
              var lg = langFromName(v); 
              if (lg && lg !== t.lang) {
                t.lang = lg;
                if (t.id === activeId) applyActiveTab();
              }
            }
            renderTabs();
            persistTabs();
          }
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { renderTabs(); }
          });
          input.addEventListener("blur", commit);
        }

        
        
        function previewTargetFor(t) {
          if (!t) return null;
          if (isWebHost(t.lang)) return t;
          if (t.lang === "css" || t.lang === "javascript") return hostLinking(t.id) || null;
          return null;
        }

        function applyActiveTab() {
          var t = tabById(activeId);
          if (!t) return;
          currentLang = t.lang;
          editor.setOption("mode", modeOf(t.lang));
          $("cmp-editor-label").textContent = "Editor — " + labelFor(t.lang);
          var target = previewTargetFor(t);
          $("cmp-out-label").textContent = target ? "Live preview" : "Output";
          updateRuntimeLabel();
          
          $("cmp-stdin-toggle").style.display = (LANGS[t.lang].piston ? "" : "none");
          $("cmp-link").style.display = isWebHost(t.lang) ? "" : "none";
          
          $("cmp-pop").style.display =
            (target || document.body.classList.contains("pip-out")) ? "" : "none";
          if (target) renderWebHost(target); 
          else { setOutputMode("text"); clearConsole(); }
          setTimeout(function () { editor.refresh(); editor.focus(); }, 0);
        }

        function newTab(lang, code, name) {
          var id = "t" + ++tabSeq;
          var doc = CodeMirror.Doc(code != null ? code : (STARTERS[lang] || ""), modeOf(lang));
          tabs.push({ id: id, lang: lang, name: name || fileName(lang), doc: doc });
          activeId = id;
          editor.swapDoc(doc);
          applyActiveTab();
          renderTabs();
          persistTabs();
        }

        function switchTab(id) {
          if (id === activeId) return; 
          var t = tabById(id);
          if (!t) return;
          activeId = id;
          editor.swapDoc(t.doc);
          applyActiveTab();
          renderTabs();
          persistTabs();
        }

        function closeTab(id) {
          var i = -1;
          tabs.forEach(function (t, k) { if (t.id === id) i = k; });
          if (i < 0) return;
          tabs.splice(i, 1);
          if (tabs.length === 0) { newTab("python"); return; } 
          if (activeId === id) switchTab(tabs[Math.max(0, i - 1)].id);
          else { renderTabs(); persistTabs(); }
        }

        
        function serializeTabs() {
          var ids = tabs.map(function (t) { return t.id; });
          return {
            activeIndex: ids.indexOf(activeId),
            tabs: tabs.map(function (t) {
              return {
                lang: t.lang, name: t.name, code: t.doc.getValue(), renamed: !!t.renamed,
                
                links: (t.links || []).map(function (id) { return ids.indexOf(id); })
                  .filter(function (i) { return i >= 0; }),
              };
            }),
          };
        }
        
        function loadTabsFrom(data) {
          if (!data || !data.tabs || !data.tabs.length) return false;
          tabs = [];
          data.tabs.forEach(function (d) {
            tabs.push({
              id: "t" + ++tabSeq, lang: d.lang, name: d.name || fileName(d.lang),
              renamed: !!d.renamed, doc: CodeMirror.Doc(d.code || "", modeOf(d.lang)),
              _linkIdx: d.links || [],
            });
          });
          tabs.forEach(function (t) {
            t.links = (t._linkIdx || []).map(function (i) { return tabs[i] && tabs[i].id; }).filter(Boolean);
            delete t._linkIdx;
          });
          var ai = (data.activeIndex >= 0 && data.activeIndex < tabs.length) ? data.activeIndex : 0;
          activeId = tabs[ai].id;
          editor.swapDoc(tabs[ai].doc);
          applyActiveTab();
          renderTabs();
          return true;
        }
        function persistTabs() {
          try { localStorage.setItem(LS_TABS, JSON.stringify(serializeTabs())); } catch (e) {}
        }
        function restoreTabs() {
          try { return loadTabsFrom(JSON.parse(localStorage.getItem(LS_TABS))); }
          catch (e) { return false; }
        }

        
        var saveTimer, webTimer;
        editor.on("change", function () {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(persistTabs, 400);
          clearErrors(); 
          
          var target = previewTargetFor(tabById(activeId));
          if (target) {
            clearTimeout(webTimer);
            webTimer = setTimeout(function () { renderWebHost(target); }, 600);
          }
        });

        
        var errLines = [];
        function clearErrors() {
          errLines.forEach(function (ln) {
            editor.removeLineClass(ln, "background", "cmp-error-line");
            editor.removeLineClass(ln, "text", "cmp-error-text");
          });
          editor.clearGutter("cmp-errors");
          errLines = [];
        }
        function parseErrorLines(text, lang) {
          if (!text) return [];
          var found = {};
          var pats = [/line (\d+)/gi, /:(\d+):\d+/g, /:(\d+)[):,]/g];
          var file = LANGS[lang] && LANGS[lang].file;
          if (file) pats.unshift(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\":, ]+(\\d+)", "gi"));
          pats.forEach(function (re) { var m; while ((m = re.exec(text))) { var n = +m[1]; if (n > 0) found[n] = 1; } });
          return Object.keys(found).map(Number).filter(function (n) { return n <= editor.lineCount(); }).sort(function (a, b) { return a - b; });
        }
        function markErrors(lines) {
          clearErrors();
          lines.forEach(function (n) {
            var idx = n - 1;
            editor.addLineClass(idx, "background", "cmp-error-line");
            editor.addLineClass(idx, "text", "cmp-error-text");
            errLines.push(idx);
            var marker = document.createElement("div");
            marker.className = "cmp-error-gutter";
            marker.textContent = "●";
            marker.title = "Error reported on line " + n + " — click to jump";
            marker.addEventListener("click", function () {
              editor.setCursor({ line: idx, ch: 0 });
              editor.scrollIntoView({ line: idx, ch: 0 }, 120);
              editor.focus();
            });
            editor.setGutterMarker(idx, "cmp-errors", marker);
          });
          if (lines.length) editor.scrollIntoView({ line: lines[0] - 1, ch: 0 }, 120); 
        }

        
        var out = $("cmp-output");
        var preview = $("cmp-preview");
        var wrap = $("cmp-out-wrap");
        var clog = $("cmp-console-log");
        var clCount = 0;

        function setOutputMode(mode) {
          wrap.classList.toggle("web", mode === "web");
        }
        function clearConsole() {
          clog.innerHTML = '<div class="cmp-cl-empty">No console output yet — console.log / warnings / errors will appear here.</div>';
          clCount = 0;
          $("cmp-console-count").textContent = "0";
        }
        function appendConsole(type, text) {
          if (clCount === 0) clog.innerHTML = "";
          var line = document.createElement("div");
          line.className = "cmp-cl-line " + type;
          var tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = type;
          line.appendChild(tag);
          line.appendChild(document.createTextNode(" " + text));
          clog.appendChild(line);
          clCount++;
          $("cmp-console-count").textContent = String(clCount);
          clog.scrollTop = clog.scrollHeight;
        }
        function clearOutput() {
          out.innerHTML = '<span class="cmp-placeholder">▶ Run your code to see the output here.</span>';
          preview.srcdoc = "";
          clearConsole();
          setOutputMode(isWebHost(currentLang) ? "web" : "text");
          setStatus("", "");
        }
        function escapeHtml(s) {
          return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function setStatus(text, kind) {
          var el = $("cmp-status");
          el.textContent = text;
          el.className = "cmp-status" + (kind ? " " + kind : "");
        }

        
        async function fetchRuntimes() {
          try {
            var r = await fetch(PISTON + "/runtimes", { cache: "no-store" });
            if (!r.ok) return;
            var list = await r.json();
            list.forEach(function (rt) {
              var keys = [rt.language].concat(rt.aliases || []);
              keys.forEach(function (k) {
                
                if (!runtimeVersions[k] || cmpVer(rt.version, runtimeVersions[k]) > 0)
                  runtimeVersions[k] = rt.version;
              });
            });
            updateRuntimeLabel();
          } catch (e) {  }
        }
        function cmpVer(a, b) {
          var pa = a.split("."), pb = b.split(".");
          for (var i = 0; i < 3; i++) {
            var x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
            if (x !== y) return x - y;
          }
          return 0;
        }

        async function runPiston(lang, signal) {
          var cfg = LANGS[lang];
          var version = runtimeVersions[cfg.piston] || cfg.ver;
          var argStr = ($("cmp-args").value || "").trim();
          var body = {
            language: cfg.piston,
            version: version,
            files: [{ name: cfg.file, content: editor.getValue() }],
            stdin: $("cmp-stdin-text").value || "",
            args: argStr ? argStr.match(/"[^"]*"|'[^']*'|\S+/g).map(function (a) { return a.replace(/^["']|["']$/g, ""); }) : [],
          };
          var r = await fetch(PISTON + "/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: signal,
          });
          if (!r.ok) {
            var msg = await r.text();
            throw new Error("Execution service error (" + r.status + "): " + msg);
          }
          return r.json();
        }

        function renderPistonResult(res) {
          var html = "";
          var failed = false;
          
          if (res.compile && (res.compile.stderr || res.compile.code)) {
            if (res.compile.stderr) {
              html += '<span class="meta">— compile —</span>\n';
              html += '<span class="err">' + escapeHtml(res.compile.stderr) + "</span>\n";
            }
            if (res.compile.code) failed = true;
          }
          var run = res.run || {};
          if (run.stdout) html += escapeHtml(run.stdout);
          if (run.stderr) html += '<span class="err">' + escapeHtml(run.stderr) + "</span>";
          if (!html.trim()) html = '<span class="cmp-placeholder">(no output)</span>';

          out.innerHTML = html;
          out.scrollTop = out.scrollHeight;

          var code = run.code != null ? run.code : (res.compile ? res.compile.code : 0);
          if (failed || (code && code !== 0)) {
            setStatus("✗ exit " + (code || 1), "err");
          } else {
            setStatus("✓ exit 0", "ok");
          }
          
          var errText = (res.compile && res.compile.stderr ? res.compile.stderr + "\n" : "") + (run.stderr || "");
          markErrors(parseErrorLines(errText, currentLang));
        }

        
        function baseName(p) { return String(p).replace(/^.*[\\/]/, "").replace(/[?#].*$/, "").toLowerCase(); }
        
        function tabByFile(ref) {
          var b = baseName(ref);
          return tabs.filter(function (t) { return baseName(t.name) === b; })[0];
        }
        
        
        function isExternalUrl(u) { return /^(https?:)?\/\//i.test(u) || /^(data|blob):/i.test(u); }

        
        
        
        
        function buildWebDoc(host) {
          var html = host.doc.getValue();
          if (host.lang === "web") return html; 
          var used = {};
          
          html = html.replace(/<link\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>/gi, function (m, href) {
            var f = tabByFile(href);
            if (f && f.lang === "css") { used[f.id] = 1; return "<style>\n/* " + f.name + " */\n" + f.doc.getValue() + "\n</style>"; }
            if (!isExternalUrl(href)) return "<!-- dropped local link: " + href + " (not an open tab) -->";
            return m; 
          });
          
          html = html.replace(/<script\b[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>\s*<\/script>/gi, function (m, src) {
            var f = tabByFile(src);
            if (f && f.lang === "javascript") { used[f.id] = 1; return "<script>\n/* " + f.name + " */\n" + f.doc.getValue() + "\n<\/script>"; }
            if (!isExternalUrl(src)) return "<!-- dropped local script: " + src + " (not an open tab) -->";
            return m; 
          });
          
          var styles = "", scripts = "";
          (host.links || []).forEach(function (id) {
            if (used[id]) return;
            var l = tabById(id);
            if (!l) return;
            if (l.lang === "css") styles += "<style>\n/* " + l.name + " */\n" + l.doc.getValue() + "\n</style>\n";
            else if (l.lang === "javascript") scripts += "<script>\n/* " + l.name + " */\n" + l.doc.getValue() + "\n<\/script>\n";
          });
          if (styles) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, styles + "</head>") : styles + html;
          if (scripts) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, scripts + "</body>") : html + scripts;
          return html;
        }

        function renderWebHost(host) {
          if (!host) return;
          setOutputMode("web");
          setStatus("rendered", "ok");
          clearConsole(); 
          
          
          var shim =
            "<script>(function(){" +
            
            
            "try{Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:function(){return {register:function(){return Promise.reject(new Error('Service workers are disabled in the preview sandbox.'));},addEventListener:function(){},ready:new Promise(function(){})};}});}catch(e){}" +
            "function send(t,a){parent.postMessage({__cmp:1,type:t," +
            "text:Array.from(a).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}" +
            "['log','info','warn','error'].forEach(function(m){var o=console[m];console[m]=function(){send(m,arguments);o&&o.apply(console,arguments)}});" +
            "window.addEventListener('error',function(e){send('error',[e.message+' ('+e.lineno+':'+e.colno+')'])});" +
            "window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled promise rejection: '+e.reason])});" +
            "})();<\/script>";
          preview.srcdoc = shim + buildWebDoc(host);
        }
        
        
        function hostLinking(id) {
          var target = tabById(id);
          var base = target ? baseName(target.name) : null;
          return tabs.filter(function (t) {
            if (!isWebHost(t.lang)) return false;
            if ((t.links || []).indexOf(id) >= 0) return true;
            if (base) {
              var code = t.doc.getValue();
              var re = new RegExp("(href|src)\\s*=\\s*[\"'][^\"']*" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"']", "i");
              if (re.test(code)) return true;
            }
            return false;
          })[0];
        }

        
        window.addEventListener("message", function (e) {
          var d = e.data;
          if (!d || d.__cmp !== 1) return;
          appendConsole(d.type, d.text);
          if (d.type === "error") setStatus("console error", "err");
        });
        $("cmp-console-clear").addEventListener("click", clearConsole);

        
        var running = false, runCtl = null;
        var RUN_TIMEOUT = 20000; 
        function setRunButton(stopMode) {
          var b = $("cmp-run");
          b.textContent = stopMode ? "■ Stop" : "▶ Run";
          b.title = stopMode ? "Stop the running program" : "Run (Ctrl/Cmd + Enter)";
        }
        async function run() {
          
          if (running) { if (runCtl) runCtl.abort(); return; }
          var lang = currentLang;
          var active = tabById(activeId);
          if (isWebHost(lang)) { renderWebHost(active); return; }
          
          if (lang === "css") {
            var host = hostLinking(activeId);
            if (host) { renderWebHost(host); }
            else {
              setOutputMode("text");
              out.innerHTML = '<span class="meta">CSS is a stylesheet — link it to an HTML tab with the 🔗 button, then Run that page (or this file) to preview it.</span>';
              setStatus("not linked", "");
            }
            return;
          }

          running = true;
          clearErrors();
          setRunButton(true);
          setOutputMode("text");
          out.innerHTML = '<span class="meta">Running ' + escapeHtml(labelFor(lang)) + "…</span>";
          setStatus("running…", "busy");
          runCtl = new AbortController();
          var timer = setTimeout(function () { runCtl.abort(); }, RUN_TIMEOUT);
          var t0 = performance.now();
          try {
            var res = await runPiston(lang, runCtl.signal);
            renderPistonResult(res);
            var ms = Math.round(performance.now() - t0);
            $("cmp-status").textContent = $("cmp-status").textContent + " · " + ms + "ms";
          } catch (err) {
            if (err && err.name === "AbortError") {
              out.innerHTML = '<span class="meta">⏹ Stopped' +
                (performance.now() - t0 >= RUN_TIMEOUT ? " (timed out after " + RUN_TIMEOUT / 1000 + "s)" : " by you") + ".</span>";
              setStatus("stopped", "err");
            } else {
              out.innerHTML =
                '<span class="err">' + escapeHtml(err.message || String(err)) +
                "</span>\n\n" +
                '<span class="meta">Tip: the execution service may be rate-limited or offline. ' +
                "HTML/CSS/JS still runs locally via the Web language.</span>";
              setStatus("failed", "err");
            }
          } finally {
            clearTimeout(timer);
            running = false;
            runCtl = null;
            setRunButton(false);
          }
        }

        
        function loadSnippets() {
          try { return JSON.parse(localStorage.getItem(LS_SNIPPETS)) || []; }
          catch (e) { return []; }
        }
        function storeSnippets(list) {
          try { localStorage.setItem(LS_SNIPPETS, JSON.stringify(list)); } catch (e) {}
        }
        function snippetMeta(s) {
          
          if (s.workspace && s.workspace.tabs) {
            var n = s.workspace.tabs.length;
            return n + (n === 1 ? " file" : " files");
          }
          return labelFor(s.lang);
        }
        function refreshSnippetList() {
          var list = loadSnippets();
          var sel = $("cmp-snippets");
          sel.innerHTML = '<option value="">choose…</option>';
          list.forEach(function (s, i) {
            var o = document.createElement("option");
            o.value = String(i);
            o.textContent = s.name + "  ·  " + snippetMeta(s);
            sel.appendChild(o);
          });
          if (list.length) {
            var d = document.createElement("option");
            d.value = "__delete__";
            d.textContent = "🗑 Delete a snippet…";
            sel.appendChild(d);
          }
        }
        function saveSnippet() {
          var name = (prompt("Name this saved workspace:") || "").trim();
          if (!name) return;
          var list = loadSnippets();
          
          var entry = { name: name, workspace: serializeTabs() };
          var i = list.findIndex(function (s) { return s.name === name; });
          if (i >= 0) list[i] = entry; else list.push(entry);
          storeSnippets(list);
          refreshSnippetList();
          var n = entry.workspace.tabs.length;
          toast("Saved “" + name + "” (" + n + (n === 1 ? " file" : " files") + ")");
        }
        $("cmp-snippets").addEventListener("change", function (e) {
          var v = e.target.value;
          if (v === "") return;
          var list = loadSnippets();
          if (v === "__delete__") {
            e.target.value = "";
            if (!list.length) return;
            var names = list.map(function (s, i) { return i + 1 + ". " + s.name + " (" + snippetMeta(s) + ")"; });
            var pick = prompt("Delete which snippet?\n\n" + names.join("\n") + "\n\nEnter its number:");
            var idx = parseInt(pick, 10) - 1;
            if (idx >= 0 && idx < list.length) {
              var removed = list.splice(idx, 1)[0];
              storeSnippets(list);
              refreshSnippetList();
              toast("Deleted “" + removed.name + "”");
            }
            return;
          }
          var s = list[parseInt(v, 10)];
          if (s) {
            if (s.workspace) {
              
              loadTabsFrom(s.workspace);
              persistTabs();
              var n = s.workspace.tabs.length;
              toast("Opened “" + s.name + "” (" + n + (n === 1 ? " file" : " files") + ")");
            } else {
              
              newTab(s.lang, s.code, s.name);
              toast("Loaded “" + s.name + "” in a new tab");
            }
          }
          e.target.value = "";
        });

        
        var toastTimer;
        function toast(msg) {
          var t = $("cmp-toast");
          t.textContent = msg;
          t.classList.add("show");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
        }

        
        var PRETTIER_PARSERS = {
          javascript: { parser: "babel", plugins: ["babel", "estree"] },
          css: { parser: "css", plugins: ["postcss"] },
          html: { parser: "html", plugins: ["html", "babel", "estree", "postcss"] },
          web: { parser: "html", plugins: ["html", "babel", "estree", "postcss"] },
        };
        async function formatActive() {
          var lang = currentLang;
          var spec = PRETTIER_PARSERS[lang];
          if (!spec) { toast("Formatting supports JS, HTML & CSS"); return; }
          if (!window.prettier || !window.prettierPlugins) { toast("Formatter still loading…"); return; }
          try {
            var plugins = spec.plugins.map(function (p) { return window.prettierPlugins[p]; }).filter(Boolean);
            var out2 = await window.prettier.format(editor.getValue(), {
              parser: spec.parser, plugins: plugins, tabWidth: 2,
            });
            var cur = editor.getCursor();
            editor.setValue(out2.replace(/\n$/, ""));
            editor.setCursor(cur);
            toast("Formatted ✨");
          } catch (e) {
            toast("Couldn't format — check for syntax errors");
          }
        }

        
        function downloadBlob(name, content, type) {
          var blob = new Blob([content], { type: type || "text/plain" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url; a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }
        function downloadActive() {
          var t = tabById(activeId); if (!t) return;
          downloadBlob(t.name, t.doc.getValue());
          toast("Downloaded " + t.name);
        }
        async function downloadZip() {
          if (!window.JSZip) { toast("Zip library not loaded"); return; }
          var zip = new JSZip();
          var seen = {};
          tabs.forEach(function (t) {
            var nm = t.name, i = 2;
            while (seen[nm]) { nm = t.name.replace(/(\.[^.]+)?$/, "-" + (i++) + "$1"); } 
            seen[nm] = 1;
            zip.file(nm, t.doc.getValue());
          });
          var blob = await zip.generateAsync({ type: "blob" });
          downloadBlob("project.zip", blob, "application/zip");
          toast("Downloaded project.zip (" + tabs.length + " files)");
        }
        function openFiles(fileList) {
          var files = Array.prototype.slice.call(fileList || []);
          if (!files.length) return;
          var pending = files.length;
          files.forEach(function (f) {
            var reader = new FileReader();
            reader.onload = function () {
              var lang = langFromName(f.name) || "python";
              newTab(lang, String(reader.result), f.name);
              tabById(activeId).renamed = true; 
              if (--pending === 0) { renderTabs(); persistTabs(); toast("Opened " + files.length + " file(s)"); }
            };
            reader.readAsText(f);
          });
        }

        
        $("cmp-run").addEventListener("click", run);
        $("cmp-save").addEventListener("click", saveSnippet);
        $("cmp-format").addEventListener("click", formatActive);
        $("cmp-download").addEventListener("click", downloadActive);
        $("cmp-zip").addEventListener("click", downloadZip);
        $("cmp-upload").addEventListener("click", function () { $("cmp-fileinput").click(); });
        $("cmp-fileinput").addEventListener("change", function () { openFiles(this.files); this.value = ""; });
        
        
        var SNIPPETS = {
          html: {
            "!": '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
            "html:5": '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
            style: "<style>\n  $0\n</style>",
            script: "<script>\n  $0\n<\/script>",
            link: '<link rel="stylesheet" href="$0">',
            a: '<a href="$0"></a>',
            img: '<img src="$0" alt="">',
            ul: "<ul>\n  <li>$0</li>\n</ul>",
          },
          css: {
            flex: "display: flex;\n  align-items: center;\n  justify-content: center;$0",
            grid: "display: grid;\n  grid-template-columns: $0;",
          },
          javascript: {
            clg: "console.log($0)",
            fn: "function $0() {\n  \n}",
            for: "for (let i = 0; i < $0; i++) {\n  \n}",
            forof: "for (const item of $0) {\n  \n}",
            if: "if ($0) {\n  \n}",
            arrow: "const $0 = () => {\n  \n}",
          },
          python: {
            main: 'if __name__ == "__main__":\n    $0',
            for: "for i in range($0):\n    ",
            def: "def $0():\n    ",
            print: "print($0)",
            class: "class $0:\n    def __init__(self):\n        ",
          },
          java: {
            sout: "System.out.println($0);",
            main: "public static void main(String[] args) {\n    $0\n}",
            fori: "for (int i = 0; i < $0; i++) {\n    \n}",
          },
          cpp: {
            main: "#include <iostream>\nusing namespace std;\n\nint main() {\n    $0\n    return 0;\n}",
            cout: "cout << $0 << endl;",
            for: "for (int i = 0; i < $0; i++) {\n    \n}",
          },
          c: {
            main: "#include <stdio.h>\n\nint main(void) {\n    $0\n    return 0;\n}",
            for: "for (int i = 0; i < $0; i++) {\n    \n}",
            printf: 'printf("$0\\n");',
          },
        };
        function snippetsFor(lang) { return SNIPPETS[lang === "web" ? "html" : lang] || {}; }

        var ghost = null; 
        function clearGhost() { if (ghost && ghost.mark) ghost.mark.clear(); ghost = null; }
        function showGhost(preview, insert, from) {
          clearGhost();
          var el = document.createElement("span");
          el.className = "cmp-ghost";
          el.textContent = preview;
          var mark = editor.setBookmark(editor.getCursor(), { widget: el });
          ghost = { mark: mark, insert: insert, from: from };
        }
        function acceptGhost() {
          if (!ghost) return false;
          var insert = ghost.insert, from = ghost.from, to = editor.getCursor();
          var caret = insert.indexOf("$0");
          insert = insert.replace("$0", "");
          clearGhost();
          editor.replaceRange(insert, from, to);
          if (caret >= 0) {
            var before = insert.slice(0, caret), lines = before.split("\n");
            editor.setCursor({
              line: from.line + lines.length - 1,
              ch: lines.length === 1 ? from.ch + lines[0].length : lines[lines.length - 1].length,
            });
          }
          editor.focus();
          return true;
        }
        function updateGhost() {
          if (editor.state.completionActive || aiPending) { clearGhost(); return; }
          var cur = editor.getCursor();
          var pre = editor.getLine(cur.line).slice(0, cur.ch);
          var m = /([A-Za-z][\w]*|!|html:5)$/.exec(pre);
          if (!m) { clearGhost(); return; }
          var trig = m[1];
          var tmpl = snippetsFor(currentLang)[trig];
          if (!tmpl) { clearGhost(); return; }
          var from = { line: cur.line, ch: cur.ch - trig.length };
          
          var preview = tmpl.indexOf(trig) === 0 ? tmpl.slice(trig.length) : tmpl;
          showGhost(preview.replace("$0", ""), tmpl, from);
        }
        editor.on("cursorActivity", updateGhost);

        
        var LS_AI = "compiler-ai";
        var aiCfg = null, aiPending = false;
        try { aiCfg = JSON.parse(localStorage.getItem(LS_AI)); } catch (e) {}
        function configureAI() {
          var provider = (prompt("AI provider — type 'openai' or 'gemini':", aiCfg ? aiCfg.provider : "openai") || "").trim().toLowerCase();
          if (provider !== "openai" && provider !== "gemini") { toast("Cancelled — use 'openai' or 'gemini'"); return false; }
          var key = (prompt("Paste your " + provider + " API key (stored only in your browser):", "") || "").trim();
          if (!key) { toast("No key entered"); return false; }
          var model = (prompt("Model (blank = default):", provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash") || "").trim();
          aiCfg = { provider: provider, key: key, model: model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash") };
          try { localStorage.setItem(LS_AI, JSON.stringify(aiCfg)); } catch (e) {}
          toast("AI ready (" + provider + "). Press Ctrl+\\ to complete.");
          return true;
        }
        async function aiComplete() {
          if (!aiCfg) { if (!configureAI()) return; }
          if (aiPending) return;
          clearGhost();
          var cur = editor.getCursor();
          var before = editor.getRange({ line: 0, ch: 0 }, cur).slice(-4000);
          var prompt2 = "You are an inline code-completion engine for " + labelFor(currentLang) +
            ". Continue the code at the cursor. Reply with ONLY the code to insert — no explanations, no markdown fences.\n\n" + before;
          aiPending = true;
          setStatus("AI thinking…", "busy");
          try {
            var text = await aiRequest(prompt2);
            text = (text || "").replace(/^```[a-z]*\n?|```$/g, "").replace(/\s+$/, "");
            aiPending = false;
            setStatus("", "");
            if (!text) { toast("AI returned nothing"); return; }
            if (editor.getCursor().line !== cur.line || editor.getCursor().ch !== cur.ch) return; 
            showGhost(text, text, cur); 
          } catch (err) {
            aiPending = false;
            setStatus("AI error", "err");
            toast("AI request failed — check your key");
          }
        }
        function aiRequest(prompt2) { return aiChat([{ role: "user", content: prompt2 }], 256); }
        
        async function aiChat(messages, maxTok) {
          maxTok = maxTok || 700;
          if (aiCfg.provider === "openai") {
            var r = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + aiCfg.key },
              body: JSON.stringify({ model: aiCfg.model, temperature: 0.2, max_tokens: maxTok, messages: messages }),
            });
            if (!r.ok) throw new Error("openai " + r.status);
            var d = await r.json();
            return d.choices && d.choices[0] && d.choices[0].message.content;
          } else {
            
            var sys = messages.filter(function (m) { return m.role === "system"; }).map(function (m) { return m.content; }).join("\n");
            var contents = messages.filter(function (m) { return m.role !== "system"; }).map(function (m) {
              return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
            });
            if (sys && contents.length && contents[0].role === "user") contents[0].parts[0].text = sys + "\n\n" + contents[0].parts[0].text;
            var r2 = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + aiCfg.model + ":generateContent?key=" + encodeURIComponent(aiCfg.key), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: contents, generationConfig: { temperature: 0.2, maxOutputTokens: maxTok } }),
            });
            if (!r2.ok) throw new Error("gemini " + r2.status);
            var d2 = await r2.json();
            return d2.candidates && d2.candidates[0] && d2.candidates[0].content.parts[0].text;
          }
        }

        
        var aiHistory = [];
        function escAi(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
        function firstCode(txt) { var m = txt.match(/```[a-z]*\n([\s\S]*?)```/i); return (m ? m[1] : txt).replace(/\s+$/, ""); }
        function renderAiBody(txt) {
          
          return escAi(txt).replace(/```[a-z]*\n?([\s\S]*?)```/gi, function (_, code) {
            return '<pre class="cmp-ai-code">' + code.replace(/\s+$/, "") + "</pre>";
          }).replace(/\n/g, "<br>");
        }
        function aiLogMsg(role, html) {
          var log = $("cmp-ai-log");
          var el = document.createElement("div");
          el.className = "cmp-ai-msg " + role;
          el.innerHTML = html;
          log.appendChild(el);
          log.scrollTop = log.scrollHeight;
          return el;
        }
        var AI_KEY_HELP =
          "<b>How to get an API key</b><br>" +
          "<b>ChatGPT:</b> open <a href='https://platform.openai.com/api-keys' target='_blank' rel='noopener'>platform.openai.com/api-keys</a>, " +
          "log in, click <b>“Create new secret key”</b>, then copy it and paste it here via the 🔑 button. " +
          "Save it somewhere — it's shown only once.<br><br>" +
          "<b>Gemini:</b> open <a href='https://aistudio.google.com/app/apikey' target='_blank' rel='noopener'>aistudio.google.com/app/apikey</a>, " +
          "log in, then <b>Create API key</b> and paste it here via 🔑.";
        function openAiChat() {
          $("cmp-ai-chat").classList.add("open");
          $("cmp-ai-chat").classList.remove("min");
          
          if (!$("cmp-ai-log").children.length) {
            aiLogMsg("ai", aiCfg
              ? "Hi! Ask me to write or explain code and I'll reply with a code block you can insert. Need a different key? Tap 🔑."
              : AI_KEY_HELP + "<br><br>When you have a key, tap 🔑 to add it.");
          }
          if (!aiCfg) configureAI();
          setTimeout(function () { $("cmp-ai-text").focus(); }, 30);
        }
        async function sendAiChat() {
          var ta = $("cmp-ai-text");
          var msg = (ta.value || "").trim();
          if (!msg || aiPending) return;
          ta.value = "";
          aiLogMsg("user", escAi(msg));
          aiHistory.push({ role: "user", content: msg });
          var thinking = aiLogMsg("ai", '<span class="cmp-ai-think">…thinking</span>');
          aiPending = true;
          try {
            var sys = "You are a helpful coding assistant for a " + labelFor(currentLang) +
              " editor. When asked for code, reply with a fenced code block. Keep prose short.";
            var reply = await aiChat([{ role: "system", content: sys }].concat(aiHistory.slice(-8)), 900);
            aiPending = false;
            aiHistory.push({ role: "assistant", content: reply || "" });
            thinking.innerHTML = renderAiBody(reply || "(no reply)");
            
            var code = firstCode(reply || "");
            if (code) {
              var row = document.createElement("div");
              row.className = "cmp-ai-actions";
              var ins = document.createElement("button"); ins.textContent = "⤵ Insert";
              ins.addEventListener("click", function () { editor.replaceSelection(code); editor.focus(); toast("Inserted into editor"); });
              var cp = document.createElement("button"); cp.textContent = "📋 Copy";
              cp.addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { toast("Copied"); }, function () {}); });
              row.appendChild(ins); row.appendChild(cp);
              thinking.appendChild(row);
            }
            $("cmp-ai-log").scrollTop = $("cmp-ai-log").scrollHeight;
          } catch (e) {
            aiPending = false;
            thinking.innerHTML = '<span class="cmp-ai-err">Request failed — check your API key (right-click 🤖).</span>';
          }
        }
        
        var editArea = document.querySelector(".cmp-editor-wrap");
        ["dragenter", "dragover"].forEach(function (ev) {
          editArea.addEventListener(ev, function (e) { e.preventDefault(); editArea.classList.add("cmp-drop"); });
        });
        ["dragleave", "drop"].forEach(function (ev) {
          editArea.addEventListener(ev, function (e) { e.preventDefault(); editArea.classList.remove("cmp-drop"); });
        });
        editArea.addEventListener("drop", function (e) {
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
        });
        $("cmp-stdin-toggle").addEventListener("click", function () {
          $("cmp-stdin").classList.toggle("show");
          editor.refresh();
        });

        
        var LS_WRAP = "compiler-wrap";
        var wrapOn = false;
        try { wrapOn = localStorage.getItem(LS_WRAP) === "1"; } catch (e) {}
        function applyWrap() {
          editor.setOption("lineWrapping", wrapOn);
          $("cmp-wrap").classList.toggle("on", wrapOn);
        }
        $("cmp-wrap").addEventListener("click", function () {
          wrapOn = !wrapOn;
          try { localStorage.setItem(LS_WRAP, wrapOn ? "1" : "0"); } catch (e) {}
          applyWrap();
        });
        applyWrap();

        
        $("cmp-copy").addEventListener("click", function () {
          var text = wrap.classList.contains("web")
            ? Array.prototype.map.call($("cmp-console-log").querySelectorAll(".cmp-cl-line"), function (l) { return l.textContent; }).join("\n")
            : $("cmp-output").textContent;
          text = (text || "").trim();
          if (!text) { toast("Nothing to copy"); return; }
          (navigator.clipboard && navigator.clipboard.writeText
            ? navigator.clipboard.writeText(text)
            : Promise.reject()
          ).then(function () { toast("Output copied"); }, function () {
            
            var ta = document.createElement("textarea");
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand("copy"); toast("Output copied"); } catch (e) { toast("Couldn't copy"); }
            ta.remove();
          });
        });

        
        var LS_STDIN = "compiler-stdin-presets";
        function loadStdinPresets() { try { return JSON.parse(localStorage.getItem(LS_STDIN)) || []; } catch (e) { return []; } }
        function refreshStdinPresets() {
          var sel = $("cmp-stdin-presets"), list = loadStdinPresets();
          sel.innerHTML = '<option value="">Presets…</option>';
          list.forEach(function (p, i) {
            var o = document.createElement("option");
            o.value = String(i); o.textContent = p.name;
            sel.appendChild(o);
          });
          if (list.length) {
            var d = document.createElement("option");
            d.value = "__del__"; d.textContent = "🗑 Delete a preset…";
            sel.appendChild(d);
          }
        }
        $("cmp-stdin-save").addEventListener("click", function () {
          var name = (prompt("Name this input preset:") || "").trim();
          if (!name) return;
          var list = loadStdinPresets();
          var entry = { name: name, stdin: $("cmp-stdin-text").value, args: $("cmp-args").value };
          var i = list.findIndex(function (p) { return p.name === name; });
          if (i >= 0) list[i] = entry; else list.push(entry);
          try { localStorage.setItem(LS_STDIN, JSON.stringify(list)); } catch (e) {}
          refreshStdinPresets();
          toast("Saved input preset “" + name + "”");
        });
        $("cmp-stdin-presets").addEventListener("change", function () {
          var v = this.value, list = loadStdinPresets();
          if (v === "") return;
          if (v === "__del__") {
            this.value = "";
            if (!list.length) return;
            var names = list.map(function (p, i) { return (i + 1) + ". " + p.name; });
            var pick = parseInt(prompt("Delete which preset?\n\n" + names.join("\n") + "\n\nEnter its number:"), 10) - 1;
            if (pick >= 0 && pick < list.length) {
              var r = list.splice(pick, 1)[0];
              try { localStorage.setItem(LS_STDIN, JSON.stringify(list)); } catch (e) {}
              refreshStdinPresets();
              toast("Deleted “" + r.name + "”");
            }
            return;
          }
          var p = list[parseInt(v, 10)];
          if (p) { $("cmp-stdin-text").value = p.stdin || ""; $("cmp-args").value = p.args || ""; $("cmp-stdin").classList.add("show"); editor.refresh(); }
          this.value = "";
        });
        refreshStdinPresets();

        
        var helpOv = $("cmp-help-overlay");
        function openHelp() { helpOv.classList.add("open"); }
        function closeHelp() { helpOv.classList.remove("open"); }
        $("cmp-ai").addEventListener("click", openAiChat);
        $("cmp-ai").addEventListener("contextmenu", function (e) { e.preventDefault(); configureAI(); });
        $("cmp-ai-x").addEventListener("click", function () { $("cmp-ai-chat").classList.remove("open"); });
        $("cmp-ai-key").addEventListener("click", function () { configureAI(); });
        $("cmp-ai-min").addEventListener("click", function () {
          var min = $("cmp-ai-chat").classList.toggle("min");
          this.textContent = min ? "▢" : "▁";
          this.title = min ? "Expand" : "Minimize";
        });
        $("cmp-ai-clear").addEventListener("click", function () { aiHistory = []; $("cmp-ai-log").innerHTML = ""; });
        
        (function () {
          var box = $("cmp-ai-chat");
          function pinTopLeft() {
            var r = box.getBoundingClientRect();
            box.style.left = r.left + "px"; box.style.top = r.top + "px";
            box.style.right = "auto"; box.style.bottom = "auto";
          }
          
          box.querySelector(".cmp-ai-head").addEventListener("pointerdown", function (e) {
            if (e.target.closest("button")) return;
            e.preventDefault();
            pinTopLeft();
            var r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
            this.setPointerCapture(e.pointerId);
            var self = this;
            function move(ev) {
              box.style.left = Math.max(4, Math.min(ev.clientX - dx, window.innerWidth - 60)) + "px";
              box.style.top = Math.max(4, Math.min(ev.clientY - dy, window.innerHeight - 40)) + "px";
            }
            function up() { self.releasePointerCapture(e.pointerId); document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); }
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", up);
          });
          
          box.querySelectorAll(".cmp-ai-rz").forEach(function (h) {
            h.addEventListener("pointerdown", function (e) {
              e.preventDefault();
              var left = h.classList.contains("left") || h.classList.contains("corner");
              var top = h.classList.contains("top") || h.classList.contains("corner");
              pinTopLeft();
              var r = box.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, sw = r.width, sh = r.height, sl = r.left, st = r.top;
              h.setPointerCapture(e.pointerId);
              function move(ev) {
                if (left) { var w = Math.max(280, sw - (ev.clientX - sx)); box.style.width = w + "px"; box.style.left = (sl + sw - w) + "px"; }
                if (top) { var ht = Math.max(300, sh - (ev.clientY - sy)); box.style.height = ht + "px"; box.style.top = (st + sh - ht) + "px"; }
              }
              function up() { h.releasePointerCapture(e.pointerId); document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); }
              document.addEventListener("pointermove", move);
              document.addEventListener("pointerup", up);
            });
          });
        })();
        $("cmp-ai-send").addEventListener("click", sendAiChat);
        $("cmp-ai-text").addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiChat(); }
        });
        $("cmp-help").addEventListener("click", openHelp);
        
        var filesMenu = $("cmp-files-menu");
        $("cmp-files").addEventListener("click", function (e) { e.stopPropagation(); filesMenu.classList.toggle("open"); });
        filesMenu.querySelectorAll("button.cmp-menu-item").forEach(function (b) {
          b.addEventListener("click", function () { filesMenu.classList.remove("open"); });
        });
        document.addEventListener("click", function (e) {
          if (filesMenu.classList.contains("open") && !e.target.closest(".cmp-menu-wrap")) filesMenu.classList.remove("open");
        });
        $("cmp-help-close").addEventListener("click", closeHelp);
        helpOv.addEventListener("click", function (e) { if (e.target === helpOv) closeHelp(); });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && helpOv.classList.contains("open")) closeHelp();
          
          if (e.key === "?" && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || "")) && !e.target.closest(".CodeMirror")) {
            e.preventDefault(); openHelp();
          }
        });

        
        var linkPop = document.createElement("div");
        linkPop.id = "cmp-link-pop";
        document.body.appendChild(linkPop);
        function renderLinkPop() {
          var host = tabById(activeId);
          linkPop.innerHTML = "";
          var title = document.createElement("div");
          title.className = "cmp-link-title";
          title.textContent = "Link files into " + host.name;
          linkPop.appendChild(title);
          var any = false;
          tabs.forEach(function (t) {
            if (t.id === host.id) return;
            if (t.lang !== "css" && t.lang !== "javascript") return;
            any = true;
            var row = document.createElement("label");
            row.className = "cmp-link-row";
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = (host.links || []).indexOf(t.id) >= 0;
            cb.addEventListener("change", function () {
              host.links = host.links || [];
              if (cb.checked) { if (host.links.indexOf(t.id) < 0) host.links.push(t.id); }
              else host.links = host.links.filter(function (x) { return x !== t.id; });
              persistTabs();
              renderWebHost(host); 
            });
            row.appendChild(cb);
            var nm = document.createElement("span");
            nm.textContent = t.name + "  (" + labelFor(t.lang) + ")";
            row.appendChild(nm);
            linkPop.appendChild(row);
          });
          if (!any) {
            var e = document.createElement("div");
            e.className = "cmp-link-empty";
            e.textContent = "No CSS or JS tabs yet. Add one with + and rename it to end in .css or .js";
            linkPop.appendChild(e);
          }
        }
        $("cmp-link").addEventListener("click", function (e) {
          e.stopPropagation();
          var host = tabById(activeId);
          if (!host || !isWebHost(host.lang)) return;
          if (linkPop.classList.contains("open")) { linkPop.classList.remove("open"); return; }
          renderLinkPop();
          var r = this.getBoundingClientRect();
          linkPop.classList.add("open");
          linkPop.style.top = (r.bottom + 6) + "px";
          linkPop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - linkPop.offsetWidth - 12)) + "px";
        });
        document.addEventListener("click", function (e) {
          if (linkPop.classList.contains("open") && !linkPop.contains(e.target) && e.target !== $("cmp-link"))
            linkPop.classList.remove("open");
        });
        
        function setBarCollapsed(collapsed) {
          document.body.classList.toggle("bar-collapsed", collapsed);
          setTimeout(function () { editor.refresh(); }, 0);
        }
        $("cmp-bar-toggle").addEventListener("click", function () { setBarCollapsed(true); });
        $("cmp-bar-show").addEventListener("click", function () { setBarCollapsed(false); });

        
        var workspace = document.querySelector(".cmp-workspace");
        var maxBtns = document.querySelectorAll(".cmp-pane-btn[data-max]");
        function setMaximized(which) {
          
          workspace.classList.toggle("max-editor", which === "editor");
          workspace.classList.toggle("max-output", which === "output");
          maxBtns.forEach(function (b) {
            var on = b.getAttribute("data-max") === which;
            b.classList.toggle("on", on);
            b.textContent = on ? "🗗" : "⛶";
            b.title = on
              ? "Restore split view"
              : "Maximize " + (b.getAttribute("data-max") === "editor" ? "editor" : "output / preview");
          });
          setTimeout(function () { editor.refresh(); }, 0); 
        }
        maxBtns.forEach(function (b) {
          b.addEventListener("click", function () {
            var target = b.getAttribute("data-max");
            var already = b.classList.contains("on");
            setMaximized(already ? null : target);
          });
        });

        function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

        
        var pip = $("cmp-pip");
        function isPopped() { return document.body.classList.contains("pip-out"); }
        function popOut() {
          if (isPopped()) return;
          $("cmp-pip-body").appendChild(preview); 
          
          pip.style.left = "";
          pip.style.top = "";
          pip.style.right = "";
          pip.style.width = "";
          pip.style.height = "";
          document.body.classList.add("pip-out");
          pip.classList.add("open");
          pip.classList.remove("min");
          $("cmp-pop").classList.add("on");
          applyActiveTab();
        }
        function popIn() {
          if (!isPopped()) return;
          
          $("cmp-out-wrap").insertBefore(preview, $("cmp-gutter-console"));
          document.body.classList.remove("pip-out");
          pip.classList.remove("open");
          $("cmp-pop").classList.remove("on");
          applyActiveTab();
        }
        $("cmp-pop").addEventListener("click", function () { isPopped() ? popIn() : popOut(); });
        $("cmp-pip-dock").addEventListener("click", popIn);
        $("cmp-pip-min").addEventListener("click", function () {
          pip.classList.toggle("min");
          this.textContent = pip.classList.contains("min") ? "▢" : "▁";
        });
        
        $("cmp-pip-head").addEventListener("pointerdown", function (e) {
          if (e.target.closest(".cmp-pip-btn")) return;
          e.preventDefault();
          var r = pip.getBoundingClientRect();
          var dx = e.clientX - r.left, dy = e.clientY - r.top;
          pip.style.right = "auto";
          this.setPointerCapture(e.pointerId);
          var self = this;
          function move(ev) {
            var x = Math.max(4, Math.min(ev.clientX - dx, window.innerWidth - 60));
            var y = Math.max(4, Math.min(ev.clientY - dy, window.innerHeight - 40));
            pip.style.left = x + "px";
            pip.style.top = y + "px";
          }
          function up() {
            self.releasePointerCapture(e.pointerId);
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
          }
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
        });
        
        var PIP_MINW = 240, PIP_MINH = 150;
        pip.querySelectorAll(".cmp-pip-rz").forEach(function (h) {
          h.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var dir = h.getAttribute("data-rz");
            var r = pip.getBoundingClientRect();
            var sx = e.clientX, sy = e.clientY;
            var sL = r.left, sT = r.top, sW = r.width, sH = r.height;
            pip.style.right = "auto"; 
            pip.style.left = sL + "px";
            pip.style.top = sT + "px";
            h.setPointerCapture(e.pointerId);
            function move(ev) {
              var dx = ev.clientX - sx, dy = ev.clientY - sy;
              if (dir.indexOf("e") >= 0) pip.style.width = Math.max(PIP_MINW, sW + dx) + "px";
              if (dir.indexOf("s") >= 0) pip.style.height = Math.max(PIP_MINH, sH + dy) + "px";
              if (dir.indexOf("w") >= 0) {
                var w = Math.max(PIP_MINW, sW - dx);
                pip.style.width = w + "px";
                pip.style.left = (sL + sW - w) + "px";
              }
              if (dir.indexOf("n") >= 0) {
                var ht = Math.max(PIP_MINH, sH - dy);
                pip.style.height = ht + "px";
                pip.style.top = (sT + sH - ht) + "px";
              }
            }
            function up() {
              h.releasePointerCapture(e.pointerId);
              document.removeEventListener("pointermove", move);
              document.removeEventListener("pointerup", up);
            }
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", up);
          });
        });

        
        
        $("cmp-gutter-main").addEventListener("pointerdown", function (e) {
          e.preventDefault();
          var g = e.currentTarget;
          var column = getComputedStyle(workspace).flexDirection === "column";
          var rect = workspace.getBoundingClientRect();
          g.setPointerCapture(e.pointerId);
          function move(ev) {
            var pct = column
              ? ((ev.clientY - rect.top) / rect.height) * 100
              : ((ev.clientX - rect.left) / rect.width) * 100;
            pct = Math.max(12, Math.min(88, pct));
            workspace.style.setProperty("--editor-basis", pct + "%");
          }
          function up() {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            editor.refresh();
          }
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
        });

        
        $("cmp-gutter-console").addEventListener("pointerdown", function (e) {
          e.preventDefault();
          var g = e.currentTarget;
          var rect = $("cmp-out-wrap").getBoundingClientRect();
          g.setPointerCapture(e.pointerId);
          function move(ev) {
            var h = rect.bottom - ev.clientY; 
            h = Math.max(60, Math.min(rect.height - 90, h));
            $("cmp-out-wrap").style.setProperty("--console-h", h + "px");
          }
          function up() {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
          }
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
        });

        
        var zoom = { editor: 100, output: 100, console: 100 };
        var ZBASE = { editor: 13.5, output: 12.5, console: 12 };
        function applyZoom(which) {
          var z = zoom[which];
          $("cmp-zoom-" + which).textContent = z + "%";
          if (which === "editor") {
            editor.getWrapperElement().style.fontSize = (ZBASE.editor * z / 100).toFixed(2) + "px";
            editor.refresh();
          } else if (which === "output") {
            out.style.fontSize = (ZBASE.output * z / 100).toFixed(2) + "px";
            preview.style.zoom = z / 100; 
          } else if (which === "console") {
            clog.style.fontSize = (ZBASE.console * z / 100).toFixed(2) + "px";
          }
        }
        function bumpZoom(which, dir) {
          zoom[which] = Math.max(50, Math.min(250, zoom[which] + dir * 10));
          applyZoom(which);
        }
        document.querySelectorAll("[data-zoom]").forEach(function (b) {
          b.addEventListener("click", function () {
            bumpZoom(b.getAttribute("data-zoom"), parseInt(b.getAttribute("data-dir"), 10));
          });
        });
        
        function wheelZoom(el, which) {
          el.addEventListener("wheel", function (e) {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            bumpZoom(which, e.deltaY < 0 ? 1 : -1);
          }, { passive: false });
        }
        wheelZoom(editor.getWrapperElement(), "editor");
        wheelZoom($("cmp-output"), "output");
        wheelZoom($("cmp-console-log"), "console");

        
        
        
        var ytLaunch = document.getElementById("yt-launch");
        var utils = $("cmp-bar-utils");
        if (ytLaunch && utils) utils.insertBefore(ytLaunch, $("cmp-home"));

        
        document.addEventListener("keydown", function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
          if (e.key === "Escape" && !isFs() &&
              (workspace.classList.contains("max-editor") || workspace.classList.contains("max-output"))) {
            setMaximized(null);
          }
        });

        
        applyCodeTheme();
        injectEditorThemeSection();
        refreshSnippetList();
        if (!restoreTabs()) newTab("python"); 
        fetchRuntimes();
        setTimeout(function () { editor.refresh(); }, 60);
      })();
(function(){
  var EDITABLE_TAGS = ['INPUT','TEXTAREA','SELECT'];
  function isEditable(t){
    if(!t) return false;
    if(t.isContentEditable) return true;
    if(EDITABLE_TAGS.indexOf((t.tagName||'').toUpperCase())>=0) return true;
    if(t.closest && (t.closest('.CodeMirror') || t.closest('.cmp-ai-log'))) return true;
    return false;
  }
  document.addEventListener('contextmenu', function(e){
    if(isEditable(e.target)) return;
    e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    var k = (e.key||'').toLowerCase();
    if(e.key === 'F12'){ e.preventDefault(); return; }
    var mod = e.ctrlKey || e.metaKey;
    if(mod && e.shiftKey && (k==='i'||k==='j'||k==='c')){ e.preventDefault(); return; }
    if(mod && e.altKey  && (k==='i'||k==='j'||k==='c')){ e.preventDefault(); return; }
    if(mod && k==='u'){ e.preventDefault(); return; }
  });
})();
