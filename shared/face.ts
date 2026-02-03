import { TextureCoords, FACE_COORDS } from "./spritesheet";

export type FaceTexture = "face1" | "face2" | "face3" | "face4";

export class Face {
  texture: FaceTexture;
  coords: TextureCoords;

  constructor(texture: FaceTexture = "face1") {
    this.texture = texture;
    this.coords = FACE_COORDS[texture];
  }

  setTexture(texture: FaceTexture) {
    this.texture = texture;
    this.coords = FACE_COORDS[texture];
  }

  getCoords(): TextureCoords {
    return this.coords;
  }
}
