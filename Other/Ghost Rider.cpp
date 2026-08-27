// Matrix size
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS
//// ----------------------------- Ghost Rider ------------------------------
//(c)stepko
//--Settings------
#define Speed 255
#define reseting 10 //reset time in seconds, 0-off
//---------------
#define LIGHTERS_AM WIDTH + HEIGHT
struct {
  int16_t PosX;
  int16_t PosY;
  uint16_t Angle;
  uint16_t vSpeed;
  int8_t angleSpeed;
}
rider;

bool loadingFlag = true;

void wu_pixel(uint32_t x, uint32_t y, CRGB * col) { //awesome wu_pixel procedure by reddit u/sutaburosu
  // extract the fractional parts and derive their inverses
  uint8_t xx = x & 0xff, yy = y & 0xff, ix = 255 - xx, iy = 255 - yy;
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
    uint16_t xy = XY((x >> 8) + (i & 1), (y >> 8) + ((i >> 1) & 1));
    leds[xy].r = qadd8(leds[xy].r, col -> r * wu[i] >> 8);
    leds[xy].g = qadd8(leds[xy].g, col -> g * wu[i] >> 8);
    leds[xy].b = qadd8(leds[xy].b, col -> b * wu[i] >> 8);
  }
}
struct {
  int16_t PosX;
  int16_t PosY;
  int16_t SpeedX;
  int16_t SpeedY;
  uint16_t time;
  bool reg;
  void run() {
    time += random(5, 20);
    if (time >= 255) { reg = true; }
    if (PosX < 0) PosX = (WIDTH - 1) << 8;
    if (PosX > (WIDTH - 1) << 8) PosX = 0;
    if (PosY < 0) PosY = (HEIGHT - 1) << 8;
    if (PosY > (HEIGHT - 1) << 8) PosY = 0;
    if (reg) {
      PosY = rider.PosY;
      PosX = rider.PosX;
      int8_t angleoffset = ((2 * random()%2) - 1) * (random() % 10);
      SpeedX = -sin(radians(rider.Angle + angleoffset)) * 244;
      SpeedY = -cos(radians(rider.Angle + angleoffset)) * 244;
      time = 0;
      reg = false;
    } else {
      PosX += SpeedX;
      PosY += SpeedY;
    }
    wu_pixel(PosX, PosY, & ColorFromPalette(HeatColors_p, (256 - time)));
  }
}
trace[LIGHTERS_AM];

void draw() {
  if (loadingFlag) {
    loadingFlag = false;
    randomSeed(millis());
    rider.angleSpeed = random(-10, 10);
    rider.vSpeed = 128;
    rider.PosX = (WIDTH / 2) << 8;
    rider.PosY = (HEIGHT / 2) << 8;
    for (byte i = 0; i < LIGHTERS_AM; i++) {
      trace[i].PosX = rider.PosX;
      trace[i].PosY = rider.PosY + (i * 25);
      trace[i].time = i * 2;
    }
  }
  fadeToBlackBy(leds, NUM_LEDS, 60);
  CRGB color = CRGB::White;
  wu_pixel(rider.PosX, rider.PosY, & color);
  rider.PosX += rider.vSpeed * sin(radians(rider.Angle));
  rider.PosY += rider.vSpeed * cos(radians(rider.Angle));
  rider.Angle += rider.angleSpeed;
  if (rider.PosX < 0) rider.PosX = (WIDTH - 1) << 8;
  if (rider.PosX > (WIDTH - 1) << 8) rider.PosX = 0;
  if (rider.PosY < 0) rider.PosY = (HEIGHT - 1) << 8;
  if (rider.PosY > (HEIGHT - 1) << 8) rider.PosY = 0;
  for (byte i = 0; i < LIGHTERS_AM; i++) {
    trace[i].run();
  }
  if (reseting > 0) {
    EVERY_N_SECONDS(reseting) {
      randomSeed(millis());
      rider.angleSpeed = ((2 * random()%2) - 1) * (random() % 10);
      rider.vSpeed = random(128, 255);
    }
  }
  blur2d(leds, LED_COLS, LED_ROWS, 32);
  delay(16);
}