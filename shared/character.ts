import { Direction } from "./types";
import { Matrix } from "./matrix";
import { Tile } from "./tile";

export class Character {
  row: number;
  col: number;

  constructor(row = 0, col = 0) {
    this.row = row;
    this.col = col;
  }

  Walk_Left() {
    this.col -= 1;
  }

  Walk_Right() {
    this.col += 1;
  }

  Walk_Up() {
    this.row -= 1;
  }

  Walk_Down() {
    this.row += 1;
  }

  Move(direction: Direction) {
    switch (direction) {
      case "Left":
        this.Walk_Left();
        break;
      case "Right":
        this.Walk_Right();
        break;
      case "Up":
        this.Walk_Up();
        break;
      case "Down":
        this.Walk_Down();
        break;
    }
  }

  Place_Flags(direction: Direction, tiles: Matrix<Tile>) {
    const { row, col } = this.getTarget(direction);
    const tile = tiles.get(row, col);
    if (!tile) return false;
    tile.isFlagged = !tile.isFlagged;
    tile.setTexture(tile.isFlagged ? "tilef" : "tile0");
    return true;
  }

  Place_Flags_Left(tiles: Matrix<Tile>) {
    return this.Place_Flags("Left", tiles);
  }

  Place_Flags_Right(tiles: Matrix<Tile>) {
    return this.Place_Flags("Right", tiles);
  }

  Place_Flags_Up(tiles: Matrix<Tile>) {
    return this.Place_Flags("Up", tiles);
  }

  Place_Flags_Down(tiles: Matrix<Tile>) {
    return this.Place_Flags("Down", tiles);
  }

  private getTarget(direction: Direction) {
    switch (direction) {
      case "Left":
        return { row: this.row, col: this.col - 1 };
      case "Right":
        return { row: this.row, col: this.col + 1 };
      case "Up":
        return { row: this.row - 1, col: this.col };
      case "Down":
        return { row: this.row + 1, col: this.col };
    }
  }
}
