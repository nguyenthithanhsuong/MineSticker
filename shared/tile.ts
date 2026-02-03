import { TextureCoords, TILE_COORDS } from "./spritesheet";

export type TileTexture =
  | "tile0"
  | "tile1"
  | "tile2"
  | "tile3"
  | "tile4"
  | "tile5"
  | "tile6"
  | "tile7"
  | "tile8"
  | "tile9"
  | "tilef"
  | "tileb1"
  | "tileb2";

export class Tile {
  texture: TileTexture;
  isMine: boolean;
  isOpen: boolean;
  isFlagged: boolean;
  coords: TextureCoords;

  constructor(
    texture: TileTexture = "tile0",
    isMine = false,
    isOpen = false,
    isFlagged = false
  ) {
    this.texture = texture;
    this.isMine = isMine;
    this.isOpen = isOpen;
    this.isFlagged = isFlagged;
    this.coords = TILE_COORDS[texture];
  }

  setTexture(texture: TileTexture) {
    this.texture = texture;
    this.coords = TILE_COORDS[texture];
  }

  getCoords(): TextureCoords {
    return this.coords;
  }
}
