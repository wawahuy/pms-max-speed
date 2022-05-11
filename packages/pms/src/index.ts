import * as fs from "fs";
import path from 'path';
import child_process from 'child_process';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";
import {PPCa, PPCaFileOptions, PPCaOptions, PPServerProxy} from "pms-proxy";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsServerAnalytics} from "@analytics/index";

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
    ]

    modules.map(moduleClazz => {
        return server.addRule(moduleClazz.rule()).then(PmsModule.create(moduleClazz));
    })

    /**
     * Analytics accept all connect from path: /websocket-pms/success
     *
     */
    server.getWebsocket()
        .addRule()
        .url(PmsServerAnalytics.mathHost)
        .then(PmsServerAnalytics.instance);

    await server.listen(configs.proxyPort);

    if (process.env.NODE_ENV == 'production') {
        if (process.env.type == 'win32') {
            // for Window's
            // start with Proxy and CA
            const spki = PPCa.generateSPKIFingerprint((<PPCaFileOptions>https).cert);
            const userData = path.join(configs.rootAppDir, '/data/chrome');
            log.info('Chrome Data: ' + userData);
            log.info('SPKI: ' + spki);
            log.info(`Run: start chrome --proxy-server="http://127.0.0.1:${configs.proxyPort}" --ignore-certificate-errors-spki-list=${spki} --user-data-dir=\"${userData}\"`)
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
