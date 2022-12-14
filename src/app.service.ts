import { Injectable } from '@nestjs/common';
import { OracleStorageService } from './infa/cloudUploader/oracleStorageService';
import { CandlesWriter } from './infa/dataWriter/candlesWriter';
import { Utils } from './infa/webSocket/utils';
import { ISocketCloseError, IWebsocketServerNotifications } from './infa/webSocket/webSocketInterface';
import { WebSocketWrapper } from './infa/webSocket/webSocketWrapper';
const moment = require("moment");

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

export class DataUploader implements IDataUploader {
  private candlesWriter: CandlesWriter;
  private currentFileDate: Date = undefined;
  private ociClient: OracleStorageService;
  private csvFilesPath = "/Users/omribitan/Desktop/JobInterviews/nestJs/nest-Tutorial/toUpload/CSV_files";
  private currentcsvFile: string = undefined;
  private messages: ICandleMessage[] = [];
  private counter : number = 0;
  private fileCounter : number = 0;

  public init() {
    this.candlesWriter = new CandlesWriter();
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

  private async uploadCandlesFile(filePath: string) {
    await this.ociClient.upload({
      filePath: filePath,
      successCallback: (fileName: string) => {
        console.log(`File ${fileName} Uploaded successfully`);
      }
    });
  }

  private createCsvFilePath(): string {
    return `${this.csvFilesPath}/${moment(this.currentFileDate).format("YYYY-MM-DD")}_${this.fileCounter}.csv`;
  }

  private async messsageHandlingLoop() {
    while (true) {
      // if no message arrived , sleep for sec
      if (this.messages.length === 0) {
        await Utils.wait(1000);
        continue;
      }

      const messages = this.messages.splice(0);
      for (let index = 0; index < messages.length; index++) {
        const message = messages[index];
        try {
          if (!this.currentcsvFile) {
            this.currentFileDate = new Date(message.startTimeAsDate);
            this.currentcsvFile = this.createCsvFilePath();
            this.candlesWriter.openFile(this.currentcsvFile);
          }
          // If the current message is from today lets update todays file
          if (moment(message.startTimeAsDate).isSame(moment(this.currentFileDate), "hour") && (this.counter < 20)) {
  
              await this.candlesWriter.Write({ data: message });
              this.counter++;
            
          } // upload current file and then create new file
          else {
            this.counter = 0;
            await this.uploadCandlesFile(this.currentcsvFile);
            this.currentcsvFile = undefined;
            console.log("not the same Day");
            this.fileCounter++;
            
          }
        } catch (error) {
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
    this.coins = coins;
    this.init();
  }

  public onSocketOpened(socketWrapper: WebSocketWrapper): void {
    //subscribe
    const sub = {
      "method": "SUBSCRIBE",
      "params":
        [
          "btcbusd@kline_1m",
          "bnbbusd@kline_1m"
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
