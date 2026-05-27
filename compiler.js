/* Code Compiler — editor + execution logic (external so embedded <script> strings are safe) */
      (function () {
        "use strict";

        var PISTON = "https://emkc.org/api/v2/piston";
        var LS_SNIPPETS = "compiler-snippets";
        var LS_PERLANG = "compiler-perlang"; // remembers code per language

        // language config: CodeMirror mode + Piston language name + fallback version
        var LANGS = {
          python:     { cm: "python",            piston: "python",     ver: "3.10.0", file: "main.py" },
          javascript: { cm: "javascript",        piston: "javascript", ver: "18.15.0", file: "main.js" },
          java:       { cm: "text/x-java",        piston: "java",       ver: "15.0.2", file: "Main.java" },
          cpp:        { cm: "text/x-c++src",      piston: "c++",        ver: "10.2.0", file: "main.cpp" },
          c:          { cm: "text/x-csrc",        piston: "c",          ver: "10.2.0", file: "main.c" },
          web:        { cm: "htmlmixed",          piston: null,         ver: null,     file: "index.html" },
        };

        var STARTERS = {
          python: 'name = input("Your name: ")\nprint(f"Hello, {name}!")\n\nfor i in range(1, 6):\n    print(i, i * i)\n',
          javascript: 'const name = "world";\nconsole.log(`Hello, ${name}!`);\n\n[1, 2, 3, 4, 5].forEach(n => console.log(n, n * n));\n',
          java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n        for (int i = 1; i <= 5; i++) {\n            System.out.println(i + " " + (i * i));\n        }\n    }\n}\n',
          cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, world!" << endl;\n    for (int i = 1; i <= 5; i++) cout << i << " " << i * i << endl;\n    return 0;\n}\n',
          c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    for (int i = 1; i <= 5; i++) printf("%d %d\\n", i, i * i);\n    return 0;\n}\n',
          web: '<!doctype html>\n<html>\n  <head>\n    <style>\n      body { font-family: sans-serif; text-align: center; padding: 40px; }\n      h1 { color: #c8a96e; }\n    </style>\n  </head>\n  <body>\n    <h1>Hello, web!</h1>\n    <button onclick="count()">Clicked <span id="n">0</span></button>\n    <script>\n      let n = 0;\n      function count() {\n        document.getElementById("n").textContent = ++n;\n        console.log("clicked", n);\n      }\n    <\/script>\n  </body>\n</html>\n',
        };

        var $ = function (id) { return document.getElementById(id); };
        var runtimeVersions = {}; // piston language -> best version (filled from API)

        // ── editor ──────────────────────────────────────────
        var editor = CodeMirror.fromTextArea($("cmp-code"), {
          mode: LANGS.python.cm,
          theme: "material-darker",
          lineNumbers: true,
          indentUnit: 4,
          tabSize: 4,
          autoCloseBrackets: true,
          matchBrackets: true,
          styleActiveLine: true,
          lineWrapping: false,
        });

        var currentLang = "python";

        function labelFor(lang) {
          return { python: "Python", javascript: "JavaScript", java: "Java",
                   cpp: "C++", c: "C", web: "Web" }[lang] || lang;
        }
        function updateRuntimeLabel() {
          var cfg = LANGS[currentLang];
          if (currentLang === "web") { $("cmp-runtime").textContent = "client-side preview"; return; }
          var v = runtimeVersions[cfg.piston] || cfg.ver;
          $("cmp-runtime").textContent = cfg.piston + " " + v;
        }

        // ── editor tabs: multiple open files, each its own document ──
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
            el.appendChild(nm);
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

        function applyActiveTab() {
          var t = tabById(activeId);
          if (!t) return;
          currentLang = t.lang;
          editor.setOption("mode", modeOf(t.lang));
          $("cmp-lang").value = t.lang;
          $("cmp-editor-label").textContent =
            t.lang === "web" ? "Editor — HTML / CSS / JS" : "Editor — " + labelFor(t.lang);
          $("cmp-out-label").textContent = t.lang === "web" ? "Live preview" : "Output";
          updateRuntimeLabel();
          $("cmp-stdin-toggle").style.display = t.lang === "web" ? "none" : "";
          if (t.lang === "web") runWeb();
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
          var t = tabById(id);
          if (!t) return;
          if (id !== activeId) { activeId = id; editor.swapDoc(t.doc); }
          applyActiveTab();
          renderTabs();
          persistTabs();
        }

        function closeTab(id) {
          var i = -1;
          tabs.forEach(function (t, k) { if (t.id === id) i = k; });
          if (i < 0) return;
          tabs.splice(i, 1);
          if (tabs.length === 0) { newTab("python"); return; } // always keep one open
          if (activeId === id) switchTab(tabs[Math.max(0, i - 1)].id);
          else { renderTabs(); persistTabs(); }
        }

        // changing the language applies to the active tab (keeps its code)
        function setActiveLang(lang) {
          var t = tabById(activeId);
          if (!t) return;
          t.lang = lang;
          t.name = fileName(lang);
          applyActiveTab();
          renderTabs();
          persistTabs();
        }

        function persistTabs() {
          try {
            localStorage.setItem(LS_TABS, JSON.stringify({
              activeIndex: tabs.map(function (t) { return t.id; }).indexOf(activeId),
              tabs: tabs.map(function (t) {
                return { lang: t.lang, name: t.name, code: t.doc.getValue() };
              }),
            }));
          } catch (e) {}
        }
        function restoreTabs() {
          try {
            var s = JSON.parse(localStorage.getItem(LS_TABS));
            if (s && s.tabs && s.tabs.length) {
              s.tabs.forEach(function (d) {
                tabs.push({
                  id: "t" + ++tabSeq, lang: d.lang, name: d.name || fileName(d.lang),
                  doc: CodeMirror.Doc(d.code || "", modeOf(d.lang)),
                });
              });
              var ai = (s.activeIndex >= 0 && s.activeIndex < tabs.length) ? s.activeIndex : 0;
              activeId = tabs[ai].id;
              editor.swapDoc(tabs[ai].doc);
              applyActiveTab();
              renderTabs();
              return true;
            }
          } catch (e) {}
          return false;
        }

        // autosave (debounced) + live web re-render as you type
        var saveTimer, webTimer;
        editor.on("change", function () {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(persistTabs, 400);
          if (currentLang === "web") {
            clearTimeout(webTimer);
            webTimer = setTimeout(runWeb, 600);
          }
        });

        // ── output helpers ──────────────────────────────────
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
          setOutputMode(currentLang === "web" ? "web" : "text");
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

        // ── Piston execution ────────────────────────────────
        async function fetchRuntimes() {
          try {
            var r = await fetch(PISTON + "/runtimes", { cache: "no-store" });
            if (!r.ok) return;
            var list = await r.json();
            list.forEach(function (rt) {
              var keys = [rt.language].concat(rt.aliases || []);
              keys.forEach(function (k) {
                // keep the highest version we see for each language/alias
                if (!runtimeVersions[k] || cmpVer(rt.version, runtimeVersions[k]) > 0)
                  runtimeVersions[k] = rt.version;
              });
            });
            updateRuntimeLabel();
          } catch (e) { /* offline → fall back to hardcoded versions */ }
        }
        function cmpVer(a, b) {
          var pa = a.split("."), pb = b.split(".");
          for (var i = 0; i < 3; i++) {
            var x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
            if (x !== y) return x - y;
          }
          return 0;
        }

        async function runPiston(lang) {
          var cfg = LANGS[lang];
          var version = runtimeVersions[cfg.piston] || cfg.ver;
          var body = {
            language: cfg.piston,
            version: version,
            files: [{ name: cfg.file, content: editor.getValue() }],
            stdin: $("cmp-stdin-text").value || "",
          };
          var r = await fetch(PISTON + "/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
          // compile stage (C/C++/Java) — show errors if compilation failed
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
            setStatus("exited with code " + (code || 1), "err");
          } else {
            setStatus("done · exit 0", "ok");
          }
        }

        // ── Web (client-side) preview ───────────────────────
        function runWeb() {
          setOutputMode("web");
          setStatus("rendered", "ok");
          clearConsole(); // fresh console for each render
          // console-capture shim injected before the user's document so we can
          // surface console.* + uncaught errors in our own console panel
          var shim =
            "<script>(function(){function send(t,a){parent.postMessage({__cmp:1,type:t," +
            "text:Array.from(a).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}" +
            "['log','info','warn','error'].forEach(function(m){var o=console[m];console[m]=function(){send(m,arguments);o&&o.apply(console,arguments)}});" +
            "window.addEventListener('error',function(e){send('error',[e.message+' ('+e.lineno+':'+e.colno+')'])});" +
            "window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled promise rejection: '+e.reason])});" +
            "})();<\/script>";
          preview.srcdoc = shim + editor.getValue();
        }

        // capture console output streamed from the sandboxed preview iframe
        window.addEventListener("message", function (e) {
          var d = e.data;
          if (!d || d.__cmp !== 1) return;
          appendConsole(d.type, d.text);
          if (d.type === "error") setStatus("console error", "err");
        });
        $("cmp-console-clear").addEventListener("click", clearConsole);

        // ── run dispatcher ──────────────────────────────────
        var running = false;
        async function run() {
          if (running) return;
          var lang = currentLang;
          if (lang === "web") { runWeb(); return; }

          running = true;
          $("cmp-run").disabled = true;
          setOutputMode("text");
          out.innerHTML = '<span class="meta">Running ' + escapeHtml(labelFor(lang)) + "…</span>";
          setStatus("running…", "busy");
          var t0 = performance.now();
          try {
            var res = await runPiston(lang);
            renderPistonResult(res);
            var ms = Math.round(performance.now() - t0);
            var cur = $("cmp-status").textContent;
            $("cmp-status").textContent = cur + " · " + ms + "ms";
          } catch (err) {
            out.innerHTML =
              '<span class="err">' + escapeHtml(err.message || String(err)) +
              "</span>\n\n" +
              '<span class="meta">Tip: the execution service may be rate-limited or offline. ' +
              "HTML/CSS/JS still runs locally via the Web language.</span>";
            setStatus("failed", "err");
          } finally {
            running = false;
            $("cmp-run").disabled = false;
          }
        }

        // ── snippets (save / load / delete) ─────────────────
        function loadSnippets() {
          try { return JSON.parse(localStorage.getItem(LS_SNIPPETS)) || []; }
          catch (e) { return []; }
        }
        function storeSnippets(list) {
          try { localStorage.setItem(LS_SNIPPETS, JSON.stringify(list)); } catch (e) {}
        }
        function refreshSnippetList() {
          var list = loadSnippets();
          var sel = $("cmp-snippets");
          sel.innerHTML = '<option value="">📂</option>';
          list.forEach(function (s, i) {
            var o = document.createElement("option");
            o.value = String(i);
            o.textContent = s.name + "  ·  " + labelFor(s.lang);
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
          var name = (prompt("Name this snippet:") || "").trim();
          if (!name) return;
          var list = loadSnippets();
          var entry = { name: name, lang: currentLang, code: editor.getValue() };
          var i = list.findIndex(function (s) { return s.name === name && s.lang === currentLang; });
          if (i >= 0) list[i] = entry; else list.push(entry);
          storeSnippets(list);
          refreshSnippetList();
          toast("Saved “" + name + "”");
        }
        $("cmp-snippets").addEventListener("change", function (e) {
          var v = e.target.value;
          if (v === "") return;
          var list = loadSnippets();
          if (v === "__delete__") {
            e.target.value = "";
            if (!list.length) return;
            var names = list.map(function (s, i) { return i + 1 + ". " + s.name + " (" + labelFor(s.lang) + ")"; });
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
          if (s) { newTab(s.lang, s.code, s.name); toast("Loaded “" + s.name + "” in a new tab"); }
          e.target.value = "";
        });

        // ── toast ───────────────────────────────────────────
        var toastTimer;
        function toast(msg) {
          var t = $("cmp-toast");
          t.textContent = msg;
          t.classList.add("show");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
        }

        // ── wire up controls ────────────────────────────────
        $("cmp-run").addEventListener("click", run);
        $("cmp-clear").addEventListener("click", clearOutput);
        $("cmp-save").addEventListener("click", saveSnippet);
        $("cmp-lang").addEventListener("change", function (e) { setActiveLang(e.target.value); });
        $("cmp-stdin-toggle").addEventListener("click", function () {
          $("cmp-stdin").classList.toggle("show");
          editor.refresh();
        });
        // ── hide / show the whole top bar to focus on the code/terminal ──
        function setBarCollapsed(collapsed) {
          document.body.classList.toggle("bar-collapsed", collapsed);
          setTimeout(function () { editor.refresh(); }, 0);
        }
        $("cmp-bar-toggle").addEventListener("click", function () { setBarCollapsed(true); });
        $("cmp-bar-show").addEventListener("click", function () { setBarCollapsed(false); });

        // ── maximize a pane to fill the whole workspace (in-page) ──
        var workspace = document.querySelector(".cmp-workspace");
        var maxBtns = document.querySelectorAll(".cmp-pane-btn");
        function setMaximized(which) {
          // which: "editor" | "output" | null
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
          setTimeout(function () { editor.refresh(); }, 0); // CodeMirror re-measures
        }
        maxBtns.forEach(function (b) {
          b.addEventListener("click", function () {
            var target = b.getAttribute("data-max");
            var already = b.classList.contains("on");
            setMaximized(already ? null : target);
          });
        });

        // ── true OS fullscreen (optional) ──
        function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
        $("cmp-full").addEventListener("click", function () {
          var el = document.documentElement;
          if (!isFs()) {
            (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
          } else {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          }
        });
        function syncFsBtn() {
          $("cmp-full").textContent = isFs() ? "⛶ Exit Full" : "⛶ Fullscreen";
        }
        document.addEventListener("fullscreenchange", syncFsBtn);
        document.addEventListener("webkitfullscreenchange", syncFsBtn);

        // ── drag-to-resize panes ──
        // main divider: editor vs output (horizontal split, or vertical on mobile)
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

        // console divider: preview vs console (web mode), adjusts console height
        $("cmp-gutter-console").addEventListener("pointerdown", function (e) {
          e.preventDefault();
          var g = e.currentTarget;
          var rect = $("cmp-out-wrap").getBoundingClientRect();
          g.setPointerCapture(e.pointerId);
          function move(ev) {
            var h = rect.bottom - ev.clientY; // height measured from the bottom up
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

        // ── per-panel zoom (editor / output+preview / console) ──
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
            preview.style.zoom = z / 100; // scales the live preview
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
        // Ctrl/Cmd + wheel zooms the panel under the cursor
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

        // ── fold the video launcher into the top-bar icon group ──
        // (#yt-launch is created by videoplayer.js, which ran just before this
        // script; place it next to the theme icons, before the Home button)
        var ytLaunch = document.getElementById("yt-launch");
        var utils = $("cmp-bar-utils");
        if (ytLaunch && utils) utils.insertBefore(ytLaunch, $("cmp-home"));

        // Ctrl/Cmd + Enter runs · Esc restores a maximized pane
        document.addEventListener("keydown", function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
          if (e.key === "Escape" && !isFs() &&
              (workspace.classList.contains("max-editor") || workspace.classList.contains("max-output"))) {
            setMaximized(null);
          }
        });

        // ── boot ────────────────────────────────────────────
        refreshSnippetList();
        if (!restoreTabs()) newTab("python"); // restore open files, or start fresh
        fetchRuntimes();
        setTimeout(function () { editor.refresh(); }, 60);
      })();