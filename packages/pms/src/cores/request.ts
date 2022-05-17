import {Readable} from "stream";
import {PmsParallelMutex} from "@cores/parallel-mutex";
import fetch, { Response, RequestInfo, RequestInit } from "node-fetch";
import AbortControllerLib from "abort-controller";
import {PmsServerAnalytics} from "@analytics/index";
import {log} from "@cores/logger";
import {IncomingHttpHeaders} from "http";
import {PromiseNoError} from "@cores/types";

const AbortController = globalThis.AbortController || AbortControllerLib;

export type PmsRequestOption = RequestInfo;
export type PmsRequestInit = RequestInit & {
    retry?: number
};

export declare interface PmsRequest {
    on(event: 'created', listener: () => void): this;
    once(event: 'created', listener: () => void): this;
    on(event: string, listener: Function): this;
    once(event: string, listener: Function): this;
}

export class PmsRequest extends Readable {
    private static readonly maxRequest: number = 30;
    public static readonly mutex: PmsParallelMutex = new PmsParallelMutex(PmsRequest.maxRequest);
    private response: Response;
    private abortController: AbortController;
    private retryCounter: number = 0;
    private testOld: number = 0;
    private testCurrent: number = 0;

    constructor(
        private requestInfo: PmsRequestOption,
        private requestInit?: PmsRequestInit
    ) {
        super();
        this.init();
    }

    private init() {
        PromiseNoError(this.createResponse());
    }

    private async createResponse() {
        this.testOld = this.testCurrent;
        this.testCurrent = 0;
        this.abortController = new AbortController();
        this.requestInit = {
            ...this.requestInit,
            signal: this.abortController.signal
        }

        const analytics = PmsServerAnalytics.instance;
        const mutex = PmsRequest.mutex;
        try {
            analytics.analyticsRequestQueue(1);
            await mutex.acquire();
            analytics.analyticsRequest(-1, 1)

            const response = await fetch(this.requestInfo, this.requestInit);
            response.body.on('data', (chunk) => {
                if (this.testOld) {
                    throw "Retry overlap data"
                }
                this.testCurrent +=  chunk;

                this.push(chunk)
                analytics.analyticsBandwidth(chunk?.length || 0)
            })
            response.body.once('error', (err) => {
                mutex.release();
                analytics.analyticsRequestCurrent(-1);
                this.retry(err);
            })
            response.body.once('close', () => {
                mutex.release();
                analytics.analyticsRequestCurrent(-1);
                this.push(null);
            })
            this.response = response;
            this.emit('created');
        } catch (e) {
            mutex.release();
            analytics.analyticsRequestCurrent(-1);
            this.retry(e as Error);
        }
    }

    private retry(e: Error) {
        log.error(e);
        if (e.name !== 'AbortError') {
            if (this.retryCounter++ < (this.requestInit?.retry || 0)) {
                log.info(`Request retry ${this.requestInfo}`);
                this.init();
                return;
            }
        }
        this.destroy(e);
    }

    _read(size: number) {
    }

    _destroy(error: Error | null, callback: (error?: (Error | null)) => void) {
        super._destroy(error, callback);
    }

    async buffer() {
        const buffer: Buffer[] = [];
        for await (const b of this) {
          buffer.push(b);
        }
        return Buffer.concat(buffer);
    }

    getHeaders() {
        const response = this.response;
        if (!response) {
            return null;
        }

        const headers: IncomingHttpHeaders = {};
        const h = response.headers.raw();
        Object.keys(h).forEach(key => {
            headers[key] = h[key]?.join("; ");
        })
        return headers;
    }

    abort() {
        this.abortController.abort();
    }
}