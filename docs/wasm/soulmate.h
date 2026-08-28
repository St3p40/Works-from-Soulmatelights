// The Soulmate IDE environment, on top of real FastLED 3.6.0.
// Everything the sketches call that is NOT FastLED lives here.
#pragma once
#include "fl_host.h"

#ifndef LED_COLS
#define LED_COLS 32
#endif
#ifndef LED_ROWS
#define LED_ROWS 32
#endif
#define NUM_LEDS (LED_COLS * LED_ROWS)
#define N_LEDS NUM_LEDS

typedef uint8_t byte;
typedef bool boolean;

extern CRGB leds[NUM_LEDS + 1];   // +1: the off-panel guard slot
uint16_t XY(uint8_t x, uint8_t y);

uint32_t millis();
void delay(uint32_t ms);
long random(long howbig);
long random(long howsmall, long howbig);
void randomSeed(unsigned long seed);
long map(long x, long in_min, long in_max, long out_min, long out_max);
float fmap(float x, float a, float b, float c, float d);

// Arduino supplies these as macros, which is why they must come after every
// C++ header - std::min/std::max would not survive them.
#define constrain(a,lo,hi) ((a)<(lo)?(lo):((a)>(hi)?(hi):(a)))
#define min(a,b) ((a)<(b)?(a):(b))
#define max(a,b) ((a)>(b)?(a):(b))
#define radians(d) ((d)*DEG_TO_RAD)
#define degrees(r) ((r)*RAD_TO_DEG)
#define DEG_TO_RAD 0.017453292519943295
#define RAD_TO_DEG 57.29577951308232
#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif

// AVR keeps constant tables in flash; on a host they are just memory
#ifndef PROGMEM
#define PROGMEM
#endif
#define pgm_read_byte(p)       (*(const uint8_t*)(p))
#define pgm_read_byte_near(p)  (*(const uint8_t*)(p))
#define pgm_read_word(p)       (*(const uint16_t*)(p))
#define pgm_read_word_near(p)  (*(const uint16_t*)(p))
#define pgm_read_dword(p)      (*(const uint32_t*)(p))

// FastLED's own object, cut down to what the sketches use
struct SoulmateFastLED {
  void clear(bool writeData = false) { memset8(leds, 0, NUM_LEDS * sizeof(CRGB)); (void)writeData; }
  void clearData() { clear(); }
  void show() {}
  void setBrightness(uint8_t) {}
  void delay(uint32_t) {}
  uint16_t getBrightness() { return 255; }
};
extern SoulmateFastLED FastLED;
