import {PmsProxyRule} from "pms-proxy/dist/rule";
import {PmsServerRequest, PmsServerResponse} from "pms-proxy/dist/server";
import {PmsServerCallbackHandler} from "pms-proxy/dist/handler";

export abstract class PmsModule {
    protected request: PmsServerRequest;
    protected response: PmsServerResponse;

    constructor() {
    }

    static rule: () => PmsProxyRule;
    static create<T extends PmsModule>(clazz: new (...args: any[]) => T, ...args: any[]): PmsServerCallbackHandler {
        const o = new clazz();
        return o._init()
    }

    public abstract init(): void;

    private _init() {
        const handler: PmsServerCallbackHandler = (req, res) => {
            this.request = req;
            this.response = res;
            this.init();
        }
        return handler;
    }
}