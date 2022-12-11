import { IWebsocketServerNotifications } from "./webSocketInterface";
import { Utils } from "./utils";
const WebSocket = require("ws");

// https://www.npmjs.com/package/ws
export class WebSocketWrapper {
    notifications: IWebsocketServerNotifications;
    url: string;
    websocket?: any;
    messagesCount = 0;
    isClosedManually = false;
    isSocketOpened = false;
    socketError?: string;
    startTime?: Date;
    endTime?: Date;
    lastMessageTime?: Date;

    constructor(url: string | undefined, notifications: IWebsocketServerNotifications) {
        if (url === undefined || url.length === 0) {
            throw new Error("url is undefined or empty");
        }

        this.url = url;
        this.notifications = notifications;
    }

    public open(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                if (this.isOpen()) {
                    return;
                }

                this.socketError = undefined;
                this.isSocketOpened = false;

                console.log(this.url);

                this.websocket = new WebSocket(this.url);
                this.registerWebSocketEvents();
                await this.waitForSocket();
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    public close() {
        this.isClosedManually = true;
        if (this.websocket) {
            this.websocket.close();
        }
        this.websocket = undefined;
    }

    public isOpen(): boolean {
        return this.websocket != undefined;
    }

    public send(message: string) {
        if (this.websocket) {
            this.websocket.send(message);
        }
    }

    protected registerWebSocketEvents() {
        const self = this;
        // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
        this.websocket.on("close", (error) => {
            self.endTime = new Date();
            this.socketError = error === 1000 ? undefined : error;
            self.notifications.onSocketClosed(self, {
                closeDescription: error,
                closeReasonCode: error,
            });

            self.websocket = undefined;

            if (!self.isClosedManually) {
                setTimeout(() => {
                    // self.open();
                }, 10);
            }
        });

        this.websocket.on("error", (error) => {
            console.log("Connection Error: " + error.toString());
            self.endTime = new Date();
            this.socketError = error;
            self.notifications.onSocketError(self, error);
        });

        this.websocket.on("message", (message) => {
            self.lastMessageTime = new Date();
            self.messagesCount++;
            self.notifications.onSocketMessage(self, message);
         });

        this.websocket.on("open", (connection) => {
            self.messagesCount = 0;
            self.startTime = new Date();
            self.endTime = undefined;
            self.isClosedManually = false;
            self.isSocketOpened = true;
            self.notifications.onSocketOpened(self);
        });
    }

    public getCurrentTime(): string {
        const d = new Date();
        const format = [d.getHours(), d.getMinutes(), d.getSeconds()].join(":");
        return format;
    }

    private async waitForSocket(): Promise<void> {
        let isLoaded = this.isSocketOpened || this.socketError;
        while (!isLoaded) {
            await Utils.wait(100);
            isLoaded = this.isSocketOpened || this.socketError;
        }
    }
}