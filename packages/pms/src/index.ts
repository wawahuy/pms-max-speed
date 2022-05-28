process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";

import * as fs from "fs";
import path from 'path';
import child_process from 'child_process';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";
import {PPCa, PPCaFileOptions, PPCaOptions, PPPassThroughHttpHandler, PPServerProxy} from "pms-proxy";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsServerAnalytics} from "@analytics/index";
import {PmsRequest} from "@cores/request";
import AVLTree from "avl";
import {timer} from "@cores/helpers";
import {Readable} from "stream";

async function getHttpsOption() {
    let https: PPCaOptions = <any>{};

    if (process.env.NODE_ENV == 'production') {
        if (process.env.type == 'android') {
            // for Android
            const caPath = path.join(configs.rootAppDir, 'ca');
            https = {
                keyPath: caPath + '.key',
                certPath: caPath + '.cert'
            }

            if (!fs.existsSync(https.keyPath) || !fs.existsSync(https.certPath) ) {
                const n = await PPCa.generateCACertificate();
                fs.writeFileSync(https.keyPath, n.key);
                fs.writeFileSync(https.certPath, n.cert);
                // android emit new CA
                const rn = require('rn-bridge');
                rn.channel.send('NewCA');
            }
        } else if (process.env.type == 'win32') {
            // for Windows
            https = await PPCa.generateCACertificate();
        } else {
            throw 'Not support system ' + process.env.type;
        }
    } else {
        https = {
            keyPath: path.join(__dirname, '../certs/rootCA.key'),
            certPath: path.join(__dirname, '../certs/rootCA.pem'),
        }
    }

    return https;
}

(async () => {
    const https: PPCaOptions = await getHttpsOption();

    const server = new PPServerProxy({
        https
    })

    const modules = [
        PmsUiInjectModule,
        PmsOkRuModule,
        // PmsMotChillModule,
    ]

    modules.map(moduleClazz => {
        return server.addRule(moduleClazz.rule()).then(PmsModule.create(moduleClazz));
    })

    /**
     * Analytics socket
     *
     */
    server.getWebsocket()
        .addRule()
        .url(PmsServerAnalytics.mathHost)
        .then(PmsServerAnalytics.instance);

    /**
     * Zone test ads block
     *
     *
     */
    // const adsTree = new AVLTree<string, undefined>();
    //
    // const adsUrl1 = 'https://raw.githubusercontent.com/jerryn70/GoodbyeAds/master/Hosts/GoodbyeAds.txt';
    // const adsResponse1 = await (new PmsRequest(adsUrl1).init().then((r) => {
    //     return r.getResponse();
    // }))
    // const text1 = await adsResponse1?.text() || '';
    // const adsSp1 = text1.split("\n")
    // adsSp1.forEach(item => {
    //     const s = item.split(" ");
    //     if (s.length == 2) {
    //         adsTree.insert(s[1]);
    //     }
    // })
    //
    // const adsUrl2 = 'https://raw.githubusercontent.com/pantsufan/BlockAds/main/hosts';
    // const adsResponse2 = await (new PmsRequest(adsUrl2).init().then((r) => {
    //     return r.getResponse();
    // }))
    // const text2 = await adsResponse2?.text() || '';
    // const adsSp2 = text2.split("\n")
    // adsSp2.forEach(item => {
    //     const s = item.split(" ");
    //     if (s.length == 2) {
    //         adsTree.insert(s[1]);
    //     }
    // })

    // console.log('init ads tree, size=', adsTree.size);

    /**
     * Zone test
     *
     */
    server.addRule().any().then(async (req, res) => {
        // const t = timer('block ads');
        // if (adsTree.find(req.hostname)) {
        //     t();
        //     res.destroy();
        //     return;
        // }
        console.log(req.url);
        const p = new PPPassThroughHttpHandler(false);
        p.injectBuffer((r, b) => {
            console.log(req.url, b.length);
            return {
                data: b,
            }
        })
        await p.handle(req, res);
    })

    await server.listen(configs.proxyPort);

    if (process.env.NODE_ENV == 'production') {
        if (process.env.type == 'win32') {
            // for Window's
            // start with Proxy and CA
            const spki = PPCa.generateSPKIFingerprint((<PPCaFileOptions>https).cert);
            const userData = path.join(configs.rootAppDir, '/data/chrome');
            log.info('Chrome Data: ' + userData);
            log.info('SPKI: ' + spki);
            log.info(`Run: start chrome --proxy-server="http://127.0.0.1:${configs.proxyPort}" --ignore-certificate-errors-spki-list=\"${spki}\" --user-data-dir=\"${userData}\"`)
            const proc = child_process.exec(
                `start chrome --proxy-server="http://127.0.0.1:${configs.proxyPort}" --ignore-certificate-errors-spki-list=\"${spki}\" --user-data-dir=\"${userData}\"`
            );
            process.on('exit', () => {
                proc.kill();
            })
        } else if (process.env.type == 'android') {
            // for Android
            const rn = require('rn-bridge');
            rn.channel.send('ServerStarted')
        }
    }

    log.info(`Server proxy running on port ${configs.proxyPort}`);
})();
