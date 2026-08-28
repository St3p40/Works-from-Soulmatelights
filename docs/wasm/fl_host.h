// Pull in FastLED's maths on a host/wasm target. FastLED 3.6.0 has no stub
// platform, but lib8tion/noise/colorutils are platform independent - the AVR
// assembly in them is already behind __AVR__ guards. So we claim FastLED.h and
// led_sysdefs.h are "already included", supply the handful of macros they would
// have defined, and include the maths headers directly. No controllers, no
// pins, no SPI - none of which the sketches touch.
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

#define __INC_FASTSPI_LED2_H
#define __INC_LED_SYSDEFS_H

#define F_CPU 16000000
#define FASTLED_NAMESPACE_BEGIN
#define FASTLED_NAMESPACE_END
#define FASTLED_USING_NAMESPACE
#define CLKS_PER_US (F_CPU/1000000)
#define FASTLED_SCALE8_FIXED 1

// lib8tion's beat functions call GET_MILLIS; on a real board that is Arduino's
// millis(). Point it at ours, or the link goes looking for FastLED.cpp.
uint32_t millis();
#define GET_MILLIS millis

#include "fastled/src/fastled_config.h"
#include "fastled/src/fastled_progmem.h"
#include "fastled/src/lib8tion.h"
#include "fastled/src/color.h"
#include "fastled/src/pixeltypes.h"
#include "fastled/src/hsv2rgb.h"
#include "fastled/src/colorutils.h"
#include "fastled/src/colorpalettes.h"
#include "fastled/src/noise.h"
