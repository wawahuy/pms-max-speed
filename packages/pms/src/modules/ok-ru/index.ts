import Url from 'url';
import {PmsModule} from "@cores/module";
import {PmsBufferRange} from "@cores/types";
import {PmsOkRuCachedManager} from "@modules/ok-ru/cached-manager";
import {PPHttpRule} from "pms-proxy";
import {log} from "@cores/logger";
import {response} from "express";

export class PmsOkRuModule extends PmsModule {
    url: Url.UrlWithParsedQuery;
    startSegment: number;
    endSegment: number;

    public static cachedManager: PmsOkRuCachedManager = new PmsOkRuCachedManager();

    static rule() {
        const r = new PPHttpRule();
        r.host(/(mycdn\.me)|(vkuser\.net)/g);
        r.query("bytes", /\d+-\d+/g);
        return r;
    }

    init() {
        this.request.on('error', () => {
            console.log('request error');
        })
        this.request.on('close', () => {
            console.log('request close');
        })
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
            cached.wait(range, async stream => {
                console.log('---------res-----------')
                console.log(range, this.id);
                console.log(this.request.url);
                stream.once('error', (err) => {
                    log.info('ok.ru init')
                    log.info(err);
                    this.response.status(500).send();
                })

                await cached.getHeaderWaiter();
                const headers = cached.getHeaderLasted();
                if (headers['content-range']) {
                    headers['content-range'] = headers['content-range']?.replace(/[\d]+-[\d]+\//gim, `${this.startSegment}-${this.endSegment}/`);
                }
                if (headers['content-length']) {
                    headers['content-length'] = (range.end - range.start + 1).toString();
                }

                this.response.writeHead(200, headers);
                stream.pipe(this.response);
            })
        }
    }
}
