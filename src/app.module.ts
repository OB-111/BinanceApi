  import { Module } from '@nestjs/common';
  import { AppController } from './app.controller';
  import { BinanceRecorder } from './app.service';

  @Module({
    imports: [],
    controllers: [AppController],
    providers: [BinanceRecorder],
  })
  export class AppModule {
    constructor(binanceRecorder : BinanceRecorder){
    }
  }
