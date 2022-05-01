import {CompletedRequest} from "mockttp";
import Url from "url";
import requestLib from "request";
import {PmsBufferCallback, PmsBufferRange, PmsResponse, PmsWaiterResponse} from "@cores/types";
import {PmsBufferTree} from "@cores/buffer-tree";

export abstract class PmsCached {
    protected request: CompletedRequest;
    protected url: Url.UrlWithParsedQuery;
    protected bufferTree: PmsBufferTree;

    protected constructor() {
        this.bufferTree = new PmsBufferTree();
    }

    abstract loadSegment(range: PmsBufferRange): void;
    abstract release(): void;

    getBuffer(range: PmsBufferRange, callback: PmsBufferCallback) {
        return this.bufferTree.get(range, callback);
    }

    searchRangeForDownload() {

    }

    setRequest(request: CompletedRequest) {
        this.request = request;
        this.url = Url.parse(request.url, true);
    };

    getUrl() {
        return this.url;
    }

    network: (url: string, option: requestLib.CoreOptions) => PmsWaiterResponse = PmsCached.network;

    static network(url: string, option: requestLib.CoreOptions): PmsWaiterResponse {
        let resolve: (value: PmsResponse) => void;
        let waiter = new Promise<PmsResponse>(res => resolve = res);

        const request = requestLib(url, option, (err, response) => {
            resolve({ response, err })
        })

        return {
            waiter,
            request
        }
    }

}