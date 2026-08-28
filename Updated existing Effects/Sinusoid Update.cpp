//// ----------------------------- Sinusoid UPD ------------------------------
//(c)Stefan Petrick https://gist.github.com/StefanPetrick/dc666c1b4851d5fb8139b73719b70149
//upd by Stepko
//https://wokwi.com/arduino/projects/287675911209222664
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS

bool loadingFlag = true;

#define regime 0 //0-Sinusoid I/1-II/2-III/3-IV

uint8_t speed = 30;
uint8_t scale = 1;
uint8_t amplitude = 200;

static float fmap(const float x,
  const float in_min,
    const float in_max,
      const float out_min,
        const float out_max) {
  return (out_max - out_min) * (x - in_min) / (in_max - in_min) + out_min;
}

const uint8_t semiHeightMajor = HEIGHT / 2 + (HEIGHT % 2);
const uint8_t semiWidthMajor = WIDTH / 2 + (WIDTH % 2);
float e_s3_speed, e_s3_size; // amplitude of the curves
uint8_t _scale;

void draw() {
  if (loadingFlag) {
    loadingFlag = 0;
    e_s3_speed = 0.004 * speed + 0.015; // speed of the movement along the Lissajous curves
    e_s3_size = fmap(amplitude, 1, 255, 3, 9); // amplitude of the curves
    _scale = map8(scale, 50, 150) / 2;
  }
  float time_shift = millis();
  struct {
    float shiftX;
    float shiftY;
  }sshft[3];
  sshft[0].shiftX = float(e_s3_size * (sin16(e_s3_speed * 98.301 * time_shift))) / 32767.0;
  sshft[0].shiftY = float(e_s3_size * (sin16(e_s3_speed * 72.0874 * time_shift))) / 32767.0;
  sshft[1].shiftX = float(e_s3_size * (sin16(e_s3_speed * 134.3447 * time_shift))) / 32767.0;
  sshft[1].shiftY = float(e_s3_size * (sin16(e_s3_speed * 170.3884 * time_shift))) / 32767.0;
  sshft[2].shiftX = float(e_s3_size * (sin16(e_s3_speed * 68.8107 * time_shift))) / 32767.0;
  sshft[2].shiftY = float(e_s3_size * (sin16(e_s3_speed * 65.534 * time_shift))) / 32767.0;
  switch (regime) {
    case 0: { //Sinusoid I
      for (uint8_t y = 0; y < HEIGHT; y++) {
        for (uint8_t x = 0; x < WIDTH; x++) {
          CRGB color;
          float cx = (y - semiHeightMajor) + sshft[0].shiftX; // the 8 centers the middle on a 16x16
          float cy = (x - semiWidthMajor) + sshft[0].shiftY;
          int8_t v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          color.r = ~v;

          cx = (y - semiHeightMajor) + sshft[1].shiftX;
          cy = (x - semiWidthMajor) + sshft[1].shiftY;
          v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          color.b = ~v;
          leds[XY(x, y)] = color;
        }
      }
    } break;

    case 1: { //Sinusoid II
      for (uint8_t y = 0; y < HEIGHT; y++) {
        for (uint8_t x = 0; x < WIDTH; x++) {
          CRGB color;
          float cx = (y - semiHeightMajor) + sshft[0].shiftX;
          float cy = (x - semiWidthMajor) + sshft[0].shiftY;
          int8_t change = time_shift * 0.1 * e_s3_speed;
          int8_t v = change + sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          color.r = ~v;

          cx = (y - semiHeightMajor) + sshft[1].shiftX;
          cy = (x - semiWidthMajor) + sshft[1].shiftY;
          change = time_shift * 0.09 * e_s3_speed;
          v = change + sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          color.r = (uint8_t(~v) > color.r) ? ~v : color.r;
          color.g = uint8_t(~v) / 2;
          leds[XY(x, y)] = color;
        }
      }
    } break;

    case 2: { //Sinusoid III
      for (uint8_t y = 0; y < HEIGHT; y++) {
        for (uint8_t x = 0; x < WIDTH; x++) {
          float cx = (y - semiHeightMajor) + sshft[0].shiftX;
          float cy = (x - semiWidthMajor) + sshft[0].shiftY;
          int8_t v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          leds[XY(x, y)].r = ~v;

          cx = (y - semiHeightMajor) + sshft[1].shiftX;
          cy = (x - semiWidthMajor) + sshft[1].shiftY;
          v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          leds[XY(x, y)].g = ~v;

          cx = (y - semiHeightMajor) + sshft[2].shiftX;
          cy = (x - semiWidthMajor) + sshft[2].shiftX;
          v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy)));
          leds[XY(x, y)].b = ~v;
        }
      }
    } break;

    case 3: { //Sinusoid IV
      for (uint8_t y = 0; y < HEIGHT; y++) {
        for (uint8_t x = 0; x < WIDTH; x++) {
          float cx = (y - semiHeightMajor) + sshft[0].shiftX;
          float cy = (x - semiWidthMajor) + sshft[0].shiftY;
          int8_t v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy))) + (time_shift * e_s3_speed);
          leds[XY(x, y)].b = ~v;

          cx = (y - semiHeightMajor) + sshft[1].shiftX;
          cy = (x - semiWidthMajor) + sshft[1].shiftY;
          v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy))) + (time_shift * e_s3_speed);
          leds[XY(x, y)].g = ~v;

          cx = (y - semiHeightMajor) + sshft[2].shiftX;
          cy = (x - semiWidthMajor) + sshft[2].shiftX;
          v = sin8(_scale * sqrt(( cx * cx) + ( cy * cy))) + (time_shift * e_s3_speed);
          leds[XY(x, y)].r = ~v;
        }
      }
    } break;
  }
}
