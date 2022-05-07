import path from 'path';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";
import {PmsServerProxy} from "pms-proxy";
import {PmsUiInjectModule} from "@modules/ui-inject";

// google-chrome --proxy-server=localhost:$PORT --ignore-certificate-errors-spki-list=$CERT_FINGERPRINT --user-data-dir=$ANY_PATH
// const caFingerprint = mockttp.generateSPKIFingerprint(https.cert)

(async () => {
    const server = new PmsServerProxy({
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
        return server.addRule(moduleClazz.rule()).setHandler(PmsModule.create(moduleClazz));
    })

    await server.listen(configs.proxyPort);

    log.info(`Server proxy running on port ${configs.proxyPort}`);
})();
