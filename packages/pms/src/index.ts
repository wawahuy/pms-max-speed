process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";

import * as fs from "fs";
import path from 'path';
import child_process from 'child_process';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";
import {
    PPCa,
    PPCaFileOptions,
    PPCaOptions,
    PPPassThroughWsHandler,
    PPServerProxy
} from "pms-proxy";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsServerAnalytics} from "@analytics/index";
import crypto from "crypto";
import {PmsHydraxInjectHydraxModule} from "@modules/hydrax/inject-hydrax";
import {PmsHydraxInjectBundleModule} from "@modules/hydrax/inject-bundle";

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

    /**
     * Module HTTP Connection
     *
     */
    const modules = [
        PmsUiInjectModule,
        PmsOkRuModule,
        PmsHydraxInjectBundleModule,
        PmsHydraxInjectHydraxModule
    ]

    modules.map(moduleClazz => {
        return server.addRule(moduleClazz.rule()).then(PmsModule.create(moduleClazz));
    })

    /**
     * Module websocket
     *
     */



    /**
     * Analytics socket
     *
     */
    server.getWebsocket()
        .addRule()
        .url(PmsServerAnalytics.mathHost)
        .then(PmsServerAnalytics.instance);

    /**
     * Zone test
     *
     */

    server.getWebsocket().addRule().host([
        /.+\.websocketgate\.com/gmi,
    ]).then((request, ws) => {
        const injectWs = new PPPassThroughWsHandler();
        injectWs.injectSend(data => {
            const key = request.query['key']?.toString();
            if (!key) {
                return  data;
            }

            try {
                if (data && data instanceof Buffer) {
                    const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
                    decipher.update(data.toString('binary'), "binary", "utf-8");
                    console.log('1++++++++++++', decipher.final("utf-8"));
                    return  Buffer.from(data.toString('binary'));
                }
            } catch (e) {
                console.log(e);
            }
            // return  data;
            return  Buffer.from(data.toString('binary'));
        })
        injectWs.injectReceive(data => {
            console.log('1++++revc', data.slice(0, 10));
            return data;
        })
        injectWs.handle(request, ws);
    });

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
