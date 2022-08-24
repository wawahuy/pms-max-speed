import {PmsWsModule} from "@cores/module";
import {PPHttpRule} from "pms-proxy";


export class PmsHydraxModule extends PmsWsModule {

    static rule() {
        const r = new PPHttpRule();
        r.host(/.+\.websocketgate\.com/gi);
        return r;
    }

    init(): void {
    }
}