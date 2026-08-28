/* ------------------------------------------------------------------
   The panel wall: one <canvas> per sketch, each running its own copy
   of the effect on its own virtual matrix and virtual millis() clock.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  const REPO = "https://github.com/St3p40/worksfromsoulmate/blob/main/";
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // preferred order for the repository's folders; any folder not listed here
  // (a new one you add to effects.js) is appended automatically
  const DIR_ORDER = ["", "Other", "Classic Demoeffects recreations", "Radial Effects", "Particle System",
                     "Any recreations", "Updated existing Effects", "Animation recreations", "Testing stuff"];
  let DIRS = null;
  function computeDirs() {
    const found = [];
    EFFECTS.forEach(function (e) {
      const d = e.file.indexOf("/") < 0 ? "" : e.file.slice(0, e.file.lastIndexOf("/"));
      if (found.indexOf(d) < 0) found.push(d);
    });
    const out = DIR_ORDER.filter(function (d) { return found.indexOf(d) >= 0; });
    found.forEach(function (d) { if (out.indexOf(d) < 0) out.push(d); });
    return out;
  }

  const state = { size: 32, running: !REDUCED, led: true, dir: "*", items: [], detail: null, eff: null };
  const masks = new Map();

  const $ = sel => document.querySelector(sel);
  const dirOf = f => f.indexOf("/") < 0 ? "" : f.slice(0, f.lastIndexOf("/"));
  const baseOf = f => f.slice(f.lastIndexOf("/") + 1);
  const hash = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // -------------------------------------------------------- sketch settings
  // An effect may declare params[]; their values land in s.opt, where the port
  // reads them in place of the .cpp's #define or tuning global. Edits are kept
  // per sketch and survive a reload.
  const STORE = "soulmate.params";
  const overrides = (function () {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  })();
  function saveOverrides() {
    try {
      if (Object.keys(overrides).length) localStorage.setItem(STORE, JSON.stringify(overrides));
      else localStorage.removeItem(STORE);
    } catch (e) { /* private mode, or storage disabled */ }
  }
  const paramsOf = eff => eff.params || [];
  const isTuned = eff => Object.keys(overrides[eff.name] || {}).length > 0;
  function optsFor(eff) {
    const o = {}, ov = overrides[eff.name] || {};
    paramsOf(eff).forEach(function (p) { o[p.k] = (p.k in ov) ? ov[p.k] : p.def; });
    return o;
  }

  // ---------------------------------------------------------- rendering
  function mask(cell, W, H) {
    const key = cell + "x" + W + "x" + H;
    if (masks.has(key)) return masks.get(key);
    const c = document.createElement("canvas");
    c.width = W * cell * DPR; c.height = H * cell * DPR;
    const g = c.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = "#fff";
    const r = Math.max(0.6, cell * 0.5 - Math.max(0.45, cell * 0.13));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      g.beginPath();
      g.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, Math.PI * 2);
      g.fill();
    }
    masks.set(key, c);
    return c;
  }

  function paint(it) {
    const m = it.m, W = m.W, H = m.H, cell = it.cell;
    if (!cell) return;
    const img = it.img || (it.img = it.sctx.createImageData(W, H));
    const d = img.data, src = m.d;
    for (let y = 0; y < H; y++) {
      const row = (H - 1 - y) * W;                 // row 0 of the matrix is the bottom
      for (let x = 0; x < W; x++) {
        const s = (row + x) * 3, o = (y * W + x) * 4;
        d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; d[o + 3] = 255;
      }
    }
    it.sctx.putImageData(img, 0, 0);

    const ctx = it.ctx, pw = W * cell, ph = H * cell;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, pw, ph);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(it.small, 0, 0, pw, ph);
    if (state.led && cell >= 4) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask(cell, W, H), 0, 0, pw, ph);
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(it.small, -cell * 0.6, -cell * 0.6, pw + cell * 1.2, ph + cell * 1.2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // ------------------------------------------------------------ running
  function step(it, dt) {
    const period = it.eff.ms || 16;
    it.acc += dt;
    let n = 0;
    while (it.acc >= period && n < 2) {
      it.acc -= period;
      FL.setMillis(it.s.ms);
      it.eff.draw(it.s, it.m);
      it.s.ms += period;
      n++;
    }
    if (n) { paint(it); return n; }
    return 0;
  }

  function prime(it, frames) {
    const period = it.eff.ms || 16;
    for (let i = 0; i < frames; i++) {
      FL.setMillis(it.s.ms);
      it.eff.draw(it.s, it.m);
      it.s.ms += period;
    }
    paint(it);
  }

  // start a panel over with the settings it has now
  function resetItem(it) {
    it.m = new FL.Matrix(it.m.W, it.m.H);
    it.s = { ms: 0, rnd: FL.makeRandom(hash(it.eff.name)), opt: optsFor(it.eff) };
    if (it.eff.init) it.eff.init(it.s, it.m);
    it.acc = 0;
    prime(it, state.running ? 30 : 160);
  }

  function makeItem(eff, canvas, cell) {
    const W = state.size, H = state.size;
    const m = new FL.Matrix(W, H);
    const s = { ms: 0, rnd: FL.makeRandom(hash(eff.name)), opt: optsFor(eff) };
    if (eff.init) eff.init(s, m);
    const small = document.createElement("canvas");
    small.width = W; small.height = H;
    const it = {
      eff: eff, m: m, s: s, canvas: canvas, ctx: canvas.getContext("2d"),
      small: small, sctx: small.getContext("2d", { willReadFrequently: true }),
      cell: 0, acc: 0, visible: false, primed: false
    };
    setCell(it, cell);
    return it;
  }

  function setCell(it, cell) {
    it.cell = cell;
    const W = it.m.W, H = it.m.H;
    it.canvas.width = W * cell * DPR;
    it.canvas.height = H * cell * DPR;
    it.canvas.style.width = (W * cell) + "px";
    it.canvas.style.height = (H * cell) + "px";
    it.ctx.imageSmoothingEnabled = false;
  }

  function cellFor(el) {
    const w = el.clientWidth - 24;            // .screen padding
    return Math.max(3, Math.floor(w / state.size));
  }

  // -------------------------------------------------------- syntax tint
  const KEYWORDS = new RegExp("^(void|byte|bool|char|int|long|short|float|double|unsigned|signed|const|static|struct|" +
    "uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|if|else|for|while|do|switch|case|break|continue|return|true|false|" +
    "CRGB|CHSV|leds|XY|NUM_LEDS|LED_COLS|LED_ROWS)$");
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function highlight(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(^[ \t]*#[a-zA-Z]+)|("(?:[^"\\]|\\.)*")|(\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*[fFuUlL]?\b)|([A-Za-z_]\w*)/gm;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const t = m[0];
      if (m[1]) out += '<span class="c">' + esc(t) + "</span>";
      else if (m[2]) out += '<span class="p">' + esc(t) + "</span>";
      else if (m[3]) out += '<span class="s">' + esc(t) + "</span>";
      else if (m[4]) out += '<span class="n">' + esc(t) + "</span>";
      else if (m[5] && KEYWORDS.test(t)) out += '<span class="k">' + esc(t) + "</span>";
      else out += esc(t);
      last = m.index + t.length;
    }
    return out + esc(src.slice(last));
  }

  // ---------------------------------------------------------------- DOM
  const wall = $("#wall");
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      const it = e.target._item;
      if (!it) return;
      it.visible = e.isIntersecting;
      if (e.isIntersecting && !it.primed) {
        it.primed = true;
        prime(it, state.running ? 45 : 260);
      }
    });
  }, { rootMargin: "150px" });

  function buildWall() {
    wall.textContent = "";
    state.items = [];
    const grid = document.createElement("div");
    grid.className = "grid";
    DIRS.forEach(function (dir) {
      EFFECTS.filter(function (e) { return dirOf(e.file) === dir; }).forEach(function (eff) {
        const card = document.createElement("button");
        card.className = "module";
        card.type = "button";
        card.dataset.dir = dir;
        card.dataset.tuned = isTuned(eff) ? "1" : "0";
        card.innerHTML =
          '<div class="screen"><canvas></canvas></div>' +
          '<div class="meta"><h3>' + esc(eff.name) + "</h3>" +
          '<p class="path">' + esc(baseOf(eff.file)) + "</p></div>";
        card.addEventListener("click", function () { openDetail(eff); });
        grid.appendChild(card);
        const screen = card.querySelector(".screen");
        const it = makeItem(eff, card.querySelector("canvas"), 4);
        it.screen = screen;
        it.card = card;
        screen._item = it;
        card._item = it;
        state.items.push(it);
        io.observe(card);
      });
    });
    wall.appendChild(grid);
    applyDir();
    requestAnimationFrame(fitAll);
  }

  // show only the chosen folder; hidden panels stop animating on their own
  function applyDir() {
    state.items.forEach(function (it) {
      const on = state.dir === "*" || it.card.dataset.dir === state.dir;
      it.card.style.display = on ? "" : "none";
      if (!on) it.visible = false;
    });
    document.querySelectorAll("#dirs .dir").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.dir === state.dir));
    });
    // the observer catches up a frame later; start whatever is on screen now
    requestAnimationFrame(function () {
      state.items.forEach(function (it) {
        if (it.card.style.display === "none") return;
        const r = it.card.getBoundingClientRect();
        if (r.bottom < -150 || r.top > window.innerHeight + 150) return;
        it.visible = true;
        if (!it.primed) { it.primed = true; prime(it, state.running ? 45 : 260); }
      });
    });
  }

  function buildDirs() {
    const bar = $("#dirs");
    const counts = {};
    EFFECTS.forEach(function (e) { const d = dirOf(e.file); counts[d] = (counts[d] || 0) + 1; });
    const rows = [["*", "all", EFFECTS.length]].concat(DIRS.map(function (d) {
      return [d, d === "" ? "root" : d, counts[d] || 0];
    }));
    rows.forEach(function (r) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dir";
      b.dataset.dir = r[0];
      b.innerHTML = "<b>" + esc(r[1]) + "</b><i>" + r[2] + "</i>";
      b.addEventListener("click", function () { state.dir = r[0]; applyDir(); });
      bar.appendChild(b);
    });
  }

  function fitAll() {
    state.items.forEach(function (it) {
      const cell = cellFor(it.screen);
      if (cell !== it.cell) { setCell(it, cell); paint(it); }
    });
  }

  // ----------------------------------------------------------- settings UI
  // Changing a setting restarts the sketch: some of them are only read in
  // init() (Blobs sizes its balls from Speed), so editing in place would show
  // half the old run. Rebuilds are coalesced to one per frame so a slider can
  // be dragged without the panel falling behind. The dot on the card is not
  // coalesced - it is one dataset write, and it should track the slider.
  function markTuned(eff) {
    const on = isTuned(eff) ? "1" : "0";
    state.items.forEach(function (it) { if (it.eff === eff) it.card.dataset.tuned = on; });
  }

  let queued = null;
  function scheduleRebuild(eff) {
    markTuned(eff);
    if (queued) return;
    queued = requestAnimationFrame(function () {
      queued = null;
      if (state.detail && state.detail.eff === eff) resetItem(state.detail);
      state.items.forEach(function (it) { if (it.eff === eff && it.primed) resetItem(it); });
    });
  }

  function setParam(eff, key, value) {
    const spec = paramsOf(eff).filter(function (p) { return p.k === key; })[0];
    const ov = overrides[eff.name] || (overrides[eff.name] = {});
    if (value === spec.def) delete ov[key]; else ov[key] = value;
    if (!Object.keys(ov).length) delete overrides[eff.name];
    saveOverrides();
    scheduleRebuild(eff);
  }

  function buildParams(eff) {
    const box = $("#d-params"), fields = $("#d-fields");
    fields.textContent = "";
    const ps = paramsOf(eff);
    box.hidden = ps.length === 0;
    if (!ps.length) return;
    const cur = optsFor(eff);
    ps.forEach(function (p) {
      const row = document.createElement("div");
      row.className = "param";
      const id = "prm-" + p.k;
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = p.label || p.k;
      row.appendChild(label);

      if (p.opts) {                             // a #define that picks a mode
        const sel = document.createElement("select");
        sel.id = id;
        sel.className = "wide";
        p.opts.forEach(function (name, i) {
          const o = document.createElement("option");
          o.value = String(i);
          o.textContent = name;
          sel.appendChild(o);
        });
        sel.value = String(cur[p.k]);
        sel.addEventListener("change", function () { setParam(eff, p.k, Number(sel.value)); });
        row.appendChild(sel);
      } else {                                  // a numeric one
        const step = p.step || 1;
        const dec = String(step).indexOf(".") < 0 ? 0 : String(step).split(".")[1].length;
        const fmt = v => v.toFixed(dec);
        const out = document.createElement("output");
        out.textContent = fmt(cur[p.k]);
        row.appendChild(out);
        const r = document.createElement("input");
        r.type = "range";
        r.id = id;
        r.className = "wide";
        r.min = p.min; r.max = p.max; r.step = step;
        r.value = cur[p.k];
        r.addEventListener("input", function () {
          const v = Number(r.value);
          out.textContent = fmt(v);
          setParam(eff, p.k, v);
        });
        row.appendChild(r);
      }
      fields.appendChild(row);
    });
  }

  // ------------------------------------------------------------- detail
  const dlg = $("#detail");
  function openDetail(eff) {
    $("#d-name").textContent = eff.name;
    $("#d-note").textContent = eff.note;
    $("#d-path").textContent = eff.file;
    const link = $("#d-link");
    link.href = REPO + eff.file.split("/").map(encodeURIComponent).join("/");
    $("#d-code").innerHTML = highlight(SOURCES[eff.file] || "// source not embedded");
    $("#d-src").scrollTop = 0;
    state.eff = eff;
    buildParams(eff);
    const cell = Math.max(5, Math.min(16, Math.floor(Math.min(400, window.innerWidth - 90) / state.size)));
    const it = makeItem(eff, $("#d-canvas"), cell);
    it.visible = true;
    prime(it, state.running ? 45 : 260);
    state.detail = it;
    dlg.showModal();
  }
  dlg.addEventListener("close", function () { state.detail = null; });
  $("#d-close").addEventListener("click", function () { dlg.close(); });
  $("#d-reset").addEventListener("click", function () {
    const eff = state.eff;
    if (!eff) return;
    delete overrides[eff.name];
    saveOverrides();
    buildParams(eff);
    scheduleRebuild(eff);
  });

  // ------------------------------------------------------------ toolbar
  // each matrix size is its own wasm module, so this is asynchronous the
  // first time a size is picked
  function setSize(n) {
    document.querySelectorAll("#sizes button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.n) === n));
    });
    SK.load(n, function () {
      state.size = n;
      $("#stat-panel").textContent = n + "×" + n;
      masks.clear();
      buildWall();
    });
  }


  const playBtn = $("#play");
  function setRunning(on) {
    state.running = on;
    playBtn.textContent = on ? "Pause" : "Play";
    playBtn.setAttribute("aria-pressed", String(!on));
    if (on) last = performance.now();
  }
  playBtn.addEventListener("click", function () { setRunning(!state.running); });

  const ledBtn = $("#led");
  ledBtn.addEventListener("click", function () {
    state.led = !state.led;
    ledBtn.setAttribute("aria-pressed", String(state.led));
    state.items.forEach(paint);
    if (state.detail) paint(state.detail);
  });

  // --------------------------------------------------------------- loop
  let last = performance.now(), acc = 0, drawn = 0, cursor = 0, fps = $("#fps");
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(120, now - last);
    last = now;
    if (document.hidden) return;
    if (state.running) {
      // with every sketch on the page, spend at most ~12ms of the frame on
      // panels and pick up where we left off next time
      let n = 0;
      const items = state.items, len = items.length, t0 = performance.now();
      for (let k = 0; k < len; k++) {
        const it = items[(cursor + k) % len];
        if (!it.visible) continue;
        n += step(it, dt);
        if (performance.now() - t0 > 12) { cursor = (cursor + k + 1) % len; break; }
        if (k === len - 1) cursor = 0;
      }
      if (state.detail) n += step(state.detail, dt);
      drawn += n;
    }
    acc += dt;
    if (acc >= 1000) {
      fps.textContent = state.running
        ? Math.round(drawn / (acc / 1000)) + " panel frames/s"
        : "paused";
      acc = 0; drawn = 0;
    }
  }

  let rt;
  addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(fitAll, 160); });

  SK.load(32, function () {
    DIRS = computeDirs();
    document.querySelectorAll("#sizes button").forEach(function (b) {
      const n = Number(b.dataset.n);
      if (SK.sizes.indexOf(n) < 0) { b.disabled = true; b.title = "no wasm build for this size"; return; }
      b.addEventListener("click", function () { setSize(n); });
    });
    $("#stat-count").textContent = EFFECTS.length;
    $("#stat-folders").textContent = DIRS.length;
    buildDirs();
    setSize(32);
    setRunning(state.running);
    requestAnimationFrame(tick);
    document.body.dataset.ready = "1";
  });
})();
