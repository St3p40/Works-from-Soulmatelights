// Bombs
// remastered(original version is deleted)
// St3P40 aka Stepko
// 17.05.23
#define SPARKS_AM NUM_LEDS / 128
uint8_t SpeedK = 6;
uint8_t SpeedDecX = 1;
uint8_t FadeSpK = 16;
bool Board = 1;
uint16_t limiter = 383;

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

bool loadingFlag = true;
struct {
  int16_t PosX, PosY;
  float SpeedX, SpeedY;
  int16_t Fade;
  byte Color;

  void reg() {
    //SpeedY = random(0, 10);
    //if (PosY < 10) {
      PosX = random(0, LED_COLS - 1) << 8;
      PosY = LED_ROWS * 255;
      SpeedY = 0;
    //}
    SpeedX = (((random()%2) * 2) - 1) * random(128,255) * (bool)(random()%6);

    Fade = 1024;
    Color = random(0, 70);
  }

  void boom() {
    int maxX = pow(LED_COLS / 6, 2), maxY = pow(LED_ROWS / 6, 2);
    for(uint8_t i = 0; i < 3; i++){
      int xoffset = (i)?random(0,LED_COLS / 6)*(((random()%2) * 2) - 1):0;
      int yoffset = (i)?random(0,LED_ROWS / 6)*(((random()%2) * 2) - 1):0;
      //Serial.println(String(xoffset)+ " " + String(yoffset) + " ");
    for (int8_t x = -(LED_COLS /4); x < LED_COLS / 4; x++) {
      for (int8_t y = -(LED_ROWS / 4); y < LED_ROWS / 4; y++) {
        CRGB boomcol = CHSV(50, 120, constrain(map((x * x + y * y), 0, maxX + maxY, 255, 0), 0, 255));
        leds[XY(xoffset + (PosX >> 8) + x, yoffset + (PosY >> 8) + y)] += boomcol;
      }}
    }
  }

  void phisics() {
    SpeedY -= SpeedK;
    if (SpeedDecX || SpeedX) {
      if (SpeedX > 0)
        SpeedX -= SpeedDecX;
      else
        SpeedX += SpeedDecX;
      if (abs(SpeedX) <= SpeedDecX)
        SpeedX = 0;
    }
    if (Board) {
      if (PosX < 0 || PosX >= (LED_COLS - 1) << 8) SpeedX = -SpeedX;
    }
    if (PosY < 0) {
      SpeedY = -SpeedY;
    }
    float speedvectdist = sqrt(pow(SpeedX,2)+pow(SpeedY, 2));
    if(speedvectdist >= limiter){
    SpeedX = (SpeedX / speedvectdist) * limiter;
    SpeedY = (SpeedY / speedvectdist) * limiter;}
    PosX += SpeedX;
    PosY += SpeedY;
    Fade -= FadeSpK;
    if ((SpeedY > 0 && SpeedY < 1 && PosY < 512) || Fade <= 32) {
      if(PosY > 10)boom();
      reg();
    }
  }

  void render(CRGB Col) {
    phisics();
    if (PosX < ((LED_ROWS - 1) << 8) && PosY >= 0)
      if (PosX < ((LED_COLS - 1) << 8) && PosX >= 0) {
        CRGB color = Col;
        wu_pixel(PosX, PosY, & color);
      }
  }
} dot[SPARKS_AM];

void draw() {
  if (loadingFlag) {
    for (byte i = 0; i < SPARKS_AM; i++) {
      dot[i].reg();
      dot[i].PosY = LED_ROWS << 8;
      dot[i].PosX = random(0, LED_COLS - 1) << 8;
      dot[i].Fade = random(0,1024);
    }
    loadingFlag = false;
  }
  fadeToBlackBy(leds, NUM_LEDS, 32);
  for (byte i = 0; i < SPARKS_AM; i++) {
    dot[i].render(CHSV(dot[i].Color, 255, 255));
  }
  delay(16);
}