import * as Buffer from "buffer";
import {CompletedRequest} from "mockttp";
import Url from "url";

export type CallbackWaitBuffer = (error: any, buffer: Buffer) => void;

export interface BufferRange {
    start: number;
    end: number
}

export class PmsWaitBuffer {

    constructor(
        range: BufferRange
    ) {
    }
}

export abstract class PmsCached {
    protected request: CompletedRequest;
    protected url: Url.UrlWithParsedQuery;

    abstract release(): void;

    waitBuffer(range: BufferRange): PmsWaitBuffer {
        const wait = new PmsWaitBuffer(range);
        return wait;
    }

    setRequest(request: CompletedRequest) {
        this.request = request;
        this.url = Url.parse(request.url, true);
    };

    getUrl() {
        return this.url;
    }
}