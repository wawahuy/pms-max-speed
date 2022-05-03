import {PmsCached} from "@cores/cached";
import {PmsBufferRange} from "@cores/types";
import * as http from "http";
import {PmsRequest, PmsRequestInit} from "@cores/request";

export class PmsOkRuCached extends PmsCached  {
    private headerLasted: http.IncomingHttpHeaders;

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
            timeout: 5000
        }
        const request = new PmsRequest(url, option);
        request.init().then(r => {
            const header = request.getHeaders();
            if (header) {
                this.headerLasted = header;
            }
        });
        return request;
    }

    loadRanges(ranges: PmsBufferRange[]): void {
        console.log(ranges);
        ranges.forEach((range) => {
            this.loadRange(range)
        })
    }

    loadRange(range: PmsBufferRange) {
        const perSegment = 200 * 1024;
        const { start, end } = range;
        let currentSegment = start - 1;

        do {
            let s = currentSegment + 1;
            let e = s + perSegment;
            if (e > end) {
                e = end;
            }

            const r = { start: s, end: e };
            const p = this.requestRange(r);
            this.bufferTree.insertWaiter(r, p);
            currentSegment = e;
        } while (currentSegment < end);
    }
}