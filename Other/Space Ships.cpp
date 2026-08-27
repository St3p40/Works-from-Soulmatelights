// Matrix size
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS

//// ----------------------------- Space ships ------------------------------
//(c)stepko
//05.02.21

void drawPixel(byte x, byte y, CRGB color) {
  leds[XY(x, y)] += color;
  if (WIDTH > 24 || HEIGHT > 24) {
    leds[XY(x + 1, y)] += color;
    leds[XY(x - 1, y)] += color;
    leds[XY(x, y + 1)] += color;
    leds[XY(x, y - 1)] += color;
  }
}

void MoveX(int8_t delta) {
  if (delta) {
    if (delta > 0) {
      for (uint8_t y = 0; y < LED_ROWS; y++) {
        for (uint8_t x = 0; x < LED_COLS; x++) {
          leds[XY(x, y)] = leds[XY(x + delta, y)];
        }
      }
    } else {
      for (uint8_t y = 0; y < LED_ROWS; y++) {
        for (uint8_t x = LED_COLS - 1; x > 0; x--) {
          leds[XY(x, y)] = leds[XY(x + delta, y)];
        }
      }
    }
  }
}

void MoveY(int8_t delta) {
  if (delta) {
    if (delta > 0) {
      for (uint8_t x = 0; x < LED_COLS; x++) {
        for (uint8_t y = 0; y < LED_ROWS; y++) {
          leds[XY(x, y)] = leds[XY(x, y + delta)];
        }
      }
    } else {
      for (uint8_t x = 0; x < LED_COLS; x++) {
        for (uint8_t y = LED_ROWS - 1; y > 0; y--) {
          leds[XY(x, y)] = leds[XY(x, y + delta)];
        }
      }
    }
  }
}

byte dir = 0;
void draw() {
  fadeToBlackBy(leds, NUM_LEDS, 16);
  switch (dir) {
    case 0:
      MoveX(1);
      break;
    case 1:
      MoveX(1);
      MoveY(-1);
      break;
    case 2:
      MoveY(-1);
      break;
    case 3:
      MoveX(-1);
      MoveY(-1);
      break;
    case 4:
      MoveX(-1);
      break;
    case 5:
      MoveX(-1);
      MoveY(1);
      break;
    case 6:
      MoveY(1);
      break;
    case 7:
      MoveX(1);
      MoveY(1);
      break;
  }
    for (byte i = 0; i < 8; i++) {
    byte x = beatsin8(12 + i, 2, WIDTH - 3);
    byte y = beatsin8(15 + i, 2, HEIGHT - 3);
    drawPixel(x, y, ColorFromPalette(RainbowColors_p, beatsin8(12 + i, 0, 255), 255));
  }
  blur2d(leds, WIDTH, HEIGHT, 32);
  EVERY_N_SECONDS(5) {
    if (dir == 7) dir = 0;
    else dir++;
  }
}