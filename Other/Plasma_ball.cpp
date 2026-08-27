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

void drawLineF(float x1, float y1, float x2, float y2,
  const CRGB & col1,
    const CRGB & col2) {
  float deltaX = fabs(x2 - x1);
  float deltaY = fabs(y2 - y1);
  float steps = 255 / max(deltaX, deltaY);
  float error = deltaX - deltaY;
  CRGB col = col1;
  float signX = x1 < x2 ? 0.5 : -0.5;
  float signY = y1 < y2 ? 0.5 : -0.5;
  
  while (x1 != x2 || y1 != y2) {
    if ((signX > 0. && x1 > x2 + signX) || (signX < 0. && x1 < x2 + signX)) break;
    if ((signY > 0. && y1 > y2 + signY) || (signY < 0. && y1 < y2 + signY)) break;
    drawPixelXYF(x1/*+random(-10,10)*0.1 */, y1/*+random(-10,10)*0.1*/, nblend(col, col2, steps++));
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
void draw() {
  uint32_t t = millis()/10;
  for (byte i = 0; i < max(LED_COLS,LED_ROWS)/2; i++) {
    uint16_t angle_a = inoise16(t,i*3760,i*1507)%360;
    uint16_t angle_b = inoise16(i*1084,t,i*3760)%360;
    float radA= radians(angle_a);
    float radB= radians(angle_b);

    float x = sinf(radA) * cosf(radB);
    float y = sinf(radA) * sinf(radB);
    float z = cosf(radA+PI/2.);
    drawLineF((1 + x) * LED_COLS / 2., (1 + y) * LED_ROWS / 2.,LED_COLS / 2.,LED_ROWS / 2., CHSV(random(200,255), 255,  constrain(112 * (1 + z) + 30, 96, 255)), CHSV(random(150,170), 150, 150));
    drawPixelXYF((1 + x) * LED_COLS / 2., (1 + y) * LED_ROWS / 2.,CHSV(0, 0,  constrain(112 * (1 + z) + 30, 96, 255)));
  }
  fadeToBlackBy(leds, NUM_LEDS, 64);
}








