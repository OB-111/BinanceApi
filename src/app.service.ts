import { Injectable } from '@nestjs/common';
import { ISocketCloseError, IWebsocketServerNotifications } from './infa/webSocket/webSocketInterface';
import { WebSocketWrapper } from './infa/webSocket/webSocketWrapper';
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const records = [];
let counter = 0;
let currentDate = new Date();
const CHUNK_SIZE = 10;


export interface ICandleMessage {
  startTimeAsDate: Date;
  closeTimeAsDate: Date;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export interface IDataUploader {
  uploadCandle(mesasge: ICandleMessage);
}

export class DataUploader implements IDataUploader {
  // 1. Create file handle and save data for each day
  private handleFile() {
    const csvWriter = createCsvWriter({
      path: `${currentDate}.csv`,
      header: [
        { id: 'startTimeAsDate', title: 'startTimeAsDate'.toUpperCase() },
        { id: 'closeTimeAsDate', title: 'closeTimeAsDate'.toUpperCase() },
        { id: 'openPrice', title: 'openPrice'.toUpperCase() },
        { id: 'closePrice', title: 'closePrice'.toUpperCase() },
        { id: 'volume', title: 'volume'.toUpperCase() },
        { id: 'highPrice', title: 'highPrice'.toUpperCase() },
        { id: 'lowPrice', title: 'lowPrice'.toUpperCase() },
      ]
    });
    csvWriter.writeRecords(records)       // returns a promise
      .then(() => {
        console.log('...Done');
      });

  }
  // 2. updload files to cloud
  // 3. Delete uploaded files ONLY AFTER SUCCESSFULL UPLOAD!!!
  public uploadCandle(message: ICandleMessage) {
    if (!message) return;
    if (message.startTimeAsDate.getDate === currentDate.getDate) {
      records.push(message);
      counter++;
      if (counter === CHUNK_SIZE) {
        this.handleFile();
        counter = 0;
        currentDate = new Date();
      }
    } else {
      this.handleFile();
      //TODO : pick  all files for same day
      //TODO : upload to cloud

    }
  }

  private uploadLoop() {
    // Check if files exists
    // If so, upload them
    // else wait for a while (Sleep(1000))
  }

}

@Injectable()
export class BinanceRecorder implements IWebsocketServerNotifications {
  private webSocketWrapper: WebSocketWrapper;
  private dataUploader: DataUploader;
  
  constructor() {
    this.dataUploader = new DataUploader();
    this.init();
  }

  public onSocketOpened(socketWrapper: WebSocketWrapper): void {
    //subscribe
    const sub = {
      "method": "SUBSCRIBE",
      "params":
        [
          "btcbusd@kline_1m"
        ],
      "id": 1
    };
    socketWrapper.send(JSON.stringify(sub))
  }

  public onSocketClosed(socketWrapper: WebSocketWrapper, error: ISocketCloseError): void {
    debugger;
  }

  private handleCandlesMessage(message: any): ICandleMessage {
    if (!message?.k) return;
    const candleMessage: ICandleMessage = {
      startTimeAsDate: new Date(message.k.t),
      closeTimeAsDate: new Date(message.k.T),
      openPrice: Number(message.k.o),
      closePrice: Number(message.k.c),
      volume: Number(message.k.v),
      highPrice: Number(message.k.h),
      lowPrice: Number(message.k.l),
    };
    return candleMessage;

  }

  private handleMessage(data: any) {
    if (!data) return;
    const m = JSON.parse(data);
    if (!m?.e) return;
    switch (m.e) {
      case "kline":
        const message = this.handleCandlesMessage(m);
        this.dataUploader.uploadCandle(message);
        break;

      default:
        break;
    }
  }

  public onSocketMessage(socketWrapper: WebSocketWrapper, message: string): void {
    this.handleMessage(message);
  }

  public onSocketError(socketWrapper: WebSocketWrapper, error: string): void {
    debugger;
  }

  getHello(): string {
    return 'Hello World!';
  }

  private init() {
    this.webSocketWrapper = new WebSocketWrapper('wss://fstream.binance.com/ws/', this);
    this.webSocketWrapper.open();
  }
}
