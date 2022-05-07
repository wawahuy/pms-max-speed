import {PmsProxyRule} from "pms-proxy/dist/rule";
import {PmsServerRequest, PmsServerResponse} from "pms-proxy/dist/server";
import {PmsServerCallbackHandler} from "pms-proxy/dist/handler";

export abstract class PmsModule {
    private static id: number = 0;

    protected id = PmsModule.id++;

    constructor(
        protected request: PmsServerRequest,
        protected response: PmsServerResponse
    ) {
        this.init();
    }

    static rule: () => PmsProxyRule;
    static create<T extends PmsModule>(clazz: new (...args: any[]) => T, ...args: any[]): PmsServerCallbackHandler {
        return (req, res) => {
            new clazz(req, res);
        }
    }

    public abstract init(): void;
}