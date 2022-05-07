import {PmsModule} from "@cores/module";
import {PmsProxyRule} from "pms-proxy/dist/rule";
import {PmsServerPassThroughHandler} from "pms-proxy/dist/handler";

// @ts-ignore
import sourceUiInject from '!!raw-loader!pms-ui-inject';
import * as Buffer from "buffer";

export class PmsUiInjectModule extends PmsModule {

    static rule() {
        const r = new PmsProxyRule();
        r.url([
            /https\:\/\/www\.ok\.ru\/videoembed\//gmi
        ]);
        return r;
    }

    init(): void {
        const passThrough = new PmsServerPassThroughHandler();
        passThrough.injectBuffer((req, buffer) => {
            let data: string | Buffer = buffer;
            if (!req.url.endsWith(".js")) {
                data = buffer.toString() + `<script>${sourceUiInject}</script>`;
            }
            return {
                data
            }
        })

        passThrough.handle(this.request, this.response)
            .then(r => {})
            .catch(err => {
                console.error(err);
            })
    }

}