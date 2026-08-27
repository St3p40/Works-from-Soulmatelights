// Matrix size
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS

#define WAVES_AMOUNT WIDTH
//// ----------------------------- Smokewaves ------------------------------
//(c)stepko
//Thank you very much, Kostyamat, for your help at the beginning of mine art way
//18.10.20
int pos[WAVES_AMOUNT];
float sSpeed[WAVES_AMOUNT];
uint8_t maxMin[WAVES_AMOUNT];
float speedfactor;
byte waveColors[WAVES_AMOUNT];
int reg[WAVES_AMOUNT];
bool loadingFlag = true;
#define speed 255
#define scale 8
#define Clr 0
#define SubPix 1

void drawPixelXYF(float x, float y, CRGB color) {
  // if (x < 0 || y < 0 || x > ((float)WIDTH - 1) || y > ((float)HEIGHT - 1)) return;
  uint8_t xx = (x - (int) x) * 255, yy = (y - (int) y) * 255, ix = 255 - xx, iy = 255 - yy;
  // calculate the intensities for each affected pixel
  #define WU_WEIGHT(a, b)((uint8_t)(((a) * (b) + (a) + (b)) >> 8))
  uint8_t wu[4] = {
    WU_WEIGHT(ix, iy),
    WU_WEIGHT(xx, iy),
    WU_WEIGHT(ix, yy),
    WU_WEIGHT(xx, yy)
  };
  // multiply the intensities by the colour, and saturating-add them to the pixels
  for (uint8_t i = 0; i < 4; i++) {
    int16_t xn = x + (i & 1), yn = y + ((i >> 1) & 1);
    CRGB clr = leds[XY(xn, yn)];
    clr.r = qadd8(clr.r, (color.r * wu[i]) >> 8);
    clr.g = qadd8(clr.g, (color.g * wu[i]) >> 8);
    clr.b = qadd8(clr.b, (color.b * wu[i]) >> 8);
    leds[XY(xn, yn)] = clr;
  }
}

CRGB colorsmear(CRGB col1, CRGB col2, byte l) {
  if(l == 0) return col1; else if(l == 255) return col2;
  else{
  CRGB col;
  col.r = ((col1.r * (255 - l)) + col2.r * l) / 255;
  col.g = ((col1.g * (255 - l)) + col2.g * l) / 255;
  col.b = ((col1.b * (255 - l)) + col2.b * l) / 255;
  return col;}
}

void shift() {
  for (byte x = 0; x < WIDTH; x++) {
    for (byte y = HEIGHT - 1; y > 0; y -= speedfactor) {
      leds[XY(x, y)] = leds[XY(x, y - 1)];//leds[XY(x, y)] = colorsmear(leds[XY(x, y)], leds[XY(x, y - 1)], byte(speedfactor * 2550));
    }
  }
}
void clearing() {
  for (byte i = 0; i < WIDTH; i++) {
    leds[XY(i, 0)] = 0;
  }
}

static float fmap(const float x,
  const float in_min,
    const float in_max,
      const float out_min,
        const float out_max) {
  return (out_max - out_min) * (x - in_min) / (in_max - in_min) + out_min;
}


void draw() {
  if (loadingFlag) {
    loadingFlag = false;
    randomSeed(millis());
    for (byte j = 0; j < WAVES_AMOUNT; j++) {
      reg[j] = random(0, WIDTH * 10);
      sSpeed[j] = float(random(50, 16 * WIDTH) / random(1, 10));
      maxMin[j] = random((WIDTH / 4) * 10, (WIDTH / 2) * 20);
      waveColors[j] = random(0, 9) * 28;
      pos[j] = reg[j];
    }
  }
  speedfactor = fmap(speed, 1., 255., .02, .2);
  shift();
  if (Clr)
    clearing();
  fadeToBlackBy(leds, NUM_LEDS, speedfactor * 10);
  blur2d(leds, WIDTH, HEIGHT, 20);
  for (byte j = 0; j < map(scale, 1, 16, 2, WAVES_AMOUNT); j++) {
    waveColors[j]++;
    pos[j] = (float)beatsin16((uint8_t)(sSpeed[j] * (speedfactor * .5)), reg[j], maxMin[j] + reg[j], waveColors[j] * 256, waveColors[j] * 8);
    if (pos[j] < 0) pos[j] = (WIDTH * 10) - 1 - (pos[j] - (WIDTH * 10));
    if (pos[j] > WIDTH * 10) pos[j] = (pos[j] - WIDTH * 10);
    if (SubPix)
      drawPixelXYF((float) pos[j] / 10., 0.05, ColorFromPalette(HeatColors_p, waveColors[j]));
    else
      leds[XY(pos[j] / 10, 0)] += ColorFromPalette(HeatColors_p, waveColors[j]);
  }
  EVERY_N_SECONDS(20) {
    for (byte j = 0; j < map(scale, 1, 16, 2, WAVES_AMOUNT); j++) {
      waveColors[j] += 28;
    }
  }
  delay(16);
}