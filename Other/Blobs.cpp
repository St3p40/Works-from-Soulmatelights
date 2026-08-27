//// ----------------------------- Blobs ------------------------------
//(c)stepko and kostyamat
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS
bool loadingFlag = true;
#define Speed 255
#define Am 64
#define regime 1 //0-small 1-big 
#define SubPixel 1

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
float ball[WIDTH][4]; //0-PosY 1-PosX 2-SpeedY 3-SpeedX
float radius[WIDTH];
bool rrad[WIDTH];
byte color[WIDTH];

void fill_circleF(float cx, float cy, float radius, CRGB col) {
  uint8_t rad = radius;
  for (float y = -radius; y <= radius; y += fabs(y) < rad ? 1 : 0.2) {
    for (float x = -radius; x <= radius; x += fabs(x) < rad ? 1 : 0.2) {
      if (x * x + y * y <= radius * radius)
        drawPixelXYF(cx + x, cy + y, col);
    }
  }
}

void fill_circle(uint8_t cx, uint8_t cy, uint8_t radius, CRGB col) {
  for (int16_t y = -radius; y <= radius; y++) {
    for (int16_t x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius)
        leds[XY(cx + x, cy + y)] += col;
    }
  }
}


byte Amount = map(Am, 1, 255, 1, WIDTH);


//Draw the scene with the background defined by RGB colors and the 5 balls in different colors
void BlobS() {
  if (loadingFlag) {
    for (byte i = 0; i < Amount; i++) {
      if (regime)
        radius[i] = random(1, 40) / 10;
      else
        radius[i] = 1;
      ball[i][2] = (float) random(5, 11) / (float)(257 - Speed) / 4.0;
      ball[i][3] = (float) random(5, 11) / (float)(257 - Speed) / 4.0;
      ball[i][0] = random(0, WIDTH);
      ball[i][1] = random(0, HEIGHT); //random(0,WIDTH);
      color[i] = random(0, 255);
      if (ball[i][2] == 0)
        ball[i][2] = 1;
      if (ball[i][3] == 0)
        ball[i][3] = 1;
    }
    loadingFlag = false;
  }
  //FastLED.clear();
  fadeToBlackBy(leds, NUM_LEDS, 20);
  // Bounce three balls around
  for (byte i = 0; i < Amount; i++) {
    if (rrad[i]) { // тут у нас шарики надуваются\сдуваются по ходу движения
      radius[i] += (fabs(ball[i][2]) > fabs(ball[i][3]) ? fabs(ball[i][2]) : fabs(ball[i][3])) * 0.05;
      if (radius[i] >= 4.) {
        rrad[i] = false;
      }
    } else {
      radius[i] -= (fabs(ball[i][2]) > fabs(ball[i][3]) ? fabs(ball[i][2]) : fabs(ball[i][3])) * 0.05;
      if (radius[i] < 1) {
        rrad[i] = true;
        color[i] = random(0, 255);
      }
    }
    if (SubPixel) {
      if (radius[i] > 1)
        fill_circleF(ball[i][1], ball[i][0], radius[i], ColorFromPalette(RainbowColors_p, color[i]));
      else
        drawPixelXYF(ball[i][1], ball[i][0], ColorFromPalette(RainbowColors_p, color[i]));
    } else {
      if (radius[i] > 1)
        fill_circle(ball[i][1], ball[i][0], radius[i], ColorFromPalette(RainbowColors_p, color[i]));
      else
        leds[XY(ball[i][1], ball[i][0])] += ColorFromPalette(RainbowColors_p, color[i]);
    }
    //----------------------
    if (ball[i][0] + radius[i] >= HEIGHT - 1)
      ball[i][0] += (ball[i][2] * ((HEIGHT - 1 - ball[i][0]) / radius[i] + 0.005));
    else if (ball[i][0] - radius[i] <= 0)
      ball[i][0] += (ball[i][2] * (ball[i][0] / radius[i] + 0.005));
    else
      ball[i][0] += ball[i][2];
    //-----------------------
    if (ball[i][1] + radius[i] >= WIDTH - 1)
      ball[i][1] += (ball[i][3] * ((WIDTH - 1 - ball[i][1]) / radius[i] + 0.005));
    else if (ball[i][1] - radius[i] <= 0)
      ball[i][1] += (ball[i][3] * (ball[i][1] / radius[i] + 0.005));
    else
      ball[i][1] += ball[i][3];
    //------------------------
    if (ball[i][0] < 0.01) {
      ball[i][2] = (float) random8(5, 11) / (257 - Speed) / 4.0;
      ball[i][0] = 0.01;
    } else if (ball[i][0] > HEIGHT - 1.01) {
      ball[i][2] = (float) random8(5, 11) / (257 - Speed) / 4.0;
      ball[i][2] = -ball[i][2];
      ball[i][0] = HEIGHT - 1.01;
    }
    //----------------------
    if (ball[i][1] < 0.01) {
      ball[i][3] = (float) random8(5, 11) / (257 - Speed) / 4.0;
      ball[i][1] = 0.01;
    } else if (ball[i][1] > WIDTH - 1.01) {
      ball[i][3] = (float) random8(5, 11) / (257 - Speed) / 4.0;
      ball[i][3] = -ball[i][3];
      ball[i][1] = WIDTH - 1.01;
    }
  }
  blur2d(leds, WIDTH, HEIGHT, 128);
}
void draw() {
  BlobS();
  delay(16);
}