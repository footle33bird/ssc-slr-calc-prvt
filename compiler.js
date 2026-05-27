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
                   cpp: "C++", c: "C", html: "HTML", css: "CSS", web: "Web" }[lang] || lang;
        }
        // languages that render a live web preview (and can host linked css/js)
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
            nm.addEventListener("dblclick", function (e) { e.stopPropagation(); startRename(t, nm); });
            el.appendChild(nm);
            var ed = document.createElement("button");
            ed.className = "cmp-tab-edit";
            ed.innerHTML = "&#9998;"; // ✎ pencil
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

        // the file extension decides the language (no separate picker)
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

        // double-click a tab name (or its ✎) to rename it; the extension picks the language
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
              var lg = langFromName(v); // switch language to match the extension
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

        // which HTML page (if any) should be previewed for the given tab:
        // the tab itself if it's a web host, or the page a linked CSS/JS belongs to
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
          // stdin only matters for Piston-run languages; link button only for HTML hosts
          $("cmp-stdin-toggle").style.display = (LANGS[t.lang].piston ? "" : "none");
          $("cmp-link").style.display = isWebHost(t.lang) ? "" : "none";
          // pop-out is only useful when there's a live preview (or already popped)
          $("cmp-pop").style.display =
            (target || document.body.classList.contains("pip-out")) ? "" : "none";
          if (target) renderWebHost(target); // always keep the web preview visible
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
          if (id === activeId) return; // already active — don't rebuild (lets dbl-click rename work)
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
          if (tabs.length === 0) { newTab("python"); return; } // always keep one open
          if (activeId === id) switchTab(tabs[Math.max(0, i - 1)].id);
          else { renderTabs(); persistTabs(); }
        }

        // snapshot of the whole workspace (every open tab + which is active)
        function serializeTabs() {
          var ids = tabs.map(function (t) { return t.id; });
          return {
            activeIndex: ids.indexOf(activeId),
            tabs: tabs.map(function (t) {
              return {
                lang: t.lang, name: t.name, code: t.doc.getValue(), renamed: !!t.renamed,
                // store links by index so they survive id regeneration
                links: (t.links || []).map(function (id) { return ids.indexOf(id); })
                  .filter(function (i) { return i >= 0; }),
              };
            }),
          };
        }
        // rebuild the workspace from a snapshot (replaces all open tabs)
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

        // autosave (debounced) + live web re-render as you type
        var saveTimer, webTimer;
        editor.on("change", function () {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(persistTabs, 400);
          // live-update the preview while editing the page OR any linked CSS/JS
          var target = previewTargetFor(tabById(activeId));
          if (target) {
            clearTimeout(webTimer);
            webTimer = setTimeout(function () { renderWebHost(target); }, 600);
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
        function baseName(p) { return String(p).replace(/^.*[\\/]/, "").replace(/[?#].*$/, "").toLowerCase(); }
        // find an open tab whose filename matches a href/src reference
        function tabByFile(ref) {
          var b = baseName(ref);
          return tabs.filter(function (t) { return baseName(t.name) === b; })[0];
        }
        // true for real external URLs (CDNs etc.); everything else is a relative
        // path that would otherwise resolve against — and load — the real site files
        function isExternalUrl(u) { return /^(https?:)?\/\//i.test(u) || /^(data|blob):/i.test(u); }

        // compose the final HTML for a host tab. <link href> / <script src> that
        // match an open tab are inlined; OTHER relative refs are dropped so the
        // preview can never pull files from the actual site. External (CDN) URLs
        // are kept. 🔗-linked tabs are injected too.
        function buildWebDoc(host) {
          var html = host.doc.getValue();
          if (host.lang === "web") return html; // self-contained single file
          var used = {};
          // <link ... href="styles.css" ...>
          html = html.replace(/<link\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>/gi, function (m, href) {
            var f = tabByFile(href);
            if (f && f.lang === "css") { used[f.id] = 1; return "<style>\n/* " + f.name + " */\n" + f.doc.getValue() + "\n</style>"; }
            if (!isExternalUrl(href)) return "<!-- dropped local link: " + href + " (not an open tab) -->";
            return m; // keep external stylesheets (CDNs)
          });
          // <script ... src="app.js" ...></script>
          html = html.replace(/<script\b[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?>\s*<\/script>/gi, function (m, src) {
            var f = tabByFile(src);
            if (f && f.lang === "javascript") { used[f.id] = 1; return "<script>\n/* " + f.name + " */\n" + f.doc.getValue() + "\n<\/script>"; }
            if (!isExternalUrl(src)) return "<!-- dropped local script: " + src + " (not an open tab) -->";
            return m; // keep external scripts (CDNs)
          });
          // explicit 🔗 links not already pulled in by a reference
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
          clearConsole(); // fresh console for each render
          // console-capture shim injected before the document so we can surface
          // console.* + uncaught errors in our own console panel
          var shim =
            "<script>(function(){" +
            // the preview is sandboxed (no same-origin) for isolation; stub the
            // service-worker API so code that touches it degrades instead of throwing
            "try{Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:function(){return {register:function(){return Promise.reject(new Error('Service workers are disabled in the preview sandbox.'));},addEventListener:function(){},ready:new Promise(function(){})};}});}catch(e){}" +
            "function send(t,a){parent.postMessage({__cmp:1,type:t," +
            "text:Array.from(a).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}" +
            "['log','info','warn','error'].forEach(function(m){var o=console[m];console[m]=function(){send(m,arguments);o&&o.apply(console,arguments)}});" +
            "window.addEventListener('error',function(e){send('error',[e.message+' ('+e.lineno+':'+e.colno+')'])});" +
            "window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled promise rejection: '+e.reason])});" +
            "})();<\/script>";
          preview.srcdoc = shim + buildWebDoc(host);
        }
        // find an HTML host tab that uses the given tab — either via the 🔗 list
        // or by referencing its filename in a <link>/<script src> in its code
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
          var active = tabById(activeId);
          if (isWebHost(lang)) { renderWebHost(active); return; }
          // CSS isn't runnable alone — preview the HTML page it's linked to
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
        function snippetMeta(s) {
          // new format = a whole workspace; old format = a single file
          if (s.workspace && s.workspace.tabs) {
            var n = s.workspace.tabs.length;
            return n + (n === 1 ? " file" : " files");
          }
          return labelFor(s.lang);
        }
        function refreshSnippetList() {
          var list = loadSnippets();
          var sel = $("cmp-snippets");
          sel.innerHTML = '<option value="">📂</option>';
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
          // save ALL open tabs (the whole workspace), not just the active file
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
              // restore the whole saved workspace (replaces the open tabs)
              loadTabsFrom(s.workspace);
              persistTabs();
              var n = s.workspace.tabs.length;
              toast("Opened “" + s.name + "” (" + n + (n === 1 ? " file" : " files") + ")");
            } else {
              // legacy single-file snippet → open in a new tab
              newTab(s.lang, s.code, s.name);
              toast("Loaded “" + s.name + "” in a new tab");
            }
          }
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
        $("cmp-save").addEventListener("click", saveSnippet);
        $("cmp-stdin-toggle").addEventListener("click", function () {
          $("cmp-stdin").classList.toggle("show");
          editor.refresh();
        });

        // ── link CSS / JS tabs into the active HTML page ──
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
              renderWebHost(host); // live update the preview
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
        // ── hide / show the whole top bar to focus on the code/terminal ──
        function setBarCollapsed(collapsed) {
          document.body.classList.toggle("bar-collapsed", collapsed);
          setTimeout(function () { editor.refresh(); }, 0);
        }
        $("cmp-bar-toggle").addEventListener("click", function () { setBarCollapsed(true); });
        $("cmp-bar-show").addEventListener("click", function () { setBarCollapsed(false); });

        // ── maximize a pane to fill the whole workspace (in-page) ──
        var workspace = document.querySelector(".cmp-workspace");
        var maxBtns = document.querySelectorAll(".cmp-pane-btn[data-max]");
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

        function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

        // ── pop the live preview into a floating window ──
        var pip = $("cmp-pip");
        function isPopped() { return document.body.classList.contains("pip-out"); }
        function popOut() {
          if (isPopped()) return;
          $("cmp-pip-body").appendChild(preview); // move the iframe into the window
          // reset to a known, on-screen position/size so it's always visible
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
          // put the iframe back in the panel, before the console
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
        // drag the window by its header
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
        // resize from any edge or corner
        var PIP_MINW = 240, PIP_MINH = 150;
        pip.querySelectorAll(".cmp-pip-rz").forEach(function (h) {
          h.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var dir = h.getAttribute("data-rz");
            var r = pip.getBoundingClientRect();
            var sx = e.clientX, sy = e.clientY;
            var sL = r.left, sT = r.top, sW = r.width, sH = r.height;
            pip.style.right = "auto"; // pin to left/top so all sides move correctly
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