/* ------------------------------------------------------------------
   Stands in for effects.js + fastled.js. The sketches are now the real
   .cpp compiled to WebAssembly against FastLED itself, so there is no
   port to keep in step with them. This only adapts the module to the
   shape the page already expects.

   LED_COLS has to be a compile-time constant - 28 of the sketches size
   arrays with it - so there is one module per matrix size, fetched the
   first time that size is chosen.
   ------------------------------------------------------------------ */
var FL = null, EFFECTS = null;

var SK = (function () {
  "use strict";
  const loaded = {};                       // size -> initialised module

  function build(M) {
    const W = M._sk_cols(), H = M._sk_rows(), PX = W * H * 3, ledsPtr = M._sk_leds();

    function Matrix(w, h) { this.W = w; this.H = h; this.N = w * h; this.d = new Uint8Array(w * h * 3); }

    FL = {
      Matrix: Matrix, W: W, H: H,
      makeRandom: function (seed) {
        let s = (seed >>> 0) || 1;
        return function () { s = (s * 1103515245 + 12345) >>> 0; return s >>> 8; };
      },
      setMillis: function () {}             // each panel's clock is set inside draw
    };

    // One module holds every sketch's globals and they all write the same
    // leds[]. So each panel keeps its own framebuffer, clock and RNG position,
    // and they are swapped in around that sketch's draw().
    EFFECTS = SKETCH_LABELS.map(function (L, i) {
      return {
        name: L.name, file: L.file, note: L.note, ms: L.ms,
        params: L.params.length ? L.params : undefined,
        init: function (s, m) { s.seed = ((i + 1) * 2654435761) >>> 0 || 1; m.d.fill(0); },
        draw: function (s, m) {
          const p = L.params;
          for (let j = 0; j < p.length; j++) M._sk_param_set(i, j, s.opt[p[j].k]);
          M.HEAPU8.set(m.d, ledsPtr);
          M._sk_set_millis(s.ms >>> 0);
          M._sk_set_seed(s.seed);
          M._sk_draw(i);
          s.seed = M._sk_get_seed() >>> 0;
          m.d.set(M.HEAPU8.subarray(ledsPtr, ledsPtr + PX));
        }
      };
    });
  }

  return {
    sizes: [16, 24, 32, 48, 64, 128],
    load: function (n, done) {
      if (loaded[n]) { build(loaded[n]); done(); return; }
      const factory = window["SketchModule" + n];
      const start = function () {
        window["SketchModule" + n]().then(function (M) { loaded[n] = M; build(M); done(); });
      };
      if (factory) { start(); return; }
      const tag = document.createElement("script");
      tag.src = "sketches" + n + ".js";
      tag.onload = start;
      tag.onerror = function () { console.error("no wasm build for " + n + "x" + n); };
      document.head.appendChild(tag);
    }
  };
})();
