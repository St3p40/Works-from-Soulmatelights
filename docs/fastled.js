/* ------------------------------------------------------------------
   fastled.js - a small, faithful port of the FastLED 8-bit math that
   these sketches rely on: inoise8, sin8/cos8, beat*, hsv2rgb_rainbow,
   ColorFromPalette, blur2d, nblend, qadd8/scale8, plus the Arduino
   helpers (map, constrain, random).  Integer widths are emulated so
   the ports overflow exactly where the C++ does.
   ------------------------------------------------------------------ */
var FL = (function () {
  "use strict";

  // ---- integer width helpers -------------------------------------
  const u8  = v => v & 255;
  const i8  = v => (v << 24) >> 24;
  const u16 = v => { v = Math.trunc(v) % 65536; return v < 0 ? v + 65536 : v; };
  const u32 = v => { v = Math.trunc(v) % 4294967296; return v < 0 ? v + 4294967296 : v; };

  const qadd8 = (a, b) => { const s = a + b; return s > 255 ? 255 : s; };
  const qsub8 = (a, b) => { const s = a - b; return s < 0 ? 0 : s; };
  const qadd7 = (a, b) => { const s = a + b; return s > 127 ? 127 : s; };
  const scale8 = (i, s) => ((i * (1 + s)) >> 8) & 255;              // FASTLED_SCALE8_FIXED
  const scale8_video = (i, s) => (((i * s) >> 8) + ((i && s) ? 1 : 0)) & 255;
  const scale16 = (i, s) => Math.floor((i * (1 + s)) / 65536) & 65535;
  const avg7 = (i, j) => ((i + j) >> 1) + (i & 1);
  const lerp8by8 = (a, b, f) => b > a ? a + scale8(b - a, f) : a - scale8(a - b, f);
  const lerp7by8 = (a, b, f) => b > a ? i8(a + scale8(b - a, f)) : i8(a - scale8(a - b, f));

  const avg8 = (i, j) => (i + j) >> 1;
  function ease8InOutApprox(i) {
    if (i < 64) return i >> 1;
    if (i > 255 - 64) { let j = 255 - i; j >>= 1; return 255 - j; }
    let j = i - 64;
    j += (j / 2) | 0;
    return u8(j + 32);
  }
  function ease8InOutQuad(i) {
    const j = (i & 0x80) ? (255 - i) : i;
    const jj = scale8(j, j);
    let jj2 = (jj << 1) & 255;
    if (i & 0x80) jj2 = 255 - jj2;
    return jj2;
  }

  // ---- Arduino helpers -------------------------------------------
  const map8 = (i, lo, hi) => u8(scale8(i, u8(hi - lo)) + lo);
  const constrain = (a, lo, hi) => a < lo ? lo : (a > hi ? hi : a);
  const map = (x, im, iM, om, oM) => Math.trunc((x - im) * (oM - om) / (iM - im)) + om;
  const sqrt16 = x => Math.floor(Math.sqrt(x)) & 255;
  const radians = d => d * Math.PI / 180;

  // ---- sin8 / cos8 / sin16 (exact FastLED tables) ----------------
  const b_m16_interleave = [0, 49, 49, 41, 90, 27, 117, 10];
  function sin8(theta) {
    theta &= 255;
    let offset = theta;
    if (theta & 0x40) offset = 255 - offset;
    offset &= 0x3F;
    let secoffset = offset & 0x0F;
    if (theta & 0x40) secoffset++;
    const section = offset >> 4;
    const b = b_m16_interleave[section * 2], m16 = b_m16_interleave[section * 2 + 1];
    const mx = (m16 * secoffset) >> 4;
    let y = i8(mx + b);
    if (theta & 0x80) y = -y;
    return u8(y + 128);
  }
  const cos8 = t => sin8(u8(t + 64));

  const s16base = [0, 6393, 12539, 18204, 23170, 27245, 30273, 32137];
  const s16slope = [49, 48, 44, 38, 31, 23, 14, 4];
  function sin16(theta) {
    theta = u16(theta);
    let offset = (theta & 0x3FFF) >> 3;
    if (theta & 0x4000) offset = 2047 - offset;
    const section = Math.floor(offset / 256);
    const b = s16base[section], m = s16slope[section];
    const secoffset8 = u8(offset) >> 1;
    let y = m * secoffset8 + b;
    if (theta & 0x8000) y = -y;
    return y;
  }
  const cos16 = t => sin16(u16(t + 16384));

  // ---- beats -----------------------------------------------------
  let NOW = 0;                       // virtual millis() of the running effect
  const millis = () => NOW;
  const beat88 = (b88, tb) => u16(Math.floor(((NOW - (tb || 0)) * b88 * 280) / 65536));
  const beat16 = (bpm, tb) => beat88(bpm < 256 ? bpm * 256 : bpm, tb);
  const beat8 = (bpm, tb) => beat16(bpm, tb) >> 8;
  function beatsin8(bpm, low, high, tb, phase) {
    low = low === undefined ? 0 : low; high = high === undefined ? 255 : high;
    const bs = sin8(u8(beat8(bpm, tb) + (phase || 0)));
    return u8(low + scale8(bs, u8(high - low)));
  }
  function beatsin88(bpm88, low, high, tb, phase) {
    low = low === undefined ? 0 : low; high = high === undefined ? 65535 : high;
    const bs = u16(sin16(u16(beat88(bpm88, tb) + (phase || 0))) + 32768);
    return u16(low + scale16(bs, u16(high - low)));
  }
  function beatsin16(bpm, low, high, tb, phase) {
    low = low === undefined ? 0 : low; high = high === undefined ? 65535 : high;
    const bs = u16(sin16(u16(beat16(bpm, tb) + (phase || 0))) + 32768);
    return u16(low + scale16(bs, u16(high - low)));
  }

  // ---- inoise8 ---------------------------------------------------
  const perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,
    69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,
    117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
    134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,
    46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,
    200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,
    123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,
    39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,
    193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,
    181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,
    114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  const P = x => perm[x & 255];

  function grad3(hash, x, y, z) {
    hash &= 15;
    let u = (hash & 8) ? y : x;
    let v = hash < 4 ? y : (hash === 12 || hash === 14 ? x : z);
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i8(avg7(u, v));
  }
  function grad2(hash, x, y) {
    hash &= 7;
    let u, v;
    if (hash < 4) { u = x; v = y; } else { u = y; v = x; }
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i8(avg7(u, v));
  }

  function inoise8_raw3(x, y, z) {
    const X = x >> 8, Y = y >> 8, Z = z >> 8;
    const A = u8(P(X) + Y), AA = u8(P(A) + Z), AB = u8(P(A + 1) + Z);
    const B = u8(P(X + 1) + Y), BA = u8(P(B) + Z), BB = u8(P(B + 1) + Z);
    const xx = (u8(x) >> 1) & 0x7F, yy = (u8(y) >> 1) & 0x7F, zz = (u8(z) >> 1) & 0x7F;
    const N = 0x80;
    const u = ease8InOutQuad(u8(x)), v = ease8InOutQuad(u8(y)), w = ease8InOutQuad(u8(z));
    const X1 = lerp7by8(grad3(P(AA), xx, yy, zz), grad3(P(BA), xx - N, yy, zz), u);
    const X2 = lerp7by8(grad3(P(AB), xx, yy - N, zz), grad3(P(BB), xx - N, yy - N, zz), u);
    const X3 = lerp7by8(grad3(P(AA + 1), xx, yy, zz - N), grad3(P(BA + 1), xx - N, yy, zz - N), u);
    const X4 = lerp7by8(grad3(P(AB + 1), xx, yy - N, zz - N), grad3(P(BB + 1), xx - N, yy - N, zz - N), u);
    return lerp7by8(lerp7by8(X1, X2, v), lerp7by8(X3, X4, v), w);
  }
  function grad1(hash, x) {
    hash &= 15;
    let u, v;
    if (hash > 8) { u = x; v = x; }
    else if (hash < 4) { u = x; v = 1; }
    else { u = 1; v = x; }
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i8(avg7(u, v));
  }
  function inoise8_raw1(x) {
    const X = x >> 8, A = P(X), AA = P(A), B = P(X + 1), BA = P(B);
    const xx = (u8(x) >> 1) & 0x7F, N = 0x80, u = ease8InOutQuad(u8(x));
    return lerp7by8(grad1(P(AA), xx), grad1(P(BA), xx - N), u);
  }
  function inoise8_raw2(x, y) {
    const X = x >> 8, Y = y >> 8;
    const A = u8(P(X) + Y), AA = P(A), AB = P(A + 1);
    const B = u8(P(X + 1) + Y), BA = P(B), BB = P(B + 1);
    const xx = (u8(x) >> 1) & 0x7F, yy = (u8(y) >> 1) & 0x7F;
    const N = 0x80;
    const u = ease8InOutQuad(u8(x)), v = ease8InOutQuad(u8(y));
    const X1 = lerp7by8(grad2(P(AA), xx, yy), grad2(P(BA), xx - N, yy), u);
    const X2 = lerp7by8(grad2(P(AB), xx, yy - N), grad2(P(BB), xx - N, yy - N), u);
    return lerp7by8(X1, X2, v);
  }
  function inoise8(x, y, z) {
    let n;
    if (z !== undefined) n = inoise8_raw3(u16(x), u16(y), u16(z));
    else if (y !== undefined) n = inoise8_raw2(u16(x), u16(y));
    else n = inoise8_raw1(u16(x));
    n += 70;
    return qadd8(n, n);
  }

  // ---- inoise16 --------------------------------------------------
  const avg15 = (i, j) => ((i + j) >> 1) + (i & 1);
  const i16 = v => (v << 16) >> 16;
  const hi16 = v => Math.floor(v / 65536) & 255;   // (x >> 16) & 0xFF for a uint32
  const lo16 = v => v % 65536;

  function ease16InOutQuad(i) {
    let j = i;
    if (j & 0x8000) j = 65535 - j;
    const jj = scale16(j, j);
    let jj2 = (jj << 1) & 65535;
    if (i & 0x8000) jj2 = 65535 - jj2;
    return jj2;
  }
  const lerp15by16 = (a, b, f) => b > a ? i16(a + scale16(b - a, f)) : i16(a - scale16(a - b, f));

  function grad16_3(hash, x, y, z) {
    hash &= 15;
    let u = hash < 8 ? x : y;
    let v = hash < 4 ? y : (hash === 12 || hash === 14 ? x : z);
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i16(avg15(u, v));
  }
  function grad16_2(hash, x, y) {
    hash &= 7;
    let u, v;
    if (hash < 4) { u = x; v = y; } else { u = y; v = x; }
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i16(avg15(u, v));
  }
  function grad16_1(hash, x) {
    hash &= 15;
    let u, v;
    if (hash > 8) { u = x; v = x; }
    else if (hash < 4) { u = x; v = 1; }
    else { u = 1; v = x; }
    if (hash & 1) u = -u;
    if (hash & 2) v = -v;
    return i16(avg15(u, v));
  }

  function inoise16_raw(x, y, z) {
    const N = 0x8000;
    const X = hi16(x), u0 = lo16(x), xx = (u0 >> 1) & 0x7FFF, u = ease16InOutQuad(u0);
    if (y === undefined) {
      const A = P(X), AA = P(A), B = P(X + 1), BA = P(B);
      return lerp15by16(grad16_1(P(AA), xx), grad16_1(P(BA), xx - N), u);
    }
    const Y = hi16(y), v0 = lo16(y), yy = (v0 >> 1) & 0x7FFF, v = ease16InOutQuad(v0);
    if (z === undefined) {
      const A = u8(P(X) + Y), AA = P(A), AB = P(A + 1);
      const B = u8(P(X + 1) + Y), BA = P(B), BB = P(B + 1);
      const X1 = lerp15by16(grad16_2(P(AA), xx, yy), grad16_2(P(BA), xx - N, yy), u);
      const X2 = lerp15by16(grad16_2(P(AB), xx, yy - N), grad16_2(P(BB), xx - N, yy - N), u);
      return lerp15by16(X1, X2, v);
    }
    const Z = hi16(z), w0 = lo16(z), zz = (w0 >> 1) & 0x7FFF, w = ease16InOutQuad(w0);
    const A = u8(P(X) + Y), AA = u8(P(A) + Z), AB = u8(P(A + 1) + Z);
    const B = u8(P(X + 1) + Y), BA = u8(P(B) + Z), BB = u8(P(B + 1) + Z);
    const X1 = lerp15by16(grad16_3(P(AA), xx, yy, zz), grad16_3(P(BA), xx - N, yy, zz), u);
    const X2 = lerp15by16(grad16_3(P(AB), xx, yy - N, zz), grad16_3(P(BB), xx - N, yy - N, zz), u);
    const X3 = lerp15by16(grad16_3(P(u8(AA + 1)), xx, yy, zz - N), grad16_3(P(u8(BA + 1)), xx - N, yy, zz - N), u);
    const X4 = lerp15by16(grad16_3(P(u8(AB + 1)), xx, yy - N, zz - N), grad16_3(P(u8(BB + 1)), xx - N, yy - N, zz - N), u);
    return lerp15by16(lerp15by16(X1, X2, v), lerp15by16(X3, X4, v), w);
  }
  function inoise16(x, y, z) {
    const ans = inoise16_raw(u32(x), y === undefined ? undefined : u32(y), z === undefined ? undefined : u32(z)) + 19052;
    return Math.floor((ans * 220) / 128) & 65535;
  }

  // ---- colours ---------------------------------------------------
  function hsv2rgb(hue, sat, val) {
    hue = u8(hue); sat = u8(sat); val = u8(val);
    const offset = hue & 0x1F, offset8 = u8(offset << 3);
    const third = scale8(offset8, 85);
    let r, g, b, tt;
    if (!(hue & 0x80)) {
      if (!(hue & 0x40)) {
        if (!(hue & 0x20)) { r = 255 - third; g = third; b = 0; }
        else { r = 171; g = u8(85 + third); b = 0; }
      } else {
        if (!(hue & 0x20)) { tt = u8(third << 1); r = u8(171 - tt); g = u8(170 + third); b = 0; }
        else { r = 0; g = 255 - third; b = third; }
      }
    } else {
      if (!(hue & 0x40)) {
        if (!(hue & 0x20)) { tt = u8(third << 1); r = 0; g = u8(171 - tt); b = u8(85 + tt); }
        else { r = third; g = 0; b = 255 - third; }
      } else {
        if (!(hue & 0x20)) { r = u8(85 + third); g = 0; b = u8(171 - third); }
        else { r = u8(171 + third); g = 0; b = u8(85 - third); }
      }
    }
    if (sat !== 255) {
      if (sat === 0) { r = 255; g = 255; b = 255; }
      else {
        let desat = 255 - sat;
        desat = scale8_video(desat, desat);
        const satscale = 255 - desat;
        r = scale8(r, satscale); g = scale8(g, satscale); b = scale8(b, satscale);
        r = u8(r + desat); g = u8(g + desat); b = u8(b + desat);
      }
    }
    if (val !== 255) {
      val = scale8_video(val, val);
      if (val === 0) { r = 0; g = 0; b = 0; }
      else { if (r) r = scale8(r, val); if (g) g = scale8(g, val); if (b) b = scale8(b, val); }
    }
    return [r, g, b];
  }
  const CHSV = hsv2rgb;
  const rgb = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

  const pal = list => list.map(rgb);
  const C = {                       // the CRGB named colours these sketches use
    Black: 0x000000, White: 0xFFFFFF, Red: 0xFF0000, Orange: 0xFFA500,
    Maroon: 0x800000, DarkRed: 0x8B0000, Blue: 0x0000FF, DarkBlue: 0x00008B,
    SkyBlue: 0x87CEEB, LightBlue: 0xADD8E6, MidnightBlue: 0x191970, Navy: 0x000080,
    MediumBlue: 0x0000CD, SeaGreen: 0x2E8B57, Teal: 0x008080, CadetBlue: 0x5F9EA0,
    DarkCyan: 0x008B8B, CornflowerBlue: 0x6495ED, Aquamarine: 0x7FFFD4, Aqua: 0x00FFFF,
    LightSkyBlue: 0x87CEFA, DarkGreen: 0x006400, DarkOliveGreen: 0x556B2F,
    Green: 0x008000, ForestGreen: 0x228B22, OliveDrab: 0x6B8E23,
    MediumAquamarine: 0x66CDAA, LimeGreen: 0x32CD32, YellowGreen: 0x9ACD32,
    LightGreen: 0x90EE90, LawnGreen: 0x7CFC00
  };
  const PAL = {
    Rainbow: pal([0xFF0000,0xD52A00,0xAB5500,0xAB7F00,0xABAB00,0x56D500,0x00FF00,0x00D52A,
                  0x00AB55,0x0056AA,0x0000FF,0x2A00D5,0x5500AB,0x7F0081,0xAB0055,0xD5002B]),
    RainbowStripe: pal([0xFF0000,0x000000,0xAB5500,0x000000,0xABAB00,0x000000,0x00FF00,0x000000,
                        0x00AB55,0x000000,0x0000FF,0x000000,0x5500AB,0x000000,0xAB0055,0x000000]),
    Party: pal([0x5500AB,0x84007C,0xB5004B,0xE5001B,0xE81700,0xB84700,0xAB7700,0xABAB00,
                0xAB5500,0xDD2200,0xF2000E,0xC2003E,0x8F0071,0x5F00A1,0x2F00D0,0x0007F9]),
    Heat: pal([0x000000,0x330000,0x660000,0x990000,0xCC0000,0xFF0000,0xFF3300,0xFF6600,
               0xFF9900,0xFFCC00,0xFFFF00,0xFFFF33,0xFFFF66,0xFFFF99,0xFFFFCC,0xFFFFFF]),
    Cloud: pal([C.Blue,C.DarkBlue,C.DarkBlue,C.DarkBlue,C.DarkBlue,C.DarkBlue,C.DarkBlue,
                C.DarkBlue,C.Blue,C.DarkBlue,C.SkyBlue,C.SkyBlue,C.LightBlue,C.White,
                C.LightBlue,C.SkyBlue]),
    Lava: pal([C.Black,C.Maroon,C.Black,C.Maroon,C.DarkRed,C.Maroon,C.DarkRed,C.DarkRed,
               C.DarkRed,C.Red,C.Orange,C.White,C.Orange,C.Red,C.DarkRed,C.Black]),
    Ocean: pal([C.MidnightBlue,C.DarkBlue,C.MidnightBlue,C.Navy,C.DarkBlue,C.MediumBlue,
                C.SeaGreen,C.Teal,C.CadetBlue,C.Blue,C.DarkCyan,C.CornflowerBlue,
                C.Aquamarine,C.SeaGreen,C.Aqua,C.LightSkyBlue]),
    Forest: pal([C.DarkGreen,C.DarkGreen,C.DarkOliveGreen,C.DarkGreen,C.Green,C.ForestGreen,
                 C.OliveDrab,C.Green,C.SeaGreen,C.MediumAquamarine,C.LimeGreen,C.YellowGreen,
                 C.LightGreen,C.LawnGreen,C.MediumAquamarine,C.ForestGreen])
  };

  function ColorFromPalette(p, index, bri) {
    index = u8(index);
    if (bri === undefined) bri = 255; else bri = u8(bri);
    const hi4 = index >> 4, lo4 = index & 15;
    const e1 = p[hi4];
    let r = e1[0], g = e1[1], b = e1[2];
    if (lo4) {
      const e2 = p[(hi4 + 1) & 15];
      const f2 = u8(lo4 << 4), f1 = 255 - f2;
      r = Math.min(255, scale8(r, f1) + scale8(e2[0], f2));
      g = Math.min(255, scale8(g, f1) + scale8(e2[1], f2));
      b = Math.min(255, scale8(b, f1) + scale8(e2[2], f2));
    }
    if (bri !== 255) {
      if (bri) {
        const s = u8(bri + 1);
        if (r) r = scale8(r, s);
        if (g) g = scale8(g, s);
        if (b) b = scale8(b, s);
      } else { r = 0; g = 0; b = 0; }
    }
    return [r, g, b];
  }

  function nblendC(existing, overlay, amt) {   // CRGB nblend, in place on `existing`
    amt = u8(amt);
    if (amt === 0) return existing;
    if (amt === 255) { existing[0] = overlay[0]; existing[1] = overlay[1]; existing[2] = overlay[2]; return existing; }
    const keep = 255 - amt;
    existing[0] = u8(scale8(existing[0], keep) + scale8(overlay[0], amt));
    existing[1] = u8(scale8(existing[1], keep) + scale8(overlay[1], amt));
    existing[2] = u8(scale8(existing[2], keep) + scale8(overlay[2], amt));
    return existing;
  }
  const addC = (a, b) => [qadd8(a[0], b[0]), qadd8(a[1], b[1]), qadd8(a[2], b[2])];
  const subC = (a, b) => [qsub8(a[0], b[0]), qsub8(a[1], b[1]), qsub8(a[2], b[2])];

  // ---- the LED matrix --------------------------------------------
  class Matrix {
    constructor(W, H) {
      this.W = W; this.H = H; this.N = W * H;
      this.d = new Uint8Array(this.N * 3 + 3);   // +1 dummy pixel for off-screen writes
      this.dummy = this.N * 3;
    }
    // XY() with the uint8 argument truncation the sketches rely on:
    // anything off the panel lands in the dummy pixel and is discarded.
    i(x, y) {
      x &= 255; y &= 255;
      return (x < this.W && y < this.H) ? (y * this.W + x) * 3 : this.dummy;
    }
    get(x, y) { const p = this.i(x, y), d = this.d; return [d[p], d[p + 1], d[p + 2]]; }
    set(x, y, c) {
      const p = this.i(x, y); if (p === this.dummy) return;
      const d = this.d; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
    }
    add(x, y, c) {
      const p = this.i(x, y); if (p === this.dummy) return;
      const d = this.d;
      d[p] = qadd8(d[p], c[0]); d[p + 1] = qadd8(d[p + 1], c[1]); d[p + 2] = qadd8(d[p + 2], c[2]);
    }
    sub(x, y, c) {
      const p = this.i(x, y); if (p === this.dummy) return;
      const d = this.d;
      d[p] = qsub8(d[p], c[0]); d[p + 1] = qsub8(d[p + 1], c[1]); d[p + 2] = qsub8(d[p + 2], c[2]);
    }
    setChannel(x, y, ch, v) {
      const p = this.i(x, y); if (p === this.dummy) return;
      this.d[p + ch] = v;
    }
    nbl(x, y, c, amt) {
      const p = this.i(x, y); if (p === this.dummy) return;
      const d = this.d;
      const e = nblendC([d[p], d[p + 1], d[p + 2]], c, amt);
      d[p] = e[0]; d[p + 1] = e[1]; d[p + 2] = e[2];
    }
    copy(xd, yd, xs, ys) {
      const a = this.i(xd, yd); if (a === this.dummy) return;
      const b = this.i(xs, ys), d = this.d;
      d[a] = d[b]; d[a + 1] = d[b + 1]; d[a + 2] = d[b + 2];
    }
    // some sketches walk leds[] as a strip instead of through XY()
    geti(i) { const p = i * 3, d = this.d; return [d[p], d[p + 1], d[p + 2]]; }
    seti(i, c) { const p = i * 3, d = this.d; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; }
    addi(i, c) {
      const p = i * 3, d = this.d;
      d[p] = qadd8(d[p], c[0]); d[p + 1] = qadd8(d[p + 1], c[1]); d[p + 2] = qadd8(d[p + 2], c[2]);
    }
    subi(i, c) {
      const p = i * 3, d = this.d;
      d[p] = qsub8(d[p], c[0]); d[p + 1] = qsub8(d[p + 1], c[1]); d[p + 2] = qsub8(d[p + 2], c[2]);
    }
    fillSolid(c) { for (let i = 0; i < this.N; i++) this.seti(i, c); }
    clear() { this.d.fill(0); }
    fade(f) {                                   // fadeToBlackBy
      const s = 255 - u8(f), d = this.d;
      for (let i = 0; i < this.N * 3; i++) d[i] = scale8(d[i], s);
    }
    nscale8(s) { const d = this.d; for (let i = 0; i < this.N * 3; i++) d[i] = scale8(d[i], s); }
    blur2d(amt) { this.blurRows(amt); this.blurCols(amt); }
    blurRows(amt) {
      const keep = 255 - u8(amt), seep = u8(amt) >> 1, d = this.d, W = this.W;
      for (let row = 0; row < this.H; row++) {
        let c0 = 0, c1 = 0, c2 = 0;
        for (let i = 0; i < W; i++) {
          const p = (row * W + i) * 3;
          const p0 = scale8(d[p], seep), p1 = scale8(d[p + 1], seep), p2 = scale8(d[p + 2], seep);
          const n0 = qadd8(scale8(d[p], keep), c0), n1 = qadd8(scale8(d[p + 1], keep), c1),
                n2 = qadd8(scale8(d[p + 2], keep), c2);
          if (i) { const q = p - 3; d[q] = qadd8(d[q], p0); d[q + 1] = qadd8(d[q + 1], p1); d[q + 2] = qadd8(d[q + 2], p2); }
          d[p] = n0; d[p + 1] = n1; d[p + 2] = n2;
          c0 = p0; c1 = p1; c2 = p2;
        }
      }
    }
    blurCols(amt) {
      const keep = 255 - u8(amt), seep = u8(amt) >> 1, d = this.d, W = this.W;
      for (let col = 0; col < W; col++) {
        let c0 = 0, c1 = 0, c2 = 0;
        for (let i = 0; i < this.H; i++) {
          const p = (i * W + col) * 3;
          const p0 = scale8(d[p], seep), p1 = scale8(d[p + 1], seep), p2 = scale8(d[p + 2], seep);
          const n0 = qadd8(scale8(d[p], keep), c0), n1 = qadd8(scale8(d[p + 1], keep), c1),
                n2 = qadd8(scale8(d[p + 2], keep), c2);
          if (i) { const q = p - W * 3; d[q] = qadd8(d[q], p0); d[q + 1] = qadd8(d[q + 1], p1); d[q + 2] = qadd8(d[q + 2], p2); }
          d[p] = n0; d[p + 1] = n1; d[p + 2] = n2;
          c0 = p0; c1 = p1; c2 = p2;
        }
      }
    }
    // sutaburosu's wu-pixel, as copy-pasted into half the sketches
    wu(x, y, c, blend) {
      const xx = u8(Math.trunc((x - Math.trunc(x)) * 255)), yy = u8(Math.trunc((y - Math.trunc(y)) * 255));
      const ix = u8(255 - xx), iy = u8(255 - yy);
      const W = (a, b) => u8((a * b + a + b) >> 8);
      const wu = [W(ix, iy), W(xx, iy), W(ix, yy), W(xx, yy)];
      for (let i = 0; i < 4; i++) {
        const xn = Math.trunc(x + (i & 1)), yn = Math.trunc(y + ((i >> 1) & 1));
        const p = this.i(xn, yn), d = this.d;
        if (p === this.dummy) continue;
        const clr = [qadd8(d[p], (c[0] * wu[i]) >> 8), qadd8(d[p + 1], (c[1] * wu[i]) >> 8),
                     qadd8(d[p + 2], (c[2] * wu[i]) >> 8)];
        if (blend === undefined) { d[p] = clr[0]; d[p + 1] = clr[1]; d[p + 2] = clr[2]; }
        else { const e = nblendC([d[p], d[p + 1], d[p + 2]], clr, blend); d[p] = e[0]; d[p + 1] = e[1]; d[p + 2] = e[2]; }
      }
    }
  }

  // ---- deterministic Arduino random() ----------------------------
  function makeRandom(seed) {
    let s = seed >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0;
      let t = s; t = Math.imul(t ^ (t >>> 15), 1 | t); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return function random(a, b) {
      if (a === undefined) return Math.floor(next() * 2147483647);
      if (b === undefined) return Math.floor(next() * a);
      return a + Math.floor(next() * (b - a));
    };
  }

  return {
    u8, i8, u16, u32, qadd8, qsub8, qadd7, scale8, scale8_video, scale16, lerp8by8,
    ease8InOutQuad, ease8InOutApprox, avg8, map8, constrain, map, sqrt16, radians, sin8, cos8, sin16, cos16,
    beat8, beat16, beat88, beatsin8, beatsin16, beatsin88, inoise8, hsv2rgb, CHSV, rgb,
    inoise8_raw: (x, y, z) => z !== undefined ? inoise8_raw3(u16(x), u16(y), u16(z))
                            : y !== undefined ? inoise8_raw2(u16(x), u16(y)) : inoise8_raw1(u16(x)),
    inoise16, ease16InOutQuad, ColorFromPalette, CFP: ColorFromPalette, PAL, C, nblendC, addC, subC, Matrix,
    makeRandom, millis,
    setMillis(v) { NOW = v; }
  };
})();
if (typeof module !== "undefined") module.exports = FL;
