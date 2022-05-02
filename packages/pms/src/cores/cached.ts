import {CompletedRequest} from "mockttp";
import Url from "url";
import {PmsBufferCallback, PmsBufferRange, PmsResponse, PmsWaiterResponse} from "@cores/types";
import {PmsBufferTree} from "@cores/buffer-tree";
import requestLib from "request";

export abstract class PmsCached {
    protected request: CompletedRequest;
    protected url: Url.UrlWithParsedQuery;
    protected bufferTree: PmsBufferTree;
    static id = 0;
    id = PmsCached.id++;

    protected constructor() {
        this.bufferTree = new PmsBufferTree();
    }

    abstract loadRanges(ranges: PmsBufferRange[]): void
    abstract release(): void;

    getBuffer(range: PmsBufferRange, callback: PmsBufferCallback) {
        if (!this.bufferTree.has(range, true)) {
            const { start, end } = range;
            console.log('load', this.id);
            let e = end;
            const size = end - start;
            if (size > 0.5 * 1024 * 1024) {
                e = start + 5 * 1024 * 1024
            }
            this.loadRanges(this.bufferTree.getNoDataRanges({ start, end: e }, false));
            console.log('add waiter');
        } else {
            console.log('no load', this.id);
        }
        return this.bufferTree.waitBuffer(range, callback);
    }

    setRequest(request: CompletedRequest) {
        this.request = request;
        this.url = Url.parse(request.url, true);
    };

    getUrl() {
        return this.url;
    }

    network: (url: string, option: requestLib.CoreOptions, retry?: number) => PmsWaiterResponse = PmsCached.network;

    private static networkCounter: number = 0;

    static network(url: string, option: requestLib.CoreOptions, retry: number = 0): PmsWaiterResponse {
        let resolve: (value: PmsResponse) => void;
        let reject: (err?: any) => void;
        const waiter = new Promise<PmsResponse>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const result: PmsWaiterResponse = <any>{ waiter };

        const retryFunc = (err: any) => {
            if (retry--) {
                return load();
            } else {
                return reject(err);
            }
        }

        const load = () => {
            PmsCached.logNetworkCounter(1);
            result.request = requestLib(url, option, (err, response) => {
                if (!!err) {
                    return retryFunc(err);
                }
                resolve({ response })
            })
            result.request.on('abort', () => {
                reject()
            })
            result.request.on('error', (err) => {
                retryFunc(err);
            })
            result.request.on('close', () => {
                PmsCached.logNetworkCounter(-1);
            })
        }

        load()

        return result;
    }

    static logNetworkCounter(inc: number) {
        PmsCached.networkCounter += inc;
        console.log('request count:', PmsCached.networkCounter);
    }

}