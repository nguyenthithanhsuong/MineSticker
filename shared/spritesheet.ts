export interface TextureCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const SPRITE_SHEET = "/MineTextures.png";
export const CHAR_SPRITE_SHEET = "/chartdl.png";
export const IDLE_SPRITE_SHEET = "/idle.png";
export const INTRO_SPRITE_SHEET = "/intro.png";
export const WALK_SPRITE_SHEET = "/walk.png";
export const CHILLWALK_SPRITE_SHEET = "/chillwalk.png";
export const PANIC_SPRITE_SHEET = "/panic.png";
export const DEAD_SPRITE_SHEET = "/dead.png";
export const KABOOM_SPRITE_SHEET = "/kaboom.png";
export const SCORCH_SPRITE_SHEET = "/scorch.png";
export const PLACEFLAG_SPRITE_SHEET = "/placeflag.png";
export const CHEER_SPRITE_SHEET = "/cheer.png";

export const FACE_COORDS: Record<string, TextureCoords> = {
  face1: { x1: 0, y1: 24, x2: 23, y2: 47 },
  face2: { x1: 25, y1: 24, x2: 48, y2: 47 },
  face3: { x1: 75, y1: 24, x2: 98, y2: 47 },
  face4: { x1: 100, y1: 24, x2: 123, y2: 47 }
};

export const TILE_COORDS: Record<string, TextureCoords> = {
  tile0: { x1: 0, y1: 49, x2: 15, y2: 64 },
  tile1: { x1: 0, y1: 66, x2: 15, y2: 81 },
  tile2: { x1: 17, y1: 66, x2: 32, y2: 81 },
  tile3: { x1: 34, y1: 66, x2: 49, y2: 81 },
  tile4: { x1: 51, y1: 66, x2: 66, y2: 81 },
  tile5: { x1: 68, y1: 66, x2: 83, y2: 81 },
  tile6: { x1: 85, y1: 66, x2: 100, y2: 81 },
  tile7: { x1: 102, y1: 66, x2: 117, y2: 81 },
  tile8: { x1: 119, y1: 66, x2: 134, y2: 81 },
  tile9: { x1: 17, y1: 49, x2: 32, y2: 64 },
  tilef: { x1: 34, y1: 49, x2: 49, y2: 64 },
  tileb1: { x1: 85, y1: 49, x2: 100, y2: 64 },
  tileb2: { x1: 102, y1: 49, x2: 117, y2: 64 }
};

export const NUMBER_COORDS: Record<string, TextureCoords> = {
  number0: { x1: 126, y1: 0, x2: 138, y2: 22 },
  number1: { x1: 0, y1: 0, x2: 12, y2: 22 },
  number2: { x1: 14, y1: 0, x2: 26, y2: 22 },
  number3: { x1: 28, y1: 0, x2: 40, y2: 22 },
  number4: { x1: 42, y1: 0, x2: 54, y2: 22 },
  number5: { x1: 56, y1: 0, x2: 68, y2: 22 },
  number6: { x1: 70, y1: 0, x2: 82, y2: 22 },
  number7: { x1: 84, y1: 0, x2: 96, y2: 22 },
  number8: { x1: 98, y1: 0, x2: 110, y2: 22 },
  number9: { x1: 112, y1: 0, x2: 124, y2: 22 },
  numberd: { x1: 140, y1: 0, x2: 152, y2: 22 },
  numberb: { x1: 154, y1: 0, x2: 166, y2: 22 }
};

export const SCORCH_COORDS: TextureCoords = { x1: 0, y1: 0, x2: 199, y2: 199 };

export const KEY_COORDS: Record<string, TextureCoords> = {
  keyW: { x1: 0, y1: 83, x2: 23, y2: 106 },
  keyA: { x1: 25, y1: 83, x2: 48, y2: 106 },
  keyS: { x1: 50, y1: 83, x2: 73, y2: 106 },
  keyD: { x1: 75, y1: 83, x2: 98, y2: 106 },
  keyBlank: { x1: 100, y1: 83, x2: 123, y2: 106 },
  arrowUp: { x1: 0, y1: 108, x2: 23, y2: 131 },
  arrowUpLeft: { x1: 25, y1: 108, x2: 48, y2: 131 },
  arrowLeft: { x1: 50, y1: 108, x2: 73, y2: 131 },
  arrowDownLeft: { x1: 75, y1: 108, x2: 98, y2: 131 },
  arrowDown: { x1: 100, y1: 108, x2: 123, y2: 131 },
  arrowDownRight: { x1: 125, y1: 108, x2: 148, y2: 131 },
  arrowRight: { x1: 150, y1: 108, x2: 173, y2: 131 },
  arrowUpRight: { x1: 175, y1: 108, x2: 198, y2: 131 }
};

export const CHAR_FEET_COORDS: TextureCoords = {
  x1: 16,
  y1: 31,
  x2: 31,
  y2: 47
};

export const CHAR_FULL_COORDS: TextureCoords = {
  x1: 0,
  y1: 0,
  x2: 47,
  y2: 47
};
// Idle animation frames (frame size: 112x112)
export const IDLE_COORDS: Record<string, TextureCoords> = {
  idle0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  idle1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  idle2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  idle3: { x1: 336, y1: 0, x2: 447, y2: 111 }
};

// Intro animation frames (13 columns x 1 row, frame size: 112x112)
export const INTRO_COORDS: Record<string, TextureCoords> = {
  intro0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  intro1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  intro2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  intro3: { x1: 336, y1: 0, x2: 447, y2: 111 },
  intro4: { x1: 448, y1: 0, x2: 559, y2: 111 },
  intro5: { x1: 560, y1: 0, x2: 671, y2: 111 },
  intro6: { x1: 672, y1: 0, x2: 783, y2: 111 },
  intro7: { x1: 784, y1: 0, x2: 895, y2: 111 },
  intro8: { x1: 896, y1: 0, x2: 1007, y2: 111 },
  intro9: { x1: 1008, y1: 0, x2: 1119, y2: 111 },
  intro10: { x1: 1120, y1: 0, x2: 1231, y2: 111 },
  intro11: { x1: 1232, y1: 0, x2: 1343, y2: 111 },
  intro12: { x1: 1344, y1: 0, x2: 1455, y2: 111 }
};

// Walk animation (11 columns x 4 rows, frame size: 112x112)
// Rows: 0=Up, 1=Left, 2=Down, 3=Right
export const WALK_COORDS: Record<string, TextureCoords> = {
  // Walk Up (row 0)
  walkUp0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  walkUp1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  walkUp2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  walkUp3: { x1: 336, y1: 0, x2: 447, y2: 111 },
  walkUp4: { x1: 448, y1: 0, x2: 559, y2: 111 },
  walkUp5: { x1: 560, y1: 0, x2: 671, y2: 111 },
  walkUp6: { x1: 672, y1: 0, x2: 783, y2: 111 },
  walkUp7: { x1: 784, y1: 0, x2: 895, y2: 111 },
  walkUp8: { x1: 896, y1: 0, x2: 1007, y2: 111 },
  walkUp9: { x1: 1008, y1: 0, x2: 1119, y2: 111 },
  walkUp10: { x1: 1120, y1: 0, x2: 1231, y2: 111 },
  
  // Walk Left (row 1)
  walkLeft0: { x1: 0, y1: 112, x2: 111, y2: 223 },
  walkLeft1: { x1: 112, y1: 112, x2: 223, y2: 223 },
  walkLeft2: { x1: 224, y1: 112, x2: 335, y2: 223 },
  walkLeft3: { x1: 336, y1: 112, x2: 447, y2: 223 },
  walkLeft4: { x1: 448, y1: 112, x2: 559, y2: 223 },
  walkLeft5: { x1: 560, y1: 112, x2: 671, y2: 223 },
  walkLeft6: { x1: 672, y1: 112, x2: 783, y2: 223 },
  walkLeft7: { x1: 784, y1: 112, x2: 895, y2: 223 },
  walkLeft8: { x1: 896, y1: 112, x2: 1007, y2: 223 },
  walkLeft9: { x1: 1008, y1: 112, x2: 1119, y2: 223 },
  walkLeft10: { x1: 1120, y1: 112, x2: 1231, y2: 223 },
  
  // Walk Down (row 2)
  walkDown0: { x1: 0, y1: 224, x2: 111, y2: 335 },
  walkDown1: { x1: 112, y1: 224, x2: 223, y2: 335 },
  walkDown2: { x1: 224, y1: 224, x2: 335, y2: 335 },
  walkDown3: { x1: 336, y1: 224, x2: 447, y2: 335 },
  walkDown4: { x1: 448, y1: 224, x2: 559, y2: 335 },
  walkDown5: { x1: 560, y1: 224, x2: 671, y2: 335 },
  walkDown6: { x1: 672, y1: 224, x2: 783, y2: 335 },
  walkDown7: { x1: 784, y1: 224, x2: 895, y2: 335 },
  walkDown8: { x1: 896, y1: 224, x2: 1007, y2: 335 },
  walkDown9: { x1: 1008, y1: 224, x2: 1119, y2: 335 },
  walkDown10: { x1: 1120, y1: 224, x2: 1231, y2: 335 },
  
  // Walk Right (row 3)
  walkRight0: { x1: 0, y1: 336, x2: 111, y2: 447 },
  walkRight1: { x1: 112, y1: 336, x2: 223, y2: 447 },
  walkRight2: { x1: 224, y1: 336, x2: 335, y2: 447 },
  walkRight3: { x1: 336, y1: 336, x2: 447, y2: 447 },
  walkRight4: { x1: 448, y1: 336, x2: 559, y2: 447 },
  walkRight5: { x1: 560, y1: 336, x2: 671, y2: 447 },
  walkRight6: { x1: 672, y1: 336, x2: 783, y2: 447 },
  walkRight7: { x1: 784, y1: 336, x2: 895, y2: 447 },
  walkRight8: { x1: 896, y1: 336, x2: 1007, y2: 447 },
  walkRight9: { x1: 1008, y1: 336, x2: 1119, y2: 447 },
  walkRight10: { x1: 1120, y1: 336, x2: 1231, y2: 447 }
};

// Chill walk animation (7 columns x 4 rows, frame size: 112x112)
// Rows: 0=Up, 1=Left, 2=Down, 3=Right
export const CHILLWALK_COORDS: Record<string, TextureCoords> = {
  // Chill walk Up (row 0)
  chillWalkUp0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  chillWalkUp1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  chillWalkUp2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  chillWalkUp3: { x1: 336, y1: 0, x2: 447, y2: 111 },
  chillWalkUp4: { x1: 448, y1: 0, x2: 559, y2: 111 },
  chillWalkUp5: { x1: 560, y1: 0, x2: 671, y2: 111 },
  chillWalkUp6: { x1: 672, y1: 0, x2: 783, y2: 111 },

  // Chill walk Left (row 1)
  chillWalkLeft0: { x1: 0, y1: 112, x2: 111, y2: 223 },
  chillWalkLeft1: { x1: 112, y1: 112, x2: 223, y2: 223 },
  chillWalkLeft2: { x1: 224, y1: 112, x2: 335, y2: 223 },
  chillWalkLeft3: { x1: 336, y1: 112, x2: 447, y2: 223 },
  chillWalkLeft4: { x1: 448, y1: 112, x2: 559, y2: 223 },
  chillWalkLeft5: { x1: 560, y1: 112, x2: 671, y2: 223 },
  chillWalkLeft6: { x1: 672, y1: 112, x2: 783, y2: 223 },

  // Chill walk Right (row 2)
  chillWalkRight0: { x1: 0, y1: 224, x2: 111, y2: 335 },
  chillWalkRight1: { x1: 112, y1: 224, x2: 223, y2: 335 },
  chillWalkRight2: { x1: 224, y1: 224, x2: 335, y2: 335 },
  chillWalkRight3: { x1: 336, y1: 224, x2: 447, y2: 335 },
  chillWalkRight4: { x1: 448, y1: 224, x2: 559, y2: 335 },
  chillWalkRight5: { x1: 560, y1: 224, x2: 671, y2: 335 },
  chillWalkRight6: { x1: 672, y1: 224, x2: 783, y2: 335 },

  // Chill walk Down (row 3)
  chillWalkDown0: { x1: 0, y1: 336, x2: 111, y2: 447 },
  chillWalkDown1: { x1: 112, y1: 336, x2: 223, y2: 447 },
  chillWalkDown2: { x1: 224, y1: 336, x2: 335, y2: 447 },
  chillWalkDown3: { x1: 336, y1: 336, x2: 447, y2: 447 },
  chillWalkDown4: { x1: 448, y1: 336, x2: 559, y2: 447 },
  chillWalkDown5: { x1: 560, y1: 336, x2: 671, y2: 447 },
  chillWalkDown6: { x1: 672, y1: 336, x2: 783, y2: 447 }
};

// Panic animation (16 columns x 1 row, frame size: 112x112)
export const PANIC_COORDS: Record<string, TextureCoords> = {
  panic0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  panic1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  panic2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  panic3: { x1: 336, y1: 0, x2: 447, y2: 111 },
  panic4: { x1: 448, y1: 0, x2: 559, y2: 111 },
  panic5: { x1: 560, y1: 0, x2: 671, y2: 111 },
  panic6: { x1: 672, y1: 0, x2: 783, y2: 111 },
  panic7: { x1: 784, y1: 0, x2: 895, y2: 111 },
  panic8: { x1: 896, y1: 0, x2: 1007, y2: 111 },
  panic9: { x1: 1008, y1: 0, x2: 1119, y2: 111 },
  panic10: { x1: 1120, y1: 0, x2: 1231, y2: 111 },
  panic11: { x1: 1232, y1: 0, x2: 1343, y2: 111 },
  panic12: { x1: 1344, y1: 0, x2: 1455, y2: 111 },
  panic13: { x1: 1456, y1: 0, x2: 1567, y2: 111 },
  panic14: { x1: 1568, y1: 0, x2: 1679, y2: 111 },
  panic15: { x1: 1680, y1: 0, x2: 1791, y2: 111 }
};

// Dead pose (frame size: 112x112)
export const DEAD_COORDS: Record<string, TextureCoords> = {
  dead0: { x1: 0, y1: 0, x2: 111, y2: 111 }
};

// Cheer animation (4 columns x 1 row, frame size: 112x112)
export const CHEER_COORDS: Record<string, TextureCoords> = {
  cheer0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  cheer1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  cheer2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  cheer3: { x1: 336, y1: 0, x2: 447, y2: 111 }
};

// Kaboom animation (4 columns x 4 rows, frame size: 270x270)
export const KABOOM_COORDS: Record<string, TextureCoords> = {
  kaboom0: { x1: 0, y1: 0, x2: 269, y2: 269 },
  kaboom1: { x1: 270, y1: 0, x2: 539, y2: 269 },
  kaboom2: { x1: 540, y1: 0, x2: 809, y2: 269 },
  kaboom3: { x1: 810, y1: 0, x2: 1079, y2: 269 },

  kaboom4: { x1: 0, y1: 270, x2: 269, y2: 539 },
  kaboom5: { x1: 270, y1: 270, x2: 539, y2: 539 },
  kaboom6: { x1: 540, y1: 270, x2: 809, y2: 539 },
  kaboom7: { x1: 810, y1: 270, x2: 1079, y2: 539 },

  kaboom8: { x1: 0, y1: 540, x2: 269, y2: 809 },
  kaboom9: { x1: 270, y1: 540, x2: 539, y2: 809 },
  kaboom10: { x1: 540, y1: 540, x2: 809, y2: 809 },
  kaboom11: { x1: 810, y1: 540, x2: 1079, y2: 809 },

  kaboom12: { x1: 0, y1: 810, x2: 269, y2: 1079 },
  kaboom13: { x1: 270, y1: 810, x2: 539, y2: 1079 },
  kaboom14: { x1: 540, y1: 810, x2: 809, y2: 1079 },
  kaboom15: { x1: 810, y1: 810, x2: 1079, y2: 1079 }
};

// Place Flag animation (6 columns x 8 rows, frame size: 112x112)
// Rows: 0=Top, 1=TopLeft, 2=Left, 3=BottomLeft, 4=Bottom, 5=BottomRight, 6=Right, 7=TopRight
export const PLACEFLAG_COORDS: Record<string, TextureCoords> = {
  // Place flag on top (row 0)
  placeflagTop0: { x1: 0, y1: 0, x2: 111, y2: 111 },
  placeflagTop1: { x1: 112, y1: 0, x2: 223, y2: 111 },
  placeflagTop2: { x1: 224, y1: 0, x2: 335, y2: 111 },
  placeflagTop3: { x1: 336, y1: 0, x2: 447, y2: 111 },
  placeflagTop4: { x1: 448, y1: 0, x2: 559, y2: 111 },
  placeflagTop5: { x1: 560, y1: 0, x2: 671, y2: 111 },
  
  // Place flag on top-left (row 1)
  placeflagTopLeft0: { x1: 0, y1: 112, x2: 111, y2: 223 },
  placeflagTopLeft1: { x1: 112, y1: 112, x2: 223, y2: 223 },
  placeflagTopLeft2: { x1: 224, y1: 112, x2: 335, y2: 223 },
  placeflagTopLeft3: { x1: 336, y1: 112, x2: 447, y2: 223 },
  placeflagTopLeft4: { x1: 448, y1: 112, x2: 559, y2: 223 },
  placeflagTopLeft5: { x1: 560, y1: 112, x2: 671, y2: 223 },
  
  // Place flag on left (row 2)
  placeflagLeft0: { x1: 0, y1: 224, x2: 111, y2: 335 },
  placeflagLeft1: { x1: 112, y1: 224, x2: 223, y2: 335 },
  placeflagLeft2: { x1: 224, y1: 224, x2: 335, y2: 335 },
  placeflagLeft3: { x1: 336, y1: 224, x2: 447, y2: 335 },
  placeflagLeft4: { x1: 448, y1: 224, x2: 559, y2: 335 },
  placeflagLeft5: { x1: 560, y1: 224, x2: 671, y2: 335 },
  
  // Place flag on bottom-left (row 3)
  placeflagBottomLeft0: { x1: 0, y1: 336, x2: 111, y2: 447 },
  placeflagBottomLeft1: { x1: 112, y1: 336, x2: 223, y2: 447 },
  placeflagBottomLeft2: { x1: 224, y1: 336, x2: 335, y2: 447 },
  placeflagBottomLeft3: { x1: 336, y1: 336, x2: 447, y2: 447 },
  placeflagBottomLeft4: { x1: 448, y1: 336, x2: 559, y2: 447 },
  placeflagBottomLeft5: { x1: 560, y1: 336, x2: 671, y2: 447 },
  
  // Place flag on bottom (row 4)
  placeflagBottom0: { x1: 0, y1: 448, x2: 111, y2: 559 },
  placeflagBottom1: { x1: 112, y1: 448, x2: 223, y2: 559 },
  placeflagBottom2: { x1: 224, y1: 448, x2: 335, y2: 559 },
  placeflagBottom3: { x1: 336, y1: 448, x2: 447, y2: 559 },
  placeflagBottom4: { x1: 448, y1: 448, x2: 559, y2: 559 },
  placeflagBottom5: { x1: 560, y1: 448, x2: 671, y2: 559 },
  
  // Place flag on bottom-right (row 5)
  placeflagBottomRight0: { x1: 0, y1: 560, x2: 111, y2: 671 },
  placeflagBottomRight1: { x1: 112, y1: 560, x2: 223, y2: 671 },
  placeflagBottomRight2: { x1: 224, y1: 560, x2: 335, y2: 671 },
  placeflagBottomRight3: { x1: 336, y1: 560, x2: 447, y2: 671 },
  placeflagBottomRight4: { x1: 448, y1: 560, x2: 559, y2: 671 },
  placeflagBottomRight5: { x1: 560, y1: 560, x2: 671, y2: 671 },
  
  // Place flag on right (row 6)
  placeflagRight0: { x1: 0, y1: 672, x2: 111, y2: 783 },
  placeflagRight1: { x1: 112, y1: 672, x2: 223, y2: 783 },
  placeflagRight2: { x1: 224, y1: 672, x2: 335, y2: 783 },
  placeflagRight3: { x1: 336, y1: 672, x2: 447, y2: 783 },
  placeflagRight4: { x1: 448, y1: 672, x2: 559, y2: 783 },
  placeflagRight5: { x1: 560, y1: 672, x2: 671, y2: 783 },
  
  // Place flag on top-right (row 7)
  placeflagTopRight0: { x1: 0, y1: 784, x2: 111, y2: 895 },
  placeflagTopRight1: { x1: 112, y1: 784, x2: 223, y2: 895 },
  placeflagTopRight2: { x1: 224, y1: 784, x2: 335, y2: 895 },
  placeflagTopRight3: { x1: 336, y1: 784, x2: 447, y2: 895 },
  placeflagTopRight4: { x1: 448, y1: 784, x2: 559, y2: 895 },
  placeflagTopRight5: { x1: 560, y1: 784, x2: 671, y2: 895 }
};