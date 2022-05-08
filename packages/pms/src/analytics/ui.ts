// @ts-ignore
import sourceUiInject from '!!raw-loader!pms-ui-inject';
import {PmsModule} from "@cores/module";
import {PPHttpRule, PPPassThroughHttpHandler} from "pms-proxy";

export class PmsUiInjectModule extends PmsModule {

    static rule() {
        const r = new PPHttpRule();
        r.url([
            /^https\:\/\/www\.ok\.ru\/videoembed\//gmi
        ]);
        return r;
    }

    init(): void {
        const passThrough = new PPPassThroughHttpHandler();
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