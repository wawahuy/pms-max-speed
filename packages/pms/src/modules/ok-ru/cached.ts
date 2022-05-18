import {PmsCached} from "@cores/cached";
import {PmsBufferRange} from "@cores/types";
import * as http from "http";
import {PmsRequest, PmsRequestInit} from "@cores/request";

export class PmsOkRuCached extends PmsCached  {
    private headerLasted: http.IncomingHttpHeaders;
    private headerContentLength: number;

    private resolveWaitHeaders: (() => void)[] = [];

    get maxOffset() {
        return this.headerContentLength;
    }

    constructor() {
        super();
    }

    release(): void {
    }

    getHeaderLasted() {
        return this.headerLasted;
    }

    getUrlByRange(range: PmsBufferRange) {
        let { start, end } = range;
        return this.request.url.replace(/bytes=(.*)-(.*)/, `bytes=${start}-${end}`)
    }

    getHeaderWaiter() {
        if (this.headerLasted) {
            return;
        }
        return new Promise<void>(resolve => {
            this.resolveWaitHeaders.push(resolve);
        })
    }

    requestRange(range: PmsBufferRange) {
        const url = this.getUrlByRange(range);
        const option: PmsRequestInit = {
            headers: <any>this.request.headers,
            timeout: 5000,
            retry: 3
        }
        const request = new PmsRequest(url, option);
        request.on('created', () => {
            const header = request.getHeaders();
            if (header) {
                this.headerLasted = header;
                this.headerContentLength = Number(header['content-range']?.split('/')?.[1]?.trim() || 0);
                this.resolveWaitHeaders.forEach(cb => cb());
            }
        })
        return request;
    }

    async loadRanges(ranges: PmsBufferRange[]) {
        console.log(ranges);
        let result: PmsRequest[] = [];
        for (const range of ranges) {
            const nextRange = await this.loadRange(range);
            result = result.concat(nextRange);
        }
        return result;
    }

    async loadRange(range: PmsBufferRange) {
        const perSegment = 200 * 1024;
        const { start, end } = range;
        const req: PmsRequest[] = [];
        let currentSegment = start - 1;

        do {
            let s = currentSegment + 1;
            let e = s + perSegment;
            if (e > end && s !== end) {
                e = end;
            }

            const r = { start: s, end: e };
            const p = this.requestRange(r);
            this.bufferTree.insertStream(r, p);
            req.push(p);
            currentSegment = e;
            await new Promise(r => setTimeout(r, 10));
        } while (currentSegment < end);

        return req;
    }
}