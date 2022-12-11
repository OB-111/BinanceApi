// import { Injectable } from '@nestjs/common';
// import { Utils } from './utils';
// import  WebSocket from "ws";

// export interface ISocketCloseError {
//     closeDescription: string;
//     closeReasonCode: string;
// }

// export interface IWebsocketClientNotifications {
//     onSocketOpened(socketWrapper: WebsocketClient): void;
//     onSocketClosed(
//         socketWrapper: WebsocketClient,
//         error: ISocketCloseError
//     ): void;
//     onSocketMessage(socketWrapper: WebsocketClient, message: string): void;
//     onSocketError(socketWrapper: WebsocketClient, error: string): void;
// }

// @Injectable()
// export class WebsocketClient {
//     notifications: IWebsocketClientNotifications;
//     url: string;
//     websocket: any = null;
//     messagesCount = 0;
//     isClosedManually = false;
//     isSocketOpened = false;
//     socketError?: string;
//     startTime?: Date;
//     endTime?: Date;
//     lastMessageTime?: Date;

//     constructor(url: string, notifications: IWebsocketClientNotifications) {
//         if (url === undefined || url.length === 0) {
//             throw new Error("url is null or empty");
//         }

//         this.url = url;
//         this.notifications = notifications;
//     }

//     public open(): Promise<any> {
//         return new Promise<any>(async (resolve, reject) => {
//             try {
//                 if (this.isOpen()) {
//                     return;
//                 }

//                 this.socketError = undefined;
//                 this.isSocketOpened = false;
//                 this.websocket = new WebSocket(this.url);
//                 this.registerWebSocketEvents();
//                 await this.waitForSocket();
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     public close() {
//         this.isClosedManually = true;
//         if (this.websocket) {
//             this.websocket.close();
//         }
//         this.websocket = null;
//     }

//     public isOpen(): boolean {
//         return this.websocket != null;
//     }
