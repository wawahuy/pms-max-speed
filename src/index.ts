import * as mockttp from 'mockttp';
import path from 'path';
import requestLib from 'request';
import url from 'url';

(async () => {
    // Create a proxy server with a self-signed HTTPS CA certificate:
    const server = mockttp.getLocal({
        https: {
            keyPath: path.join(__dirname, '../certs/rootCA.key'),
            certPath: path.join(__dirname, '../certs/rootCA.pem'),
        }
    });

    // Inject 'Hello world' responses for all requests
    let test: { [key: string]: number } = {};
    await server.forGet(/mycdn\.me/).thenCallback(request => {
        return new Promise(async res => {
            console.log(new Date().getTime(), request.url);
            const u = url.parse(request.url, true);
            // @ts-ignore
            delete u.search;
            const byteRange = (u.query['bytes'] as string)?.split('-');
            const start = Number(byteRange?.[0]);
            const end = Number(byteRange?.[1]);
            console.log('load', start, end);

            if (!end || start > end) {
                requestLib(request.url, { headers: request.headers, encoding: null }, (err, response) => {
                    if (err) {
                        res({
                            statusCode: response.statusCode,
                            body: response.body
                        })
                        return;
                    }

                    res({
                        statusCode: response.statusCode,
                        body: response.body,
                        headers: response.headers
                    })
                    console.log(response.headers)
                })
                return;
            }

            const perSegment = 100 * 1024; // 200kb
            let currentSegment = start - 1;
            let waitList: Promise<requestLib.Response & { time: number }>[] = []
            do {
                let s = currentSegment + 1;
                let e = s + perSegment;
                if (e > end) {
                    e = end;
                }
                u.query['bytes'] = s + '-' + e;
                const segURL = url.format(u);
                console.log('add', s, e);
                waitList.push(new Promise<any>(res => {
                    requestLib(segURL, { headers: request.headers, encoding: null }, (err, response) => {
                        if (err) {
                            console.log('error');
                            res(null)
                            return;
                        }

                        res({ ...response, time: new Date().getTime() });
                    })
                }))
                currentSegment = e;
            } while (currentSegment < end);

            const time = new Date().getTime();
            const result = await Promise.all(waitList);
            // @ts-ignore
            const buffers = result.map(r => r.body);
            const buffer = Buffer.concat(buffers);
            console.log('Oke buffer length', buffer.length/1024 + 'kb', '->', new Date().getTime() - time, 'ms')
            console.log((buffer.length/1024/1024)/((new Date().getTime() - time)/1000), 'Mb/S')

            const headers = result[0].headers;
            if (headers['content-range']) {
                headers['content-range'] = headers['content-range']?.replace(/[\d]+-[\d]+\//gim, `${start}-${end}/`);
            }
            if (headers['content-length']) {
                headers['content-length'] = buffer.length.toString();
            }

            res({
                statusCode: result[0].statusCode,
                body: buffer,
                headers
            })
        })
    })
    await server.forUnmatchedRequest().thenPassThrough();
    await server.start(1234);

    // Print out the server details:
    console.log(`Server running on port ${server.port}`);
})();