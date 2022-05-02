import {PmsCached} from "@cores/cached";
import {PmsBufferRange, PmsResponse, PmsWaiterResponse} from "@cores/types";
import requestLib from "request";
import * as http from "http";

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
        const option: requestLib.CoreOptions = {
            headers: this.request.headers,
            encoding: null,
            timeout: 5000
        }
        return this.network(url, option, 3);
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
            p.waiter.then(res => {
                this.headerLasted = res.response.headers;
                return Promise.resolve(res);
            })
            this.bufferTree.insertWaiter(r, p);
            currentSegment = e;
        } while (currentSegment < end);
    }
}