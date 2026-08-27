//Stepko
//17.06.21
byte scale = 64;
byte speed = 92;
static uint32_t t;
void draw() {
  t += speed;
  for (byte x = 0; x < LED_COLS; x++) {
    for (byte y = 0; y < LED_ROWS; y++) {
     
      int16_t Bri = inoise8(x * scale, (y * scale) - t) - (y * (255 / LED_ROWS));
      byte Col = Bri;// inoise8(x * scale, (y * scale) - t) - (y * (255 / LED_ROWS));
       if (Bri < 0) Bri = 0; if(Bri != 0) Bri = 256 - (Bri * 0.2);
      nblend(leds[XY(x, y)], ColorFromPalette(HeatColors_p, Col, Bri), speed);}
  }
}