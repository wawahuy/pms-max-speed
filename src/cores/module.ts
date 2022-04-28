import {CompletedRequest} from "mockttp";
import {MaybePromise} from "mockttp/src/util/type-utils";
import {CallbackResponseResult} from "mockttp/src/rules/requests/request-handler-definitions";

export abstract class PmsModule {
    protected outCallback: (data: CallbackResponseResult | 'close') => void;

    constructor(
        protected request: CompletedRequest,
    ) {
    }

    static matcher: () => RegExp;
    static create<T extends PmsModule>(clazz: new (...args: any[]) => T, ...args: any[]) {
        return (request: CompletedRequest) => {
            const o = new clazz(request);
            return o._init()
        }
    }

    public abstract init(): void;

    private _init(): MaybePromise<CallbackResponseResult | 'close'> {
        const promise = new Promise<CallbackResponseResult | 'close'>(res => {
            this.outCallback = res;
        })
        this.init();
        return promise;
    }

}