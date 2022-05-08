import {PPCallbackHttpHandler, PPHttpRule, PPServerRequest, PPServerResponse} from "pms-proxy";

export abstract class PmsModule {
    private static id: number = 0;

    protected id = PmsModule.id++;

    constructor(
        protected request: PPServerRequest,
        protected response: PPServerResponse
    ) {
        this.init();
    }

    static rule: () => PPHttpRule;
    static create<T extends PmsModule>(clazz: new (...args: any[]) => T, ...args: any[]): PPCallbackHttpHandler {
        return (req, res) => {
            new clazz(req, res);
        }
    }

    public abstract init(): void;
}