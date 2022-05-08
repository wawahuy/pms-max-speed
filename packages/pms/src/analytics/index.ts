import {MayBePromise, PPIncomingMessage, PPWsHandler, PPWebsocket, PPWebsocketRawData} from "pms-proxy";
import {log} from "@cores/logger";
import AVLTree from "avl";

enum WsCommand {
    StatusBar = 1
}

interface StatusBarData {
    requestCurrent: number;
    requestQueue: number;
    bandwidth: number;
    speed: number;
}

export class PmsServerAnalytics extends PPWsHandler {
    static readonly instance = new PmsServerAnalytics();
    static readonly mathHost = /pms-inject-websocket\.pms\/connect/gmi;
    private static id: number = 0;

    private sockets: AVLTree<number, PPWebsocket>;

    private speedTotal: number = 0;
    private statusBarData: StatusBarData = {
        requestQueue: 0,
        requestCurrent: 0,
        bandwidth: 0,
        speed: 0
    };

    private constructor() {
        super();
        this.sockets = new AVLTree<number, PPWebsocket>(undefined, true);
        setInterval(() => {
            if (this.speedTotal) {
                this.statusBarData.speed = this.speedTotal;
                this.speedTotal = 0;
            } else {
                this.statusBarData.speed = 0;
            }
            this.broadcast(WsCommand.StatusBar, {
                speed: this.statusBarData.speed
            })
        }, 1000)
    }

    analyticsRequestCurrent(inc: number) {
        this.statusBarData.requestCurrent += inc;
        this.broadcast(WsCommand.StatusBar, {
            requestCurrent: this.statusBarData.requestCurrent
        })
    }

    analyticsRequestQueue(inc: number) {
        this.statusBarData.requestQueue += inc;
        this.broadcast(WsCommand.StatusBar, {
            requestQueue: this.statusBarData.requestQueue
        })
    }

    analyticsRequest(queue: number, current: number) {
        this.statusBarData.requestQueue += queue;
        this.statusBarData.requestCurrent += current;
        this.broadcast(WsCommand.StatusBar, {
            requestQueue: this.statusBarData.requestQueue,
            requestCurrent: this.statusBarData.requestCurrent
        })
    }

    analyticsBandwidth(inc: number) {
        this.statusBarData.bandwidth += inc;
        this.speedTotal += inc;
        this.broadcast(WsCommand.StatusBar, {
            bandwidth: this.statusBarData.bandwidth
        })
    }

    handle(request: PPIncomingMessage, ws: PPWebsocket): MayBePromise<void> {
        const id = ++PmsServerAnalytics.id;
        log.info(`ws connect at ${request.hostname}, id=${id}`);

        this.onOpen(ws, id);
        ws.on("message", (data) => this.onData(ws, data, id));
        ws.on("close", () => this.onClose(ws, id));
        ws.on("error", () => this.onClose(ws, id));
    }

    private broadcast(command: WsCommand, data: any) {
        const pack = {
            command,
            data
        }
        this.sockets.forEach(ws => ws.data?.send(JSON.stringify(pack)));
    }

    private onOpen(ws: PPWebsocket, id: number) {
        this.sockets.insert(id, ws);
        this.broadcast(WsCommand.StatusBar, this.statusBarData);
    }

    private onData(ws: PPWebsocket, data: PPWebsocketRawData, id: number) {
    }

    private onClose(ws: PPWebsocket, id: number) {
        this.sockets.remove(id);
    }
}