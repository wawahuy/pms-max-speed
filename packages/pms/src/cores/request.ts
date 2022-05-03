import {PmsParallelMutex} from "@cores/parallel-mutex";
import fetch, { Response, RequestInfo, RequestInit } from "node-fetch";
import AbortControllerLib from "abort-controller";
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {IncomingHttpHeaders} from "http";

const AbortController = globalThis.AbortController || AbortControllerLib;

export type PmsRequestOption = RequestInfo;
export type PmsRequestInit = RequestInit & {
    retry?: number
};


export class PmsRequest {
    private static readonly maxRequest: number = 30;
    private static mutex: PmsParallelMutex = new PmsParallelMutex(PmsRequest.maxRequest);

    private isCanceled: boolean = false;
    private retryCounter: number = 0;
    private abortController: AbortController;

    private responseSubject: BehaviorSubject<Response | null>;
    public readonly response$: Observable<Response | null>;

    constructor(
        private requestInfo: PmsRequestOption,
        private requestInit?: PmsRequestInit
    ) {
        this.responseSubject = new BehaviorSubject<Response | null>(null);
        this.response$ = this.responseSubject.asObservable();
    }

    init() {
        this.abortController = new AbortController();
        this.requestInit = {
            signal: this.abortController.signal,
            ...this.requestInit
        }
        return new Promise<this>(async (resolve, reject) => {
            const mutex = PmsRequest.mutex;
            try {
                await mutex.acquire();
                if (this.isCanceled) {
                    this.isCanceled = false;
                    throw 'AbortError';
                }

                const response = await fetch(this.requestInfo, this.requestInit);
                response.body.once('error', (err) => {
                    console.log(err);
                    mutex.release();
                    if (err.name !== 'AbortError') {
                        this.retry();
                    }
                })
                response.body.once('close', () => {
                    mutex.release();
                })
                this.responseSubject.next(response);
                resolve(this);
            } catch (e) {
                mutex.release();
                this.retry();
                reject(e);
            }
        })
    }

    private retry() {
        const r = this.requestInit?.retry || 0;
        if (this.retryCounter++ < r) {
            setTimeout(() => {
                this.init().catch(e => console.log(e));
            })
        }
    }

    abort() {
        this.isCanceled = true;
        this.abortController.abort();
    }

    getHeaders() {
        const response = this.responseSubject.value;
        if (!response) {
            return null;
        }

        const headers: IncomingHttpHeaders = {};

        const h = response.headers.raw();
        Object.keys(h).forEach(key => {
            if (h[key]?.length > 1) {
                console.log('check re!')
                process.exit(-1);
            }
            headers[key] = h[key]?.[0];
        })

        return headers;
    }

    getResponse() {
        return this.responseSubject.value;
    }
}