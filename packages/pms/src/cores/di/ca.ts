import {injectable} from "inversify";
import {PPCa} from "pms-proxy";
import * as path from "path";
import {Config} from "@cores/config";

@injectable()
export class Ca {
    constructor(
        private config: Config
    ) {
    }

    getCaOption() {
        const config = this.config;
        if (config.isProduction) {
            return PPCa.generateCACertificate();
        } else {
            const ca = {
                keyPath: path.join(config.dataCertDirectory, config.nameCertKey),
                certPath: path.join(config.dataCertDirectory, config.nameCertPem),
            }
            return Promise.resolve(ca);
        }
    }
}