import { Injectable } from '@nestjs/common';
import { OracleStorageService } from './infa/cloudUploader/oracleStorageService';
import { CandlesWriter } from './infa/dataWriter/candlesWriter';
import { Utils } from './infa/webSocket/utils';
import { ISocketCloseError, IWebsocketServerNotifications } from './infa/webSocket/webSocketInterface';
import { WebSocketWrapper } from './infa/webSocket/webSocketWrapper';
const moment = require("moment");
var fs = require('fs');

export interface ICandleMessage {
  startTimeAsDate: number;
  closeTimeAsDate: number;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  symbol: string;
};

export interface IDataUploader {
  uploadCandle(mesasge: ICandleMessage);
}

export interface IDataWriter {

}


export interface IWriterMapItem {
  currentFileDate: Date;
  currentcsvFile: string;
  writer: CandlesWriter;
}

export class DataUploader implements IDataUploader {
  private ociClient: OracleStorageService;
  private csvFilesPath = "/Users/omribitan/Desktop/JobInterviews/nestJs/nest-Tutorial/toUpload/CSV_files";
  private messages: ICandleMessage[] = [];
  private counter: number = 0;
  private fileCounter: number = 0;
  private writersMap = new Map<string, IWriterMapItem>();

  public init() {
    this.ociClient = new OracleStorageService(
      "nrvobnkc5mtf",
      "bucket-candles",
      "/Users/omribitan/Desktop/JobInterviews/nestJs/nest-Tutorial/toUpload/uploadManager");

    this.messsageHandlingLoop();
  }

  public async uploadCandle(message: ICandleMessage): Promise<void> {
    if (!message) return;
    this.messages.push(message);
  }

  private async uploadCandlesFile(filePath: string, symbol: string) {
    await this.ociClient.upload({
      filePath: filePath,
      symbol: symbol,
      successCallback: (fileName: string) => {
        console.log(`File ${fileName} Uploaded successfully`);
      }
    });
  }

  private createCsvFilePath(symbol: string, currentFileDate: Date): string {
    const path = `${this.csvFilesPath}/${symbol}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    return `${path}/${moment(currentFileDate).format("YYYY-MM-DD")}_${this.fileCounter}.csv`;
  }

  private async messsageHandlingLoop() {
    while (true) {
      // if no message arrived , sleep for sec
      if (this.messages.length === 0) {
        await Utils.wait(1000);
        continue;
      }

      let writerMapItem: IWriterMapItem;
      const messages = this.messages.splice(0);
      for (let index = 0; index < messages.length; index++) {
        const message = messages[index];
        try {
          writerMapItem = this.writersMap.get(message.symbol);
          if (!writerMapItem) {
            writerMapItem = {
              writer: new CandlesWriter(),
              currentcsvFile: undefined,
              currentFileDate: undefined
            }
            this.writersMap.set(message.symbol, writerMapItem);
          }

          if (!writerMapItem.currentcsvFile) {
            writerMapItem.currentFileDate = new Date(message.startTimeAsDate);
            writerMapItem.currentcsvFile = this.createCsvFilePath(message.symbol, writerMapItem.currentFileDate);
            writerMapItem.writer.openFile(writerMapItem.currentcsvFile);
          }
          // If the current message is from today lets update todays file
          // TODO : change the check for only if the same day
          if (moment(message.startTimeAsDate).isSame(moment(writerMapItem.currentFileDate), "hour") && (this.counter < 20)) {
            await writerMapItem.writer.Write({ data: message });
            this.counter++;
          } // upload current file and then create new file
          else {
            this.counter = 0;
            await this.uploadCandlesFile(writerMapItem.currentcsvFile, message.symbol);
            writerMapItem.currentcsvFile = undefined;
            console.log("not the same Day");
            this.fileCounter++;
          }
        } catch (error) {
          console.log(error);
          debugger; // Todo: add log
        }
      }
    }
  }
}

@Injectable()
export class BinanceRecorder implements IWebsocketServerNotifications {
  private webSocketWrapper: WebSocketWrapper;
  private dataUploader: DataUploader;
  private coins: string[] = [];

  constructor() {
    this.dataUploader = new DataUploader();
  }

  public start(coins: string[]) {
    if(coins.length == 0) throw new Error("coins can't be empty");
    
    this.coins = coins;
    this.init();
  }

  public onSocketOpened(socketWrapper: WebSocketWrapper): void {
    //subscribe
    const sub = {
      method: "SUBSCRIBE",
      params: [],
      id: 1
    };

    this.coins.forEach(coin => {
      sub.params.push(`${coin.toLocaleLowerCase()}@kline_1m`);
    });

    socketWrapper.send(JSON.stringify(sub))
  }

  public onSocketClosed(socketWrapper: WebSocketWrapper, error: ISocketCloseError): void {
    debugger;
  }

  private handleCandlesMessage(message: any): ICandleMessage {
    if (!message?.k) return;
    const candleMessage: ICandleMessage = {
      startTimeAsDate: Number(message.k.t),
      closeTimeAsDate: Number(message.k.T),
      openPrice: Number(message.k.o),
      closePrice: Number(message.k.c),
      volume: Number(message.k.v),
      highPrice: Number(message.k.h),
      lowPrice: Number(message.k.l),
      symbol: message.s
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
    this.dataUploader.init();
    this.webSocketWrapper.open();
  }
}