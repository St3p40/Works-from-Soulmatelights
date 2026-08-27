//// ----------------------------- Holiday lights ------------------------------
//(c)stepko and Kostyamat
//Merry Christmas and Happy New Year
//27.12.20
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS
#define speed (200 / (HEIGHT - 4))
byte hue;
byte effId = 4; //1-4

const byte maxDim = max(WIDTH, HEIGHT);
const byte minDim = min(WIDTH, HEIGHT);
const byte width_adj = (WIDTH < HEIGHT ? (HEIGHT - WIDTH) / 2 : 0);
const byte height_adj = (HEIGHT < WIDTH ? (WIDTH - HEIGHT) / 2 : 0);
const bool glitch = abs(WIDTH - HEIGHT) >= minDim / 4;

byte density = 50; //
byte fadingSpeed = 10; //
byte updateFromRGBWeight = 10;
const byte scaleToNumLeds = NUM_LEDS / 256;

uint16_t RGBweight(const CRGB & led, uint16_t idx) {
  return (leds[idx].r + leds[idx].g + leds[idx].b);
}

void confetti() {
  uint16_t idx = random16(NUM_LEDS);
  for (byte i = 0; i < scaleToNumLeds; i++)
    if (random8() < density)
      if (RGBweight(leds, idx) < 10) leds[idx] = random(48, 16777216);
}

void drawPixelXY(float x, uint16_t y,
  const CRGB & col) {
leds[XY(x,y)] = col;
}

void drawPixelXYF_X(float x, uint16_t y,
  const CRGB & color) {
  // extract the fractional parts and derive their inverses
  uint8_t xx = (x - (int) x) * 255, ix = 255 - xx;
  // calculate the intensities for each affected pixel
  uint8_t wu[2] = { ix, xx };
  // multiply the intensities by the colour, and saturating-add them to the pixels
  for (int8_t i = 1; i >= 0; i--) {
    int16_t xn = x + (i & 1);
    CRGB clr = leds[XY(xn, y)];
      clr.r = qadd8(clr.r, (color.r * wu[i]) >> 8);
      clr.g = qadd8(clr.g, (color.g * wu[i]) >> 8);
      clr.b = qadd8(clr.b, (color.b * wu[i]) >> 8);
    leds[XY(xn, y)] = clr;
  }
}

byte y[HEIGHT];
float x;

void addGlitter(uint8_t chanceOfGlitter) {
  if (random8() < chanceOfGlitter) leds[random16(NUM_LEDS)] = random(0, 16777215);
}

void draw() {
  hue++;
  fadeToBlackBy(leds, NUM_LEDS, map(speed, 1, 255, 1, 10));
  uint8_t z;
  if (effId == 3) z = triwave8(hue);
  else z = beatsin8(1, 1, 255);
  for (uint8_t i = 0; i < minDim; i++) {
    x = beatsin16(i * (map(speed, 1, 255, 3, 20) /*(NUM_LEDS/256)*/ ),
      i * 2,
      (minDim * 4 - 2) - (i * 2 + 2));
    if (effId == 2)
      drawPixelXYF_X(x / 4 + height_adj, i, random8(10) == 0 ? CHSV(random8(), random8(32, 255), 255) : CHSV(100, 255, map(speed, 1, 255, 128, 100)));
    else
    if (effId == 4) drawPixelXYF_X(x / 4 + height_adj, i, ColorFromPalette(OceanColors_p, inoise8(x * 10, i * 10, hue), 255 - ((abs(x - LED_COLS * 2) + i) * (128 / LED_COLS))));
    else
      drawPixelXYF_X(x / 4 + height_adj, i, CHSV(hue + i * z, 255, 255));
  }
  if (!(WIDTH & 0x01))
    leds[XY(WIDTH / 2 - ((millis() >> 9) & 0x01 ? 1 : 0), minDim - 1 - ((millis() >> 8) & 0x01 ? 1 : 0))] = CHSV(0, 255, 255);
  else
    leds[XY(WIDTH / 2, minDim - 1)] = CHSV(0, (millis() >> 9) & 0x01 ? 0 : 255, 255);
  
  if (glitch) confetti();
  delay(16);
}