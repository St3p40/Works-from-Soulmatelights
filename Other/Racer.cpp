//// -----------------------------  Racer (Particle sys) ------------------------------
//rewrited from https://editor.soulmatelights.com/gallery/655-space-racer
//(c)stepko + kostyamat
//23.08.21
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS
bool straightLineDir = 1;
float FADE_KOEF = 0.5;

void drawPixelXYF(float x, float y, CRGB color) {
  if (x < 0 || y < 0 || x > ((float) LED_COLS - 1) || y > ((float) LED_ROWS - 1)) return;
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


void drawCircleF(float x0, float y0, float radius,
  const CRGB & color, float step = 0.25) {
  float a = radius, b = 0.;
  float radiusError = step - a;
  
  if (radius <= step * 2) {
    drawPixelXYF(x0, y0, color);
    return;
  }
  
  while (a >= b) {
    drawPixelXYF(a + x0, b + y0, color);
    drawPixelXYF(b + x0, a + y0, color);
    drawPixelXYF(-a + x0, b + y0, color);
    drawPixelXYF(-b + x0, a + y0, color);
    drawPixelXYF(-a + x0, -b + y0, color);
    drawPixelXYF(-b + x0, -a + y0, color);
    drawPixelXYF(a + x0, -b + y0, color);
    drawPixelXYF(b + x0, -a + y0, color);
    
    b += step;
    if (radiusError < 0.)
      radiusError += 2. * b + step;
    else {
      a -= step;
      radiusError += 2 * (b - a + step);
    }
  }
}

void drawLineF(float x1, float y1, float x2, float y2,
  const CRGB & color) {
  float deltaX = fabs(x2 - x1);
  float deltaY = fabs(y2 - y1);
  float error = deltaX - deltaY;
  
  float signX = x1 < x2 ? 0.5 : -0.5;
  float signY = y1 < y2 ? 0.5 : -0.5;
  
  while (x1 != x2 || y1 != y2) {
    if ((signX > 0. && x1 > x2 + signX) || (signX < 0. && x1 < x2 + signX))
      break;
    if ((signY > 0. && y1 > y2 + signY) || (signY < 0. && y1 < y2 + signY))
      break;
    drawPixelXYF(x1, y1, color);
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

void drawStarF(float x, float y, float biggy, float little, int16_t points, float dangle, CRGB color) {
  float radius2 = 255.0 / points;
  for (int i = 0; i < points; i++) {
    drawLineF(x + ((little * (sin8(i * radius2 + radius2 / 2 - dangle) - 128.0)) / 128), y + ((little * (cos8(i * radius2 + radius2 / 2 - dangle) - 128.0)) / 128), x + ((biggy * (sin8(i * radius2 - dangle) - 128.0)) / 128), y + ((biggy * (cos8(i * radius2 - dangle) - 128.0)) / 128), color);
    drawLineF(x + ((little * (sin8(i * radius2 - radius2 / 2 - dangle) - 128.0)) / 128), y + ((little * (cos8(i * radius2 - radius2 / 2 - dangle) - 128.0)) / 128), x + ((biggy * (sin8(i * radius2 - dangle) - 128.0)) / 128), y + ((biggy * (cos8(i * radius2 - dangle) - 128.0)) / 128), color);
  }
}
float dist(float x1, float y1, float x2, float y2) {
  return sqrtf(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
}

float RPos[2];
float RSpeed[2];
float RFade;
float DPos[2];
bool run = true;
byte hue;
float radius;
int angle;
byte starPoints;

bool loadingFlag = true;
void reg() {
  RPos[0] = random() % WIDTH;
  RPos[1] = random() % HEIGHT;
  RSpeed[0] = 0;
  RSpeed[1] = 0;
  RFade = 255;
}

void phisics() {
  float force[2] { DPos[0] - RPos[0], DPos[1] - RPos[1] };
  float d = dist(force[0], force[1], force[0] * 2, force[1] * 2);
  force[0] *= (1. / d);
  force[1] *= (1. / d);
  d = constrain(d, 5., HEIGHT * 2.);
  float s = (7.5 * 10) / (d * d);
  force[0] *= s;
  force[1] *= s;
  RSpeed[0] += force[0];
  RSpeed[1] += force[1];
  RFade -= (255. / (float)(((HEIGHT + WIDTH) / 2) * FADE_KOEF));
  float sq = ((RSpeed[0] * RSpeed[0]) + (RSpeed[1] * RSpeed[1]));
  if (sq > 2.25) {
    sq = sqrtf(sq);
    RSpeed[0] *= (1. / sq) * 1.5;
    RSpeed[1] *= (1. / sq) * 1.5;
  }
  RPos[0] += RSpeed[0];
  RPos[1] += RSpeed[1];
}

const float addRadius = (float) NUM_LEDS / 8000;
void render(CRGB Col) {
  phisics();
  if (RPos[1] < (HEIGHT - 1.) and RPos[1] >= 0.)
    if (RPos[0] < (WIDTH - 1.) and RPos[0] >= 0.) {
      CRGB color = Col;
      drawPixelXYF(RPos[0], RPos[1], color);
    }
}

void start() {
  DPos[0] = random() % WIDTH;
  DPos[1] = random() % HEIGHT;
  reg();
}

void draw() {
  if (loadingFlag) {
    start();
    loadingFlag = false;
  }
  fadeToBlackBy(leds, NUM_LEDS, 20);
  render(CRGB(255, 255, 255));
  if (dist(RPos[0], RPos[1], DPos[0], DPos[1]) <= .75) {
    { DPos[0] = random() % WIDTH;
      DPos[1] = random() % HEIGHT; }
    if (straightLineDir) {
      float a = dist(DPos[0], DPos[1], RPos[0], RPos[1]);
      RSpeed[0] *= (1. / a);
      RSpeed[1] *= (1. / a);
    }
    starPoints = random(3, 7);
    radius = 1;
    hue = millis() >> 1;
  }
  radius += addRadius;
  angle += radius;
  switch (hue % 3) {
    case 0:
      drawCircleF(DPos[0], DPos[1], radius, ColorFromPalette(HeatColors_p, 255 - RFade)); // рисуем круг
      break;
    case 1:
      drawStarF(DPos[0], DPos[1], 1.3 * radius, radius, 4, angle, ColorFromPalette(HeatColors_p, 255 - RFade)); // рисуем квадрат
      break;
    case 2:
      drawStarF(DPos[0], DPos[1], 2 * radius, radius, starPoints, angle, ColorFromPalette(HeatColors_p, 255 - RFade)); // рисуем звезду
      break;
  }
  delay(16);
}