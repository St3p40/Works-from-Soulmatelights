"""Emit registry.cpp (the C side) and meta.js (what the page reads)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
reg = [r for r in json.load(open(os.path.join(HERE, "registry.json"))) if r["ok"]]

decl, rows, ptbl = [], [], []
for r in reg:
    ns = r["ns"]
    decl.append("namespace %s { void draw();%s }" % (
        ns, " double __pget(int); void __pset(int, double);" if r["params"] else ""))
    if r["params"]:
        rows.append('{ "%s", %s::draw, %s::__pget, %s::__pset, %d }'
                    % (r["file"].replace('"', '\\"'), ns, ns, ns, len(r["params"])))
    else:
        rows.append('{ "%s", %s::draw, nullptr, nullptr, 0 }'
                    % (r["file"].replace('"', '\\"'), ns))

open(os.path.join(HERE, "registry.cpp"), "w").write('''#include "soulmate.h"
#include <emscripten/emscripten.h>

void advance_frame(uint32_t);
void reset_clock();
void set_millis(uint32_t);
uint32_t get_seed();
void set_seed(uint32_t);
%s

struct Sketch {
  const char* file;
  void (*draw)();
  double (*pget)(int);
  void (*pset)(int, double);
  int nparams;
};
static const Sketch SKETCHES[] = {
  %s
};
static const int N = sizeof(SKETCHES) / sizeof(SKETCHES[0]);

extern "C" {
EMSCRIPTEN_KEEPALIVE int sk_count() { return N; }
EMSCRIPTEN_KEEPALIVE int sk_cols() { return LED_COLS; }
EMSCRIPTEN_KEEPALIVE int sk_rows() { return LED_ROWS; }
EMSCRIPTEN_KEEPALIVE uint8_t* sk_leds() { return (uint8_t*)leds; }
EMSCRIPTEN_KEEPALIVE void sk_draw(int i) { if (i >= 0 && i < N) SKETCHES[i].draw(); }
EMSCRIPTEN_KEEPALIVE void sk_advance(uint32_t ms) { advance_frame(ms); }
// every panel keeps its own clock and its own RNG position; the module has one
// of each, so the page swaps them in around each sketch's draw()
EMSCRIPTEN_KEEPALIVE void sk_set_millis(uint32_t ms) { set_millis(ms); }
EMSCRIPTEN_KEEPALIVE uint32_t sk_get_seed() { return get_seed(); }
EMSCRIPTEN_KEEPALIVE void sk_set_seed(uint32_t s) { set_seed(s); }
EMSCRIPTEN_KEEPALIVE void sk_clear() { memset8(leds, 0, NUM_LEDS * sizeof(CRGB)); }
EMSCRIPTEN_KEEPALIVE void sk_reset_clock() { reset_clock(); }
EMSCRIPTEN_KEEPALIVE int sk_param_count(int i) { return SKETCHES[i].nparams; }
EMSCRIPTEN_KEEPALIVE double sk_param_get(int i, int j) {
  return SKETCHES[i].pget ? SKETCHES[i].pget(j) : 0;
}
EMSCRIPTEN_KEEPALIVE void sk_param_set(int i, int j, double v) {
  if (SKETCHES[i].pset) SKETCHES[i].pset(j, v);
}
}
''' % ("\n".join(decl), ",\n  ".join(rows)))

meta = [{"file": r["file"], "params": [{"k": p["k"], "def": p["def"]} for p in r["params"]]}
        for r in reg]
open(os.path.join(HERE, "meta.js"), "w").write(
    "var SKETCH_META = " + json.dumps(meta, ensure_ascii=False, indent=0) + ";\n")
print("registry.cpp + meta.js for %d sketches" % len(reg))
