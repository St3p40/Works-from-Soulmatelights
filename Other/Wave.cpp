void draw() {
  FastLED.clear();
  double t = millis()/2;
    for(byte i=0; i < LED_COLS; i++) {
      byte thisVal = inoise8(i * 45 ,t , t);
      byte thisMax = map(thisVal, 0, 255, 0, LED_ROWS);
      for(byte j = 0; j < thisMax; j++) {
        leds[XY(i, j)] += ColorFromPalette(RainbowColors_p, map(j, 0, thisMax, 250, 0), 255, LINEARBLEND);
        leds[XY((LED_COLS-1)-i, (LED_ROWS-1)-j)] += ColorFromPalette(RainbowColors_p, map(j, 0, thisMax, 250, 0), 255, LINEARBLEND);
}}blur2d(leds, LED_COLS, LED_ROWS, 64);delay(16);}