import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to MineSticker Backend - Minesweeper with the Dark Lord!';
  }
}
