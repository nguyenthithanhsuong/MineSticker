import { Injectable } from "@nestjs/common";
import { Character, Face, Matrix, Tile } from "../../shared";

@Injectable()
export class AppService {
  getInitialState() {
    const rows = 9;
    const cols = 9;
    const tiles = new Matrix<Tile>(rows, cols, () => new Tile("tile0"));
    const character = new Character(0, 0);
    const face = new Face("face1");

    return {
      rows,
      cols,
      character,
      face,
      tiles: tiles.data.map((row) => row.map((tile) => tile.texture))
    };
  }
}
