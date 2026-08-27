#define AM LED_ROWS
int Pos[AM][2];
byte speed[AM];
int8_t yspeed;
bool Loading = true;
void wu_pixel(uint32_t x, uint32_t y, CRGB * col) { //awesome wu_pixel procedure by reddit u/sutaburosu
  // extract the fractional parts and derive their inverses
  uint8_t xx = x & 0xff, yy = y & 0xff, ix = 255 - xx, iy = 255 - yy;
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
    uint16_t xy = XY((x >> 8) + (i & 1), (y >> 8) + ((i >> 1) & 1));
    leds[xy].r = qadd8(leds[xy].r, col -> r * wu[i] >> 8);
    leds[xy].g = qadd8(leds[xy].g, col -> g * wu[i] >> 8);
    leds[xy].b = qadd8(leds[xy].b, col -> b * wu[i] >> 8);
  }
}
CRGB col = CHSV(155, 20, 255);
void draw() {
  if (Loading) {
    for (byte i = 0; i < AM; i++) {
      Pos[i][1] = random(0, (LED_ROWS - 1) * 10);
      speed[i] = random(2, 10);
      //yspeed = 0;//random(-5,5);
    }
    Loading = false;
  }
  fadeToBlackBy(leds, NUM_LEDS, 32);
  for (byte i = 0; i < AM; i++) {
    if (Pos[i][0] >= LED_COLS * 10) {
      Pos[i][0] = -10;
      //Pos[i][1] = random(0, (LED_ROWS - 1) * 10);
    }
    Pos[i][0] += speed[i];
    Pos[i][1] += (inoise8(Pos[i][0]*3,millis())-128)/32;
    wu_pixel(Pos[i][0] * 25.6, Pos[i][1] * 25.6, & col);
  }
}