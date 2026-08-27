/* ------------------------------------------------------------------
   effects.js - ports of the sketches.  Each one follows its .cpp line
   for line, including the integer truncation and byte overflow, so it
   looks the same as it does on the panel.
   ------------------------------------------------------------------ */
var EFFECTS = (function () {
  "use strict";
  const { u8, i8, u16, u32, map, constrain, sin8, cos8, sin16, cos16, inoise8, inoise16,
          CHSV, CFP, PAL, C, sqrt16, qadd8, qsub8, scale8, scale8_video, lerp8by8,
          beat8, beat16, beat88, beatsin8, beatsin16, beatsin88, inoise8_raw, avg8,
          ease8InOutApprox, nblendC, addC, subC, radians, rgb } = FL;

  // EVERY_N_MILLISECONDS
  function every(s, key, period) {
    if (!s._e) s._e = {};
    const prev = s._e[key] || 0;
    if (s.ms - prev >= period) { s._e[key] = s.ms; return true; }
    return false;
  }
  // fill_circleF from Blobs.cpp
  function fillCircleF(m, cx, cy, radius, col) {
    const rad = Math.trunc(radius);
    for (let y = -radius; y <= radius; y += Math.abs(y) < rad ? 1 : 0.2)
      for (let x = -radius; x <= radius; x += Math.abs(x) < rad ? 1 : 0.2)
        if (x * x + y * y <= radius * radius) m.wu(cx + x, cy + y, col);
  }
  // fill_circle from Blobs.cpp - the integer path, when SubPixel is off
  function fillCircle(m, cx, cy, radius, col) {
    const r = Math.trunc(radius);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) m.add(Math.trunc(cx) + x, Math.trunc(cy) + y, col);
  }
  // wu_pixel() taking 24.8 fixed point in a uint32 (Wind.cpp)
  function wuPixel32(m, x, y, c) {
    x = u32(x); y = u32(y);
    const xx = x & 255, yy = y & 255, ix = u8(255 - xx), iy = u8(255 - yy);
    const W = (a, b) => u8((a * b + a + b) >> 8);
    const wu = [W(ix, iy), W(xx, iy), W(ix, yy), W(xx, yy)];
    const bx = Math.floor(x / 256), by = Math.floor(y / 256);
    for (let i = 0; i < 4; i++)
      m.add(bx + (i & 1), by + ((i >> 1) & 1),
            [(c[0] * wu[i]) >> 8, (c[1] * wu[i]) >> 8, (c[2] * wu[i]) >> 8]);
  }
  // drawPixelXYF_X from DNA.cpp - antialiased on X only
  function wuX(m, x, y, c) {
    const xx = u8(Math.trunc((x - Math.trunc(x)) * 255)), ix = u8(255 - xx);
    const wu = [ix, xx];
    for (let i = 1; i >= 0; i--)
      m.add(Math.trunc(x + (i & 1)), y,
            [(c[0] * wu[i]) >> 8, (c[1] * wu[i]) >> 8, (c[2] * wu[i]) >> 8]);
  }
  // Bresenham line (Lines.cpp and friends) - int8 error term, as written
  function line(m, x1, y1, x2, y2, color, setEnd) {
    const dX = i8(Math.abs(x2 - x1)), dY = i8(Math.abs(y2 - y1));
    const sX = x1 < x2 ? 1 : -1, sY = y1 < y2 ? 1 : -1;
    let err = i8(dX - dY), guard = 0;
    if (setEnd) m.set(x2, y2, color); else m.add(x2, y2, color);
    while ((x1 !== x2 || y1 !== y2) && guard++ < 1024) {
      m.set(x1, y1, color);
      const e2 = i8(err * 2);
      if (e2 > -dY) { err = i8(err - dY); x1 = u8(x1 + sX); }
      if (e2 < dX) { err = i8(err + dX); y1 = u8(y1 + sY); }
    }
  }
  // ---- Racer.cpp shapes (all bounds-checked before drawing) ----
  function wuB(m, x, y, c) {
    if (x < 0 || y < 0 || x > m.W - 1 || y > m.H - 1) return;
    m.wu(x, y, c);
  }
  function circleF(m, x0, y0, radius, color, step) {
    step = step || 0.25;
    let a = radius, b = 0, err = step - a;
    if (radius <= step * 2) { wuB(m, x0, y0, color); return; }
    let guard = 0;
    while (a >= b && guard++ < 4096) {
      wuB(m, a + x0, b + y0, color); wuB(m, b + x0, a + y0, color);
      wuB(m, -a + x0, b + y0, color); wuB(m, -b + x0, a + y0, color);
      wuB(m, -a + x0, -b + y0, color); wuB(m, -b + x0, -a + y0, color);
      wuB(m, a + x0, -b + y0, color); wuB(m, b + x0, -a + y0, color);
      b += step;
      if (err < 0) err += 2 * b + step;
      else { a -= step; err += 2 * (b - a + step); }
    }
  }
  function lineFB(m, x1, y1, x2, y2, color) {
    const dX = Math.abs(x2 - x1), dY = Math.abs(y2 - y1);
    let error = dX - dY, guard = 0;
    const sX = x1 < x2 ? 0.5 : -0.5, sY = y1 < y2 ? 0.5 : -0.5;
    while ((x1 !== x2 || y1 !== y2) && guard++ < 512) {
      if ((sX > 0 && x1 > x2 + sX) || (sX < 0 && x1 < x2 + sX)) break;
      if ((sY > 0 && y1 > y2 + sY) || (sY < 0 && y1 < y2 + sY)) break;
      wuB(m, x1, y1, color);
      const e2 = error;
      if (e2 > -dY) { error -= dY; x1 += sX; }
      if (e2 < dX) { error += dX; y1 += sY; }
    }
  }
  function starF(m, x, y, biggy, little, points, dangle, color) {
    const r2 = 255 / points;
    for (let i = 0; i < points; i++) {
      lineFB(m, x + little * (sin8(u8(Math.trunc(i * r2 + r2 / 2 - dangle))) - 128) / 128,
                y + little * (cos8(u8(Math.trunc(i * r2 + r2 / 2 - dangle))) - 128) / 128,
                x + biggy * (sin8(u8(Math.trunc(i * r2 - dangle))) - 128) / 128,
                y + biggy * (cos8(u8(Math.trunc(i * r2 - dangle))) - 128) / 128, color);
      lineFB(m, x + little * (sin8(u8(Math.trunc(i * r2 - r2 / 2 - dangle))) - 128) / 128,
                y + little * (cos8(u8(Math.trunc(i * r2 - r2 / 2 - dangle))) - 128) / 128,
                x + biggy * (sin8(u8(Math.trunc(i * r2 - dangle))) - 128) / 128,
                y + biggy * (cos8(u8(Math.trunc(i * r2 - dangle))) - 128) / 128, color);
    }
  }

  // Wandering souls - Run == 2, straight lines that wrap
  function soulsSeed(s, m, from, to, keepPos) {
    for (let i = from; i < to; i++) {
      s.sx[i] = s.rnd(-10, 10);
      s.sy[i] = s.rnd(-10, 10);
      s.sz[i] = s.rnd(3, 25);
      if (!keepPos) {
        s.px[i] = s.rnd(0, m.W * 10);
        s.py[i] = s.rnd(0, m.H * 10);
        s.col[i] = s.rnd(0, 9) * 28;
      }
    }
  }

  // Crgb332() from the sprite decoder
  function rgb332(a) {
    let r = a & 0xe0; r |= (r >> 3); r |= (r >> 3);
    let g = a & 0x1c; g = u8(g | (g << 3) | (r >> 3));
    let b = a & 0x03; b |= b << 2; b |= b << 4;
    return [u8(r), g, u8(b)];
  }
  var SPRITE = null;
  const SPRITE_B64 = "EBAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAACRJAAAAAAAAAAAAAAAABCQlJAAAAAAAAAAAAAAAJCQEAQAAAAQAAAAAAAAAJCgBAQEAAAAkJAAAAAAAACQEAAAAAAAgjW0kAAAAAAAkBAEBAAAAjbGNSAAAAAAAACgFAQAAAI2NaCQAAAAAACBMKAUBAAAkJCQAAAAAAAAAKCgoJAAAAAAAAAAAAAAAACRtTGwkAAAAAAAAAAAAAAAAREgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkJCQAAAAAAAAAAAAAACQkICQkAAAAAAAAAAAAACRsKCQkAAAAAAAAAAAAAACNjSgoAAAAAAAAAAAAAAAAjW0oAAAAAAAAJAAAAAAAAEgkBAAAAAAAACQAAAAAAAABJAUAAAAAAAAAAAAAAAAAAQEFTEgkAAAAAAAAAAAAAAEBJSgoKCgkAAAAAAAAAAAAAQFIKCgoJAAAAAAAAAAAAAAAJW0oJAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJCgkAAAAAAAAAAAAAAAAJCQkAAAAAAAAAAAAAAAAACRIKAQEAAAAAAAAAAAAAABtjWgoJAAAAAAAAAAAAAABbbFtKCQAAAAAAAAAAAABAQFtbQAAAAAAAAAAAAAAAQEBACQkAAAAAAAAAAAAAAEBAQEAAAQkJAAAAAAAAAABAQEBAQAkJAAAAAAAAAAAAAEBAQAAACQAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACRJJAAAAAAAAAAAAAAAAAQkJAQAAAAAAAAAAAAAAAAAAAAkKAQAAAAAAAAAAAAAAAAASGgkAAAAAAAAAAAAAAAAACRtSAAAAAAAAAAAAQEAAAAAJEQkAAAAAAAAAAEBAQAAAAAAAAAAAAAAAAABAQEBAAAAAAAAAAAAAAAAAAEBAQAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoSSQAAAAAAAAAAAAAACQkJAAkAAAAAAAAAAAAACQBAQAAAAAAAAAAAAAAAAAAAQEAAAAAACQAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAAEBAQAAAAAAAAAAAAAAAAABAQEAAAAAAAAAAAAAAAAAAQEBAQAAAAAAAAAAAAAAAAQBAQEAAAAAAAAAAAAAAAAkAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJEkkAAAAAAAAAAAAAAAkJCQkAAAAAAAAAAAAAACNaCQBAAAAAAAAAAAAAAAkbAUEAQAAAAAAAAAAAAAAKCgAAAAAAAAAAAAAAAAAACQBAQAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAAAAAAAABAABAQAAAAAAAAAAAAAAAAABBQQAAAAAAAAAAAAAAAAARI1JAAAAAAAAAAAAAAAAAABojSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkJAAAAAAAAAAAAAAAJCQkJCQAAAAAAAAAAAAAjY2NSCQEAAAAAAAAAAAAbdbWsWwkBAAAAAAAAAAAAI2xbEwoAAAAAAAAAAAAAABJbWwoBAAAAAAAAAAAAAAABAVMASQAAAAAAAAAAAAAAAABBQQEAAAAAAAAAAAAAAAAAQUEAAAAAAAAAAAAAAAAAAABAAAkJAQAAAAAAAAAAAAAAACNjY0kAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJCQAAAAAAAAAAAAAACQkJCQEAAAAAAAAAAAAACSxjWxoSCQAAAAAAAAAAGjW9rHWsbFIAAAAAAAAAACx+vqxsY1IKAAAAAAAAAAAkbWRkW1sKCQAAAAAAAAAAI0FSY0FTEgAAAAAAAAAAAAgAQEFASQkAAAAAAAAAAAAAAEBAQAkJCQAAAAAAAAAAAAAAQEAAAAAJCQAAAAAAAAAAAAAAAAAREQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQkAAAAAAAAAAAAAAAEJCQkBAAAAAAAAAAAAAAkKEhtbUhIJCQAAAAAAABtsW2RsbGNjWgkAAAAAAAA1v/6+tbWjY1IJAAAAAAAANb/+v/WkbFsKCQAAAAAAABMtbXWkQBoSAAkAAAAAAAAJEyxsQAAJCQAAAAAAAAAAABIjQUAAAAAAAAAAAAAAAAASGgFAQAAAAAAAAAAAAAAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQkAAAAAAAAAAAAAAAAAAQkJAQAAAAAAAAAAAAAAAQoKCgoSEQkAAAAAAAAACSNSSRJaG1tJAAAAAAAACTW/vrWsdaxjUgkAAAAAABt//////rW1m0kJAAAAAAAJLX+//76sdVJAAAAAAAAAAAlbUxsbIyNAAAAAAAAAAAAAAFIKGyNRAAAAAAAAAAAAAABSUhIJAAAAAAAAAAAAAAAAEmNSCQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

  // Patterns.cpp - 38 ten-by-ten tiles of palette indices
  const PATTERNS = "7777777777777777777777777777777777777777773337773773333373373033333377333333333773333373377733377737666667777776666677777766666777777666667777776666677777766666777766666777766666777766666777766666777766666555666666656656666665666666666566666666656666665555666665555566666655566666666666666666666566666666777666666777776666777777766777777777777777777767777777776677777776666777776666667776666666676666666666666666116661166111161111611111111161111111116611111116661111111666611111666666111666666661666666665566666556666556656655665666666666665656556565565655656566666666666566556656655666655666665566666667777776666677776666666776667766666666777666666777776666777776666667776666666666666776666666777766666666666666444446666441414466644444446664444444666414441466644111446666444446666666666666666666666660777770666607770666666070666666660666600666666607706666607777066607777770607777777707777007777777066666667777766666677777666666777776666667777766666667777666666677776666666777766666667777666666677776677766777666766667666666666666666666666666666666667666776667776777767777777777777777777777777777777767777777777677777776766777776677666666677776666677777766677777777677777777676777776677766666777777761555005551511055011555015510555051551505055511555005551155505051551505550155105551105501151555005551777777777677777777677777777666677777666666777676666667677766666677777666677777777677777777677777777766666555556666655555666665555566666555556666655555555556666655555666665555566666555556666655555666660666666660706666660777066660777770660777777700777777770077777770660777770666607770666666070666666660666665555565556577756565657575655565777566666555555555566666577756555657575656565777565556555556666600000000000066666000555555555006556556000666666600060666060006600066000066666000000000000000000000006665555666665666656665660066565660660665560677606556067760655660660665656600665666566665666665555666777777776766666666677677776767766666676776767767677676776767767666666776767777677666666666767777777766767767666676776766777666677766676676667766776677776677667766676676667776666777667677676666767767667766776677776677667766776677666677667766776677667777667766776677667766667766776677667766777766776677666677666667666666766666666666666766766676666666677666666667666766766666666666666766666676666677666600000000000666006660060677606006660066600070000700007000070006660066600606776060066600666000000000007667667667677677677667666666767667667667676666667667666666767667667667676666667667767767767667667667666666666665555555566566666656656555565665656656566565665656656555565665666666566555555556666666666600b0000b000b000000b0b000bb000b000b00b00000b0000b0000b0000b00000b00b000b000bb000b0b000000b000b0000b0090090090090000990000000099000090090090090990000990099000099090090090090000990000000099000090090090090770000770777077077777707707770007777000077700777007770077700007777000777077077777707707770770000770777666677776666666677677667767667777776666676676666667667666667777776676776677677666666667777666677777667766777766776677666666666666666666667766776677776677667766666666666666666666776677667777667766777766776677766677666766767767666666776666777766777777776677776666776666667677676676667766677766776677777777777776766667677777777777767666676776767767677676776767767666676777777777777676666767777777777767666666767677777767676666667667677776766767667676676766767667677776766766666676767777776767666666766666666676677777767667666676766767767676676766767667676676766767777676676666667667777777766666666666766766766767666666766676666766766766766766667766666666776666766766766766766667666766666676766766766777756657777075665707777566577755556655556666556666666655666655556655557775665777707566570777756657777666776667676766767666766667666766776676766766766776676676676766776676667666676667676676767666776667";
  function patternPalette(s) {
    return [CHSV(0, 0, 0), CHSV(0, 255, 255), CHSV(96, 255, 255), CHSV(160, 255, 255),
            CHSV(64, 255, 255), CHSV(0, 0, 220), CHSV(s.h6, 255, 255), CHSV(s.h7, 255, 255),
            CHSV(32, 255, 255), CHSV(224, 255, 255), CHSV(192, 255, 255), CHSV(128, 255, 255)];
  }

  // Flags.cpp - one function per flag, all reading the same noise wave
  const FLAGS = [
    // Ukraine
    (i, j, v, mx, W, H) => j < mx ? CHSV(50, 255, v) : CHSV(150, 255, v),
    // UK
    (i, j, v, mx, W, H) => {
      const d = j + mx - (((H * 2 - W) / 2) | 0);
      const off = i > ((W / 2) | 0) + 1 || i < ((W / 2) | 0) - 2;
      if ((off && i - d > -2 && i - d < 2) || (off && W - 1 - i - d > -2 && W - 1 - i - d < 2) ||
          ((W / 2 | 0) - i === 0) || ((W / 2 | 0) - 1 - i === 0) ||
          (H - (j + mx) === 0) || (H - 1 - (j + mx) === 0)) return CHSV(0, 255, v);
      if ((i - d > -4 && i - d < 4) || (W - 1 - i - d > -4 && W - 1 - i - d < 4) ||
          ((W / 2 | 0) + 1 - i === 0) || ((W / 2 | 0) - 2 - i === 0) ||
          (H + 1 - (j + mx) === 0) || (H - 2 - (j + mx) === 0)) return CHSV(0, 0, v);
      return CHSV(150, 255, v);
    },
    // Germany
    (i, j, v, mx, W, H) => j < mx - ((H / 4) | 0) ? CHSV(68, 255, v)
                         : j < mx + ((H / 4) | 0) ? CHSV(0, 255, v) : CHSV(0, 0, Math.trunc(v / 2.5)),
    // Poland
    (i, j, v, mx, W, H) => j < mx + 1 ? CHSV(248, 214, Math.trunc(v * 0.83)) : CHSV(25, 3, Math.trunc(v * 0.91)),
    // Belarus
    (i, j, v, mx, W, H) => j < mx - ((H / 4) | 0) ? CHSV(0, 0, v)
                         : j < mx + ((H / 4) | 0) ? CHSV(0, 224, v) : CHSV(0, 0, v),
    // Italy
    (i, j, v, mx, W, H) => i < (W / 3 | 0) ? CHSV(90, 255, v)
                         : i < W - 1 - (W / 3 | 0) ? CHSV(0, 0, v) : CHSV(0, 255, v),
    // Spain
    (i, j, v, mx, W, H) => j < mx - ((H / 3) | 0) ? CHSV(250, 224, Math.trunc(v * 0.68))
                         : j < mx + ((H / 3) | 0) ? CHSV(64, 255, Math.trunc(v * 0.98))
                         : CHSV(250, 224, Math.trunc(v * 0.68)),
    // France
    (i, j, v, mx, W, H) => i < (W / 3 | 0) ? CHSV(160, 255, v)
                         : i < W - 1 - (W / 3 | 0) ? CHSV(0, 0, v) : CHSV(0, 255, v),
    // USA
    (i, j, v, mx, W, H) => (i <= (W / 2 | 0) && j + mx > H - 1 + ((H / 16) | 0))
      ? ((i % 2 && ((j - ((H / 16) | 0) + mx) % 2)) ? CHSV(160, 0, v) : CHSV(160, 255, v))
      : (((j + 1 + mx) % 6 < 3) ? CHSV(0, 0, v) : CHSV(0, 255, v))
  ];

  // 2048.cpp
  function newTile(s, GC, GR) {
    for (let guard = 0; guard < 1024; guard++) {
      const k = s.rnd() % GR, l = s.rnd() % GC;
      if (s.grid[k][l] === 0) {
        s.grid[k][l] = (2 * ((s.rnd() % 10) + 1)) < 5 ? 4 : 2;
        return;
      }
    }
  }
  function rot2048(s, GC, GR) {
    const t = [];
    for (let i = 0; i < GC; i++) t.push(new Int32Array(GR));
    for (let i = 0; i < GC; i++) for (let j = 0; j < GR; j++) t[j][i] = s.grid[i][j];
    s.grid = t;
  }
  function pairs2048(s, GC, GR) {
    for (let x = 0; x < GC; x++) for (let y = 0; y < GR - 1; y++)
      if (s.grid[x][y] === s.grid[x][y + 1]) return true;
    return false;
  }
  function full2048(s, GC, GR) {
    for (let i = 0; i < GC; i++) for (let j = 0; j < GR; j++) if (!s.grid[i][j]) return false;
    return true;
  }
  function gameEnded(s, GC, GR) {
    if (!full2048(s, GC, GR)) return false;
    if (pairs2048(s, GC, GR)) return false;
    rot2048(s, GC, GR);
    if (pairs2048(s, GC, GR)) return false;
    rot2048(s, GC, GR); rot2048(s, GC, GR); rot2048(s, GC, GR);
    return true;
  }
  function moveTiles(s, dir, GC, GR) {
    s.moved = false;
    const up = () => {
      for (let k = 0; k < GR; k++) {
        let tmp = -1, j = 0;
        for (let i = 0; i < GC; i++) {
          if (s.grid[i][k] !== 0) {
            if (tmp === -1) tmp = s.grid[i][k];
            else if (tmp && s.grid[i][k] === tmp) { s.grid[j][k] = tmp + tmp; tmp = -1; j++; s.moved = true; }
            else { s.grid[j][k] = tmp; tmp = s.grid[i][k]; j++; }
          }
        }
        if (tmp !== -1) { s.grid[j][k] = tmp; j++; }
        while (j < GC) { if (s.grid[j][k]) { s.grid[j][k] = 0; s.moved = true; } j++; }
      }
    };
    const down = () => {
      for (let k = 0; k < GR; k++) {
        let tmp = -1, j = GC - 1;
        for (let i = GC - 1; i >= 0; i--) {
          if (s.grid[i][k] !== 0) {
            if (tmp === -1) tmp = s.grid[i][k];
            else if (tmp && s.grid[i][k] === tmp) { s.grid[j][k] = tmp + tmp; tmp = -1; j--; s.moved = true; }
            else { s.grid[j][k] = tmp; tmp = s.grid[i][k]; j--; }
          }
        }
        if (tmp !== -1) { s.grid[j][k] = tmp; j--; }
        while (j >= 0) { if (s.grid[j][k]) { s.grid[j][k] = 0; s.moved = true; } j--; }
      }
    };
    if (dir === 0) up();
    else if (dir === 1) down();
    else if (dir === 2) { rot2048(s, GC, GR); up(); rot2048(s, GC, GR); }
    else { rot2048(s, GC, GR); down(); rot2048(s, GC, GR); }
    newTile(s, GC, GR);
    return s.moved;
  }

  // Minesweeper plays out across many FastLED.show() calls; each yield is one frame
  function* minesweeper(s, m) {
    const W = m.W, H = m.H;
    const minesAm = Math.trunc(m.N / 100 * 12);
    const COL = [[32, 32, 32], [0, 0, 255], [0, 128, 0], [255, 0, 0], [0, 0, 128],
                 [128, 0, 0], [0, 128, 128], [0, 0, 32], [128, 128, 128]];
    const lit = (x, y) => { const c = m.get(x, y); return c[0] || c[1] || c[2]; };
    function* animate(x, y, clr, spd) {
      const temp = m.get(x, y);
      for (let i = 0; i < 256; i += spd) { m.set(x, y, nblendC(temp.slice(), clr, i)); yield; }
    }
    for (;;) {
      m.clear();
      const mine = [];
      for (let i = 0; i < minesAm; i++) mine.push({ x: s.rnd() % W, y: s.rnd() % H });
      let over = false;
      do {
        let cx = s.rnd() % W, cy = s.rnd() % H, guard = 0;
        while (lit(cx, cy) && guard++ < 4096) { cx = s.rnd() % W; cy = s.rnd() % H; }
        if (guard >= 4096) { over = true; break; }
        const stack = [[cx, cy]];
        while (stack.length && !over) {
          const [x, y] = stack.pop();
          if (lit(x, y)) continue;
          let neigh = 0, hit = false;
          for (const mn of mine) {
            if (x === mn.x && y === mn.y) { yield* animate(x, y, [255, 255, 255], 16); over = true; hit = true; break; }
            if (Math.abs(x - mn.x) <= 1 && Math.abs(y - mn.y) <= 1) neigh++;
          }
          if (hit) break;
          yield* animate(x, y, COL[Math.min(neigh, 8)], neigh ? 16 : 127);
          if (neigh > 0) continue;
          for (const n of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
            if (n[0] >= 0 && n[1] >= 0 && n[0] < W && n[1] < H) stack.push(n);
        }
      } while (!over);
      for (let j = 0; j < 32; j++) { for (const mn of mine) m.add(mn.x, mn.y, [8, 4, 0]); yield; }
      for (let j = 0; j < 32; j++) { m.blur2d(64); yield; }
    }
  }

  // Puzzles.cpp - the tiles
  function square(m, x1, y1, x2, y2, col) {
    for (let x = x1; x < x2; x++) for (let y = y1; y < y2; y++) {
      if (col === 0) m.set(x, y, [0, 0, 0]);
      else if (x === x1 || x === x2 - 1 || y === y1 || y === y2 - 1)
        m.set(x, y, CFP(PAL.Heat, u8(col - 16)));
      else m.set(x, y, CFP(PAL.Heat, col));
    }
  }
  function wuSquare(m, x1, y1, x2, y2, col) {
    const Lx = x2 - x1, Ly = y2 - y1;
    for (let x = 0; x < Lx; x += 256) for (let y = 0; y < Ly; y += 256) {
      if (col === 0) m.set(x, y, [0, 0, 0]);
      else if (x === 0 || x === Lx - 256 || y === 0 || y === Ly - 256)
        wuPixel32(m, x1 + x, y1 + y, CFP(PAL.Heat, u8(col - 16)));
      else wuPixel32(m, x1 + x, y1 + y, CFP(PAL.Heat, col));
    }
  }

  // Maze.cpp - dig it, then walk it
  function digMaze(s, MW, MH) {
    const at = (x, y) => y * MW + x;
    s.maze[at(1, 1)] = 0;
    const dig = (x, y) => {
      let dir = s.rnd(10) % 4, count = 0;
      while (count < 4) {
        let dx = 0, dy = 0;
        if (dir === 0) dx = 1; else if (dir === 1) dy = 1; else if (dir === 2) dx = -1; else dy = -1;
        const x1 = x + dx, y1 = y + dy, x2 = x1 + dx, y2 = y1 + dy;
        if (x2 > 0 && x2 < MW && y2 > 0 && y2 < MH && s.maze[at(x1, y1)] && s.maze[at(x2, y2)]) {
          s.maze[at(x1, y1)] = 0; s.maze[at(x2, y2)] = 0;
          x = x2; y = y2; dir = s.rnd(10) % 4; count = 0;
        } else { dir = (dir + 1) % 4; count += 1; }
      }
    };
    for (let y = 1; y < MH; y += 2) for (let x = 1; x < MW; x += 2) dig(x, y);
    s.maze[at(0, 1)] = 0;
    s.maze[at(MW - 2, MH - 1)] = 0;
  }
  // drawPixelXYF() from Maze.cpp - bilinear, additive
  function blend4(m, x, y, col) {
    const ax = Math.trunc(x), ay = Math.trunc(y);
    const xsh = u8(Math.trunc((x - ax) * 255)), ysh = u8(Math.trunc((y - ay) * 255));
    const P1 = nblendC(col.slice(), [0, 0, 0], xsh);
    const P2 = nblendC([0, 0, 0], col, xsh);
    m.add(ax, ay, nblendC(P1.slice(), [0, 0, 0], ysh));
    m.add(ax + 1, ay, nblendC(P2.slice(), [0, 0, 0], ysh));
    m.add(ax, ay + 1, nblendC([0, 0, 0], P1, ysh));
    m.add(ax + 1, ay + 1, nblendC([0, 0, 0], P2, ysh));
  }

  // Bombs.cpp - one shell
  function bombReg(s, m, d) {
    d.PosX = s.rnd(0, m.W - 1) << 8;
    d.PosY = m.H * 255;
    d.SpeedY = 0;
    d.SpeedX = (((s.rnd() % 2) * 2) - 1) * s.rnd(128, 255) * ((s.rnd() % 6) ? 1 : 0);
    d.Fade = 1024;
    d.Color = s.rnd(0, 70);
  }
  function bombBoom(s, m, d) {
    const W = m.W, H = m.H;
    const maxX = ((W / 6) | 0) * ((W / 6) | 0), maxY = ((H / 6) | 0) * ((H / 6) | 0);
    for (let i = 0; i < 3; i++) {
      const xo = i ? s.rnd(0, (W / 6) | 0) * (((s.rnd() % 2) * 2) - 1) : 0;
      const yo = i ? s.rnd(0, (H / 6) | 0) * (((s.rnd() % 2) * 2) - 1) : 0;
      for (let x = -((W / 4) | 0); x < (W / 4) | 0; x++)
        for (let y = -((H / 4) | 0); y < (H / 4) | 0; y++)
          m.add(xo + (d.PosX >> 8) + x, yo + (d.PosY >> 8) + y,
                CHSV(50, 120, constrain(map(x * x + y * y, 0, maxX + maxY, 255, 0), 0, 255)));
    }
  }
  function bombPhysics(s, m, d) {
    const SpeedK = 6, DecX = 1, FadeSpK = 16, limiter = 383;
    d.SpeedY -= SpeedK;
    d.SpeedX += d.SpeedX > 0 ? -DecX : DecX;
    if (Math.abs(d.SpeedX) <= DecX) d.SpeedX = 0;
    if (d.PosX < 0 || d.PosX >= (m.W - 1) << 8) d.SpeedX = -d.SpeedX;
    if (d.PosY < 0) d.SpeedY = -d.SpeedY;
    const v = Math.hypot(d.SpeedX, d.SpeedY);
    if (v >= limiter) { d.SpeedX = (d.SpeedX / v) * limiter; d.SpeedY = (d.SpeedY / v) * limiter; }
    d.PosX = i16(Math.trunc(d.PosX + d.SpeedX));
    d.PosY = i16(Math.trunc(d.PosY + d.SpeedY));
    d.Fade = i16(d.Fade - FadeSpK);
    if ((d.SpeedY > 0 && d.SpeedY < 1 && d.PosY < 512) || d.Fade <= 32) {
      if (d.PosY > 10) bombBoom(s, m, d);
      bombReg(s, m, d);
    }
  }
  // wu_pixelY() - antialiased on Y only (Sending.cpp)
  function wuPixel32Y(m, x, y, c) {
    y = u32(y);
    const yy = y & 255, iy = u8(255 - yy), wu = [iy, yy], by = Math.floor(y / 256);
    for (let i = 1; i >= 0; i--)
      m.add(x, by + ((i >> 1) & 1), [(c[0] * wu[i]) >> 8, (c[1] * wu[i]) >> 8, (c[2] * wu[i]) >> 8]);
  }

  // Monster Face draws into one channel at a time
  function lineCh(m, x1, y1, x2, y2, V, ch) {
    x1 = Math.trunc(x1); y1 = Math.trunc(y1); x2 = Math.trunc(x2); y2 = Math.trunc(y2);
    const dX = i8(Math.abs(x2 - x1)), dY = i8(Math.abs(y2 - y1));
    const sX = x1 < x2 ? 1 : -1, sY = y1 < y2 ? 1 : -1;
    let err = i8(dX - dY), guard = 0;
    m.setChannel(x2, y2, ch, V);
    while ((x1 !== x2 || y1 !== y2) && guard++ < 1024) {
      m.setChannel(x1, y1, ch, V);
      const e2 = i8(err * 2);
      if (e2 > -dY) { err = i8(err - dY); x1 = u8(x1 + sX); }
      if (e2 < dX) { err = i8(err + dX); y1 = u8(y1 + sY); }
    }
  }
  function circleCh(m, x0, y0, radius, V, ch) {
    x0 = Math.trunc(x0); y0 = Math.trunc(y0);
    let a = radius, b = 0, err = 1 - a;
    if (radius === 0) { m.setChannel(x0, y0, ch, V); return; }
    while (a >= b) {
      m.setChannel(a + x0, b + y0, ch, V); m.setChannel(b + x0, a + y0, ch, V);
      m.setChannel(-a + x0, b + y0, ch, V); m.setChannel(-b + x0, a + y0, ch, V);
      m.setChannel(-a + x0, -b + y0, ch, V); m.setChannel(-b + x0, -a + y0, ch, V);
      m.setChannel(a + x0, -b + y0, ch, V); m.setChannel(b + x0, -a + y0, ch, V);
      b++;
      if (err < 0) err += 2 * b + 1;
      else { a--; err += 2 * (b - a + 1); }
    }
  }

  // ---- the Particle System folder: one rig, five sets of constants ----
  const fmap = (x, im, iM, om, oM) => (oM - om) * (x - im) / (iM - im) + om;

  function psInit(s, m) {
    const n = s.cfg.n;
    s.px = new Int32Array(n); s.py = new Int32Array(n);
    s.sx = new Float64Array(n); s.sy = new Float64Array(n);
    s.fade = new Float64Array(n);
  }
  function psRegC(s, m, i) {                       // reg() for the int-position variants
    const al = u8(s.rnd());
    s.cfg.spawn(s, m, i);
    s.sx[i] = s.cfg.vx(al);
    s.sy[i] = s.cfg.vy(al);
    s.fade[i] = s.fadeIsClock ? s.ms : 255;        // Lava seeds fade with millis(), as written
  }
  function psPhys(s, m, i) {
    const c = s.cfg;
    if (c.SpeedK) {
      s.sx[i] += (s.grav[0] < s.px[i] ? -1 : 1) * c.SpeedK * c.kx;
      s.sy[i] += (s.grav[1] < s.py[i] ? -1 : 1) * c.SpeedK * c.ky;
    }
    s.fade[i] -= c.fadeStep;
    if (c.satStep) s.sat[i] += c.satStep;
    if (c.DecX && s.sx[i]) {
      s.sx[i] += s.sx[i] > 0 ? -c.DecX : c.DecX;
      if (Math.abs(s.sx[i]) <= c.DecX) s.sx[i] = 0;
    }
    if (c.DecY && s.sy[i]) {
      s.sy[i] += s.sy[i] > 0 ? -c.DecY : c.DecY;
      if (Math.abs(s.sy[i]) <= c.DecY) s.sy[i] = 0;
    }
    const vx = c.clamp ? constrain(s.sx[i], -15, 15) : s.sx[i];
    const vy = c.clamp ? constrain(s.sy[i], -15, 15) : s.sy[i];
    s.px[i] = Math.trunc(s.px[i] + vx);
    s.py[i] = Math.trunc(s.py[i] + vy);
  }
  function psStart(s, m) {
    for (let i = 0; i < s.cfg.n; i++) {
      psRegC(s, m, i);
      for (let a = 0; a < i; a++) {
        if (s.cfg.dead(s, m, a)) psRegC(s, m, a);
        psPhys(s, m, a);
      }
    }
  }
  // the float/attractor variant used by Particle system.cpp
  function psReg(s, i) {
    s.px[i] = s.gen[0]; s.py[i] = s.gen[1];
    s.sx[i] = s.rnd(-15, 15) / 10;
    s.sy[i] = s.rnd(-15, 15) / 10;
    s.fade[i] = 255;
    s.col[i] = u8(s.rnd());
  }
  function psAttract(s, m, i) {
    let fx = s.grav[0] - s.px[i], fy = s.grav[1] - s.py[i];
    let d = Math.hypot(fx, fy);
    fx *= 1 / d; fy *= 1 / d;
    d = constrain(d, 5, m.H * 2);
    const sc = 15 / (d * d);
    s.sx[i] += fx * sc; s.sy[i] += fy * sc;
    s.fade[i] -= 255 / (((m.H + m.W) / 2) | 0);
    let sq = s.sx[i] * s.sx[i] + s.sy[i] * s.sy[i];
    if (sq > 2.25) {
      sq = Math.sqrt(sq);
      s.sx[i] *= (1 / sq) * 1.5; s.sy[i] *= (1 / sq) * 1.5;
    }
    s.px[i] += s.sx[i]; s.py[i] += s.sy[i];
  }
  // Jumping balls keeps its own struct
  function jbReg(s, m, i) {
    s.px[i] = s.gen[0]; s.py[i] = s.gen[1];
    s.sx[i] = s.rnd(-10, 10); s.sy[i] = s.rnd(-10, 10);
    s.fade[i] = 255; s.col[i] = u8(s.rnd());
  }
  function jbPhys(s, m, i) {
    const SpeedK = 0.98, DecX = 0.01;
    s.sy[i] += (0 < s.py[i] ? -SpeedK : SpeedK);   // gravity is Y-only, toward the floor
    s.fade[i] -= 255 / ((m.H + m.W) * 10);
    s.sx[i] += s.sx[i] > 0 ? -DecX : DecX;
    if (Math.abs(s.sx[i]) <= DecX) s.sx[i] = 0;
    if (s.opt.board) {                             // #define Board
      if (s.px[i] < 0 || s.px[i] >= m.W * 10) s.sx[i] = -s.sx[i];
      if (s.py[i] < 0) s.sy[i] = -s.sy[i];
    }
    s.px[i] = i16(Math.trunc(s.px[i] + s.sx[i]));
    s.py[i] = i16(Math.trunc(s.py[i] + s.sy[i]));
  }

  // FillNoise() and MoveFractionalNoise*() from the Soap sketch
  function fillSoapNoise(s, m) {
    const W = m.W, H = m.H;
    for (let i = 0; i < W; i++) {
      const io = s.sx * (i - ((W / 2) | 0));
      for (let j = 0; j < H; j++) {
        const jo = s.sy * (j - ((H / 2) | 0));
        s.n3[j * W + i] = u8(inoise16(u32(s.nx + io), u32(s.ny + jo), s.nz) >> 8);
      }
    }
  }
  function soapSlide(s, m, amplitude, horizontal) {
    const W = m.W, H = m.H;
    const N = horizontal ? W : H, M = horizontal ? H : W;
    const buf = new Uint8Array(N * 3);
    for (let o = 0; o < M; o++) {
      const src = horizontal ? s.n3[o * W + 0] : s.n3[0 * W + o];
      const amount = i16((src - 128) * 2 * amplitude);
      const delta = Math.abs(amount) >> 8, fraction = Math.abs(amount) & 255;
      const ka = ease8InOutApprox(255 - fraction), kb = ease8InOutApprox(fraction);
      for (let i = 0; i < N; i++) {
        const zD = amount < 0 ? i - delta : i + delta;
        const zF = amount < 0 ? zD - 1 : zD + 1;
        const edge = z => horizontal
          ? CHSV(u8(~s.n3[o * W + (Math.abs(z) % W)] * 3), 255, 255)
          : CHSV(u8(~s.n3[(Math.abs(z) % H) * W + o] * 3), 255, 255);
        const A = (zD >= 0 && zD < N) ? (horizontal ? m.get(zD, o) : m.get(o, zD)) : edge(zD);
        const B = (zF >= 0 && zF < N) ? (horizontal ? m.get(zF, o) : m.get(o, zF)) : edge(zF);
        buf[i * 3] = qadd8(scale8(A[0], ka), scale8(B[0], kb));
        buf[i * 3 + 1] = qadd8(scale8(A[1], ka), scale8(B[1], kb));
        buf[i * 3 + 2] = qadd8(scale8(A[2], ka), scale8(B[2], kb));
      }
      for (let i = 0; i < N; i++) {
        const c = [buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]];
        if (horizontal) m.set(i, o, c); else m.set(o, i, c);
      }
    }
  }

  // drawLineF() - float Bresenham that blends col1 into col2 along the way
  function lineF(m, x1, y1, x2, y2, col1, col2) {
    const dX = Math.abs(x2 - x1), dY = Math.abs(y2 - y1);
    let steps = 255 / Math.max(dX, dY);
    if (!isFinite(steps)) steps = 0;
    let error = dX - dY, guard = 0;
    const col = col1.slice();
    const sX = x1 < x2 ? 0.5 : -0.5, sY = y1 < y2 ? 0.5 : -0.5;
    while ((x1 !== x2 || y1 !== y2) && guard++ < 512) {
      if ((sX > 0 && x1 > x2 + sX) || (sX < 0 && x1 < x2 + sX)) break;
      if ((sY > 0 && y1 > y2 + sY) || (sY < 0 && y1 < y2 + sY)) break;
      m.wu(x1, y1, nblendC(col, col2, u8(steps)));
      steps++;
      const e2 = error;
      if (e2 > -dY) { error -= dY; x1 += sX; }
      if (e2 < dX) { error += dX; y1 += sY; }
    }
  }

  const i16 = v => (v << 16) >> 16;

  // midpoint circle from Drop.cpp
  function circle(m, x0, y0, radius, color) {
    let a = radius, b = 0, err = 1 - a;
    if (radius === 0) { m.add(x0, y0, color); return; }
    const px = (x, y) => { if (x >= 0 && x <= m.W - 1 && y >= 0 && y <= m.H - 1) m.add(x, y, color); };
    while (a >= b) {
      px(a + x0, b + y0); px(b + x0, a + y0); px(-a + x0, b + y0); px(-b + x0, a + y0);
      px(-a + x0, -b + y0); px(-b + x0, -a + y0); px(a + x0, -b + y0); px(b + x0, -a + y0);
      b++;
      if (err < 0) err += 2 * b + 1;
      else { a--; err += 2 * (b - a + 1); }
    }
  }

  // MoveX()/MoveY() from Starships - a sub-pixel scroll of the whole panel
  function slide(m, am, horizontal) {
    const amount = (am - 128) * 2;
    const delta = Math.abs(amount) >> 8, fraction = Math.abs(amount) & 255;
    const ka = ease8InOutApprox(255 - fraction), kb = ease8InOutApprox(fraction);
    const N = horizontal ? m.W : m.H, M = horizontal ? m.H : m.W;
    const buf = new Uint8Array(N * 3);
    for (let o = 0; o < M; o++) {
      for (let i = 0; i < N; i++) {
        const zD = amount < 0 ? i - delta : i + delta;
        const zF = amount < 0 ? zD - 1 : zD + 1;
        const A = (zD >= 0 && zD < N) ? (horizontal ? m.get(zD, o) : m.get(o, zD)) : [0, 0, 0];
        const B = (zF >= 0 && zF < N) ? (horizontal ? m.get(zF, o) : m.get(o, zF)) : [0, 0, 0];
        buf[i * 3] = qadd8(scale8(A[0], ka), scale8(B[0], kb));
        buf[i * 3 + 1] = qadd8(scale8(A[1], ka), scale8(B[1], kb));
        buf[i * 3 + 2] = qadd8(scale8(A[2], ka), scale8(B[2], kb));
      }
      for (let i = 0; i < N; i++) {
        const c = [buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]];
        if (horizontal) m.set(i, o, c); else m.set(o, i, c);
      }
    }
  }

  // Sort methods.cpp calls FastLED.show() mid-sort; each of those calls is one frame here
  function sortFrames(s, W, H) {
    const a = new Uint8Array(W);
    for (let x = 0; x < W; x++) a[x] = s.rnd(1, H);
    const out = [];
    const shot = () => out.push(a.slice());
    const swap = (i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
    shot();
    if (s.method === 0) {
      for (let y = 0; y < W - 1; y++) {
        for (let x = 0; x < W - (y + 1); x++) if (a[x] > a[x + 1]) swap(x, x + 1);
        shot();
      }
    } else if (s.method === 1) {
      for (let y = 0; y < W; y++) {
        let mn = 255, mnID = 0;
        for (let x = y; x < W; x++) if (a[x] < mn) { mn = a[x]; mnID = x; }
        swap(y, mnID); shot();
      }
    } else if (s.method === 2) {
      for (let y = 1; y < W; y++) {
        for (let x = y; y > 0; x--) {          // the loop condition is on y, as written
          if (x > 0 && a[x - 1] > a[x]) swap(x, x - 1); else break;
        }
        shot();
      }
    } else {
      const part = (from, to) => {
        for (let y = from; y < to; y++) {
          let mn = 255, mnID = y;
          for (let x = y; x < to; x++) if (a[x] < mn) { mn = a[x]; mnID = x; }
          swap(y, mnID);
        }
      };
      const steps = Math.trunc(Math.log2(W)) + 1;
      for (let st = 0; st < steps; st++) {
        const step2 = u8(Math.pow(2, st + 1));
        for (let ap = 0; ap <= W; ap += step2) { part(ap, constrain(ap + step2, 0, W)); shot(); }
      }
    }
    for (let i = 0; i < 50; i++) shot();       // the delay(500) between methods
    s.method = s.method === 3 ? 0 : s.method + 1;
    return out;
  }

  // bee.aimed() from Crazy bees.cpp
  function aim(s, m, b) {
    b.aimX = s.rnd(0, m.W);
    b.aimY = s.rnd(0, m.H);
    b.hue = s.rnd(0, 256);
    b.deltaX = i8(Math.abs(b.aimX - b.posX));
    b.deltaY = i8(Math.abs(b.aimY - b.posY));
    b.signX = b.posX < b.aimX ? 1 : -1;
    b.signY = b.posY < b.aimY ? 1 : -1;
    b.error = i8(b.deltaX - b.deltaY);
  }
  // the polar lookup table shared by the Radial Effects folder
  function radialMap(m, mapp) {
    const W = m.W, H = m.H, CX = (W / 2) | 0, CY = (H / 2) | 0;
    const ang = new Uint8Array(W * H), rad = new Uint8Array(W * H);
    for (let x = -CX; x < CX + (W % 2); x++)
      for (let y = -CY; y < CY + (H % 2); y++) {
        const i = (x + CX) * H + (y + CY);
        ang[i] = u8(Math.trunc(128 * (Math.atan2(y, x) / Math.PI)));
        rad[i] = u8(Math.trunc(Math.hypot(x, y) * mapp));
      }
    return { ang, rad };
  }

  const E = [];
  const add = o => { E.push(o); return o; };

  // ---------------------------------------------------------------- root
  add({ name: "Fire", file: "Other/Fire.cpp", note: "Perlin flame through the Heat palette", ms: 16,
    params: [{ k: "scale", label: "Scale", min: 1, max: 255, def: 64 },
             { k: "speed", label: "Speed", min: 1, max: 255, def: 92 }],
    init(s) { s.t = 0; },
    draw(s, m) {
      const scale = s.opt.scale, speed = s.opt.speed, step = (255 / m.H) | 0;
      s.t = u32(s.t + speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        let Bri = inoise8(x * scale, y * scale - s.t) - y * step;
        const Col = u8(Bri);
        if (Bri < 0) Bri = 0;
        if (Bri !== 0) Bri = Math.trunc(256 - Bri * 0.2);
        m.nbl(x, y, CFP(PAL.Heat, Col, Bri), speed);
      }
    } });

  add({ name: "Wave", file: "Other/Wave.cpp", note: "Noise bars, mirrored and blurred", ms: 16,
    draw(s, m) {
      m.clear();
      const t = Math.floor(s.ms / 2);
      for (let i = 0; i < m.W; i++) {
        const thisVal = inoise8(i * 45, t, t);
        const thisMax = map(thisVal, 0, 255, 0, m.H);
        for (let j = 0; j < thisMax; j++) {
          const c = CFP(PAL.Rainbow, map(j, 0, thisMax, 250, 0));
          m.add(i, j, c);
          m.add(m.W - 1 - i, m.H - 1 - j, c);
        }
      }
      m.blur2d(64);
    } });

  add({ name: "Plasm ball", file: "Other/Plasm ball.cpp", note: "Two noise fields folded into a cage", ms: 16,
    draw(s, m) {
      m.fade(16);
      const W = m.W, H = m.H, half = (W / 2) | 0;
      const t = Math.floor(s.ms / 16), hue = beat8(5);
      for (let i = 0; i < W; i++) {
        const thisVal = inoise8(i * 30, t, t);
        const thisMax = map(thisVal, 0, 255, 0, W);
        for (let j = 0; j < H; j++) {
          const thisVal_ = inoise8(t, j * 30, t);
          const thisMax_ = map(thisVal_, 0, 255, 0, H);
          const x = u8(i + thisMax_ - half), y = u8(j + thisMax - half);
          const cx = u8(i + thisMax_), cy = u8(j + thisMax);
          const on = (x - y > -2 && x - y < 2) || (W - 1 - x - y > -2 && W - 1 - x - y < 2) ||
                     (W - cx === 0) || (W - 1 - cx === 0) || (H - cy === 0) || (H - 1 - cy === 0);
          if (on) m.add(i, j, CHSV(hue, thisVal_, thisVal));
        }
      }
      m.blur2d(16);
    } });

  add({ name: "Lost lands", file: "Other/Lost lands.cpp", note: "Cloud palette minus a noise mask", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H, t = u16(Math.floor(s.ms / 10)), k = ((255 / W) | 0) * 2;
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        const bri = u8(255 - Math.abs(x - ((W / 2) | 0)) * k);
        m.set(x, y, subC(CFP(PAL.Cloud, inoise8(x * 100, y * 10 - t, (t / 2) | 0), bri),
                         CHSV(0, 0, inoise8(x * 50, y * 50, t))));
      }
    } });

  add({ name: "Blobs", file: "Other/Blobs.cpp", note: "Breathing metaball-ish balls, sub-pixel drawn", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 255 },
             { k: "am", label: "Amount", min: 1, max: 255, def: 64 },
             { k: "regime", label: "Regime", def: 1, opts: ["Small", "Big"] },
             { k: "sub", label: "Sub-pixel", def: 1, opts: ["Off", "On"] }],
    init(s, m) {
      const r = s.rnd, W = m.W, H = m.H, div = 257 - s.opt.speed;
      s.amount = map(s.opt.am, 1, 255, 1, W);
      s.ball = []; s.radius = []; s.rrad = []; s.color = [];
      for (let i = 0; i < s.amount; i++) {
        s.radius[i] = s.opt.regime ? Math.trunc(r(1, 40) / 10) : 1;
        const sy = r(5, 11) / div / 4, sx = r(5, 11) / div / 4;
        s.ball[i] = [r(0, W), r(0, H), sy, sx];
        s.color[i] = r(0, 255);
        s.rrad[i] = false;
      }
    },
    draw(s, m) {
      m.fade(20);
      const W = m.W, H = m.H, r = s.rnd, div = 257 - s.opt.speed;
      for (let i = 0; i < s.amount; i++) {
        const b = s.ball[i];
        const d = (Math.abs(b[2]) > Math.abs(b[3]) ? Math.abs(b[2]) : Math.abs(b[3])) * 0.05;
        if (s.rrad[i]) { s.radius[i] += d; if (s.radius[i] >= 4) s.rrad[i] = false; }
        else { s.radius[i] -= d; if (s.radius[i] < 1) { s.rrad[i] = true; s.color[i] = r(0, 255); } }
        const col = CFP(PAL.Rainbow, s.color[i]);
        if (s.opt.sub) {
          if (s.radius[i] > 1) fillCircleF(m, b[1], b[0], s.radius[i], col);
          else m.wu(b[1], b[0], col);
        } else {
          if (s.radius[i] > 1) fillCircle(m, b[1], b[0], s.radius[i], col);
          else m.add(Math.trunc(b[1]), Math.trunc(b[0]), col);
        }
        if (b[0] + s.radius[i] >= H - 1) b[0] += b[2] * ((H - 1 - b[0]) / s.radius[i] + 0.005);
        else if (b[0] - s.radius[i] <= 0) b[0] += b[2] * (b[0] / s.radius[i] + 0.005);
        else b[0] += b[2];
        if (b[1] + s.radius[i] >= W - 1) b[1] += b[3] * ((W - 1 - b[1]) / s.radius[i] + 0.005);
        else if (b[1] - s.radius[i] <= 0) b[1] += b[3] * (b[1] / s.radius[i] + 0.005);
        else b[1] += b[3];
        if (b[0] < 0.01) { b[2] = r(5, 11) / div / 4; b[0] = 0.01; }
        else if (b[0] > H - 1.01) { b[2] = -(r(5, 11) / div / 4); b[0] = H - 1.01; }
        if (b[1] < 0.01) { b[3] = r(5, 11) / div / 4; b[1] = 0.01; }
        else if (b[1] > W - 1.01) { b[3] = -(r(5, 11) / div / 4); b[1] = W - 1.01; }
      }
      m.blur2d(128);
    } });

  add({ name: "Wind", file: "Other/Wind.cpp", note: "Noise-steered motes, wu-pixel trails", ms: 16,
    init(s, m) {
      const r = s.rnd;
      s.pos = []; s.spd = [];
      for (let i = 0; i < m.H; i++) { s.pos[i] = [0, r(0, (m.H - 1) * 10)]; s.spd[i] = r(2, 10); }
      s.col = CHSV(155, 20, 255);
    },
    draw(s, m) {
      m.fade(32);
      for (let i = 0; i < m.H; i++) {
        const p = s.pos[i];
        if (p[0] >= m.W * 10) p[0] = -10;
        p[0] += s.spd[i];
        p[1] += Math.trunc((inoise8(p[0] * 3, s.ms) - 128) / 32);
        wuPixel32(m, p[0] * 25.6, p[1] * 25.6, s.col);
      }
    } });

  add({ name: "SmokeWaves", file: "Other/SmokeWaves.cpp", note: "Embers injected at the base, then shifted up", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 255 },
             { k: "scale", label: "Scale", min: 1, max: 16, def: 8 },
             { k: "clr", label: "Clear base", def: 0, opts: ["Off", "On"] },
             { k: "sub", label: "Sub-pixel", def: 1, opts: ["Off", "On"] }],
    init(s, m) {
      const r = s.rnd, W = m.W;
      s.pos = []; s.sSpeed = []; s.maxMin = []; s.waveColors = []; s.reg = [];
      for (let j = 0; j < W; j++) {
        s.reg[j] = r(0, W * 10);
        s.sSpeed[j] = Math.trunc(r(50, 16 * W) / r(1, 10));
        s.maxMin[j] = u8(r(((W / 4) | 0) * 10, ((W / 2) | 0) * 20));
        s.waveColors[j] = r(0, 9) * 28;
        s.pos[j] = s.reg[j];
      }
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      const speedfactor = (0.2 - 0.02) * (s.opt.speed - 1) / 254 + 0.02;   // fmap()
      for (let x = 0; x < W; x++)
        for (let y = H - 1; y > 0; y = Math.trunc(y - speedfactor)) m.copy(x, y, x, y - 1);
      if (s.opt.clr) for (let i = 0; i < W; i++) m.set(i, 0, [0, 0, 0]);
      m.fade(Math.trunc(speedfactor * 10));
      m.blur2d(20);
      const cnt = map(s.opt.scale, 1, 16, 2, W);
      for (let j = 0; j < cnt; j++) {
        s.waveColors[j] = u8(s.waveColors[j] + 1);
        let pos = beatsin16(u8(Math.trunc(s.sSpeed[j] * (speedfactor * 0.5))), s.reg[j],
                            u16(s.maxMin[j] + s.reg[j]), s.waveColors[j] * 256, s.waveColors[j] * 8);
        if (pos > W * 10) pos = pos - W * 10;
        s.pos[j] = pos;
        if (s.opt.sub) m.wu(pos / 10, 0.05, CFP(PAL.Heat, s.waveColors[j]));
        else m.add(Math.trunc(pos / 10), 0, CFP(PAL.Heat, s.waveColors[j]));
      }
      if (every(s, "recolour", 20000))
        for (let j = 0; j < cnt; j++) s.waveColors[j] = u8(s.waveColors[j] + 28);
    } });

  // ------------------------------------------- Classic Demoeffects
  add({ name: "Starfield", file: "Classic Demoeffects recreations/Starfield.cpp",
    note: "Perspective-divided starfield", ms: 16,
    init(s, m) {
      const n = Math.trunc((m.W + m.H) / 2);
      s.star = [];
      for (let i = 0; i < n; i++) s.star.push({ X: 0, Y: 0, W: 0 });
      for (const st of s.star) { this.run(s, m, st); st.W = s.rnd(m.W * 5); }
    },
    run(s, m, st) {
      st.W -= 5;
      if (st.W < 0) { st.X = s.rnd(m.W * -5, m.W * 5); st.Y = s.rnd(m.H * -5, m.H * 5); st.W = m.W * 5; }
      const SX = m.W * 0.5 + (st.X / st.W) * (m.W / 2);
      const SY = m.H * 0.5 + (st.Y / st.W) * (m.H / 2);
      if (SX > 0 && SX < m.W && SY > 0 && SY < m.H)
        m.wu(SX, SY, CHSV(0, 0, u8(map(st.W, 0, m.W * 5, 255, 100))), 128);
    },
    draw(s, m) { m.fade(32); for (const st of s.star) this.run(s, m, st); } });

  add({ name: "Xor Circles", file: "Classic Demoeffects recreations/Xor Circles.cpp",
    note: "Two distance fields XORed together", ms: 16,
    draw(s, m) {
      const sx = Math.trunc(Math.log2(Math.trunc(64 / m.W))) || 0;
      const sy = Math.trunc(Math.log2(Math.trunc(64 / m.H))) || 0;
      const x1sh = beatsin8(5, 0, m.W), y1sh = beatsin8(6, 0, m.H);
      const x2sh = beatsin8(7, 0, m.W), y2sh = beatsin8(4, 0, m.H);
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
        let cx = i8(x - x1sh), cy = i8(y - y1sh);
        const a = u8(sqrt16(cx * cx + cy * cy) << sx);
        cx = i8(x - x2sh); cy = i8(y - y2sh);
        const v = u8(sqrt16(cx * cx + cy * cy) << sy);
        m.set(x, y, rgb((((a ^ v) >> 4) & 1) * 255));
      }
    } });

  add({ name: "Drift", file: "Classic Demoeffects recreations/Drift.cpp",
    note: "Nested spirals, one dot per radius", ms: 16,
    draw(s, m) {
      m.clear();
      const cx = ((m.W / 2) | 0) - 0.5, cy = ((m.H / 2) | 0) - 0.5;
      const maxDim = Math.max(m.W, m.H), half = (maxDim / 2) | 0;
      const t = Math.floor(s.ms / 20);
      for (let i = 1; i < maxDim / 2; i += 0.5) {
        const angle = radians(t * (half - i));
        m.wu(cx + Math.sin(angle) * i, cy + Math.cos(angle) * i,
             CFP(PAL.Party, u8(Math.trunc(i * 20 + Math.floor(t / 20)))));
      }
    } });

  add({ name: "Checkerboard", file: "Classic Demoeffects recreations/Checkerboard.cpp",
    note: "Four XOR grids sliding over each other", ms: 16,
    draw(s, m) {
      const a = u16(Math.floor(s.ms) >> 4);
      for (let z = 2; z < 6; z++) {
        const Xx = sin8(u8((a >> 2) + (z << 5))) >> 3, Yy = sin8(u8((a >> 1) + (z << 5))) >> 3;
        const col = CHSV(u8(Math.trunc(((z << 8) - 1) / 5)), 255, u8(~((255 / z) | 0)));
        for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
          const on = (Math.trunc((x + Xx) / (z << 1)) % 2) ^ (Math.trunc((y + Yy) / (z << 1)) % 2);
          if (on) m.set(x, y, col);
          else if (z === 2) m.set(x, y, [0, 0, 0]);
        }
      }
    } });

  add({ name: "Amiga Boing!", file: "Classic Demoeffects recreations/Amiga Boing!.cpp",
    note: "The 1984 demo ball, checker and all", ms: 16,
    init(s, m) {
      s.size = (m.W / 8) | 0; s.dir = true; s.shift = 0;
      s.ball = { X: m.W * 5, Y: m.H * 10 - s.size * 10, SX: 5, SY: 2 };
    },
    draw(s, m) {
      m.clear();
      const b = s.ball, size = s.size;
      b.X = Math.trunc(b.X + b.SX); b.Y = Math.trunc(b.Y + b.SY); b.SY -= 0.9;
      if (b.X >= (m.W - size) * 10 || b.X < size * 10) { b.SX = -b.SX; s.dir = !s.dir; }
      if (b.Y < size * 10) b.SY = -b.SY;
      if (every(s, "shift", 250)) s.shift = u8(s.shift + (s.dir ? 1 : -1));
      const cx = Math.trunc(b.X / 10), cy = Math.trunc(b.Y / 10), radius = size;
      for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius)
          m.set(cx + x, cy + y, CHSV(0,
            ((Math.trunc((radius + x + s.shift) / 2) % 2) ^ (Math.trunc((radius + y) / 2) % 2)) * 255,
            u8(map(Math.trunc(Math.sqrt(x * x + y * y)), 0, Math.trunc(radius * 1.5), 255, 64))));
      }
    } });

  // ------------------------------------------------ Radial Effects
  add({ name: "RadialFire", file: "Radial Effects/RadialFire.cpp",
    note: "Fire.cpp rewritten in polar coordinates", ms: 20,
    params: [{ k: "scaleX", label: "Scale X", min: 1, max: 64, def: 16 },
             { k: "scaleY", label: "Scale Y", min: 1, max: 64, def: 1 },
             { k: "speed", label: "Speed", min: 1, max: 64, def: 24 }],
    init(s, m) { s.p = radialMap(m, 1); s.t = 0; },
    draw(s, m) {
      const speed = s.opt.speed, scaleX = s.opt.scaleX, scaleY = s.opt.scaleY, step = (255 / m.H) | 0;
      s.t = u32(s.t + speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        let Bri = inoise8(angle * scaleX, radius * scaleY - s.t) - radius * step;
        const Col = u8(Bri);
        if (Bri < 0) Bri = 0;
        if (Bri !== 0) Bri = Math.trunc(256 - Bri * 0.2);
        m.nbl(x, y, CFP(PAL.Heat, Col, Bri), speed);
      }
    } });

  add({ name: "Rainbow tunnel", file: "Radial Effects/Rainbow tunel.cpp",
    note: "Hue by angle, brightness by radius", ms: 20,
    params: [{ k: "scaleX", label: "Scale X", min: 1, max: 16, def: 4 },
             { k: "scaleY", label: "Scale Y", min: 1, max: 16, def: 4 },
             { k: "speed", label: "Speed", min: 1, max: 16, def: 2 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(u8(angle * s.opt.scaleX - s.t + radius * s.opt.scaleY), 255,
                         constrain(radius * 2, 0, 255)));
      }
    } });

  add({ name: "Hypnosis", file: "Radial Effects/Hypnosis.cpp",
    note: "Striped palette pulled through a spiral", ms: 16,
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + 4);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CFP(PAL.RainbowStripe, u8(((s.t / 2) | 0) + radius + angle),
                        sin8(u8(angle + radius * 2 - s.t))));
      }
    } });

  add({ name: "Lotus", file: "Radial Effects/Lotus.cpp", note: "Five petals from nested sin8", ms: 20,
    params: [{ k: "petals", label: "Petals", min: 1, max: 16, def: 5 },
             { k: "speed", label: "Speed", min: 1, max: 16, def: 2 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      const petals = s.opt.petals;
      s.t = u32(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(248, 181,
          sin8(u8(s.t - radius + Math.trunc(sin8(u8(s.t + angle * petals)) / 5)))));
      }
    } });

  add({ name: "Flower", file: "Radial Effects/Flower.cpp", note: "sin8 folded three deep", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 16, def: 1 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(u8(s.t + radius), 255,
          sin8(u8(sin8(u8(s.t + angle * 5 + radius)) + s.t * 4 + sin8(u8(s.t * 4 - radius)) + angle * 5))));
      }
    } });

  add({ name: "Mariana Trench", file: "Radial Effects/Mariana Trench.cpp",
    note: "Noise sampled along a sin8 radius", ms: 20,
    params: [{ k: "speed", label: "Speed", min: 1, max: 32, def: 8 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(150, 181, inoise8(sin8(u8(radius * 4)) - s.t, angle * 8, s.t)));
      }
    } });

  add({ name: "Octopus", file: "Radial Effects/Octopus.cpp", note: "Three arms chasing the centre", ms: 16,
    params: [{ k: "legs", label: "Legs", min: 1, max: 16, def: 3 },
             { k: "speed", label: "Speed", min: 1, max: 16, def: 3 }],
    init(s, m) { s.p = radialMap(m, (255 / Math.max(m.H, m.W)) | 0); s.t = 0; },
    draw(s, m) {
      const legs = s.opt.legs;
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(u8(((s.t / 2) | 0) - radius), 255,
          sin8(u8(sin8(u8(Math.trunc((angle * 4 - radius) / 4) + s.t)) + radius - s.t * 2 + angle * legs))));
      }
    } });

  // ------------------------------------ Any / Updated / Testing
  add({ name: "Metaballs", file: "Updated existing Effects/Metaballs UPD.cpp",
    note: "Stefan Petrick's isosurfaces, noise-driven", ms: 16,
    params: [{ k: "scale", label: "Scale", min: 1, max: 255, def: 160 },
             { k: "speed", label: "Speed", min: 0.05, max: 2, step: 0.05, def: 0.5 }],
    draw(s, m) {
      const W = m.W, H = m.H, hormap = (256 / W) | 0, vermap = (256 / H) | 0;
      const t = Math.trunc(s.ms * s.opt.speed);
      const x1 = Math.trunc(inoise8(t, 12355, 85) / hormap), y1 = Math.trunc(inoise8(t, 5, 685) / vermap);
      const x2 = Math.trunc(inoise8(t, 25355, 685) / hormap), y2 = Math.trunc(inoise8(t, 355, 11685) / vermap);
      const x3 = Math.trunc(inoise8(t, 55355, 6685) / hormap), y3 = Math.trunc(inoise8(t, 25355, 22685) / vermap);
      const dist = (x0, y0, x1_, y1_) => {
        const dx = u8(Math.abs(x1_ - x0)), dy = u8(Math.abs(y1_ - y0));
        return u8(2 * sqrt16(dx * dx + dy * dy));
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let d = dist(x1, y1, x, y);
        d = u8(d + dist(x2, y2, x, y));
        d = u8(d + dist(x3, y3, x, y));
        const color = u8(Math.trunc(s.opt.scale * 4 / (d === 0 ? 1 : d)));
        m.set(x, y, (color > 0 && color < 60) ? CFP(PAL.Rainbow, u8(color * 9)) : CFP(PAL.Rainbow, 0));
      }
      m.set(x1, y1, [255, 255, 255]); m.set(x2, y2, [255, 255, 255]); m.set(x3, y3, [255, 255, 255]);
    } });

  add({ name: "Swirl", file: "Any recreations/Swirl.cpp", note: "Seven dot pairs smeared by a beating blur", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 240 },
             { k: "dots", label: "Dot pairs", min: 1, max: 16, def: 7 }],
    init(s) { s.koef = 1; },
    draw(s, m) {
      m.fade(8);
      const W = m.W, H = m.H, DotsX2 = s.opt.dots;
      const sx = Math.trunc(256 / ((W / 2) | 0)) - ((W / 16) | 0);
      const cy = Math.trunc(256 / ((H / 2) | 0)) - ((H / 16) | 0);
      const t = Math.floor(s.ms / (256 - s.opt.speed));
      const dot = (x, y, c) => {
        m.add(x, y, c);
        if (W > 24 || H > 24) { m.add(x + 1, y, c); m.add(x - 1, y, c); m.add(x, y + 1, c); m.add(x, y - 1, c); }
      };
      for (let c = 0; c < DotsX2; c++) {
        const xx = Math.trunc(sin8(u8(t + (100 * c) * s.koef)) / sx);
        const yy = Math.trunc(cos8(u8(t + (150 * c) * s.koef)) / cy);
        dot(xx, yy, CHSV(c * ((256 / DotsX2) | 0), 200, 255));
        dot(W - xx - 1, H - yy - 1, CHSV(c * ((256 / DotsX2) | 0), 255, 255));
      }
      const blurAmount = beatsin8(2, 8, 200);
      s.koef += 0.005;
      m.blur2d(blurAmount);
    } });

  add({ name: "DNA", file: "Any recreations/DNA.cpp", note: "Two strands, one row at a time", ms: 16,
    init(s) { s.t = 0; s.flag = true; },
    draw(s, m) {
      m.fade(32);
      const a = 256 / m.W + 1;
      s.t += 10;
      for (let i = 0; i < m.H; i++) {
        const shift = i * 8;
        const sin1 = (1 + Math.sin(radians(s.t + shift))) * 128;
        const bright = Math.trunc(constrain(112 * (1 + Math.sin(radians(s.t + shift + 90))) + 30, 96, 255));
        const bright2 = Math.trunc(constrain(112 * (1 + Math.sin(radians(s.t + shift + 270))) + 30, 96, 255));
        if (s.flag) wuX(m, sin1 / a, i, CHSV(u8(sin1), 255, bright));
        else wuX(m, (m.W - 1) - (sin1 / a), i, CHSV(u8(~u8(sin1)), 255, bright2));
        s.flag = !s.flag;
      }
      m.blur2d(64);
    } });

  add({ name: "Snow", file: "Any recreations/Snow.cpp", note: "Falling flakes over a noise drift", ms: 16,
    init(s, m) {
      s.buff = [];
      for (let x = 0; x < m.W; x++) s.buff.push(new Uint8Array(m.H + 1));
      s.shift = 255;
    },
    draw(s, m) {
      const W = m.W, H = m.H, t = u16(Math.floor(s.ms / 10));
      s.shift = u16(s.shift + 254);
      if (s.shift >= 255) {
        if (s.rnd() % 2) s.buff[s.rnd(0, W)][H] = s.rnd(192, 255);
        for (let x = 0; x < W; x++) for (let y = 0; y < H + 1; y++) {
          if (s.buff[x][y] && y) { s.buff[x][y - 1] = s.buff[x][y]; s.buff[x][y] = 0; }
          else if (s.buff[x][y] && !y) s.buff[x][y] = 0;
        }
        s.shift = s.shift % 255;
      }
      for (let y = 0; y < H; y++) {
        const yred = (H - y) * ((255 / H) | 0) * 2;
        for (let x = 0; x < W; x++) {
          const noise = constrain(Math.trunc(inoise8(x * 10 + t, y * 25 + t) * 3 / 2) - yred, 0, 255);
          m.set(x, y, CHSV(0, 0, noise));
          m.add(x, y, nblendC(CHSV(0, 0, s.buff[x][y]), CHSV(0, 0, s.buff[x][y + 1]), u8(s.shift)));
        }
      }
    } });

  add({ name: "Worley Noise", file: "Testing stuff/Worley Noise.cpp",
    note: "Cell edges from the 1st and 2nd nearest point, hued by cell", ms: 16,
    init(s, m) {
      const n = Math.max(m.W, m.H), r = s.rnd;
      s.cell = [];
      for (let i = 0; i < n; i++)
        s.cell.push({ x: r(0, m.W << 8), y: r(0, m.H << 8), vx: r(-30, 30), vy: r(-30, 30) });
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      for (const c of s.cell) {
        c.x += c.vx; c.y += c.vy;
        if (c.x < 0) { c.x = 0; c.vx = -c.vx; }
        if (c.x > (W - 1) << 8) { c.x = (W - 1) << 8; c.vx = -c.vx; }
        if (c.y < 0) { c.y = 0; c.vy = -c.vy; }
        if (c.y > (H - 1) << 8) { c.y = (H - 1) << 8; c.vy = -c.vy; }
      }
      for (let x = 0; x < W; x++) {
        const x8 = x << 8;
        for (let y = 0; y < H; y++) {
          const y8 = y << 8;
          let d1 = Infinity, d2 = Infinity, i1 = 0;
          for (let i = 0; i < s.cell.length; i++) {
            const c = s.cell[i];
            const dx = c.x - x8, dy = c.y - y8, d = dx * dx + dy * dy;
            if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d;
          }
          const val = constrain(Math.trunc(Math.sqrt(d2) - Math.sqrt(d1)) >> 2, 0, 255);
          m.set(x, y, CHSV(u8(i1 << 4), 255, val));
        }
      }
    } });

  add({ name: "Clouds", file: "Testing stuff/Clouds.cpp", note: "Three-octave noise, inverted", ms: 16,
    draw(s, m) {
      const H = m.H, t = u16(Math.floor(s.ms / 10)), step = (255 / H) | 0;
      for (let i = 0; i < m.W; i++) for (let j = 0; j < H; j++) {
        const v = constrain(inoise8(i * 10 + (t >> 3), j * 100 + t, t >> 2) - j * step, 0, 255);
        m.set(i, H - 1 - j, CFP(PAL.Cloud, u8(~v)));
      }
    } });

  // ------------------------------------------------------------ batch 1
  add({ name: "Waving Cells", file: "Testing stuff/WavingCells.cpp",
    note: "Two sine grids beating against each other", ms: 16,
    draw(s, m) {
      const t = s.ms / 100;
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++)
        m.set(x, y, CFP(PAL.Heat,
          u8(Math.trunc(sin8(u8(x * 10 + sin8(u8(y * 5 + t * 5)))) + cos8(u8(y * 10)) + 1 + t))));
    } });

  add({ name: "Lava lake", file: "Testing stuff/Lava lake.cpp",
    note: "Noise sheared by x·y, on the Lava palette", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H, step = (255 / H) | 0;
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
        m.set(x, y, CFP(PAL.Lava,
          inoise8((x * y) - (y * W), y * 50 + Math.floor(s.ms / 100), Math.floor(s.ms / 10)),
          u8(255 - y * step)));
    } });

  add({ name: "Rotating rainbow", file: "Testing stuff/Rotating rainbow Test.cpp",
    note: "A hue ramp whose gradient direction turns", ms: 16,
    params: [{ k: "scale", label: "Scale", min: 1, max: 64, def: 10 }],
    init(s) { s.hue = 0; s.t = 0; },
    draw(s, m) {
      s.hue = u8(s.hue + 1); s.t = u16(s.t + 1);
      const xf = Math.sin(radians(s.t)), yf = Math.cos(radians(s.t)), scale = s.opt.scale;
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++)
        m.set(x, y, CHSV(u8(Math.trunc((x * xf + y * yf + s.hue) * scale)), 255, 255));
    } });

  add({ name: "Black Hole", file: "Testing stuff/BlackHole.cpp",
    note: "32 orbiting dots, each on its own beat", ms: 16,
    draw(s, m) {
      m.fade(32);
      const t = s.ms / 128;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
        const ph = t * (i + j);
        m.add(beatsin8(10, j * 2, m.W - 1 - j * 2, 0, u8(Math.trunc(((j % 2) ? 128 : 0) + ph))),
              beatsin8(5, j * 2, m.H - 1 - j * 2, 0, u8(Math.trunc(((j % 2) ? 192 : 64) + ph))),
              CHSV(i * 32, 255, 255));
      }
      m.blur2d(16);
    } });

  add({ name: "Twinkling", file: "Any recreations/Twinking.cpp",
    note: "Every pixel breathes on its own, walking the strip", ms: 16,
    init(s, m) { s.a = new Int8Array(m.N); },
    draw(s, m) {
      const r = s.rnd, d = m.d;
      for (let i = 0; i < m.N; i++) {
        const p = i * 3, R = d[p], G = d[p + 1], B = d[p + 2];
        if (R || G || B) {
          const mx = Math.max(R, Math.max(G, B)), a = Math.abs(s.a[i]);
          const cr = map(R, 0, mx, 0, a), cg = map(G, 0, mx, 0, a), cb = map(B, 0, mx, 0, a);
          if (s.a[i] > 0) { d[p] = qadd8(R, cr); d[p + 1] = qadd8(G, cg); d[p + 2] = qadd8(B, cb); }
          else { d[p] = qsub8(R, cr); d[p + 1] = qsub8(G, cg); d[p + 2] = qsub8(B, cb); }
          if (mx + s.a[i] > 255) s.a[i] = -s.a[i];
        } else if (r() % 128 === 0) {
          s.a[i] = Math.pow(2, r() % 2) + 2;
          m.seti(i, CHSV(u8(r()), 255, s.a[i]));
        }
      }
    } });

  add({ name: "Noise V2", file: "Testing stuff/NoiseV2.cpp",
    note: "Perlin plus two travelling ripple centres", ms: 16,
    draw(s, m) {
      const t = Math.floor(s.ms / 100);
      const ax = beatsin8(5, 0, m.W - 1), ay = beatsin8(6, 0, m.H - 1, 0, 64);
      const bx = beatsin8(5, 0, m.W - 1, 0, 64), by = beatsin8(6, 0, m.H - 1);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        let col = inoise8(x * 16 + t, y * 16 + t);
        let cx = i8(x - ax), cy = i8(y - ay);
        col = u8(col + sin8(u8(16 * sqrt16(cx * cx + cy * cy))));
        cx = i8(x - bx); cy = i8(y - by);
        col = u8(col + sin8(u8(16 * sqrt16(cx * cx + cy * cy))));
        col = u8(col + sin8(u8(cx - t)));
        col = u8(col + cos8(u8(cy - t)));
        m.set(x, y, CFP(PAL.Lava, col, col));
      }
    } });

  add({ name: "Infinity", file: "Any recreations/Infinity.cpp",
    note: "One dot on two beats, drawing a lissajous", ms: 16,
    draw(s, m) {
      const color = CHSV(beatsin8(10, 1, 10), 10, 255);
      const q = (m.H / 4) | 0;
      const x = beatsin8(12, 0, m.W - 1), y = beatsin8(24, q, m.H - 1 - q);
      m.add(x, y, color);
      if (m.W > 24 || m.H > 24) {
        m.add(x + 1, y, color); m.add(x - 1, y, color);
        m.add(x, y + 1, color); m.add(x, y - 1, color);
        m.blur2d(64);
      }
      m.fade(2);
    } });

  add({ name: "Lines", file: "Testing stuff/Lines.cpp",
    note: "Twelve Bresenham lines chasing their endpoints", ms: 16,
    init(s) { s.offest = 0; },
    draw(s, m) {
      m.fade(128);
      s.offest = u8(s.offest + 5);
      for (let i = 0; i < 12; i++)
        line(m, beatsin8(10 + i, 0, m.W - 1, i * i), beatsin8(12 - i, 0, m.H - 1, i * 5, 64),
                beatsin8(8 + i, 0, m.W - 1, i * 20), beatsin8(14 - i, 0, m.H - 1, i * 5, 64),
             CHSV(u8(90 + s.offest + i * 10), 255, 255));
    } });

  add({ name: "PSP", file: "Animation recreations/PSP.cpp",
    note: "The PSP XMB wave, on 16-bit noise", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H, col = 150;
      const xadj = ((256 / H) | 0) << 7;
      const t = u32(s.ms * 4);
      for (let x = 0; x < W; x++) {
        const h1 = map(inoise16(x * xadj + t), 0, 65535, 0, H << 8);
        const h2 = map(inoise16(0, 35550, x * xadj + t), 0, 65535, 0, H << 8);
        const bh1 = u8(h1 >> 8), bh2 = u8(h2 >> 8);
        for (let y = 0; y < H; y++) {
          let c = CHSV(col, u8(map(y + x, 0, H + W - 1, 255, 32)),
                            u8(map(x - (H - 1 - y), 0, W - 1, 196, 255)));
          c = addC(c, CHSV(0, 0, (y < bh1) ? u8(map(y, 0, bh1, 64, 256)) : 0));
          c = addC(c, CHSV(0, 0, (y < bh2) ? u8(map(y, 0, bh2, 64, 256)) : 0));
          m.set(x, y, c);
        }
        m.add(x, bh1, CHSV(0, 0, h1 % 256));
        m.add(x, bh2, CHSV(0, 0, h2 % 256));
      }
    } });

  add({ name: "Color Frizzles", file: "Testing stuff/Color Frizzles.cpp",
    note: "Eight beat-driven dots, blurred into ribbons", ms: 16,
    draw(s, m) {
      m.fade(16);
      for (let i = 8; i > 0; i--) {
        const x = beatsin8(12 + i, 0, m.W - 1), y = beatsin8(15 - i, 0, m.H - 1);
        const c = CHSV(beatsin8(12, 0, 255), 255, 255);
        m.add(x, y, c);
        if (m.W > 24 || m.H > 24) {
          m.add(x + 1, y, c); m.add(x - 1, y, c); m.add(x, y + 1, c); m.add(x, y - 1, c);
        }
      }
      m.blur2d(16);
    } });

  // ------------------------------------------------------------ batch 2
  add({ name: "Noise plus palette", file: "Testing stuff/NoiseWithSettings.cpp",
    note: "The FastLED noise demo, trimmed down", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 10 },
             { k: "scale", label: "Scale", min: 1, max: 255, def: 30 }],
    init(s) { s.x = 0; s.y = 0; s.z = 0; s.hue = 0; },
    draw(s, m) {
      const Speed = s.opt.speed, Scale = s.opt.scale;
      s.z = u16(s.z + Speed);
      s.x = u16(Math.trunc(s.x + Speed * 0.125));
      s.y = u16(Math.trunc(s.y - Speed * 0.0625));
      for (let i = 0; i < m.W; i++) for (let j = 0; j < m.H; j++) {
        const noise = inoise8(i * Scale + s.x, j * Scale + s.y, s.z);
        const inv = inoise8(j * Scale + s.y, i * Scale + s.x, s.z);
        const v = u8(inv * 2);
        m.set(i, j, CFP(PAL.Cloud, u8(noise + s.hue), inv > 127 ? 255 : scale8(v, v)));
      }
      s.hue = 0;
    } });

  add({ name: "Candle", file: "Testing stuff/Candle.cpp",
    note: "Four distance fields, one of them wandering", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H, t = s.ms;
      const d0 = (x1, y1, x2, y2) => sqrt16((x2 - x1) * (x2 - x1) + Math.trunc((y2 - y1) * (y2 - y1) / 2));
      const d1 = (x1, y1, x2, y2) => sqrt16((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
      const dX = u8(map(inoise8(t, 0, t), 0, 255, 0, W));
      const dY = u8(map(inoise8(0, t), 0, 255, (H / 2) | 0, H * 2));
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        let dista = d0(x, y, (W / 3) | 0, (H / 10) | 0);
        dista += d0(x, y, W - 1 - ((W / 3) | 0), (H / 10) | 0);
        dista += d0(x, y, (W / 2) | 0, (H / 10) | 0);
        dista += d1(x, y, dX, dY);
        if (dista >= W + H) dista = 0;
        m.nbl(x, y, CFP(PAL.Heat, u8(map(dista * 2, 0, W + H, 255, 0))), 30);
      }
      m.blur2d(64);
    } });

  add({ name: "Radial Wave", file: "Radial Effects/RadialWave.cpp",
    note: "One sin8 nested in another, by angle", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 16, def: 1 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u32(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        m.set(x, y, CHSV(u8(s.t + radius), 255,
          sin8(u8(s.t * 4 + sin8(u8(s.t * 4 - radius)) + angle * 3))));
      }
    } });

  add({ name: "Odd lands", file: "Radial Effects/Odd lands.cpp",
    note: "Polar noise pushed through the Forest palette", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 16, def: 1 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y;
        const angle = sin8(s.p.ang[i]) >> 3, radius = s.p.rad[i] >> 3;
        m.set(x, y, CFP(PAL.Forest, u8(inoise8(s.t + angle, radius - s.t) << 3), u8(~radius << 3)));
      }
    } });

  add({ name: "Spring cells", file: "Testing stuff/spring cellular automata Test.cpp",
    note: "Every LED is a mass on a spring, pulled by its neighbours", ms: 16,
    init(s, m) {
      s.pos = new Int16Array(m.N); s.vel = new Int8Array(m.N);
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
        s.pos[y * m.W + x] = sin8(u8((x + y) * 16));
        s.vel[y * m.W + x] = 10;
      }
    },
    draw(s, m) {
      const W = m.W, H = m.H, pos = s.pos, vel = s.vel;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let sum = 0, div = 0;
        if (x) { sum += pos[y * W + x - 1]; div++; }
        if (x !== W - 1) { sum += pos[y * W + x + 1]; div++; }
        if (y) { sum += pos[(y - 1) * W + x]; div++; }
        if (y !== H - 1) { sum += pos[(y + 1) * W + x]; div++; }
        vel[y * W + x] += Math.trunc(sum / div) - pos[y * W + x];
      }
      for (let i = 0; i < m.N; i++) {
        pos[i] += vel[i];
        m.seti(i, CFP(PAL.Heat, constrain(Math.abs(pos[i]), 0, 255)));
      }
    } });

  add({ name: "Radial Pattern", file: "Radial Effects/Radial Pattern.cpp",
    note: "Red and green checkers in polar space, drifting apart", ms: 20,
    params: [{ k: "speed", label: "Speed", min: 1, max: 16, def: 2 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u32(s.t + s.opt.speed);
      const t = s.t;
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y, angle = s.p.ang[i], radius = s.p.rad[i];
        const g = ((Math.floor(u32(angle + Math.floor(t / 6)) / 32) % 2) ^
                   (Math.floor(u32(radius - t) / 64) % 2)) * 220;
        const r = ((Math.floor(u32(angle + t) / 32) % 2) ^
                   (Math.floor(u32(radius - Math.floor(t / 2)) / 64) % 2)) * 255;
        m.set(x, y, [r, g, 0]);
      }
    } });

  add({ name: "Water in a jar", file: "Testing stuff/Pseudo water in jar.cpp",
    note: "A one-dimensional spring chain, read as a water line", ms: 16,
    init(s, m) {
      s.pos = new Int16Array(m.W); s.vel = new Int16Array(m.W);
      s.vel[s.rnd() % m.W] = -256;
    },
    draw(s, m) {
      const W = m.W, H = m.H, pos = s.pos, vel = s.vel;
      if (every(s, "splash", 5000)) vel[s.rnd() % W] = -256;
      for (let i = 0; i < W; i++) {
        let sum = 0;
        if (i) sum += pos[i - 1];
        if (i !== W - 1) sum += pos[i + 1];
        vel[i] += Math.trunc(sum / 2) - pos[i];
      }
      for (let i = 0; i < W; i++) {
        vel[i] += vel[i] < 0 ? 1 : vel[i] > 0 ? -1 : 0;
        pos[i] += Math.trunc(vel[i] / 2);
        const coord = u16(map(pos[i], -1024, 1024, 0, (H - 1) << 8));
        for (let j = 0; j < H; j++)
          m.set(i, j, j < (coord >> 8) ? CHSV(150, 255, 255)
                    : j === (coord >> 8) ? CHSV(150, 255, coord % 255) : [0, 0, 0]);
      }
    } });

  add({ name: "Crazy Bee", file: "Testing stuff/CrazyBee.cpp",
    note: "Noise walk with the contrast stretched, drawn as a trail", ms: 16,
    init(s) { s.c = [[0, 0], [0, 0]]; s.offest = 0; },
    draw(s, m) {
      m.fade(2);
      const t = s.ms;
      s.offest = u16(s.offest + 1);
      const punch = v => qadd8(qsub8(v, 16), scale8(qsub8(v, 16), 39));
      s.c[0][1] = s.c[0][0]; s.c[1][1] = s.c[1][0];
      s.c[0][0] = u8(map(punch(inoise8(t, s.offest)), 0, 255, 0, m.W - 1));
      s.c[1][0] = u8(map(punch(inoise8(s.offest, t)), 0, 255, 0, m.H - 1));
      line(m, s.c[0][0], s.c[1][0], s.c[0][1], s.c[1][1],
           CHSV(punch(inoise8(s.offest)), 255, 255), true);
      m.blur2d(16);
    } });

  add({ name: "Loading", file: "Animation recreations/Loading.cpp",
    note: "Sixteen dots on one path, each a little behind the last", ms: 16,
    draw(s, m) {
      m.clear();
      const col = [255, 255, 255], W = m.W, H = m.H;
      for (let i = 0; i < 16; i++) {
        const lag = beatsin16(16, 1, 2048) * i;
        wuPixel32(m,
          beatsin16(20, (W >> 3) << 8, (W - (W >> 3) - 1) << 8, 0, u16(-lag)) * 1,
          beatsin16(20, (H >> 3) << 8, (H - (H >> 3) - 1) << 8, 0, u16(16384 - lag)) * 1,
          col);
      }
    } });

  add({ name: "Graph", file: "Testing stuff/GraphDrawing.cpp",
    note: "A scrolling plot that rescales to its own min and max", ms: 16,
    params: [{ k: "floor", label: "Min border", min: 0, max: 50000, step: 1000, def: 0 }],
    init(s, m) { s.buf = new Int32Array(m.W); s.start = 0; s.t = 0; },
    draw(s, m) {
      const W = m.W, H = m.H, r = s.rnd;
      s.t = u32(s.t + 16);
      m.clear();
      s.buf[s.start] = inoise16(u32(u32(u32(r() * 32) + s.t) * 256), u32((s.t >> 3) + r()));
      s.start = (s.start + 1) % W;
      let maximum = 0;
      for (let x = 0; x < W; x++) maximum = Math.max(maximum, s.buf[(s.start + x) % W]);
      if (!maximum) return;
      for (let x = 0; x < W; x++) {
        const raw = u16(map(s.buf[(s.start + x) % W], s.opt.floor, maximum, 0, H << 8));
        const ly = raw >> 8, py = raw % 256, hue = u8(x + (s.t >> 2));
        for (let y = 0; y < ly; y++)
          m.set(x, y, CHSV(hue, u8(map(y, 0, ly, 255, 0)), u8(map(y, 0, ly, 0, 255))));
        m.set(x, ly, CHSV(hue, 0, py));
      }
    } });

  // ------------------------------------------------------------ batch 3
  add({ name: "Drift rose", file: "Classic Demoeffects recreations/Drift rose pattern.cpp",
    note: "36 dots, each on its own bpm, tracing a rose", ms: 16,
    draw(s, m) {
      const CX = m.W / 2 - 0.5, CY = m.H / 2 - 0.5, L = (Math.min(m.W, m.H) / 2) | 0;
      for (let i = 1; i < 37; i++) {
        const r = beatsin8(i, 0, L * 2) - L;
        m.wu(CX + Math.sin(radians(i * 10)) * r, CY + Math.cos(radians(i * 10)) * r,
             CHSV(u8(i * 10), 255, 255));
      }
      m.fade(32);
      m.blur2d(16);
    } });

  add({ name: "Radial Nuclear Noise", file: "Radial Effects/RadialNuclearNoise.cpp",
    note: "Three noise fields thresholded into R, G and B", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 32, def: 8 }],
    init(s, m) { s.p = radialMap(m, (255 / m.W) | 0); s.t = 0; },
    draw(s, m) {
      m.clear();
      s.t = u16(s.t + s.opt.speed);
      const t = s.t, t1 = (t / 2) | 0;
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const i = x * m.H + y;
        const angle = sin8(u8(((t1 / 2) | 0) + s.p.ang[i] * 3));
        const radius = u8(s.p.rad[i] * 2 - t);
        const n = [inoise8(angle, radius, t1), inoise8(angle, 12032 + t1, radius),
                   inoise8(radius, 120021 + t1, angle)];
        for (let k = 0; k < 3; k++) n[k] = n[k] < 128 ? 0 : constrain((n[k] - 128) * 3, 0, 255);
        m.set(x, y, n);
      }
    } });

  add({ name: "Langton's Ant", file: "Any recreations/Langton Ant.cpp",
    note: "Eight ants, one rule, sixty seconds before the reset", ms: 16,
    params: [{ k: "restart", label: "Restart (s), 0 = off", min: 0, max: 180, def: 60 }],
    init(s, m) { s.setUp = true; s.hue = 0; s.n = Math.trunc((m.W + m.H) / 8); },
    draw(s, m) {
      const W = m.W, H = m.H, n = s.n;
      if (s.setUp) {
        s.setUp = false;
        m.clear();
        s.px = new Int8Array(n); s.py = new Int8Array(n); s.dir = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          s.px[i] = s.rnd(0, W - 1); s.py[i] = s.rnd(0, H - 1); s.dir[i] = s.rnd(0, 3);
        }
      }
      const wx = v => ((v % W) + W) % W, wy = v => ((v % H) + H) % H;
      const black = c => !c[0] && !c[1] && !c[2];
      for (let i = 0; i < n; i++) {
        let x = wx(s.px[i]), y = wy(s.py[i]);
        m.set(x, y, black(m.get(x, y)) ? CHSV(s.hue, 255, 255) : [0, 0, 0]);
        switch (s.dir[i]) {
          case 0: s.py[i]++; break;
          case 1: s.px[i]++; break;
          case 2: s.py[i]--; break;
          case 3: s.px[i]--; break;
        }
        x = wx(s.px[i]); y = wy(s.py[i]);
        s.dir[i] = u8(s.dir[i] + (black(m.get(x, y)) ? 1 : -1));
        if (s.dir[i] > 3) s.dir[i] = 0;
      }
      s.hue = u8(s.hue + 1);
      if (s.opt.restart > 0 && every(s, "restart", s.opt.restart * 1000)) s.setUp = true;
    } });

  add({ name: "S.a.n.d.", file: "Any recreations/S.a.n.d..cpp",
    note: "Falling sand that collapses once the pile reaches the mark", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 196 }],
    init(s, m) {
      s.FF = new Uint8Array(m.W * m.H); s.SF = new Uint8Array(m.W * m.H); s.shift = 0;
    },
    draw(s, m) {
      const W = m.W, H = m.H, r = s.rnd, SF = s.SF;
      const g = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? 0 : SF[y * W + x];
      const st = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) SF[y * W + x] = v; };
      s.shift = u16(s.shift + s.opt.speed);
      if (s.shift >= 255) {
        s.FF.set(SF);
        let checked = 0;
        for (let x = 0; x < W; x++) {
          checked = 1;
          if (!g(x, ((H / 2) | 0) - ((H / 8) | 0))) { checked = 0; break; }
        }
        if (checked) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() % 3) st(x, y, 0);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (!g(x, y)) continue;
          if (!g(x, y - 1) && y) { st(x, y - 1, g(x, y)); st(x, y, 0); }
          else if (g(x, y - 1) && !g(x + 1, y - 1) && x !== W - 1 && y) { st(x + 1, y - 1, g(x, y)); st(x, y, 0); }
          else if (g(x, y - 1) && !g(x - 1, y - 1) && x && y) { st(x - 1, y - 1, g(x, y)); st(x, y, 0); }
        }
        if (!(r() % 4)) st((W / 2) | 0, H - 1, r(10, 255));
        s.shift = s.shift % 256;
      }
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        const f = s.FF[y * W + x], b = SF[y * W + x];
        m.set(x, y, nblendC(CHSV(f, 255, f ? 255 : 0), CHSV(b, 255, b ? 255 : 0), u8(s.shift)));
      }
    } });

  add({ name: "Zooming", file: "Testing stuff/Zooming Test.cpp",
    note: "The panel repeatedly zooms into a quarter of itself", ms: 200,
    init(s, m) {
      const W = m.W, H = m.H;
      s.bw = ((W / 2) | 0) + W % 2; s.bh = ((H / 2) | 0) + H % 2;
      s.buf = new Uint8Array(s.bw * s.bh * 3);
      s.pos = 0;
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
        m.set(x, y, CHSV(inoise8(x * 180, y * 180), 255, 255));
      for (let x = 0; x < s.bw; x++) for (let y = 0; y < s.bh; y++) {
        const c = m.get(x + ((W / 4) | 0), y + ((H / 4) | 0)), o = (y * s.bw + x) * 3;
        s.buf[o] = c[0]; s.buf[o + 1] = c[1]; s.buf[o + 2] = c[2];
      }
    },
    draw(s, m) {
      const W = m.W, H = m.H, r = s.rnd;
      const bget = (x, y) => { const o = (y * s.bw + x) * 3; return [s.buf[o], s.buf[o + 1], s.buf[o + 2]]; };
      s.pos = u16(s.pos + 128);
      if (s.pos > 255) {
        s.pos = 0;
        for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
          m.set(x, y, bget((x / 2) | 0, (y / 2) | 0));
        const t = u16(Math.floor(s.ms / 1000));
        const zx = map(sin8(u8(t)), 0, 255, 0, (W / 2) | 0);
        const zy = map(sin8(u8(t + 10929)), 0, 255, 0, (H / 2) | 0);
        for (let a = 0; a < ((m.N / 16) | 0); a++) m.seti(r(0, m.N), CHSV(u8(r()), 255, 255));
        for (let x = 0; x < s.bw; x++) for (let y = 0; y < s.bh; y++) {
          const c = m.get(x + zx, y + zy), o = (y * s.bw + x) * 3;
          s.buf[o] = c[0]; s.buf[o + 1] = c[1]; s.buf[o + 2] = c[2];
        }
      }
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
        m.nbl(x, y, bget((x / 2) | 0, (y / 2) | 0), u8(s.pos));
    } });

  add({ name: "Crazy bees", file: "Other/Crazy bees.cpp",
    note: "Bees flying Bresenham lines to a target, then picking a new one", ms: 16,
    init(s, m) {
      s.n = m.N > 256 ? (m.N / 256) | 0 : 1;
      s.bee = [];
      for (let i = 0; i < s.n; i++) {
        const b = { posX: s.rnd(0, m.W), posY: s.rnd(0, m.H) };
        aim(s, m, b);
        s.bee.push(b);
      }
    },
    draw(s, m) {
      m.fade(8);
      for (const b of s.bee) {
        const c = CHSV(b.hue, 255, 255);
        m.add(b.aimX + 1, b.aimY, c); m.add(b.aimX, b.aimY + 1, c);
        m.add(b.aimX - 1, b.aimY, c); m.add(b.aimX, b.aimY - 1, c);
        if (b.posX !== b.aimX || b.posY !== b.aimY) {
          m.set(b.posX, b.posY, CHSV(b.hue, 60, 255));
          const e2 = i8(b.error * 2);
          if (e2 > -b.deltaY) { b.error = i8(b.error - b.deltaY); b.posX = u8(b.posX + b.signX); }
          if (e2 < b.deltaX) { b.error = i8(b.error + b.deltaX); b.posY = u8(b.posY + b.signY); }
        } else aim(s, m, b);
      }
      m.blur2d(32);
    } });

  // ------------------------------------------------------------ batch 4
  add({ name: "Dithering", file: "Testing stuff/Dithering Test.cpp",
    note: "Floyd-Steinberg over noise, on eight colours", ms: 16,
    init(s) { s.t = 0; },
    draw(s, m) {
      const W = m.W, H = m.H;
      s.t = u16(s.t + 1);
      const push = (x, y, e, f) => {
        const p = m.i(x, y), d = m.d;
        d[p] = qadd8(d[p], u8((e[0] * f) >> 4));
        d[p + 1] = qadd8(d[p + 1], u8((e[1] * f) >> 4));
        d[p + 2] = qadd8(d[p + 2], u8((e[2] * f) >> 4));
      };
      for (let row = 0; row < H; row++) {
        for (let x = 0; x < W; x++)
          m.set(x, row, CHSV(inoise8(x << 3, ((row << 3) + s.t) << 2), 255,
                             u8(32 + inoise8(row << 3, x << 3, s.t << 2))));
        // applyDithering() runs once per row, as written
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const old = m.get(x, y);
          const nw = [old[0] > 127 ? 255 : 0, old[1] > 127 ? 255 : 0, old[2] > 127 ? 255 : 0];
          m.set(x, y, nw);
          const e = [i8(old[0] - nw[0]), i8(old[1] - nw[1]), i8(old[2] - nw[2])];
          if (x < W - 1) push(x + 1, y, e, 7);
          if (y < H - 1) {
            if (x) push(x - 1, y + 1, e, 3);
            push(x, y + 1, e, 5);
            if (x < W - 1) push(x + 1, y + 1, e, 1);
          }
        }
      }
    } });

  add({ name: "Spiro", file: "Any recreations/Spiro.cpp",
    note: "A spirograph that gains an arm every time it collapses", ms: 16,
    init(s) { s.AM = 1; s.Angle = 0; s.change = true; s.incenter = false; },
    draw(s, m) {
      m.fade(8);
      const CX = ((m.W / 2) | 0) - 0.5, CY = ((m.H / 2) | 0) - 0.5;
      const t = s.ms / 500;
      const CalcRad = Math.sin(t / 2) + 1;
      if (CalcRad <= 0.001) {
        if (!s.incenter) {
          s.AM = u8(s.AM + ((s.change * 2) - 1) * (s.AM >= 4 ? 2 : 1));
          s.Angle = 6.28318531 / s.AM;
          if (s.AM <= 1) s.change = true;
          else if (s.AM >= (m.W + m.H) / 2) s.change = false;
        }
        s.incenter = true;
      } else s.incenter = false;
      const radX = CalcRad * CX / 2, radY = CalcRad * CY / 2;
      for (let i = 0; i < s.AM; i++)
        m.wu(CX + Math.sin(t + s.Angle * i) * radX, CY + Math.cos(t + s.Angle * i) * radY,
             CFP(PAL.Heat, u8(Math.trunc(t * 10 + ((256 / s.AM) | 0) * i))));
    } });

  add({ name: "Noise Move", file: "Testing stuff/NoiseMove Test.cpp",
    note: "Dots steered by raw signed noise, wrapping at the edges", ms: 16,
    init(s, m) {
      s.n = (m.W / 4) | 0; s.dot = [];
      for (let i = 0; i < s.n; i++)
        s.dot.push({ x: s.rnd(), y: s.rnd(), w: s.rnd(), color: u8(s.rnd()) });
      s.t = 0;
    },
    draw(s, m) {
      const speedfact = 35;
      s.t = u32(s.t + 1);
      if (every(s, "fade", 500)) m.fade(1);
      for (let i = 0; i < s.n; i++) {
        const d = s.dot[i];
        d.x += inoise8_raw(s.t + 39000, i * 2048, i * 40961) / speedfact;
        d.y += inoise8_raw(i * 4096, i * 20418, s.t) / speedfact;
        d.w += inoise8_raw(i * 4096, i * 20418, s.t) / speedfact * 2;
        if (d.x < 0) d.x = m.W; if (d.x > m.W) d.x = 0;
        if (d.y < 0) d.y = m.H; if (d.y > m.H) d.y = 0;
        if (d.w < 128) d.w = 255; if (d.w > 255) d.w = 128;
        m.wu(d.x, d.y, CHSV(d.color, 255, u8(d.w)));
      }
      m.blur2d(4);
    } });

  add({ name: "Pool Noise", file: "Testing stuff/PoolNoise.cpp",
    note: "A palette built at runtime, so the noise reads as water", ms: 16,
    params: [{ k: "hue", label: "Hue", min: 0, max: 255, def: 150 },
             { k: "sat", label: "Sat", min: 0, max: 255, def: 255 },
             { k: "scale", label: "Scale", min: 1, max: 255, def: 40 }],
    init(s) {
      const Sat = s.opt.sat, Hue = s.opt.hue;
      const pal = [];
      for (let i = 0; i < 16; i++) pal.push(CHSV(Hue, Sat, 230));
      pal[9] = CHSV(Hue, Sat - 60, 255);
      pal[8] = CHSV(Hue, 255 - Sat, 210);
      pal[7] = CHSV(Hue, 255 - Sat, 210);
      pal[6] = CHSV(Hue, Sat - 60, 255);
      s.pal = pal;
    },
    draw(s, m) {
      const Scale = s.opt.scale;
      for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++)
        m.set(x, y, CFP(s.pal, inoise8(x * Scale, y * Scale, Math.floor(s.ms / 16))));
      m.blur2d(32);
    } });

  add({ name: "Mirage", file: "Any recreations/Mirage.cpp",
    note: "Three dots feeding a diffusion buffer, read as saturation", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 128 },
             { k: "hue", label: "Hue", min: 0, max: 255, def: 70 }],
    init(s, m) {
      s.bw = m.W + 2; s.bh = m.H + 2;
      s.buf = new Uint8Array(s.bw * s.bh);
      s.hue = s.opt.hue;
    },
    draw(s, m) {
      const W = m.W, H = m.H, bw = s.bw, buf = s.buf, div = 4, val = 255, speed = s.opt.speed;
      for (let x = 1; x < W + 1; x++) for (let y = 1; y < H + 1; y++) {
        let sum = buf[y * bw + x];
        sum += buf[y * bw + x + 1];
        sum += buf[(y - 1) * bw + x];
        sum += buf[(y + 1) * bw + x];
        sum += buf[y * bw + x - 1];
        buf[y * bw + x] = u8(Math.floor(sum / 5));
      }
      const dot = (x, y, a) => {
        const xx = u8(Math.trunc((x - Math.trunc(x)) * 255)), yy = u8(Math.trunc((y - Math.trunc(y)) * 255));
        const ix = u8(255 - xx), iy = u8(255 - yy);
        const WT = (p, q) => u8((p * q + p + q) >> 8);
        const wu = [WT(ix, iy), WT(xx, iy), WT(ix, yy), WT(xx, yy)];
        for (let i = 0; i < 4; i++) {
          const xn = Math.trunc(x + (i & 1)), yn = Math.trunc(y + ((i >> 1) & 1));
          if (xn < 0 || yn < 0 || xn >= bw || yn >= s.bh) continue;
          buf[yn * bw + xn] = qadd8(buf[yn * bw + xn], (a * wu[i]) >> 8);
        }
      };
      const x1 = beatsin88(15 * speed, div, (W - 1) * div) / div;
      const y1 = beatsin88(20 * speed, div, H * div) / div;
      const x2 = beatsin88(16 * speed, div, (W - 1) * div) / div;
      const y2 = beatsin88(14 * speed, div, H * div) / div;
      const x3 = beatsin88(12 * speed, div, (W - 1) * div) / div;
      const y3 = beatsin88(16 * speed, div, H * div) / div;
      dot(x1, y1, val); dot(x1 + 1, y1, val);
      dot(x2, y2, val); dot(x2 + 1, y2, val);
      dot(x3, y3, val); dot(x3 + 1, y3, val);
      s.hue = u8(s.hue + 1);
      for (let x = 1; x < W + 1; x++) for (let y = 1; y < H + 1; y++)
        m.set(x - 1, y - 1, CHSV(s.hue, buf[y * bw + x], 255));
    } });

  add({ name: "Bars", file: "Testing stuff/drawBars.cpp",
    note: "One bar per column, each on its own beat, drawn sub-pixel", ms: 16,
    params: [{ k: "rot", label: "Direction", def: 0, opts: ["Up", "Across"] }],
    init(s, m) {
      const r = s.rnd, n = m.W;
      s.speed = []; s.col = []; s.mn = []; s.mx = [];
      for (let i = 0; i < n; i++) {
        s.speed[i] = r(15, 30); s.col[i] = u8(r()); s.mn[i] = r(0, 32); s.mx[i] = r(64, 255);
      }
    },
    draw(s, m) {
      m.clear();
      const rot = s.opt.rot;                    // drawBar()'s Vert flag
      const n = rot ? m.H : m.W, span = (rot ? m.W : m.H) * 256;
      for (let i = 0; i < n; i++) {
        const v = beatsin8(s.speed[i], s.mn[i], s.mx[i]);
        const top = map(v, s.mn[i], s.mx[i], 0, span);
        const c = CHSV(s.col[i], 255, 255);
        for (let k = 0; k < top; k += 16)
          if (rot) wuPixel32(m, k, i * 256, c); else wuPixel32(m, i * 256, k, c);
      }
    } });

  // ------------------------------------------------------------ batch 5
  add({ name: "Space Ships", file: "Other/Space Ships.cpp",
    note: "Eight dots on a panel that scrolls, turning every five seconds", ms: 16,
    init(s) { s.dir = 0; },
    draw(s, m) {
      m.fade(16);
      const mvx = d => {
        if (!d) return;
        if (d > 0) { for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) m.copy(x, y, x + d, y); }
        else { for (let y = 0; y < m.H; y++) for (let x = m.W - 1; x > 0; x--) m.copy(x, y, x + d, y); }
      };
      const mvy = d => {
        if (!d) return;
        if (d > 0) { for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) m.copy(x, y, x, y + d); }
        else { for (let x = 0; x < m.W; x++) for (let y = m.H - 1; y > 0; y--) m.copy(x, y, x, y + d); }
      };
      switch (s.dir) {
        case 0: mvx(1); break;
        case 1: mvx(1); mvy(-1); break;
        case 2: mvy(-1); break;
        case 3: mvx(-1); mvy(-1); break;
        case 4: mvx(-1); break;
        case 5: mvx(-1); mvy(1); break;
        case 6: mvy(1); break;
        case 7: mvx(1); mvy(1); break;
      }
      for (let i = 0; i < 8; i++) {
        const x = beatsin8(12 + i, 2, m.W - 3), y = beatsin8(15 + i, 2, m.H - 3);
        const c = CFP(PAL.Rainbow, beatsin8(12 + i, 0, 255), 255);
        m.add(x, y, c);
        if (m.W > 24 || m.H > 24) {
          m.add(x + 1, y, c); m.add(x - 1, y, c); m.add(x, y + 1, c); m.add(x, y - 1, c);
        }
      }
      m.blur2d(32);
      if (every(s, "dir", 5000)) s.dir = s.dir === 7 ? 0 : s.dir + 1;
    } });

  add({ name: "Tixy land", file: "Testing stuff/ownVerOFTixyLand.cpp",
    note: "One expression per channel, tixy.land style", ms: 16,
    draw(s, m) {
      const t = Math.floor(s.ms / 10);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++)
        m.set(x, y, [inoise8(x * 20, y * 20, t),
                     inoise8(x * 20, y * 20 + t),
                     inoise8(x * 20 + t, y * 20)]);
    } });

  add({ name: "Sorting", file: "Testing stuff/Sort methods.cpp",
    note: "Bubble, selection, insertion and merge sort, one swap pass per frame", ms: 10,
    init(s, m) { s.method = 0; s.queue = []; },
    draw(s, m) {
      if (!s.queue.length) s.queue = sortFrames(s, m.W, m.H);
      const a = s.queue.shift();
      m.clear();
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++)
        if (a[x] > y) m.set(x, y, CHSV(u8(a[x] * 16), 255, 255));
    } });

  add({ name: "Starships", file: "Other/Starships(with smooth direction change).cpp",
    note: "The same dots, but the panel slides sub-pixel in both axes", ms: 16,
    draw(s, m) {
      for (let i = 0; i < 8; i++)
        m.set(beatsin8(12 + i, 2, m.W - 3), beatsin8(15 + i, 2, m.H - 3),
              CFP(PAL.Rainbow, beatsin8(12 + i, 0, 255), 255));
      slide(m, beatsin8(20), true);
      slide(m, beatsin8(23), false);
      m.blur2d(16);
    } });

  add({ name: "Drop", file: "Any recreations/Drop.cpp",
    note: "Rings spreading from raindrops, on a water palette", ms: 16,
    init(s, m) {
      const Sat = 255, Hue = 150;
      const pal = [];
      for (let i = 0; i < 16; i++) pal.push(CHSV(Hue, Sat, 230));
      pal[10] = CHSV(Hue, Sat - 60, 255);
      pal[9] = CHSV(Hue, 255 - Sat, 210);
      pal[8] = CHSV(Hue, 255 - Sat, 210);
      pal[7] = CHSV(Hue, Sat - 60, 255);
      s.pal = pal;
      s.n = ((m.H + m.W) / 8) | 0;
      s.rad = []; s.px = []; s.py = [];
      for (let i = 0; i < s.n - 1; i++) {
        s.px[i] = s.rnd(m.W - 1); s.py[i] = s.rnd(m.H - 1); s.rad[i] = s.rnd(-1, m.W + m.H);
      }
    },
    draw(s, m) {
      const MaxRad = m.W + m.H;
      m.fillSolid(CFP(s.pal, 1));
      for (let i = s.n - 1; i > 0; i--) {
        circle(m, s.px[i], s.py[i], s.rad[i], CFP(s.pal, u8(Math.trunc(16 * 8.5 - s.rad[i]))));
        circle(m, s.px[i], s.py[i], s.rad[i] - 1, CFP(s.pal, u8(Math.trunc(16 * 7.5 - s.rad[i]))));
        if (s.rad[i] >= MaxRad) { s.rad[i] = -1; s.px[i] = s.rnd(m.W); s.py[i] = s.rnd(m.H); }
        else s.rad[i]++;
      }
      m.blur2d(64);
    } });

  add({ name: "Ugly Caustic", file: "Testing stuff/Ugly Caustic.cpp",
    note: "Noise used as a lens: light gathers where the gradient converges", ms: 16,
    params: [{ k: "scale", label: "Scale", min: 1, max: 64, def: 24 },
             { k: "bri", label: "Brightness", min: 1, max: 255, def: 128 },
             { k: "speed", label: "Speed", min: 1, max: 64, def: 8 }],
    init(s, m) {
      s.w = m.W + 1; s.h = m.H + 1;
      s.n0 = new Uint8Array(s.w * s.h); s.n1 = new Uint8Array(s.w * s.h);
      s.x = 0; s.y = 0; s.z = 0;
    },
    draw(s, m) {
      const scale = s.opt.scale, bri = s.opt.bri, speed = s.opt.speed, W = s.w, H = s.h;
      const smoothing = speed < 50 ? 200 - speed * 4 : 0;
      for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
        let data = inoise8(s.x + scale * i, s.y + scale * j, s.z);
        data = qsub8(data, 16);
        data = qadd8(data, scale8(data, 39));
        if (smoothing) data = u8(scale8(s.n0[j * W + i], smoothing) + scale8(data, 256 - smoothing));
        s.n0[j * W + i] = data;
      }
      s.z = u16(s.z + speed); s.x = u16(s.x + (speed >> 3)); s.y = u16(s.y - (speed >> 4));
      s.n1.fill(255);
      for (let x = 0; x < m.W; x++) for (let y = 0; y < m.H; y++) {
        const n0 = s.n0[y * W + x], n1 = s.n0[y * W + x + 1], n2 = s.n0[(y + 1) * W + x];
        const xl = i8(n0 - n1), yl = i8(n0 - n2);
        const xa = i16((x << 8) + ((xl * avg8(n0, n1)) >> 1));
        const ya = i16((y << 8) + ((yl * avg8(n0, n2)) >> 1));
        const xx = xa & 255, yy = ya & 255, ix = u8(255 - xx), iy = u8(255 - yy);
        const WT = (p, q) => u8((p * q + p + q) >> 8);
        const wu = [WT(ix, iy), WT(xx, iy), WT(ix, yy), WT(xx, yy)];
        for (let i = 0; i < 4; i++) {
          const lx = u8((xa >> 8) + (i & 1)), ly = u8((ya >> 8) + ((i >> 1) & 1));
          if (lx <= m.W && ly <= m.H)
            s.n1[ly * W + lx] = constrain(qsub8(s.n1[ly * W + lx], (bri * wu[i]) >> 8), 15, 255);
        }
      }
      for (let i = 0; i < m.W; i++) for (let j = 0; j < m.H; j++)
        m.nbl(i, j, CHSV(150, s.n1[j * W + i], 255), 64);
    } });

  // ------------------------------------------------------------ batch 6
  add({ name: "Plasma ball", file: "Other/Plasma_ball.cpp",
    note: "Arcs from the rim to the centre, aimed by 16-bit noise", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H, t = Math.floor(s.ms / 10), r = s.rnd;
      for (let i = 0; i < (Math.max(W, H) / 2) | 0; i++) {
        const a = inoise16(t, i * 3760, i * 1507) % 360;
        const b = inoise16(i * 1084, t, i * 3760) % 360;
        const radA = radians(a), radB = radians(b);
        const x = Math.sin(radA) * Math.cos(radB);
        const y = Math.sin(radA) * Math.sin(radB);
        const z = Math.cos(radA + Math.PI / 2);
        const bri = constrain(Math.trunc(112 * (1 + z) + 30), 96, 255);
        lineF(m, (1 + x) * W / 2, (1 + y) * H / 2, W / 2, H / 2,
              CHSV(r(200, 255), 255, bri), CHSV(r(150, 170), 150, 150));
        m.wu((1 + x) * W / 2, (1 + y) * H / 2, CHSV(0, 0, bri));
      }
      m.fade(64);
    } });

  add({ name: "Curve", file: "Testing stuff/Curve.cpp",
    note: "A bezier whose control points each ride their own beat", ms: 16,
    params: [{ k: "speed", label: "Speed", min: -14, max: 40, def: -5 },
             { k: "sub", label: "Sub-pixel", def: 0, opts: ["Off", "On"] }],
    init(s) { s.hue = 0; },
    draw(s, m) {
      m.fade(30);
      const sp = s.opt.speed;
      const x1 = beatsin8(18 + sp, 0, m.W - 1), x2 = beatsin8(23 + sp, 0, m.W - 1),
            x3 = beatsin8(27 + sp, 0, m.W - 1);
      const y1 = beatsin8(20 + sp, 0, m.H - 1), y2 = beatsin8(26 + sp, 0, m.H - 1),
            y3 = beatsin8(15 + sp, 0, m.H - 1);
      const col = CHSV(s.hue, 255, 255);
      for (let u = 0; u <= 1.0; u += 0.01) {
        const iu = 1 - u;
        const xu = iu * iu * iu * x1 + 3 * u * iu * iu * x2 + 3 * u * u * iu * x3 + u * u * u * x3;
        const yu = iu * iu * iu * y1 + 3 * u * iu * iu * y2 + 3 * u * u * iu * y3 + u * u * u * y3;
        if (s.opt.sub) m.wu(xu, yu, col); else m.add(Math.trunc(xu), Math.trunc(yu), col);
      }
      m.blur2d(64);
      s.hue = u8(s.hue + 1);
    } });

  add({ name: "Torch", file: "Testing stuff/Torch.cpp",
    note: "A raycast light cone walking a randomly built map", ms: 16,
    init(s, m) {
      const W = m.W, H = m.H, r = s.rnd;
      s.MW = W * 2; s.MH = H * 2;
      s.mape = new Uint8Array(W * H);
      s.lx = r(0, s.MW * 10); s.ly = r(0, s.MH * 10);
      s.alpha = 0; s.angle = 0;
      s.CX = u8((1 + Math.sin(0)) * W); s.CY = u8((1 + Math.cos(0)) * H);
      s.rot = r(-10, 10); s.act = true; s.period = 2; s.speed = 0;
      s.PosX = 0; s.PosY = 0;
      for (let i = 0; i < ((s.MH * s.MW / 64) | 0); i++) s.mape[r(0, H - 1) * W + r(0, W - 1)] = 1;
    },
    draw(s, m) {
      const W = m.W, H = m.H, MW = s.MW, MH = s.MH, POV = 75, PoV = (POV / 2) | 0;
      const ConstWR = (256 / W) | 0, Color = 40;
      const wall = (x, y) => { x %= MW; y %= MH; return (x < W && y < H) ? s.mape[y * W + x] : 0; };
      m.clear();
      if (!s.act) {
        s.alpha = u16(s.alpha + s.rot);
        s.CX = u8(Math.trunc(sin8(u8(map(s.alpha % 360, 0, 360, 0, 255))) / ConstWR));
        s.CY = u8(Math.trunc(cos8(u8(map(s.alpha % 360, 0, 360, 0, 255))) / ConstWR));
        s.angle = radians(s.alpha);
      } else {
        s.lx = u16(Math.trunc(s.lx + Math.sin(s.angle) * s.speed));
        s.ly = u16(Math.trunc(s.ly + Math.cos(s.angle) * s.speed));
        if (s.lx <= 0) s.lx = (MW - 1) * 10;
        if (s.lx > (MW - 1) * 10) s.lx = 1;
        if (s.ly <= 0) s.ly = (MH - 1) * 10;
        if (s.ly > (MH - 1) * 10) s.ly = 1;
        s.PosX = u8(Math.trunc(s.lx / 10)); s.PosY = u8(Math.trunc(s.ly / 10));
      }
      const beam = CHSV(Color, 200, 100);
      for (let pov = 0; pov < POV + 1; pov++) {
        const end = radians(s.alpha + pov - PoV - 1);
        const a = Math.sin(end), b = Math.cos(end);
        for (let i = 0; i < W + H; i++) {
          const ex = u8(Math.trunc(s.PosX + i * a)), ey = u8(Math.trunc(s.PosY + i * b));
          if (wall(ex, ey) || s.CX - i * a < 0 || s.CX - i * a >= MW ||
              s.CY - i * b < 0 || s.CY - i * b >= MH) break;
          m.add(s.CX - i * a, s.CY - i * b, beam);
        }
      }
      if (every(s, "act", s.period * 1000)) {
        if (s.act) { s.rot = s.rnd(-10, 10); s.speed = 0; s.period = s.rnd(2, 5); s.act = false; }
        else { s.speed = s.rnd(2, 20); s.rot = 0; s.period = s.rnd(5, 10); s.act = true; }
      }
    } });

  add({ name: "Camera Mode", file: "Testing stuff/Special Camera Mode.cpp",
    note: "One dot, but the camera swings the whole panel around it", ms: 16,
    draw(s, m) {
      slide(m, beatsin8(12, 0, 255), true);
      slide(m, beatsin8(15, 0, 255), false);
      const x = beatsin8(12, 2, m.W - 3), y = beatsin8(15, 2, m.H - 3);
      const c = CHSV(u8(Math.floor(s.ms / 100)), 255, 255);
      m.add(x, y, c);
      if (m.W > 24 || m.H > 24) {
        m.add(x + 1, y, c); m.add(x - 1, y, c); m.add(x, y + 1, c); m.add(x, y - 1, c);
      }
      m.blur2d(64);
    } });

  add({ name: "Gyroscope", file: "Other/Gyroscope.cpp",
    note: "Six axes tumbling in 3D, drawn as gradient lines", ms: 16,
    params: [{ k: "am", label: "Axes", min: 1, max: 32, def: 6 }],
    init(s) {
      s.am = s.opt.am; s.a = []; s.b = []; s.hue = 0;
      for (let i = 0; i < s.am; i++) { s.a.push(radians(s.rnd())); s.b.push(radians(s.rnd())); }
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      s.hue = u8(s.hue + 1);
      for (let i = 1; i < s.am + 1; i++) {
        s.a[i - 1] = (s.a[i - 1] + (beatsin8(3, 0, 50, 0, 4 * i) - 25) / 100) % 6.28318531;
        s.b[i - 1] = (s.b[i - 1] + (beatsin8(3, 0, 50, 0, (8 * i) + 64) - 25) / 100) % 6.28318531;
        const radA1 = s.a[i - 1] + 3.14159265;
        const x = (1 + Math.sin(s.a[i - 1]) * Math.cos(s.b[i - 1])) * W / 2;
        const y = (1 + Math.sin(s.a[i - 1]) * Math.sin(s.b[i - 1])) * H / 2;
        const z = Math.cos(s.a[i - 1]), z1 = Math.cos(radA1);
        lineF(m, x, y, W - 1 - x, H - 1 - y,
              CHSV(u8(127 + i * 32 + s.hue), 255, constrain(Math.trunc(112 * (1 + z) + 30), 96, 255)),
              CHSV(u8(i * 32 + s.hue), 255, constrain(Math.trunc(112 * (1 + z1) + 30), 96, 255)));
      }
      m.fade(64);
    } });

  // ------------------------------------------------------------ batch 7
  add({ name: "Walking machine", file: "Other/Walking machine.cpp",
    note: "Seven joints on slow beats, linked into a body", ms: 16,
    draw(s, m) {
      m.clear();
      const W = m.W, H = m.H, dot = [];
      for (let i = 0; i < 7; i++)
        dot.push([
          beatsin16(4, (W >> 3) << 8, (W - (W >> 3) - 1) << 8, i * 8192, i * 8192) / 255,
          beatsin16(4, (H >> 3) << 8, (H - (H >> 3) - 1) << 8, i * 4096, 16384 + i * 8192) / 255]);
      for (let i = 0; i < 7; i++) {
        const col = CHSV(u8(i * 32), 255, 255);
        for (let y = -4; y < 4; y++) for (let x = -4; x < 4; x++)
          if (x * x + y * y < 16) m.wu(dot[i][0] + x, dot[i][1] + y, col);
        lineF(m, dot[i][0], dot[i][1], dot[(i + 1) % 7][0], dot[(i + 1) % 7][1],
              col, CHSV(u8(((i + 1) % 7) * 32), 255, 255));
      }
    } });

  add({ name: "Holiday lights", file: "Other/Holiday lights.cpp",
    note: "A garland swinging row by row, with a star on top", ms: 16,
    init(s) { s.hue = 0; },
    draw(s, m) {
      const W = m.W, H = m.H, minDim = Math.min(W, H);
      const height_adj = H < W ? ((W - H) / 2) | 0 : 0;
      const speed = (200 / (H - 4)) | 0;
      s.hue = u8(s.hue + 1);
      m.fade(map(speed, 1, 255, 1, 10));
      for (let i = 0; i < minDim; i++) {
        const x = beatsin16(i * map(speed, 1, 255, 3, 20), i * 2, (minDim * 4 - 2) - (i * 2 + 2));
        wuX(m, x / 4 + height_adj, i,
            CFP(PAL.Ocean, inoise8(x * 10, i * 10, s.hue),
                u8(255 - ((Math.abs(x - W * 2) + i) * ((128 / W) | 0)))));
      }
      if (!(W & 1))
        m.set((W / 2 | 0) - ((Math.floor(s.ms) >> 9) & 1 ? 1 : 0),
              minDim - 1 - ((Math.floor(s.ms) >> 8) & 1 ? 1 : 0), CHSV(0, 255, 255));
      else
        m.set(W / 2 | 0, minDim - 1, CHSV(0, (Math.floor(s.ms) >> 9) & 1 ? 0 : 255, 255));
    } });

  add({ name: "Alone in the void", file: "Testing stuff/Alone in the void.cpp",
    note: "A noise cave, redrawn as the camera falls through it", ms: 16,
    params: [{ k: "scale", label: "Scale", min: 1, max: 64, def: 16 }],
    init(s) {
      s.bX = Math.imul(s.rnd(), s.rnd()) / 255;
      s.bY = s.rnd() % 200;
      s.bsX = 0; s.bsY = -25; s.t = 0;
    },
    draw(s, m) {
      const W = m.W, H = m.H, scale = s.opt.scale;
      const cx = (W / 2 - 0.5) * scale, cy = (H / 2 - 0.5) * scale;
      s.t = u32(s.t + 1);
      const nd = u16((s.t / 4) | 0);
      let guard = 0;
      while (inoise8(s.bX + cx, s.bY + cy, nd) >= 150 && guard++ < 4096) s.bY++;
      s.bX += s.bsX; s.bY += s.bsY;
      if (inoise8(s.bX + cx, s.bY + cy, nd) >= 150) {
        s.bX -= s.bsX; s.bY -= s.bsY;
        const best = [0, 0, 0];
        for (let i = 0; i < 360; i += 9) {
          const rad = radians(i);
          const nois = inoise8(s.bX + cx + scale * Math.cos(rad), s.bY + cy + scale * Math.sin(rad), nd);
          if (best[2] < nois) {
            const back = radians((i + 180) % 360);
            best[0] = Math.cos(back); best[1] = Math.sin(back); best[2] = nois;
          }
        }
        const sp = Math.hypot(s.bsX, s.bsY);
        s.bsY = best[1] * sp; s.bsX = best[0] * sp;
      }
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        const nois = inoise8(s.bX + x * scale, s.bY + y * scale, nd);
        m.set(x, y, nois >= 150 ? CHSV(nois, 255, constrain(Math.trunc(nois * 1.2), 0, 255)) : [0, 0, 0]);
      }
      m.wu(W / 2 - 0.5, H / 2 - 0.5, CHSV(0, 0, 255));
    } });

  add({ name: "Ghost Rider", file: "Other/Ghost Rider.cpp",
    note: "A rider that turns, and sparks thrown off its trail", ms: 16,
    params: [{ k: "reset", label: "Reset (s), 0 = off", min: 0, max: 60, def: 10 }],
    init(s, m) {
      const r = s.rnd;
      s.rider = { PosX: (m.W / 2 | 0) << 8, PosY: (m.H / 2 | 0) << 8, Angle: 0,
                  vSpeed: 128, angleSpeed: r(-10, 10) };
      s.n = m.W + m.H;
      s.tr = [];
      for (let i = 0; i < s.n; i++)
        s.tr.push({ PosX: s.rider.PosX, PosY: s.rider.PosY + i * 25,
                    SpeedX: 0, SpeedY: 0, time: i * 2, reg: false });
    },
    draw(s, m) {
      const W = m.W, H = m.H, r = s.rnd, rd = s.rider;
      m.fade(60);
      wuPixel32(m, rd.PosX, rd.PosY, [255, 255, 255]);
      rd.PosX = i16(rd.PosX + Math.trunc(rd.vSpeed * Math.sin(radians(rd.Angle))));
      rd.PosY = i16(rd.PosY + Math.trunc(rd.vSpeed * Math.cos(radians(rd.Angle))));
      rd.Angle = u16(rd.Angle + rd.angleSpeed);
      if (rd.PosX < 0) rd.PosX = (W - 1) << 8;
      if (rd.PosX > (W - 1) << 8) rd.PosX = 0;
      if (rd.PosY < 0) rd.PosY = (H - 1) << 8;
      if (rd.PosY > (H - 1) << 8) rd.PosY = 0;
      for (const t of s.tr) {
        t.time = u16(t.time + r(5, 20));
        if (t.time >= 255) t.reg = true;
        if (t.PosX < 0) t.PosX = (W - 1) << 8;
        if (t.PosX > (W - 1) << 8) t.PosX = 0;
        if (t.PosY < 0) t.PosY = (H - 1) << 8;
        if (t.PosY > (H - 1) << 8) t.PosY = 0;
        if (t.reg) {
          t.PosY = rd.PosY; t.PosX = rd.PosX;
          const off = -(r() % 10);
          t.SpeedX = i16(Math.trunc(-Math.sin(radians(rd.Angle + off)) * 244));
          t.SpeedY = i16(Math.trunc(-Math.cos(radians(rd.Angle + off)) * 244));
          t.time = 0; t.reg = false;
        } else { t.PosX = i16(t.PosX + t.SpeedX); t.PosY = i16(t.PosY + t.SpeedY); }
        wuPixel32(m, t.PosX, t.PosY, CFP(PAL.Heat, u8(256 - t.time)));
      }
      if (s.opt.reset > 0 && every(s, "reset", s.opt.reset * 1000)) {
        rd.angleSpeed = -(r() % 10);
        rd.vSpeed = r(128, 255);
      }
      m.blur2d(32);
    } });

  add({ name: "Soap", file: "Any recreations/Soap Bubble recreation.cpp",
    note: "Stefan Petrick's soap: the panel drags itself along a noise field", ms: 16,
    init(s, m) {
      const W = m.W, H = m.H, r = s.rnd;
      s.n3 = new Uint8Array(W * H);
      s.nx = r(0, 65536); s.ny = r(0, 65536); s.nz = r(0, 65536);
      s.sx = (160000 / W) | 0; s.sy = (160000 / H) | 0;
      s.mov = Math.max(W, H) * 47;
      fillSoapNoise(s, m);
      for (let i = 0; i < W; i++) for (let j = 0; j < H; j++)
        m.set(i, j, CHSV(u8(~s.n3[j * W + i] * 3), 255, 255));
    },
    draw(s, m) {
      s.nx = u32(s.nx + s.mov); s.ny = u32(s.ny + s.mov); s.nz = u32(s.nz + s.mov);
      fillSoapNoise(s, m);
      soapSlide(s, m, (m.W / 8) | 0, true);
      soapSlide(s, m, (m.H / 8) | 0, false);
    } });

  // ------------------------------------------------------------ batch 8
  add({ name: "Particle system", file: "Particle System/Particle system.cpp",
    note: "Sparks falling into an attractor at the centre", ms: 16,
    init(s, m) {
      const n = m.W;
      s.n = n; s.px = new Float64Array(n); s.py = new Float64Array(n);
      s.sx = new Float64Array(n); s.sy = new Float64Array(n);
      s.fade = new Float64Array(n); s.col = new Uint8Array(n);
      s.gen = [0, 0]; s.grav = [m.W / 2, m.H / 2];
      const phys = i => psAttract(s, m, i);
      for (let i = 0; i < n; i++) { psReg(s, i); for (let a = 0; a < i; a++) phys(a); }
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      m.fade(20);
      s.gen[0] = beatsin16(10, 0, (W - 1) * 10) / 10;
      s.gen[1] = beatsin16(10, 0, (H - 1) * 10, 0, 16384) / 10;
      s.grav = [W / 2, H / 2];
      for (let i = 0; i < s.n; i++) {
        if (s.px[i] <= 0 || s.px[i] >= W - 1 || s.py[i] < 0 || s.py[i] >= H - 1 || s.fade[i] <= 35)
          psReg(s, i);
        psAttract(s, m, i);
        if (s.py[i] < H - 1 && s.py[i] >= 0 && s.px[i] < W - 1 && s.px[i] >= 0)
          wuPixel32(m, s.px[i] * 255, s.py[i] * 255,
                    CHSV(s.col[i], 255, constrain(Math.trunc(s.fade[i]), 32, 255)));
      }
    } });

  add({ name: "Jumping balls", file: "Particle System/Jumping balls.cpp",
    note: "Balls that fall to the floor and bounce back up", ms: 16,
    params: [{ k: "board", label: "Walls", def: 1, opts: ["Open", "Bounce"] }],
    init(s, m) {
      const n = m.W;
      s.n = n; s.px = new Int16Array(n); s.py = new Int16Array(n);
      s.sx = new Float64Array(n); s.sy = new Float64Array(n);
      s.fade = new Float64Array(n); s.col = new Uint8Array(n);
      s.gen = [0, 0];
      for (let i = 0; i < n; i++) {
        jbReg(s, m, i);
        s.fade[i] = u8(s.rnd());
        for (let a = 0; a < i; a++) jbPhys(s, m, i);
      }
    },
    draw(s, m) {
      s.gen[0] = beatsin16(10, 0, m.W * 10);
      s.gen[1] = beatsin16(10, 0, m.H * 10, 0, 16384);
      m.clear();
      for (let i = 0; i < s.n; i++) {
        if (s.fade[i] <= 35) jbReg(s, m, i);
        jbPhys(s, m, i);
        if (s.px[i] < (m.H - 1) * 10 && s.py[i] >= 0 && s.px[i] < (m.W - 1) * 10 && s.px[i] >= 0)
          wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6,
                    CHSV(s.col[i], 255, constrain(Math.trunc(s.fade[i]), 32, 255)));
      }
    } });

  add({ name: "Fire (particles)", file: "Particle System/Fire(particle system).cpp",
    note: "The same particle rig, aimed upward and blurred hard", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 255 }],
    init(s, m) {
      const W = m.W, H = m.H, LEN = H, sp = s.opt.speed;
      s.cfg = {
        LEN: LEN, n: H * 4,
        SpeedK: fmap(sp, 1, 255, 0.2, 2), kx: 1, ky: 1,
        DecX: fmap(m.N, 256, 1024, 0.05, 0.8) * fmap(sp, 1, 255, 0.1, 1), DecY: 0,
        fadeStep: 255 / (LEN * (fmap(H, 16, 32, 0.8, 0.5) * fmap(sp, 1, 255, 3.5, 1))),
        clamp: false,
        vx: al => Math.sin(radians(128 - al)) * ((LEN / 2) | 0) * fmap(sp, 1, 255, 0.1, 1),
        vy: al => Math.cos(radians(128 - al)) * ((LEN / 8) | 0) * fmap(sp, 1, 255, 0.1, 1),
        spawn: (s, m, i) => { s.px[i] = s.gen[0]; s.py[i] = s.gen[1]; },
        dead: (s, m, i) => s.px[i] <= 0 || s.px[i] >= (m.W - 1) * 10 || s.py[i] < 0 ||
                           s.py[i] >= (m.H - 1) * 10 || s.fade[i] < 20
      };
      psInit(s, m);
      s.gen = [W * 5, H];
      s.grav = [0, 0];
      psStart(s, m);
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      const noise = inoise8(u16(Math.floor(s.ms / 16)));
      s.grav = [map(noise, 0, 255, W * 4, W * 6),
                map(Math.abs(128 - noise), 0, 127, H * 8, H * 11)];
      m.fade(150);
      for (let i = 0; i < s.cfg.n; i++) {
        if (s.cfg.dead(s, m, i)) psRegC(s, m, i);
        psPhys(s, m, i);
        const f = s.fade[i];
        const c = CHSV(u8(Math.trunc(10 + f / 25.5)), constrain(Math.trunc(255 - f / 5), 0, 255), u8(f));
        if (s.py[i] < (H - 1) * 10 && s.py[i] >= 0 && s.px[i] < (W - 1) * 10 && s.px[i] >= 0) {
          wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6, c);
          if (s.cfg.LEN > 24) {
            wuPixel32(m, (s.px[i] + 1) * 25.6, s.py[i] * 25.6, c);
            wuPixel32(m, s.px[i] * 25.6, (s.py[i] + 1) * 25.6, c);
            wuPixel32(m, (s.px[i] - 1) * 25.6, s.py[i] * 25.6, c);
            wuPixel32(m, s.px[i] * 25.6, (s.py[i] - 1) * 25.6, c);
          }
        }
      }
      m.blur2d(128);
    } });

  add({ name: "Lava (particles)", file: "Particle System/Lava(particle system).cpp",
    note: "Particles spawned across the floor, pulled sideways by noise", ms: 16,
    init(s, m) {
      const W = m.W, H = m.H;
      s.cfg = {
        n: (W * 0.5) | 0, SpeedK: 2, kx: 0.5, ky: 1, DecX: 0.1, DecY: 0,
        fadeStep: 255 / (H * 1.2), clamp: true,
        vx: al => Math.sin(radians(al - 128)) * ((W / 2) | 0),
        vy: al => Math.cos(radians(al - 128)) * ((H / 8) | 0),
        spawn: (s, m, i) => { s.px[i] = s.rnd(0, m.W * 10); s.py[i] = s.gen[1]; s.born = true; },
        dead: (s, m, i) => s.px[i] < 0 || s.py[i] >= m.W * 10 || s.py[i] < 0
      };
      psInit(s, m);
      s.gen = [W * 5, H * 10];
      s.grav = [0, 0];
      s.fadeIsClock = true;
      psStart(s, m);
    },
    draw(s, m) {
      const W = m.W;
      const noise = inoise8(u16(Math.floor(s.ms / 10)));
      s.grav = [map(Math.abs(128 - noise), 0, 127, W, W * 9), 0];
      m.fade(16);
      for (let i = 0; i < s.cfg.n; i++) {
        if (s.cfg.dead(s, m, i)) psRegC(s, m, i);
        psPhys(s, m, i);
        if (s.py[i] < (m.H - 1) * 10 && s.py[i] >= 0 && s.px[i] < (W - 1) * 10 && s.px[i] >= 0)
          wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6, CFP(PAL.Heat, u8(Math.trunc(255 - s.fade[i]))));
      }
      m.blur2d(4);
    } });

  add({ name: "Wind (particles)", file: "Particle System/Wind(particle system).cpp",
    note: "Motes blown in from the left edge, drifting with the noise", ms: 16,
    init(s, m) {
      const W = m.W, H = m.H;
      s.cfg = {
        n: (H * 0.5) | 0, SpeedK: 2, kx: 1, ky: 0.5, DecX: 0.1, DecY: 0,
        fadeStep: 255 / (W * 1.2), clamp: true,
        vx: al => Math.sin(radians(128 - al)) * ((W / 2) | 0),
        vy: al => Math.cos(radians(128 - al)) * ((H / 8) | 0),
        spawn: (s, m, i) => { s.px[i] = s.gen[0]; s.py[i] = s.rnd(0, m.H * 10); },
        dead: (s, m, i) => s.px[i] >= (m.W - 1) * 10 || s.py[i] < 0 ||
                           s.py[i] >= (m.H - 1) * 10 || s.fade[i] < 20
      };
      psInit(s, m);
      s.gen = [0, H * 5];
      s.grav = [0, 0];
      psStart(s, m);
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      const noise = inoise8(u16(Math.floor(s.ms / 10)));
      s.grav = [W * 11, map(Math.abs(128 - noise), 0, 127, H, H * 9)];
      m.fade(20);
      for (let i = 0; i < s.cfg.n; i++) {
        if (s.cfg.dead(s, m, i)) psRegC(s, m, i);
        psPhys(s, m, i);
        if (s.py[i] < (H - 1) * 10 && s.py[i] >= 0 && s.px[i] < (W - 1) * 10 && s.px[i] >= 0)
          wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6, CHSV(0, 0, u8(s.fade[i])));
      }
    } });

  // ------------------------------------------------------------ batch 9
  add({ name: "Dist Lines", file: "Any recreations/DistLines.cpp",
    note: "Three noise-walked nodes, linked whenever they drift close", ms: 16,
    params: [{ k: "counts", label: "Nodes", min: 2, max: 12, def: 3 },
             { k: "speed", label: "Speed", min: 1, max: 255, def: 1 }],
    init(s) { s.hue = 0; s.speedFactor = 0; },
    draw(s, m) {
      const W = m.W, H = m.H, COUNTS = s.opt.counts;
      const dXc = 255 / W, dYc = 255 / H;
      const N = (x, y, z) => {
        const v = inoise8(x, y, z);
        return qadd8(qsub8(v, 16), scale8(qsub8(v, 16), 39));
      };
      const t = s.ms * s.speedFactor;
      m.fade(192);
      s.hue = u8(s.hue + 1);
      s.speedFactor = fmap(s.opt.speed, 1, 255, 0.05, 1.5);
      const x = [], y = [];
      for (let i = 0; i < COUNTS; i++) {
        x[i] = N(t + i * 100, i * 200, i * 1000) / dXc;
        y[i] = N(i * 200, t + i * 100, i * 200) / dYc;
      }
      const bri = i => u8(Math.trunc(256 - ((256 / H) | 0) * Math.abs(((H / 2) | 0) - y[i])));
      for (let i = 0; i < COUNTS; i++) {
        for (let j = i; j < COUNTS; j++) {
          const dx = u8(x[j]) - u8(x[i]), dy = u8(y[j]) - u8(y[i]);
          const a = u8(Math.trunc(Math.sqrt(dx * dx + dy * dy)));
          if (i !== j && a <= ((W / 2) | 0))
            lineF(m, x[i], y[i], x[j], y[j],
                  CHSV(u8(s.hue + i * ((256 / COUNTS) | 0)), 255, bri(i)),
                  CHSV(u8(s.hue + j * ((256 / COUNTS) | 0)), 255, bri(j)));
        }
        fillCircleF(m, x[i], y[i], N(i * 300, i * 150, t + i * 200) / 64,
                    CHSV(u8(s.hue + i * ((256 / COUNTS) | 0)), 255, bri(i)));
      }
      m.blur2d(32);
    } });

  add({ name: "Bengal fire", file: "Any recreations/Bengal fire.cpp",
    note: "A sparkler: white sparks that colour up as they fall", ms: 16,
    init(s, m) {
      const W = m.W, H = m.H;
      s.cfg = {
        n: W + H, SpeedK: 0.98, kx: 0, ky: 1, DecX: 0.01, DecY: 0,
        fadeStep: 255 / ((H + W) * 0.5), satStep: 255 / ((W + W) * (0.5 - 0.2)),
        clamp: false,
        vx: () => s.rnd(-10, 10), vy: () => s.rnd(-5, 20),
        spawn: (s, m, i) => { s.px[i] = s.gen[0]; s.py[i] = s.gen[1]; s.sat[i] = 10; s.col[i] = u8(s.rnd()); },
        dead: (s, m, i) => s.px[i] <= 0 || s.px[i] >= (m.W - 1) * 10 || s.py[i] < 0
      };
      psInit(s, m);
      s.sat = new Float64Array(s.cfg.n); s.col = new Uint8Array(s.cfg.n);
      s.gen = [W * 5, H * 5]; s.grav = [0, 0];
      for (let i = 0; i < s.cfg.n; i++) { psRegC(s, m, i); for (let a = 0; a < i; a++) psPhys(s, m, a); }
      s.period = 10;
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      m.fade(beatsin8(5, 20, 100));
      s.gen = [W * 5, H * 5]; s.grav = [0, 0];
      for (let i = 0; i < s.cfg.n; i++) {
        if (s.cfg.dead(s, m, i)) psRegC(s, m, i);
        psPhys(s, m, i);
        if (s.py[i] < (H - 1) * 10 && s.py[i] >= 0 && s.px[i] < (W - 1) * 10 && s.px[i] >= 0)
          wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6,
                    CHSV(s.col[i], constrain(Math.trunc(s.sat[i]), 5, 255),
                         constrain(Math.trunc(s.fade[i]), 32, 255)));
        if (every(s, "relight", s.period * 1000)) {
          for (let a = 0; a < s.cfg.n; a++) psRegC(s, m, a);
          s.period = s.rnd(10, 60);
        }
      }
    } });

  add({ name: "Monster Face", file: "Testing stuff/Monster Face.cpp",
    note: "A face drawn three times, one channel each, slightly out of step", ms: 16,
    draw(s, m) {
      const W = m.W, H = m.H;
      const t = Math.trunc(s.ms / 100);
      m.clear();
      const X1 = (W / 16) | 0, Y1 = (H / 16) | 0, X2 = (W / 8) | 0, Y2 = ((H / 2) | 0) - 1;
      const X3 = (W / 4) | 0, Y3 = (H / 4) | 0, X4 = (W / 3) | 0, Y4 = (H / 2) | 0;
      const X5 = (W / 2) | 0, Y5 = (H / 3) | 0;
      const Yb = (H / 5) | 0, Ye = H - ((H / 4) | 0);
      const iX1 = W - ((W / 16) | 0), iX2 = W - ((W / 8) | 0), iX3 = W - ((W / 4) | 0);
      const iX4 = W - ((W / 3) | 0), iX5 = W - ((W / 2) | 0);
      const face = (V, T, ox, oy) => {
        const L = (a, b, c, d) => lineCh(m, a + ox, b + oy, c + ox, d + oy, V, T);
        L(X1, Y1, X2, Y2); L(X2, Y2, X3, Y3); L(X3, Y3, X4, Y4); L(X4, Y4, X5, Y5);
        L(X1, Y1, X4, Yb); L(X4, Yb, X5, Y1); L(X5, Y1, iX5, Y1);
        L(iX5, Y1, iX4, Yb); L(iX4, Yb, iX1, Y1);
        L(X5, Y5, iX5, Y5); L(iX5, Y5, iX4, Y4); L(iX4, Y4, iX3, Y3);
        L(iX3, Y3, iX2, Y2); L(iX2, Y2, iX1, Y1);
        circleCh(m, X3 + ox, Ye + oy, (W / 6) | 0, V, T);
        circleCh(m, iX3 + ox, Ye + oy, (W / 6) | 0, V, T);
      };
      face(255, 0, Math.sin(t), Math.cos(t));
      face(255, 1, Math.sin(t * 2), Math.cos(t * 2));
      face(255, 2, Math.sin(t * 1.5), Math.cos(t * 1.5));
    } });

  add({ name: "Sinusoid", file: "Updated existing Effects/Sinusoid Update.cpp",
    note: "Stefan Petrick's sinusoid: two ripple centres on a lissajous", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 30 },
             { k: "scale", label: "Scale", min: 1, max: 255, def: 1 },
             { k: "amp", label: "Amplitude", min: 1, max: 255, def: 200 }],
    init(s, m) {
      s.speed = 0.004 * s.opt.speed + 0.015;
      s.size = fmap(s.opt.amp, 1, 255, 3, 9);
      s.scale = (FL.map8 ? FL.map8(s.opt.scale, 50, 150) : 50) / 2;
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      const shY = H / 2 + (H % 2), shX = W / 2 + (W % 2);
      const ts = s.ms;
      const sh = f => s.size * sin16(u16(Math.trunc(s.speed * f * ts))) / 32767;
      const s0x = sh(98.301), s0y = sh(72.0874), s1x = sh(134.3447), s1y = sh(170.3884);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let cx = (y - shY) + s0x, cy = (x - shX) + s0y;
        let v = i8(sin8(u8(Math.trunc(s.scale * Math.sqrt(cx * cx + cy * cy)))));
        const r = u8(~v);
        cx = (y - shY) + s1x; cy = (x - shX) + s1y;
        v = i8(sin8(u8(Math.trunc(s.scale * Math.sqrt(cx * cx + cy * cy)))));
        m.set(x, y, [r, 0, u8(~v)]);
      }
    } });

  // ----------------------------------------------------------- batch 10
  add({ name: "Bombs", file: "Other/Bombs.cpp",
    note: "Shells that arc up, stall, and go off", ms: 16,
    init(s, m) {
      s.n = Math.max(1, (m.N / 128) | 0);
      s.dot = [];
      for (let i = 0; i < s.n; i++) {
        const d = { PosX: 0, PosY: 0, SpeedX: 0, SpeedY: 0, Fade: 0, Color: 0 };
        bombReg(s, m, d);
        d.PosY = m.H << 8;
        d.PosX = s.rnd(0, m.W - 1) << 8;
        d.Fade = s.rnd(0, 1024);
        s.dot.push(d);
      }
    },
    draw(s, m) {
      m.fade(32);
      for (const d of s.dot) {
        bombPhysics(s, m, d);
        if (d.PosX < ((m.H - 1) << 8) && d.PosY >= 0 && d.PosX < ((m.W - 1) << 8) && d.PosX >= 0)
          wuPixel32(m, d.PosX, d.PosY, CHSV(d.Color, 255, 255));
      }
    } });

  add({ name: "Spider", file: "Other/Spider.cpp",
    note: "Seven lines whose ends orbit, weaving a web", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 255, def: 240 },
             { k: "lines", label: "Lines", min: 1, max: 16, def: 7 },
             { k: "koef", label: "Koef", min: 1, max: 16, def: 10 },
             { k: "fader", label: "Fade", min: 1, max: 255, def: 64 }],
    draw(s, m) {
      const W = m.W, H = m.H, L = Math.min(W, H), lines = s.opt.lines, Koef = s.opt.koef;
      m.fade(s.opt.fader);
      const t = s.ms / ((256 - s.opt.speed) * 50);
      const ShX = W - L, ShY = H - L;
      for (let a = 0; a < lines; a++) {
        const xx = ((L / 2) | 0) - 1 >= 0 ? (L / 2 - 1) * (1 + Math.sin(t + 100 * a * Koef)) : 0;
        const yy = (L / 2 - 1) * (1 + Math.cos(t + 150 * a * Koef));
        const col = CHSV(u8(a * ((256 / lines) | 0)), 200, 128);
        lineF(m, ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, col, col);
      }
    } });

  add({ name: "Sending", file: "Updated existing Effects/Sending.cpp",
    note: "Voxels handed from one edge of the panel to the other", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 64, def: 5 }],
    init(s, m) {
      s.pos = new Int32Array(m.W);
      for (let i = 0; i < m.W; i++) s.pos[i] = (s.rnd(2) === 1) ? (m.H - 1) * 256 : 0;
      s.sending = false; s.dir = 1; s.selX = 0;
    },
    draw(s, m) {
      const W = m.W, H = m.H, speed = s.opt.speed;
      for (let i = 0; i < W; i++) {
        const color = CHSV(150, 255, 255);
        if (i === s.selX) wuPixel32Y(m, i, s.pos[i], color);
        else m.add(i, (s.pos[i] / 256) | 0, color);
        if (!s.sending) {
          s.selX = s.rnd(0, W);
          if (s.pos[s.selX] === 0) s.dir = 1;
          else if (s.pos[s.selX] === (H - 1) * 256) s.dir = 0;
          s.sending = true;
        } else if (s.dir) {
          s.pos[s.selX] += speed;
          if (s.pos[s.selX] >= (H - 1) * 256) { s.pos[s.selX] = (H - 1) * 256; s.sending = false; }
        } else {
          s.pos[s.selX] -= speed;
          if (s.pos[s.selX] <= 0) { s.pos[s.selX] = 0; s.sending = false; }
        }
      }
      m.blur2d(35);
    } });

  // ----------------------------------------------------------- batch 11
  add({ name: "Minesweeper", file: "Any recreations/Minesweeper.cpp",
    note: "It plays itself, flood-filling until it hits a mine", ms: 16,
    init(s, m) { s.gen = minesweeper(s, m); },
    draw(s, m) { if (s.gen.next().done) s.gen = minesweeper(s, m); } });

  add({ name: "Puzzles", file: "Any recreations/Puzzles.cpp",
    note: "A sliding tile puzzle shuffling itself, one tile at a time", ms: 16,
    params: [{ k: "px", label: "Tile W", min: 2, max: 12, def: 4 },
             { k: "py", label: "Tile H", min: 2, max: 12, def: 4 },
             { k: "shspeed", label: "Slide speed", min: 8, max: 128, def: 64 }],
    init(s, m) {
      const PX = s.opt.px, PY = s.opt.py;
      s.PX = PX; s.PY = PY;
      s.PCols = ((m.W / PX) | 0) + (m.W % PX ? 1 : 0);
      s.PRows = ((m.H / PY) | 0) + (m.H % PY ? 1 : 0);
      s.p = [];
      for (let x = 0; x < s.PCols; x++) {
        s.p.push([]);
        for (let y = 0; y < s.PRows; y++) s.p[x][y] = s.rnd(16, 255);
      }
      s.z = [s.rnd(0, s.PCols), s.rnd(0, s.PRows)];
      s.p[s.z[0]][s.z[1]] = 0;
      s.etap = 0; s.move = [0, 0]; s.shift = [0, 0]; s.XorY = false; s.tmpp = 0;
    },
    draw(s, m) {
      const PX = s.PX, PY = s.PY;
      for (let x = 0; x < s.PCols; x++) for (let y = 0; y < s.PRows; y++)
        square(m, x * PX, y * PY, (x + 1) * PX, (y + 1) * PY, s.p[x][y]);
      switch (s.etap) {
        case 0:
          s.XorY = !s.XorY;
          if (s.XorY) {
            if (s.z[0] === s.PCols - 1) s.move[0] = -1;
            else if (s.z[0] === 0) s.move[0] = 1;
            else s.move[0] = s.move[0] === 0 ? (s.rnd() % 2) * 2 - 1 : s.move[0];
          } else {
            if (s.z[1] === s.PRows - 1) s.move[1] = -1;
            else if (s.z[1] === 0) s.move[1] = 1;
            else s.move[1] = s.move[1] === 0 ? (s.rnd() % 2) * 2 - 1 : s.move[1];
          }
          s.move[s.XorY ? 1 : 0] = 0;
          s.etap = 1;
          break;
        case 1:
          s.tmpp = s.p[s.z[0] + s.move[0]][s.z[1] + s.move[1]];
          s.p[s.z[0] + s.move[0]][s.z[1] + s.move[1]] = 0;
          s.etap = 2;
          break;
        case 2: {
          const zx = s.z[0] + s.move[0], zy = s.z[1] + s.move[1];
          wuSquare(m, ((zx * PX) << 8) + s.shift[0], ((zy * PY) << 8) + s.shift[1],
                      (((zx + 1) * PX) << 8) + s.shift[0], (((zy + 1) * PY) << 8) + s.shift[1], s.tmpp);
          s.shift[0] -= s.move[0] * s.opt.shspeed;
          s.shift[1] -= s.move[1] * s.opt.shspeed;
          if (Math.abs(s.shift[0]) >= ((m.W / s.PCols) | 0) << 8 ||
              Math.abs(s.shift[1]) >= ((m.H / s.PRows) | 0) << 8) {
            s.shift[0] = 0; s.shift[1] = 0;
            s.p[s.z[0]][s.z[1]] = s.tmpp;
            s.etap = 3;
          }
          break;
        }
        case 3:
          s.z[0] += s.move[0]; s.z[1] += s.move[1];
          s.etap = 0;
          break;
      }
    } });

  add({ name: "Maze", file: "Updated existing Effects/Maze.cpp",
    note: "A maze dug at random, then solved by keeping one hand on the wall", ms: 16,
    init(s, m) { s.start = true; },
    draw(s, m) {
      const W = m.W, H = m.H;
      const MW = W + (W % 2 ? 0 : 1), MH = H + (H % 2 ? 0 : 1);
      const SX = W % 2 ? 0 : 1, SY = H % 2 ? 0 : 1;
      const wall = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? 1 : s.maze[y * MW + x];
      if (s.start) {
        s.start = false;
        s.maze = new Uint8Array(MW * MH).fill(1);
        s.color = u8(s.rnd());
        s.MW = MW; s.MH = MH;
        digMaze(s, MW, MH);
        s.posX = 0; s.posY = 1; s.checkFlag = true; s.look = 0; s.sub = 0;
        s.tale = s.rnd() % 2;
      }
      if (!s.tale)
        for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
          m.set(x, y, wall(x + SX, y + SY) ? CHSV(s.color, 200, 255) : [0, 0, 0]);
      if (s.checkFlag) {
        const px = s.posX, py = s.posY;
        if (s.look === 0 && !wall(px, py - 1)) s.look = 1;
        else if (s.look === 1 && !wall(px - 1, py)) s.look = 2;
        else if (s.look === 2 && !wall(px, py + 1)) s.look = 3;
        else if (s.look === 3 && !wall(px + 1, py)) s.look = 0;
        let guard = 0;
        while (guard++ < 8) {
          let turned = false;
          if (s.look === 0 && wall(px + 1, py)) { s.look = 3; turned = true; }
          else if (s.look === 1 && wall(px, py - 1)) { s.look = 0; turned = true; }
          else if (s.look === 2 && wall(px - 1, py)) { s.look = 1; turned = true; }
          else if (s.look === 3 && wall(px, py + 1)) { s.look = 2; turned = true; }
          if (!turned) break;
        }
        s.checkFlag = false;
      }
      s.sub += 64;
      if (s.sub >= 255) {
        s.sub = 0;
        s.checkFlag = true;
        if (s.look === 0) s.posX = u8(s.posX + 1);
        else if (s.look === 1) s.posY = u8(s.posY - 1);
        else if (s.look === 2) s.posX = u8(s.posX - 1);
        else s.posY = u8(s.posY + 1);
      }
      const f = s.sub / 255, white = [255, 255, 255];
      if (s.look === 0) blend4(m, s.posX - SX + f, s.posY - SY, white);
      else if (s.look === 1) blend4(m, s.posX - SX, s.posY - SY - f, white);
      else if (s.look === 2) blend4(m, s.posX - SX - f, s.posY - SY, white);
      else blend4(m, s.posX - SX, s.posY - SY + f, white);
      if (s.posX === MW - 2 && s.posY === MH - 1) s.start = true;
    } });

  // ----------------------------------------------------------- batch 12
  add({ name: "Flags", file: "Other/Flags.cpp",
    note: "Nine flags rippling on a noise wave, one every thirty seconds", ms: 16,
    params: [{ k: "speed", label: "Speed", min: 1, max: 16, def: 16 },
             { k: "chg", label: "Flag 0-8, or change (s)", min: 0, max: 60, def: 30 }],
    init(s) { s.counter = 0; s.flag = s.opt.chg >= 9 ? 0 : s.opt.chg; },
    draw(s, m) {
      const W = m.W, H = m.H;
      const DEV = 512 / W, ADJ = m.N / 512;
      const mix = (a1, a2, l) => Math.trunc((a1 * l + a2 * (255 - l)) / 255);
      if (s.opt.chg >= 9 && every(s, "flag", s.opt.chg * 1000))
        s.flag = s.flag >= 8 ? 0 : s.flag + 1;
      m.fade(32);
      for (let i = 0; i < W; i++) {
        const thisVal = u8(mix(inoise8(i * DEV - s.counter, s.counter / 2, i * ADJ), 128,
                               u8(i * ((255 / W) | 0))));
        const thisMax = u8(map(thisVal, 0, 255, 0, H - 1));
        for (let j = 0; j < H; j++) {
          const ref = (s.flag === 1 || s.flag === 8) ? (H - 1 - j) : j;
          if (thisMax > ref + ((H / 2) | 0) || thisMax < ref - ((H / 2) | 0)) m.set(i, j, [0, 0, 0]);
          else m.add(i, j, FLAGS[s.flag](i, j, thisVal, thisMax, W, H));
        }
      }
      m.blur2d(40);
      s.counter += s.opt.speed * ADJ;
    } });

  add({ name: "2048", file: "Testing stuff/2048.cpp",
    note: "The game playing itself with random swipes", ms: 160,
    init(s) { s.grid = null; },
    draw(s, m) {
      const W = m.W, H = m.H, GC = 4, GR = 4;
      if (!s.grid) { s.grid = []; for (let x = 0; x < GC; x++) s.grid.push(new Int32Array(GR)); newTile(s, GC, GR); newTile(s, GC, GR); }
      else moveTiles(s, s.rnd() % 4, GC, GR);
      const cw = (W / GC) | 0, ch = (H / GR) | 0;
      for (let x = 0; x < GC; x++) for (let y = 0; y < GR; y++) {
        const v = s.grid[x][y];
        const col = v ? u8(Math.trunc(Math.log2(v) * 23)) : 0;
        for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) {
          const px = x * cw + i, py = y * ch + j;
          if (!v) m.set(px, py, [0, 0, 0]);
          else if (i === 0 || i === cw - 1 || j === 0 || j === ch - 1)
            m.set(px, py, CFP(PAL.Rainbow, col));
          else m.set(px, py, CFP(PAL.Rainbow, col, 160));
        }
      }
      if (gameEnded(s, GC, GR)) {
        for (let x = 0; x < GC; x++) s.grid[x].fill(0);
        newTile(s, GC, GR); newTile(s, GC, GR);
      }
    } });

  // ----------------------------------------------------------- batch 13
  add({ name: "Racer", file: "Other/Racer.cpp",
    note: "A racer pulled toward a target, which explodes into a shape when caught", ms: 16,
    init(s, m) {
      s.D = [s.rnd() % m.W, s.rnd() % m.H];
      s.R = [s.rnd() % m.W, s.rnd() % m.H];
      s.V = [0, 0]; s.fade = 255;
      s.radius = 1; s.angle = 0; s.points = 5; s.hue = 0;
    },
    draw(s, m) {
      const W = m.W, H = m.H, addRadius = m.N / 8000;
      m.fade(20);
      // phisics()
      let fx = s.D[0] - s.R[0], fy = s.D[1] - s.R[1];
      let d = Math.hypot(fx, fy);
      fx *= 1 / d; fy *= 1 / d;
      d = constrain(d, 5, H * 2);
      const sc = 75 / (d * d);
      s.V[0] += fx * sc; s.V[1] += fy * sc;
      s.fade -= 255 / (((H + W) / 2) * 0.5);
      let sq = s.V[0] * s.V[0] + s.V[1] * s.V[1];
      if (sq > 2.25) { sq = Math.sqrt(sq); s.V[0] *= (1 / sq) * 1.5; s.V[1] *= (1 / sq) * 1.5; }
      s.R[0] += s.V[0]; s.R[1] += s.V[1];
      if (s.R[1] < H - 1 && s.R[1] >= 0 && s.R[0] < W - 1 && s.R[0] >= 0)
        wuB(m, s.R[0], s.R[1], [255, 255, 255]);
      if (Math.hypot(s.R[0] - s.D[0], s.R[1] - s.D[1]) <= 0.75) {
        s.D = [s.rnd() % W, s.rnd() % H];
        const a = Math.hypot(s.D[0] - s.R[0], s.D[1] - s.R[1]);
        s.V[0] *= 1 / a; s.V[1] *= 1 / a;
        s.points = s.rnd(3, 7);
        s.radius = 1;
        s.hue = u8(Math.floor(s.ms) >> 1);
      }
      s.radius += addRadius;
      s.angle = Math.trunc(s.angle + s.radius);
      const col = CFP(PAL.Heat, u8(Math.trunc(255 - s.fade)));
      if (s.hue % 3 === 0) circleF(m, s.D[0], s.D[1], s.radius, col);
      else if (s.hue % 3 === 1) starF(m, s.D[0], s.D[1], 1.3 * s.radius, s.radius, 4, s.angle, col);
      else starF(m, s.D[0], s.D[1], 2 * s.radius, s.radius, s.points, s.angle, col);
    } });

  add({ name: "Wandering souls", file: "Other/Wandering souls.cpp",
    note: "Thirty lighters drifting on straight lines, wrapping at the edges", ms: 16,
    init(s, m) {
      const n = m.W + m.H;
      s.n = n;
      s.px = new Int16Array(n); s.py = new Int16Array(n);
      s.sx = new Uint16Array(n); s.sy = new Uint16Array(n);
      s.sz = new Uint8Array(n); s.col = new Uint8Array(n);
      s.count = map(8, 1, 16, 2, n);
      soulsSeed(s, m, 0, n);
    },
    draw(s, m) {
      const W = m.W, H = m.H;
      m.fade(50);
      for (let i = 0; i < s.count; i++) {
        s.col[i] = u8(s.col[i] + 1);
        s.px[i] = i16(s.px[i] + s.sx[i]);
        s.py[i] = i16(s.py[i] + s.sy[i]);
        if (s.px[i] < 0) s.px[i] = (W - 1) * 10;
        if (s.px[i] > (W - 1) * 10) s.px[i] = 0;
        if (s.py[i] < 0) s.py[i] = (H - 1) * 10;
        if (s.py[i] > (H - 1) * 10) s.py[i] = 0;
        wuPixel32(m, s.px[i] * 25.6, s.py[i] * 25.6,
                  CHSV(s.col[i], 255, beatsin8(s.sz[i], 128, 255)));
      }
      if (every(s, "reset", 10000)) soulsSeed(s, m, 0, s.count, true);
    } });

  add({ name: "Sprite decoder", file: "Testing stuff/Little animation image decoder.cpp",
    note: "A ten-frame RGB332 sprite, unpacked and scaled to the panel", ms: 50,
    init(s) {
      if (!SPRITE) {
        const bin = atob(SPRITE_B64);
        SPRITE = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) SPRITE[i] = bin.charCodeAt(i);
      }
      s.frame = 0;
    },
    draw(s, m) {
      const fw = SPRITE[0], fh = SPRITE[1], frames = SPRITE[2];
      const steps = Math.min((m.W / fw) | 0, (m.H / fh) | 0);
      let p = 3 + fw * fh * s.frame;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const col = rgb332(SPRITE[p++]);
        for (let sx = x * steps; sx < x * steps + steps; sx++)
          for (let sy = y * steps; sy < y * steps + steps; sy++)
            m.set(sx, m.W - 1 - sy, col);
      }
      s.frame++;
      if (s.frame >= frames) s.frame = 0;
    } });

  add({ name: "Patterns", file: "Updated existing Effects/Patterns.cpp",
    note: "Thirty-eight woven patterns, scrolling diagonally", ms: 16,
    init(s) { s.x = 0; s.y = 0; s.idx = 23; s.h6 = 0; s.h7 = 96; },
    draw(s, m) {
      const W = m.W, H = m.H;
      s.x += 0.2; s.y += 0.1;
      if (every(s, "hue", 256)) { s.h6 = u8(s.h6 + 1); s.h7 = u8(s.h6 + 96); }
      const pal = patternPalette(s);
      m.clear();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const py = Math.trunc(s.y + y) % 10, px = Math.trunc(s.x + x) % 10;
        m.set(x, H - 1 - y, pal[PATTERNS.charCodeAt((s.idx * 100) + py * 10 + px) - 48 < 10
          ? PATTERNS.charCodeAt((s.idx * 100) + py * 10 + px) - 48
          : PATTERNS.charCodeAt((s.idx * 100) + py * 10 + px) - 87]);
      }
      if (every(s, "next", 25000)) {
        s.idx++;
        s.h6 = u8(s.rnd()); s.h7 = u8(s.h6 + 96);
        if (s.idx >= 38) s.idx = 0;
      }
    } });

  return E;
})();
if (typeof module !== "undefined") module.exports = EFFECTS;
