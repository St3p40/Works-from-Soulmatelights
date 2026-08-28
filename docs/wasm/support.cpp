#include "soulmate.h"
CRGB leds[NUM_LEDS + 1];
SoulmateFastLED FastLED;
static uint32_t g_ms = 0;
static uint32_t g_seed = 1;
static CRGB trash;   // writes off the panel land here instead of in memory
uint16_t XY(uint8_t x, uint8_t y){
  if (x >= LED_COLS || y >= LED_ROWS) return NUM_LEDS;   // the guard slot
  return y * LED_COLS + x;
}
uint32_t millis(){ return g_ms; }
void delay(uint32_t ms){ g_ms += ms; }
void advance_frame(uint32_t ms){ g_ms += ms; }
static uint32_t rnd32(){ g_seed = g_seed * 1103515245u + 12345u; return g_seed >> 8; }
long random(long howbig){ return howbig ? (long)(rnd32() % howbig) : 0; }
long random(long a, long b){ return b > a ? a + (long)(rnd32() % (b - a)) : a; }
void randomSeed(unsigned long s){ g_seed = (uint32_t)s | 1; }
long map(long x, long a, long b, long c, long d){ return b == a ? c : (x - a) * (d - c) / (b - a) + c; }
float fmap(float x, float a, float b, float c, float d){ return (d - c) * (x - a) / (b - a) + c; }

// FastLED.cpp supplies this on a board; we are not compiling FastLED.cpp
uint32_t get_millisecond_timer(){ return millis(); }

void reset_clock(){ g_ms = 0; g_seed = 1; }

void set_millis(uint32_t ms){ g_ms = ms; }
uint32_t get_seed(){ return g_seed; }
void set_seed(uint32_t s){ g_seed = s; }
