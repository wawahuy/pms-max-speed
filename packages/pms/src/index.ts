import * as mockttp from 'mockttp';
import path from 'path';
import {PmsModule} from "@cores/module";
import {PmsOkRuModule} from "@modules/ok-ru";
import {configs} from "./config";
import {log} from "@cores/logger";

process.env.rootAppDir = __dirname;

// google-chrome --proxy-server=localhost:$PORT --ignore-certificate-errors-spki-list=$CERT_FINGERPRINT --user-data-dir=$ANY_PATH
// const caFingerprint = mockttp.generateSPKIFingerprint(https.cert)

(async () => {
    // Create a proxy server with a self-signed HTTPS CA certificate:
    const server = mockttp.getLocal({
        https: {
            keyPath: path.join(__dirname, '../certs/rootCA.key'),
            certPath: path.join(__dirname, '../certs/rootCA.pem'),
        }
    });

    const modules = [
        PmsOkRuModule
    ]


    await Promise.all(modules.map(moduleClazz => {
        return server.forGet(moduleClazz.matcher()).withSomeQuery({ bytes: /.+-.+/g }).thenCallback(PmsModule.create(moduleClazz));
    }))

    await server.forUnmatchedRequest().thenPassThrough();
    await server.forAnyWebSocket().thenPassThrough();
    await server.start(configs.proxyPort);

    // Print out the server details:
    log.info(`Server proxy running on port ${server.port}`);
})();

if (process.env.NODE_ENV === 'development') {
    require('./debug')
}
