import {PmsCached} from "@cores/cached";
import {PmsBufferRange, PmsResponse} from "@cores/types";
import requestLib from "request";
import Url from "url";

export class PmsOkRuCached extends PmsCached  {

    constructor() {
        super();
    }

    release(): void {
    }

    getUrlByRange(range: PmsBufferRange) {
        let { start, end } = range;
        if (typeof start === 'number' && typeof end === 'number') {
            this.url.query['bytes'] = start + '-' + end;
        }
        return Url.format(this.url);
    }

    loadSegment(range: PmsBufferRange) {
        const url = this.getUrlByRange(range);
        const option: requestLib.CoreOptions = {
            headers: this.request.headers,
            encoding: null,
        }
        return this.network(url, option);
    }

}