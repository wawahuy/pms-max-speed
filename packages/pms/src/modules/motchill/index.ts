import Url from 'url';
import {PmsModule} from "@cores/module";
import {PmsBufferRange} from "@cores/types";
import {PPHttpRule, PPPassThroughHttpHandler} from "pms-proxy";
import {PmsMotChillCachedManager} from "@modules/motchill/cached-manager";
import {PmsRequest} from "@cores/request";

export class PmsMotChillModule extends PmsModule {
    url: Url.UrlWithParsedQuery;
    startSegment: number;
    endSegment: number;

    public static cachedManager: PmsMotChillCachedManager = new PmsMotChillCachedManager();

    static rule() {
        const r = new PPHttpRule();
        r.url(/\.googleusercontent\.com\/gadgets\/proxy/g);
        r.header('origin', /motchill/g);
        return r;
    }

    async init() {
        let hasResponse = false
        this.request.on('error', () => {
            console.log('request error');
            if (!hasResponse) {
            }
        })
        this.request.on('close', () => {
            console.log('request close');
            if (!hasResponse) {
            }
        })
        this.url = Url.parse(this.request.url, true);

        // @ts-ignore
        delete this.url.search;

        // get content length
        console.log(this.request.url)
        const headers = <any>this.request.headers;
        const r = new PmsRequest(this.request.url, { headers, method: 'HEAD' });
        const rp = await r.init()
            .then(() => {
                return r.getResponse();
            })
            .catch(e => {
                this.response.destroy();
                return null;
            })

        if (!rp) {
            const p = new PPPassThroughHttpHandler(false);
            await p.handle(this.request, this.response)
            return;
        }

        this.startSegment = 0;
        this.endSegment = Number(rp.headers.get('content-length')) - 1;
        console.log(this.startSegment, this.endSegment)

        if (this.startSegment >= this.endSegment) {
            const p = new PPPassThroughHttpHandler(false);
            await p.handle(this.request, this.response)
            return;
        }

        // load segment & cached
        const cached = PmsMotChillModule.cachedManager.getCached(this.request);
        if (cached) {
            const range: PmsBufferRange = { start: this.startSegment, end: this.endSegment };
            const time = new Date().getTime();
            cached.getBuffer(range, buffer => {
                hasResponse = true;
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