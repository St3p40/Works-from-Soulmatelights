# Soulmate Sketchbook — the demo page

`index.html` runs every sketch in this repository in the browser, on a JS
reimplementation of the FastLED calls the sketches use. Open it directly
(double-click works) or serve the folder; on GitHub Pages, set the source to
`main` → `/docs`.

    index.html        page markup
    style.css         styling
    fastled.js        the FastLED shim: inoise8/16, sin8/16, beat*, CHSV,
                      ColorFromPalette, blur2d, nblend, the LED matrix class
    effects.js        one entry per sketch - the actual ports
    sources.js        generated: the .cpp text shown in the detail view
    app.js            the page: grid, directory filter, canvas rendering
    build_sources.py  regenerates sources.js from the .cpp files

## Adding a sketch

1. Commit the `.cpp` as usual, anywhere in the repository.

2. Add an entry to `effects.js`, before `return E;`:

   ```js
   add({ name: "Nice name", file: "Testing stuff/Nice name.cpp",
     note: "One line about what it does", ms: 16,
     params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 8 },
              { k: "sub", label: "Sub-pixel", def: 1, opts: ["Off", "On"] }],
     init(s, m) { s.t = 0; },              // optional; the sketch's setup
     draw(s, m) {                          // the sketch's draw()
       m.fade(32);
       m.set(x, y, CHSV(hue, 255, s.opt.speed));
     } });
   ```

   * `file` must be the path from the repository root - it decides which
     directory tab the panel appears under, and where "View on GitHub" points.
     A directory that isn't in `DIR_ORDER` in `app.js` still works; it is
     appended to the end of the row. Reorder that list to place it.
   * `ms` is the sketch's `delay()`, i.e. how many milliseconds one frame
     covers. It drives the virtual `millis()`, so timing matches the panel.
   * `params` is optional, and is where the sketch's own `#define`s and
     tuning globals go - see "Settings" below.
   * `s` is per-panel state (your globals and `static`s live here, plus
     `s.ms` = millis() and `s.rnd` = random()). `m` is the matrix.
   * Useful matrix calls: `m.set/add/sub/nbl(x, y, c)`, `m.wu(x, y, c)` for
     sub-pixel, `m.seti/geti(i, c)` for strip order, `m.fade(n)`,
     `m.blur2d(n)`, `m.clear()`, `m.W`, `m.H`, `m.N`.
   * Keep the C++ integer widths: `u8()`, `i8()`, `u16()`, `i16()`, `u32()`
     wrap the way `byte`, `int8_t`, `uint16_t`, `int16_t`, `uint32_t` do.

3. Regenerate the embedded sources:

       python3 docs/build_sources.py docs

   It reads the `file:` entries in `effects.js` and pulls in exactly those.
   It also lists any `.cpp` in the repository that no sketch entry points at,
   so you can see what is not on the page yet.

Refresh the page - the sketch count, the folder row and the grid all come from
`effects.js`, so there is nothing else to update.

## Settings

A sketch that has knobs in its `.cpp` - a `#define Speed 240`, a
`static byte scale = 8` - can expose them. Declare them in `params` and read
them from `s.opt` instead of writing the number into the port:

    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 240 },
             { k: "regime", label: "Regime", def: 1, opts: ["Small", "Big"] }],

* `k` is the key on `s.opt`, `def` is the value the `.cpp` ships with. Keep
  `def` equal to the source, so an untouched panel matches the sketch.
* `min`/`max` (with an optional `step`, which may be fractional) make a
  slider. `opts` instead makes a dropdown, and the value is the index - use
  it for a `#define` that picks a mode rather than a magnitude.
* Only expose what the sketch actually reads. If a `#define` selects a code
  path the port does not have, leave it out rather than fake it.

The panel appears under the canvas in the detail view. Changing anything
restarts that sketch on both the detail canvas and its card in the wall,
since some settings are only read in `init()`. Edits are stored per sketch in
`localStorage` and survive a reload; a card running edited settings gets a dot
next to its name, and **Reset** puts it back to the `.cpp` values.

## Moving or renaming a sketch

Move the file, then re-run:

    python3 docs/build_sources.py docs

Any path in `effects.js` that no longer exists is looked up by filename and
rewritten to wherever the file went, so moving a folder full of sketches needs
no hand-editing. If two files share a name it stops and says so, and if a file
is gone entirely it prints `MISSING:` and leaves the entry alone.

## Drift

`effects.js` is a hand port, so editing a `.cpp` changes only the source text
shown beside the canvas - not what the canvas animates. Nothing about the page
looks wrong when the two disagree, which is the reason to check for it.

`build_sources.py` keeps the hash of every `.cpp` in `ported.json` and reports
any that changed since its port was last confirmed:

    DRIFT:  Testing stuff/Worley Noise.cpp changed since its port was confirmed

It exits non-zero when anything has drifted, so it works as a pre-commit hook.
Once you have ported the change by hand, confirm it:

    python3 docs/build_sources.py docs --ported "Testing stuff/Worley Noise.cpp"
    python3 docs/build_sources.py docs --ported all

Confirming records the hash; it does not check the port, since only you know
whether the JS matches. Moving or renaming a file carries its hash across, so a
move is never reported as a change. `ported.json` belongs in the repository.

## Removing a sketch

Delete its `add({ ... })` entry from `effects.js`, then re-run `build_sources.py`.
