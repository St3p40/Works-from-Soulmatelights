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
    drawPixelXYF(x1, y1, nblend(col, col2, steps++));
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
bool is_setup = 1;
#define am 6
float angle_a[am];
float angle_b[am];
void draw() {
  static byte hue;
  if (is_setup) {
    for (byte i = 0; i < am; i++) {
      angle_a[i] = radians(random());
      angle_b[i] = radians(random());
    }
    is_setup = 0;
  }
  hue++;
  for (byte i = 1; i < am+1; i++) {
    angle_a[i-1] = fmod(angle_a[i-1] + (beatsin8(3, 0, 50, 0, 4 * i)-25)/100.f,6.28318531);
    angle_b[i-1] = fmod(angle_b[i-1] + (beatsin8(3, 0, 50, 0, (8 * i)+64)-25)/100.f,6.28318531);
    float radA1= angle_a[i-1]+3.14159265;
    //float radB1= angle_b[i-1]+3.14159265;

    float x = (1+sin(angle_a[i-1]) * cos(angle_b[i-1])) * LED_COLS/2;
    float y = (1+sin(angle_a[i-1]) * sin(angle_b[i-1])) * LED_ROWS/2;
    float z = cos(angle_a[i-1]);
    
    float x1 = LED_COLS-1-x;//(1+sin(radA1) * cos(radB1)) * LED_COLS/2;
    float y1 = LED_ROWS-1-y;//(1+sin(radA1) * sin(radB1)) * LED_ROWS/2;
    float z1 = cos(radA1);
    
    drawLineF(x,y,x1,y1, CHSV(127 + (i * 32) + hue, 255, constrain(112 * (1 + z) + 30, 96, 255)), CHSV(i * 32 + hue, 255, constrain(112 * (1 + z1) + 30, 96, 255)));
  }
  fadeToBlackBy(leds, NUM_LEDS, 64);
}