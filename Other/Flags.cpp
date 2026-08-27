//// ----------------------------- Flags ------------------------------
//(c)stepko and kostyamat
//17.03.21

// Matrix size
#define WIDTH LED_COLS
#define HEIGHT LED_ROWS
#define DEVIATOR 512. / LED_COLS
#define SPEED_ADJ (float) N_LEDS / 512

#define speed 16 // 1 - 16
#define CHANGE_FLAG 30 // >= 9 Autochange

uint8_t thisVal;
uint8_t thisMax;


//Germany
void germany(byte i, byte j) {
    leds[XY(i, j)] += (j < thisMax - HEIGHT / 4) ? CHSV(68, 255, thisVal) : (j < thisMax + HEIGHT / 4) ? CHSV(0, 255, thisVal) : CHSV(0, 0, thisVal / 2.5);
}

//Ukraine
void ukraine(byte i, byte j) {
    leds[XY(i, j)] += (j < thisMax) ? CHSV(50, 255, thisVal) : CHSV(150, 255, thisVal);
}

//Belarus
void belarus(uint8_t i, byte j) {
        leds[XY(i, j)] +=  (j < thisMax - HEIGHT / 4) ? CHSV(0, 0, thisVal) : (j < thisMax + HEIGHT / 4) ? CHSV(0, 224, thisVal) : CHSV(0, 0, thisVal);
}
//Poland
void poland(byte i, byte j) {
    leds[XY(i, j)] += (j < thisMax + 1) ? CHSV(248, 214, (float) thisVal * 0.83) : CHSV(25, 3, (float) thisVal * 0.91);
}

//The USA
void USA(byte i,byte j) {
    leds[XY(i, j)] +=
      ((i <= WIDTH / 2) && (j + thisMax > HEIGHT - 1 + HEIGHT / 16)) ?
      ((i % 2 && ((int) j - HEIGHT / 16 + thisMax) % 2) ? CHSV(160, 0, thisVal) : CHSV(160, 255, thisVal)) :
      ((j + 1 + thisMax) % 6 < 3 ? CHSV(0, 0, thisVal) : CHSV(0, 255, thisVal));
}

//Italy
void italy(byte i, byte j) {
    leds[XY(i, j)] += (i < WIDTH / 3) ? CHSV(90, 255, thisVal) : (i < WIDTH - 1 - WIDTH / 3) ? CHSV(0, 0, thisVal) : CHSV(0, 255, thisVal);
}

//France
void france(byte i, byte j) {
    leds[XY(i, j)] += (i < WIDTH / 3) ? CHSV(160, 255, thisVal) : (i < WIDTH - 1 - WIDTH / 3) ? CHSV(0, 0, thisVal) : CHSV(0, 255, thisVal);
}

//The UK
void UK(byte i, byte j) {
    leds[XY(i, j)] += ((i > WIDTH / 2 + 1 || i < WIDTH / 2 - 2) && (i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) > -2 && (i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) < 2)) || (i > WIDTH / 2 + 1 || i < WIDTH / 2 - 2) && (WIDTH - 1 - i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) > -2 && (WIDTH - 1 - i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) < 2)) || (WIDTH / 2 - i == 0) || (WIDTH / 2 - 1 - i == 0) || ((HEIGHT - (j + thisMax)) == 0) || ((HEIGHT - 1 - (j + thisMax)) == 0)) ? CHSV(0, 255, thisVal) : ((i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) > -4 && (i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) < 4)) || (WIDTH - 1 - i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) > -4 && (WIDTH - 1 - i - (j + thisMax - (HEIGHT * 2 - WIDTH) / 2) < 4)) || (WIDTH / 2 + 1 - i == 0) || (WIDTH / 2 - 2 - i == 0) || (HEIGHT + 1 - (j + thisMax) == 0) || (HEIGHT - 2 - (j + thisMax) == 0)) ? CHSV(0, 0, thisVal) : CHSV(150, 255, thisVal);
}

//Spain
void spain(byte i,byte j) {
    leds[XY(i, j)] += (j < thisMax - HEIGHT / 3) ? CHSV(250, 224, (float) thisVal * 0.68) : (j < thisMax + HEIGHT / 3) ? CHSV(64, 255, (float) thisVal * 0.98) : CHSV(250, 224, (float) thisVal * 0.68);
}

typedef struct _EFFECT {
  const char * eff_name;
  void( * func)(byte i, byte j);
}
EFFECT;


static EFFECT _EFFECTS_ARR[] {
  { "Ukraine", ukraine },{ "UK", UK }, { "Germany", germany },  { "Poland", poland }, { "Belarus", belarus }, { "Italy", italy }, { "Spain", spain }, { "France", france }, { "USA", USA }
  
};

float counter;
uint8_t flag = 0;
//void (*fcnPtr)(byte i) = UK; // initial pattern

void changeFlags() {
  #if CHANGE_FLAG >= 9
  EVERY_N_SECONDS(CHANGE_FLAG) {
    flag++;
    if (flag > sizeof(_EFFECTS_ARR) / sizeof(EFFECT)) flag = 0;
  }
  #else
  flag = CHANGE_FLAG;
  #endif
}

uint8_t mix(uint8_t a1, uint8_t a2, uint8_t l){
  return ((a1*l)+(a2*(255-l)))/255;
}

void draw() {
  changeFlags();
  fadeToBlackBy(leds, NUM_LEDS, 32);
  for (byte i = 0; i < WIDTH; i++) {
    thisVal = mix(inoise8(((float) i * DEVIATOR)-counter,counter/2,(float)i*SPEED_ADJ),128,i*(255/WIDTH));
    thisMax = map(thisVal, 0, 255, 0, HEIGHT - 1);
    for (byte j = 0; j < HEIGHT; j++) {
    //fcnPtr(i);
    if(thisMax > ((flag == 1 || flag == 8)?(HEIGHT-1-j):j)+HEIGHT/2 || thisMax < ((flag == 1 || flag == 8)?(HEIGHT-1-j):j)-HEIGHT/2) leds[XY(i,j)]=0; else
    _EFFECTS_ARR[flag].func(i,j);}
  }
  blur2d(leds, LED_COLS, LED_ROWS, 40);
  counter += speed * SPEED_ADJ;
  delay(16);
}