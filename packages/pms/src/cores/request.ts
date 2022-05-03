import {PmsParallelMutex} from "@cores/parallel-mutex";
import fetch, { Response, RequestInfo, RequestInit } from "node-fetch";
import AbortControllerLib from "abort-controller";

const AbortController = globalThis.AbortController || AbortControllerLib;

export type PmsRequestOption = RequestInfo;

export type PmsRequestInit = RequestInit;

export class PmsRequest {
    private static readonly maxRequest: number = 30;
    private static mutex: PmsParallelMutex = new PmsParallelMutex(PmsRequest.maxRequest);

    private isCanceled: boolean = false;
    private response: Response;
    private abortController: AbortController;
    private readonly requestInit: PmsRequestInit;

    constructor(
        private requestInfo: PmsRequestOption,
        requestInit?: PmsRequestInit
    ) {
        this.abortController = new AbortController();
        this.requestInit = {
            signal: this.abortController.signal,
            ...requestInit
        }
    }

    init() {
        return new Promise<Response>(async (resolve, reject) => {
            const mutex = PmsRequest.mutex;
            try {
                await mutex.acquire();
                if (this.isCanceled) {
                    throw 'abort';
                }
                this.response = await fetch(this.requestInfo, this.requestInit);
                this.response.body.once('close', () => {
                    mutex.release();
                })
                resolve(this.response);
            } catch (e) {
                mutex.release();
                reject(e);
            }
        })
    }

    abort() {
        this.isCanceled = true;
        if (this.response) {
            this.abortController.abort();
        }
    }

    getResponse() {
        return this.response;
    }
}