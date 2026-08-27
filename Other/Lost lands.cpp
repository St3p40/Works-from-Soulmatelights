void draw() {
  uint16_t t = millis() / 10;
  for(uint8_t x = 0; x < LED_COLS; x++){
    for(uint8_t y = 0; y < LED_ROWS; y++){
      leds[XY(x, y)] = ColorFromPalette(CloudColors_p, inoise8((x * 100), (y * 10) - t, t / 2), 255 - (abs(x - LED_COLS / 2) * (255 / LED_COLS * 2))) - CHSV(0, 0, inoise8(x * 50, y * 50, t));
    }
  }
}