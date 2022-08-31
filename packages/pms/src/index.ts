import {glob} from "glob";

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
    PPCaOptions, PPPassThroughHttpHandler,
    PPPassThroughWsHandler,
    PPServerProxy
} from "pms-proxy";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsServerAnalytics} from "@analytics/index";
import crypto from "crypto";
import {PmsHydraxInjectHydraxModule} from "@modules/hydrax/inject-hydrax";
import {PmsHydraxInjectBundleModule} from "@modules/hydrax/inject-bundle";
import {V2Ray} from "@cores/v2ray";
import {PmsRequest} from "@cores/request";

async function getHttpsOption() {
    let https: PPCaOptions = <any>{};

    if (process.env.NODE_ENV == 'production') {
        if (process.env.type == 'win32') {
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

function runV2RayClient() {
    return new Promise<void>(resolve => {
        const dir = path.join(configs.configV2RayDirectory, '*.json').replace(/\\/g, '/');
        log.info('v2ray config directory: ' + dir);
        glob(dir, {}, function (er, files) {
            if(er) {
                log.error(er);
                return;
            }
            files.forEach(file => {
                log.info('v2ray: ' + file);
                new V2Ray(file);
                resolve();
            })
        })
    })
}

(async () => {
    const https: PPCaOptions = await getHttpsOption();

    const server = new PPServerProxy({
        https
    })

    /**
     * Start V2Ray
     *
     */
    await runV2RayClient();
    // PPPassThroughHttpHandler.agents = Object.values(V2Ray.getClients()).map(client => {
    //     console.log(client.proxyUrls[0])
    //     return client.proxyAgents[0];
    // });
    // PmsRequest.agents = Object.values(V2Ray.getClients()).map(client => {
    //     console.log(client.proxyUrls[0])
    //     return client.proxyAgents[0];
    // });

    PPPassThroughHttpHandler.agents = V2Ray.getClientByFile('own.json').proxyAgents;
    PPPassThroughWsHandler.agents = V2Ray.getClientByFile('own.json').proxyAgents;
    PmsRequest.agents = V2Ray.getClientByFile('own.json').proxyAgents;

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
        } 
    }

    log.info(`Server proxy running on port ${configs.proxyPort}`);
})();
