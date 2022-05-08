import path from 'path';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";
import {PPServerProxy} from "pms-proxy";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsServerAnalytics} from "@analytics/index";

// google-chrome --proxy-server=localhost:$PORT --ignore-certificate-errors-spki-list=$CERT_FINGERPRINT --user-data-dir=$ANY_PATH
// const caFingerprint = mockttp.generateSPKIFingerprint(https.cert)

(async () => {
    const server = new PPServerProxy({
        https: {
            keyPath: path.join(__dirname, '../certs/rootCA.key'),
            certPath: path.join(__dirname, '../certs/rootCA.pem'),
        }
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

    log.info(`Server proxy running on port ${configs.proxyPort}`);
})();
