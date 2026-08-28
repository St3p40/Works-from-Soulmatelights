# The compiled page

`../wasm.html` runs the sketches themselves - the `.cpp` files in this
repository, compiled to WebAssembly against FastLED 3.6.0. There is no port to
keep in step, so editing a sketch and rebuilding is the whole workflow.

    source ~/emsdk/emsdk_env.sh
    sh docs/wasm/build.sh

Needs emsdk. FastLED is cloned into `docs/wasm/fastled` on the first run.

## How 90-odd sketches fit in one module

They all define `draw()`, most define `t`, `speed` and `loadingFlag`, and two
of them define `speed` as different `#define`s. So each sketch gets its own
translation unit wrapped in its own namespace:

    namespace sk042 {
    #include "../../Radial Effects/Lotus.cpp"
    }

A separate TU keeps the `#define`s to itself; the namespace keeps the globals
to itself. The sketches are not modified.

FastLED's platform layer is skipped entirely - `lib8tion`, `noise`,
`colorutils`, `colorpalettes` and `hsv2rgb` are platform independent, and the
AVR assembly in them is already behind `__AVR__` guards. `fl_host.h` claims
`FastLED.h` and `led_sysdefs.h` are already included and supplies the handful
of macros they would have set. `soulmate.h` is the rest of the sketch
environment: `leds`, `XY()`, `millis`, `random`, `map`, `PROGMEM`.

## Settings

`gen.py` promotes a sketch's numeric `#define`s, its file-scope constants and
its function-local `static`s to variables, so the page can move them. Each one
is tried and reverted on its own: a `#define` used as an array bound stays a
`#define` and simply does not appear in the panel. Only names the sketch never
assigns to are considered, so counters and accumulators are left alone.

Reading and writing goes through `decltype` accessors generated inside each
namespace, so a knob that is a `byte` in one sketch and a `float` in another
needs no type bookkeeping.

Display names, notes and the hand-picked slider ranges live in `../labels.js`.
`mklabels.py` seeds them from `effects.js` while that still exists and
preserves anything already there, so edit `labels.js` freely.

## One module per matrix size

28 sketches size arrays from `LED_COLS`, so it has to be a compile-time
constant. `build.sh` therefore builds 16, 24, 32, 48, 64 and 128, each about
180 KB with the wasm inlined as base64 - which is what keeps `file://` working.
The page fetches a size the first time it is chosen.

## What is not in the build

Eight sketches are excluded. All of them need a one-line fix:

| sketch | problem |
|---|---|
| `ownVerOFTixyLand.cpp` | declares a variable in a `switch` case without braces |
| `Spiro.cpp`, `Drift.cpp` | `draw()` with no return type - needs `void` |
| `Puzzles.cpp` | `const int PCols = round(...)` is not constexpr, so `puzzle[PCols][PRows]` is a variable length array at file scope |
| `Holiday lights.cpp` | passes `leds` to `RGBweight(const CRGB&, ...)`; means `leds[idx]` |
| `Little animation image decoder.cpp` | assigns a `const byte*` to a `byte*` |
| `Minesweeper.cpp` | `while (leds[XY(...)])` looks for an unlit cell and never finds one once the board fills - loops forever |
| `Flags.cpp` | loops forever |

The first six are portability problems that `avr-g++` also rejects or only
tolerates under `-fpermissive`. The last two are genuine hangs.

`Torch.cpp` builds and runs but draws nothing in 30 frames; it may just need a
longer warm-up.
