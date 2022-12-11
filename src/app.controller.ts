import { Controller, Get } from '@nestjs/common';
import { BinanceRecorder } from './app.service';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello(): string {
    return "";
  }

  }



