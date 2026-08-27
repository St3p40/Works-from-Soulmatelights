bool setup = true;
#define GROWS 4
#define GCOLS 4
int grid[GCOLS][GROWS];
bool moved = false;

double log2(double num) {
  double number = log(num) / log(2);
  return (number);
}

bool anyPairsPresent() {
  for (uint8_t x = 0; x < GCOLS; x++) {
    for (uint8_t y = 0; y < GROWS - 1; y++) {
      if (grid[x][y] == grid[x][y + 1]) {
        return true;
      }
    }
  }
  return false;
}

bool gridIsFull() {
  for (uint8_t i = 0; i < GCOLS; i++) {
    for (uint8_t j = 0; j < GROWS; j++) {
      if (!grid[i][j]) {
        return false;
      }
    }
  }
  return true;
}

void rotate() { //Transpose of the matrix
  int temp[GCOLS][GROWS];
  for (uint8_t i = 0; i < GCOLS; i++) {
    for (uint8_t j = 0; j < GROWS; j++) {
      temp[j][i] = grid[i][j];
    }
  }
  memcpy(grid, temp, sizeof(grid));
}

bool gameEnded() {
  
  if (!gridIsFull()) {
    return false;
  }
  
  if (anyPairsPresent()) {
    return false;
  }
  
  rotate();
  
  if (anyPairsPresent()) {
    return false;
  }
  
  rotate();
  rotate();
  rotate();
  
  return true;
}

void generateNewTile() {
  uint8_t no, k, l;
  bool generated = false;
  
  while (!generated) {
    k = random() % GROWS; //Random row
    l = random() % GCOLS; //Random column
    if (grid[k][l] == 0) { //If the tile is empty, fill it with random number
      no = 2 * ((random() % 10) + 1);
      if (no < 5) {
        grid[k][l] = 4;
      } else {
        grid[k][l] = 2;
      }
      generated = true;
    }
  }
}

void moveUp() {
  int i, j, k, tmp;
  
  for (k = 0; k < GROWS; k++) {
    tmp = -1, j = 0;
    for (i = 0; i < GCOLS; i++) {
      if (grid[i][k] != 0) {
        if (tmp == -1) {
          tmp = grid[i][k];
        } else if ((tmp) && (grid[i][k] == tmp)) {
          grid[j][k] = tmp + tmp;
          tmp = -1;
          j++;
          moved = true;
        } else {
          grid[j][k] = tmp;
          tmp = grid[i][k];
          j++;
        }
      }
    }
    if (tmp != -1) {
      grid[j][k] = tmp;
      j++;
    }
    while (j < GCOLS) {
      if (grid[j][k]) {
        grid[j][k] = 0;
        moved = true;
      }
      j++;
    }
  }
}

void moveDown() {
  int i, j, k, tmp;
  
  for (k = 0; k < GROWS; k++) {
    tmp = -1, j = GCOLS - 1;
    for (i = GCOLS - 1; i >= 0; i--) {
      if (grid[i][k] != 0) {
        if (tmp == -1) {
          tmp = grid[i][k];
        } else if ((tmp) && (grid[i][k] == tmp)) {
          grid[j][k] = tmp + tmp;
          tmp = -1;
          j--;
          moved = true;
        } else {
          grid[j][k] = tmp;
          tmp = grid[i][k];
          j--;
        }
      }
    }
    if (tmp != -1) {
      grid[j][k] = tmp;
      j--;
    }
    while (j >= 0) {
      if (grid[j][k]) {
        grid[j][k] = 0;
        moved = true;
      }
      j--;
    }
  }
}

void moveLeft() {
  rotate();
  moveUp();
  rotate();
}

void moveRight() {
  rotate();
  moveDown();
  rotate();
}

bool moveTiles(byte direction) {
  moved = false;
  switch (direction) {
    case 0:
      moveUp();
      break;
    case 1:
      moveDown();
      break;
    case 2:
      moveLeft();
      break;
    case 3:
      moveRight();
      break;
  }
  generateNewTile();
  return moved;
}

void startgame() {
  for (uint8_t x = 0; x < GCOLS; x++) {
    for (uint8_t y = 0; y < GROWS; y++) { grid[x][y] = 0; }
  }
  generateNewTile();
  generateNewTile();
}

void draw() {
  if (setup) {
    startgame();
    setup = false;
  } else
    moveTiles(random() % 4);
  for (uint8_t x = 0; x < GCOLS; x++) {
    for (uint8_t y = 0; y < GROWS; y++) {
      uint8_t col = (grid[x][y]) ? log2(grid[x][y]) * 23 : 0;
      for (uint8_t i = 0; i < LED_COLS / GCOLS; i++) {
        for (uint8_t j = 0; j < LED_ROWS / GROWS; j++) {
          if (grid[x][y] == 0)
            leds[XY(x * LED_COLS / GCOLS + i, y * LED_ROWS / GROWS + j)] = CHSV(0, 0, 0);
          else {
            if (i == 0 || i == (LED_COLS / GCOLS) - 1 || j == 0 || j == (LED_ROWS / GROWS) - 1)
              leds[XY(x * LED_COLS / GCOLS + i, y * LED_ROWS / GROWS + j)] = ColorFromPalette(RainbowColors_p, col);
            else
              leds[XY(x * LED_COLS / GCOLS + i, y * LED_ROWS / GROWS + j)] = ColorFromPalette(RainbowColors_p, col, 160);
          }
        }
      }
    }
  }
  if (gameEnded()) {
    startgame();
  }
  delay(160);
}