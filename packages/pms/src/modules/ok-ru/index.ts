import Url from 'url';
import {PmsModule} from "@cores/module";
import {PmsBufferRange} from "@cores/types";
import {PmsOkRuCachedManager} from "@modules/ok-ru/cached-manager";
import {PmsProxyRule} from "pms-proxy/dist/rule";

export class PmsOkRuModule extends PmsModule {
    url: Url.UrlWithParsedQuery;
    startSegment: number;
    endSegment: number;

    public static cachedManager: PmsOkRuCachedManager = new PmsOkRuCachedManager();

    static rule() {
        const r = new PmsProxyRule();
        r.host(/(mycdn\.me)|(vkuser\.net)/g);
        r.query("bytes", /\d+-\d+/g);
        return r;
    }

    init() {
        this.url = Url.parse(this.request.url, true);

        // @ts-ignore
        delete this.url.search;

        // split start & end
        const byteRange = (this.url.query['bytes'] as string)?.split('-');
        this.startSegment = Number(byteRange?.[0]);
        this.endSegment = Number(byteRange?.[1]);

        // load segment & cached
        const cached = PmsOkRuModule.cachedManager.getCached(this.request);
        if (cached) {
            const range: PmsBufferRange = { start: this.startSegment, end: this.endSegment };
            const time = new Date().getTime();
            cached.getBuffer(range, buffer => {
                console.log('---------res-----------')
                console.log(range, this.id);
                console.log(this.request.url);
                console.log(buffer.length/1024/1024, 'Mb -',((buffer.length/1024/1024)/((new Date().getTime() - time)/1000)).toFixed(2), 'Mb/S')
                const headers = cached.getHeaderLasted();
                if (headers['content-range']) {
                    headers['content-range'] = headers['content-range']?.replace(/[\d]+-[\d]+\//gim, `${this.startSegment}-${this.endSegment}/`);
                }
                if (headers['content-length']) {
                    if (!buffer.length) {
                        console.log('err');
                        process.exit(-1);
                    }
                    headers['content-length'] = buffer.length.toString();
                }

                this.response.writeHead(200, headers);
                this.response.write(buffer);
                this.response.end();
            })
        }
    }
}