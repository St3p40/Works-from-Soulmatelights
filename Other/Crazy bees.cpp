//// ----------------------------- Crazy bees ------------------------------
//(c)stepko
//Another version there: https://editor.soulmatelights.com/gallery/655-space-racer
//12.02.21
bool setup = true;
#define n ((NUM_LEDS > 256) ? NUM_LEDS / 256 : 1)
struct {
  uint8_t posX, posY, aimX, aimY, hue;
  int8_t deltaX, deltaY, signX, signY, error;
  void aimed() {
    randomSeed(millis());
    aimX = random8(0, LED_COLS);
    aimY = random8(0, LED_ROWS);
    hue = random8();
    deltaX = abs(aimX - posX);
    deltaY = abs(aimY - posY);
    signX = posX < aimX ? 1 : -1;
    signY = posY < aimY ? 1 : -1;
    error = deltaX - deltaY;
  };
  void run() {
    leds[XY(aimX + 1, aimY)] += CHSV(hue, 255, 255);
    leds[XY(aimX, aimY + 1)] += CHSV(hue, 255, 255);
    leds[XY(aimX - 1, aimY)] += CHSV(hue, 255, 255);
    leds[XY(aimX, aimY - 1)] += CHSV(hue, 255, 255);
    if (posX != aimX || posY != aimY) {
      leds[XY(posX, posY)] = CHSV(hue, 60, 255);
      int8_t error2 = error * 2;
      if (error2 > -deltaY) {
        error -= deltaY;
        posX += signX;
      }
      if (error2 < deltaX) {
        error += deltaX;
        posY += signY;
      }
    } else {
      aimed();
    }
  }
}
bee[n];

void setUp() {
  for (byte i = 0; i < n; i++) {
    bee[i].posX = random8(0, LED_COLS);
    bee[i].posY = random8(0, LED_ROWS);
    bee[i].aimed();
  }
}
void draw() {
  if (setup) {
    setup = false;
    setUp();
  }
  fadeToBlackBy(leds, NUM_LEDS, 8);
  for (byte i = 0; i < n; i++) {
    bee[i].run();
  }
  blur2d(leds, LED_COLS, LED_ROWS, 32);
  delay(16);
}