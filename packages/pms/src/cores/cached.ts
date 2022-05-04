import {CompletedRequest} from "mockttp";
import Url from "url";
import {PmsBufferCallback, PmsBufferRange} from "@cores/types";
import {PmsBufferTree} from "@cores/buffer-tree";

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
        console.log('----------------')
        console.log(this.request.url);
        console.log('load', this.id);

        if (!this.bufferTree.has(range, true)) {
            const { start, end } = range;
            const e = end || Math.max(start + 10 * 1024 * 1024, end);
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
}