import {PmsCached} from "@cores/cached";
import {PmsBufferRange} from "@cores/types";
import * as http from "http";
import {PmsRequest, PmsRequestInit} from "@cores/request";

export class PmsOkRuCached extends PmsCached  {
    private headerLasted: http.IncomingHttpHeaders;
    private headerContentLength: number;

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

    requestRange(range: PmsBufferRange) {
        const url = this.getUrlByRange(range);
        const option: PmsRequestInit = {
            headers: <any>this.request.headers,
            timeout: 5000,
            retry: 3
        }
        const request = new PmsRequest(url, option);
        request.init().then(r => {
            const header = request.getHeaders();
            if (header) {
                this.headerLasted = header;
                this.headerContentLength = Number(header['content-range']?.split('/')?.[1]?.trim() || 0);
            }
        }).catch(err => {
            if (err.name !== 'AbortError' && err !== 'AbortError') {
                console.log(err);
            }
        })
        return request;
    }

    loadRanges(ranges: PmsBufferRange[]): PmsRequest[] {
        console.log(ranges);
        return ranges.reduce<PmsRequest[]>((arr, range) => {
            const start = range.start;
            if (this.headerContentLength && start >= this.headerContentLength) {
                return arr;
            }

            const end = Math.min(this.headerContentLength || range.end, range.end);

            return arr.concat(this.loadRange({ start, end }));
        }, []);
    }

    loadRange(range: PmsBufferRange) {
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
            this.bufferTree.insertWaiter(r, p);
            req.push(p);
            currentSegment = e;
        } while (currentSegment < end);

        return req;
    }
}