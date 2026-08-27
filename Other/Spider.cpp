// Matrix size
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS

//// ----------------------------- Spider ------------------------------
//(c)stepko
//There was a cobweb here before
//26.10.20
#define Speed 240
#define Koef 10 //1,3,5,7,9(standart),10,12
#define lines 7
#define Color 1 //By Kostyamat https://editor.soulmatelights.com/gallery/550
#define Fader 64 //By Kostyamat https://editor.soulmatelights.com/gallery/550
#define L min(WIDTH, HEIGHT)
#define c ((256 / (L / 2)) - (L / 16))
#define ShX WIDTH - L
#define ShY HEIGHT - L

void drawPixelXYF(float x, float y,
  const CRGB & color) {
  // extract the fractional parts and derive their inverses
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
  #undef WU_WEIGHT
}

void drawLineF(float x1, float y1, float x2, float y2,
  const CRGB & color) {
  float deltaX = fabs(x2 - x1);
  float deltaY = fabs(y2 - y1);
  float error = deltaX - deltaY;
  
  float signX = x1 < x2 ? 0.5 : -0.5;
  float signY = y1 < y2 ? 0.5 : -0.5;
  
  while (x1 != x2 || y1 != y2) {
    if ((signX > 0. && x1 > x2 + signX) || (signX < 0. && x1 < x2 + signX)) break;
    if ((signY > 0. && y1 > y2 + signY) || (signY < 0. && y1 < y2 + signY)) break;
    drawPixelXYF(x1, y1, color);
    float error2 = error;
    if (error2 > -deltaY) {
      error -= deltaY;
      x1 += signX;
    }
    if (error2 < deltaX) {
      error += deltaX;
      y1 += signY;
    }
  }
}

//sin8 version
/*
const float Cc = ((256 / (L / 2)) - (L / 16));
void draw() {
  fadeToBlackBy(leds, NUM_LEDS, Fader);
  double t = (double) millis() / (256 - Speed);
  for (uint8_t a = 0; a < lines; a++) {
    float xx = sin8(t + (100 * a) * Koef) / Cc;
    float yy = cos8(t + (150 * a) * Koef) / Cc;
    if (Color)
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(a * (256 / lines), 200, 128));
    else
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(0, 0, 128));
  }
  delay(16);
}
*/
//beatsin version
/*
void draw() {
  fadeToBlackBy(leds, NUM_LEDS, Fader);
  for (uint8_t a = 0; a < lines; a++) {
    float xx = beatsin8(Speed/20,0,L-1,(100 * a) * Koef);
    float yy = beatsin8(Speed/20,0,L-1,((150 * a) * Koef) + 64);
    if (Color)
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(a * (256 / lines), 200, 128));
    else
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(0, 0, 128));
  }
  delay(16);
}
*/
//sin version

void draw() {
  fadeToBlackBy(leds, NUM_LEDS, Fader);
  double t = (double)millis() / ((256 - Speed) * 50);
  for (uint8_t a = 0; a < lines; a++) {
    float xx = (L/2-1)*(1+sin(t + (100 * a) * Koef));
    float yy = (L/2-1)*(1+cos(t + (150 * a) * Koef));
    if (Color)
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(a * (256 / lines), 200, 128));
    else
      drawLineF(ShX + xx, ShY + yy, L - xx - 1, L - yy - 1, CHSV(0, 0, 128));
  }
  delay(16);
}