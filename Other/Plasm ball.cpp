//// ----------------------------- Plasm Ball ------------------------------
//(c)stepko
//24.03.21
void draw() {
  fadeToBlackBy(leds, NUM_LEDS, 16);
  double t = millis()/16;
  for (byte i = 0; i < LED_COLS; i++) {
    byte thisVal = inoise8(i * 30, t, t);
    byte thisMax = map(thisVal, 0, 255, 0, LED_COLS);
    for (byte j = 0; j < LED_ROWS; j++) {
      byte thisVal_ = inoise8(t, j * 30, t);
      byte thisMax_ = map(thisVal_, 0, 255, 0, LED_ROWS);
      byte x = (i+thisMax_ -(LED_COLS * 2 - LED_COLS) / 2);
      byte y = (j+thisMax -(LED_COLS * 2 - LED_COLS) / 2);
      byte cx = (i+thisMax_);
      byte cy = (j+thisMax);
      leds[XY(i, j)] += ((x-y > -2) && (x-y < 2)) || ((LED_COLS - 1 - x-y) > -2 && (LED_COLS - 1 - x-y < 2)) || (LED_COLS - cx == 0) || (LED_COLS - 1 - cx == 0) || ((LED_ROWS - cy == 0) || (LED_ROWS - 1 - cy == 0)) ? CHSV(beat8(5), thisVal_, thisVal) : CHSV(0, 0, 0);
    }
  }
    blur2d(leds, LED_COLS, LED_ROWS, 16);
  delay(16);
}