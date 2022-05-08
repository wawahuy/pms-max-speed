import {MayBePromise, PPIncomingMessage, PPWsHandler, PPWebsocket, PPWebsocketRawData} from "pms-proxy";
import {log} from "@cores/logger";
import AVLTree from "avl";
import {PmsDataWatcher} from "@analytics/data-watcher";

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
    private statusBarData: PmsDataWatcher<StatusBarData>;

    private constructor() {
        super();
        this.sockets = new AVLTree<number, PPWebsocket>(undefined, true);
        this.statusBarData = new PmsDataWatcher<StatusBarData>(100, {
            requestQueue: 0,
            requestCurrent: 0,
            bandwidth: 0,
            speed: 0
        })
        this.statusBarData.change$.subscribe(data => {
            this.broadcast(WsCommand.StatusBar, data);
        })
        setInterval(() => {
            if (this.speedTotal) {
                this.statusBarData.change({ speed: this.speedTotal });
                this.speedTotal = 0;
            } else {
                this.statusBarData.change({ speed: 0 });
            }
        }, 1000)
    }

    analyticsRequestCurrent(inc: number) {
        const value = this.statusBarData.value;
        this.statusBarData.change({ requestCurrent: value.requestCurrent + inc });
    }

    analyticsRequestQueue(inc: number) {
        const value = this.statusBarData.value;
        this.statusBarData.change({ requestQueue: value.requestQueue + inc });
    }

    analyticsRequest(queue: number, current: number) {
        const value = this.statusBarData.value;
        this.statusBarData.change({
            ...value,
            requestQueue: value.requestQueue + queue,
            requestCurrent: value.requestCurrent + current
        })
    }

    analyticsBandwidth(inc: number) {
        const value =  this.statusBarData.value;
        this.speedTotal += inc;
        this.statusBarData.change({ ...value, bandwidth: value.bandwidth + inc })
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
        this.broadcast(WsCommand.StatusBar, this.statusBarData.value);
    }

    private onData(ws: PPWebsocket, data: PPWebsocketRawData, id: number) {
    }

    private onClose(ws: PPWebsocket, id: number) {
        this.sockets.remove(id);
    }
}