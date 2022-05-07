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
    public static readonly mutex: PmsParallelMutex = new PmsParallelMutex(PmsRequest.maxRequest);

    private isDone: boolean = false;
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
        this.isDone = false;
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
                    this.isDone = true;
                    mutex.release();
                    console.log('what????', err);
                    if (err.name !== 'AbortError') {
                        console.log(err);
                        this.retry();
                    }
                })
                response.body.once('close', () => {
                    this.isDone = true;
                    mutex.release();
                })
                this.responseSubject.next(response);
                resolve(this);
            } catch (e) {
                console.log('what??', e)
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
                this.init().catch(err => {
                    if (err.name !== 'AbortError' && err !== 'AbortError') {
                        console.log(err);
                    }
                });
            })
        }
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