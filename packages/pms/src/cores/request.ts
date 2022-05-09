import {PmsParallelMutex} from "@cores/parallel-mutex";
import fetch, { Response, RequestInfo, RequestInit } from "node-fetch";
import AbortControllerLib from "abort-controller";
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {IncomingHttpHeaders} from "http";
import {PmsServerAnalytics} from "@analytics/index";
import {log} from "@cores/logger";

const AbortController = globalThis.AbortController || AbortControllerLib;

export type PmsRequestOption = RequestInfo;
export type PmsRequestInit = RequestInit & {
    retry?: number
};


export class PmsRequest {
    private static readonly maxRequest: number = 30;
    public static readonly mutex: PmsParallelMutex = new PmsParallelMutex(PmsRequest.maxRequest);

    private readonly timeout: number = 0;
    private timeoutId: NodeJS.Timeout;
    private isDone: boolean = false;
    private isCanceled: boolean = false;
    private isTimeout: boolean = false;
    private retryCounter: number = 0;
    private abortController: AbortController;

    private responseSubject: BehaviorSubject<Response | null>;
    public readonly response$: Observable<Response | null>;

    get isAbort() {
        return this.isCanceled;
    }

    constructor(
        private requestInfo: PmsRequestOption,
        private requestInit?: PmsRequestInit
    ) {
        this.responseSubject = new BehaviorSubject<Response | null>(null);
        this.response$ = this.responseSubject.asObservable();

        if (this.requestInit?.timeout) {
            this.timeout = this.requestInit.timeout;
            delete this.requestInit.timeout;
        }
    }

    init() {
        this.isDone = false;
        this.abortController = new AbortController();
        this.requestInit = {
            ...this.requestInit,
            signal: this.abortController.signal
        }
        return new Promise<this>(async (resolve, reject) => {
            const analytics = PmsServerAnalytics.instance;
            const mutex = PmsRequest.mutex;
            try {
                analytics.analyticsRequestQueue(1);
                await mutex.acquire();

                analytics.analyticsRequest(-1, 1)
                if (this.isCanceled) {
                    this.isCanceled = false;
                    throw 'AbortError';
                }

                this.registerTimeout();
                const response = await fetch(this.requestInfo, this.requestInit);
                response.body.on('data', (chunk) => {
                    analytics.analyticsBandwidth(chunk?.length || 0)
                })
                response.body.once('error', (err) => {
                    if (this.timeoutId) {
                        clearTimeout(this.timeoutId);
                    }
                    this.isDone = true;
                    mutex.release();
                    analytics.analyticsRequestCurrent(-1);

                    if (!this.isCanceled && !this.isTimeout) {
                        log.info(err);
                    }
                    this.retry();
                })
                response.body.once('close', () => {
                    if (this.timeoutId) {
                        clearTimeout(this.timeoutId);
                    }
                    this.isDone = true;
                    mutex.release();
                    analytics.analyticsRequestCurrent(-1);
                })
                this.responseSubject.next(response);
                resolve(this);
            } catch (e) {
                if (!this.isCanceled && !this.isTimeout) {
                    log.info(e);
                }
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }
                mutex.release();
                analytics.analyticsRequestCurrent(-1);
                this.retry();
                reject(e);
            }
        })
    }

    private retry() {
        const r = this.requestInit?.retry || 0;
        if (!this.isCanceled && this.retryCounter++ < r) {
            log.info(`Request retry ${this.requestInfo}`);
            setTimeout(() => {
                this.init().catch(err => {
                });
            })
        }
    }

    private registerTimeout() {
        if (!this.timeout) {
            return;
        }

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.isTimeout = true;
        this.timeoutId = setTimeout(() => {
            log.info(`Request timeout ${this.requestInfo}`);
            this.abortController.abort();
        }, this.timeout);
    }

    abort() {
        this.isCanceled = true;
        if (!this.isDone && this.abortController) {
            this.abortController.abort();
        }
    }

    getHeaders() {
        const response = this.responseSubject.value;
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

    getResponse() {
        return this.responseSubject.value;
    }
}