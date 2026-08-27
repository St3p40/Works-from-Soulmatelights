void applyDithering() {
  for (uint8_t y = 0; y < LED_ROWS; y++) {
    for (uint8_t x = 0; x < LED_COLS; x++) {
      uint16_t index = XY(x, y);
      CRGB oldColor = leds[index];
      
      CRGB newColor((oldColor.r > 127) ? 255 : 0, (oldColor.g > 127) ? 255 : 0, (oldColor.b > 127) ? 255 : 0);
      
      leds[index] = newColor;
      int8_t errorR = oldColor.r - newColor.r;
      int8_t errorG = oldColor.g - newColor.g;
      int8_t errorB = oldColor.b - newColor.b;
      
      if (x < LED_COLS - 1) {
        index = XY(x + 1, y); //right
        leds[index] = CRGB(qadd8(leds[index].r, (errorR * 7) >> 4), qadd8(leds[index].g, (errorG * 7) >> 4), qadd8(leds[index].b, (errorB * 7) >> 4));
      }
      if (y < LED_ROWS - 1) {
        if (x) {
          index = XY(x - 1, y + 1);//leftbottom
          leds[index] = CRGB(qadd8(leds[index].r, (errorR * 3) >> 4), qadd8(leds[index].g, (errorG * 3) >> 4), qadd8(leds[index].b, (errorB * 3) >> 4));
        }
        index = XY(x, y + 1);//bottom
          leds[index] = CRGB(qadd8(leds[index].r, (errorR *5) >> 4), qadd8(leds[index].g, (errorG * 5) >> 4), qadd8(leds[index].b, (errorB * 5) >> 4));
        if (x < LED_COLS - 1) {
          index = XY(x + 1, y + 1);//rightbottom
          leds[index] = CRGB(qadd8(leds[index].r, errorR >> 4), qadd8(leds[index].g, errorG >> 4), qadd8(leds[index].b, errorB >> 4));
        }
      }
    }
  }
}
uint16_t t;
void draw() {
  t++;
  for (uint8_t y = 0; y < LED_ROWS; y++) {
    for (uint8_t x = 0; x < LED_COLS; x++) {
      leds[XY(x, y)] = CHSV(inoise8(x << 3, (y << 3) + t << 2), 255, 32 + inoise8(y << 3, x << 3, t << 2));
    }
    applyDithering();
  }
}