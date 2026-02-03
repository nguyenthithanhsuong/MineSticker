import { TextureCoords, NUMBER_COORDS } from "./spritesheet";

export type NumberTexture =
  | "number0"
  | "number1"
  | "number2"
  | "number3"
  | "number4"
  | "number5"
  | "number6"
  | "number7"
  | "number8"
  | "number9"
  | "numberd"
  | "numberb";

export class Number {
  texture: NumberTexture;
  coords: TextureCoords;

  constructor(texture: NumberTexture = "number0") {
    this.texture = texture;
    this.coords = NUMBER_COORDS[texture];
  }

  setTexture(texture: NumberTexture) {
    this.texture = texture;
    this.coords = NUMBER_COORDS[texture];
  }

  getCoords(): TextureCoords {
    return this.coords;
  }
}
