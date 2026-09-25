//PSP background recreation
//@St3p40(aka Stepko)
//01.01.23
uint8_t col = 150;
int xadj = (256 / LED_ROWS) << 7;
void draw() {
  uint32_t t = millis() << 2;
  for (uint8_t x = 0; x < LED_COLS; x++) {
    uint16_t h1 = map(inoise16(x * xadj + t), 0, 65535, 0, LED_ROWS << 8);
    uint16_t h2 = map(inoise16(0, 35550, x * xadj + t), 0, 65535, 0, LED_ROWS << 8);
    uint8_t bh1 = uint8_t(h1 >> 8);
    uint8_t bh2 = uint8_t(h2 >> 8);
    for (uint8_t y = 0; y < LED_ROWS; y++) {
      leds[XY(x, y)] = CHSV(col, map(y + x, 0, LED_ROWS + LED_COLS - 1, 255, 32), map(x - (LED_ROWS - 1 - y), 0, LED_COLS - 1, 196, 255));
      if(y < bh1) leds[XY(x, y)] += CHSV(0, 0, map(y << 8, 0, h1, 0, 224));
      if(y < bh2) leds[XY(x, y)] += CHSV(0, 0, map(y << 8, 0, h2, 0, 224));
    }
    leds[XY(x, bh1)] += CHSV(0, 0, (h1 % 256));
    leds[XY(x, bh2)] += CHSV(0, 0, (h2 % 256));
  }
}