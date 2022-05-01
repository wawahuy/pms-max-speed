import Url from 'url';
import requestLib from 'request';
import {SmartSpeed} from "@cores/smart-speed";
import {PmsModule} from "@cores/module";
import {PmsResponse, PmsWaiterResponse} from "@cores/types";
import {PmsOkRuCachedManager} from "@modules/ok-ru/cached-manager";

export class PmsOkRuModule extends PmsModule {
    url: Url.UrlWithParsedQuery;
    startSegment: number;
    endSegment: number;

    public static cachedManager: PmsOkRuCachedManager = new PmsOkRuCachedManager();
    private static smartSpeed: SmartSpeed = new SmartSpeed('Ok.ru');

    static matcher(): RegExp {
        return /mycdn\.me/g;
    }

    init() {
        this.url = Url.parse(this.request.url, true);
        console.log(this.request.url)

        // @ts-ignore
        delete this.url.search;

        // split start & end
        const byteRange = (this.url.query['bytes'] as string)?.split('-');
        this.startSegment = Number(byteRange?.[0]);
        this.endSegment = Number(byteRange?.[1]);

        // when no segment range then no split segment
        if (!this.endSegment || this.startSegment > this.endSegment) {
            this.loadSegment(this.startSegment, this.endSegment)
                .waiter
                .then(({ response, err }) => {
                    this.outCallback({
                        statusCode: response.statusCode,
                        body: response.body,
                        headers: response.headers
                    })
                })
            return;
        }

        // load segment & cached
        // const cached = PmsOkRuModule.cachedManager.getCached(this.request);
        // if (cached) {
        //     cached.waitBuffer({ start: this.startSegment, end: this.endSegment })
        //         .setCallback((buffer) => {
        //
        //         });
        // }

        // split segment
        this.splitSegment().then(() => {});
    }

    getUrlByRange(start: number, end: number) {
        if (typeof start === 'number' && typeof end === 'number') {
            this.url.query['bytes'] = start + '-' + end;
        }
        return Url.format(this.url);
    }

    loadSegment(start: number, end: number) {
        let resolve: (value: PmsResponse) => void;
        let waiter = new Promise<PmsResponse>(res => resolve = res);

        const url = this.getUrlByRange(start, end);
        const option: requestLib.CoreOptions = {
            headers: this.request.headers,
            encoding: null,
        }
        let t = new Date().getTime();
        const request = requestLib(url, option, (err, response) => {
            t = new Date().getTime() - t;
            // console.log('Ok.ru:', this.request.id, start, '-->', end, t, 'ms');
            if (response?.body) {
                PmsOkRuModule.smartSpeed.add(response.body.length, t);
            }
            resolve({ response, err })
        })

        return {
            waiter,
            request
        }
    }

    static test = false;
    async splitSegment() {
        const perSegment = PmsOkRuModule.smartSpeed.speed;
        let currentSegment = this.startSegment - 1;
        let waitList: PmsWaiterResponse[] = []

        let flagCloseAll = false;
        const closeAll = () => {
            if (!flagCloseAll) {
                flagCloseAll = true;
                waitList.forEach(item => item.request.abort());
                console.log('close all')
                this.outCallback({
                    statusCode: 404,
                    body: 'error'
                })
            }
        }

        let timeout: NodeJS.Timeout | undefined = undefined;
        const resetTimeout = () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                closeAll();
            }, 2000);
        }

        do {
            let s = currentSegment + 1;
            let e = s + perSegment;
            if (e > this.endSegment) {
                e = this.endSegment;
            }

            const p = this.loadSegment(s, e);
            p.waiter.then(res => {
                resetTimeout();
                if (!!res.err) {
                    closeAll();
                }
                return Promise.resolve(res);
            })
            waitList.push(p)
            currentSegment = e;
        } while (currentSegment < this.endSegment);

        const time = new Date().getTime();
        const result = await Promise.all(waitList.map(item => item.waiter));
        clearTimeout(timeout)

        if (result.find(item => !!item.err)) {
            return;
        }

        // @ts-ignore
        const buffers = result.map(r => r.response.body);
        const buffer = Buffer.concat(buffers);
        // console.log('Oke buffer length', buffer.length/1024 + 'kb', '->', new Date().getTime() - time, 'ms')
        console.log((buffer.length/1024/1024)/((new Date().getTime() - time)/1000), 'Mb/S')

        const headers = result[0].response.headers;
        if (headers['content-range']) {
            headers['content-range'] = headers['content-range']?.replace(/[\d]+-[\d]+\//gim, `${this.startSegment}-${this.endSegment}/`);
        }
        if (headers['content-length']) {
            headers['content-length'] = buffer.length.toString();
        }

        this.outCallback({
            statusCode: result[0].response.statusCode,
            body: buffer,
            headers
        })
    }

}