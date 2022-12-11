
import { WebSocketWrapper } from "./webSocketWrapper";

export interface ISocketCloseError {
    closeDescription: string;
    closeReasonCode: string;
}

export interface IWebsocketServerNotifications {
    onSocketOpened(socketWrapper: WebSocketWrapper): void;
    onSocketClosed(
        socketWrapper: WebSocketWrapper,
        error: ISocketCloseError
    ): void;
    onSocketMessage(socketWrapper: WebSocketWrapper, message: string): void;
    onSocketError(socketWrapper: WebSocketWrapper, error: string): void;
}

export class WsClientConfig {
    url?: string;
    apiKey?: string;
    apiSecret?: string;
    password?: any;
    quoteCurrency?: string;
}

export interface IExchangeListenerNotifications {
    stopped(marketType: string);
    started(marketType: string);
    socketOpen(marketType: string);
    socketClose(marketType: string);
}