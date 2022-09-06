import {injectable, multiInject, optional} from "inversify";
import {Logger} from "@cores/logger";
import {Ca} from "@cores/di/ca";
import {Config} from "@cores/config";
import {PPPassThroughHttpHandler, PPPassThroughWsHandler, PPServerProxy} from "pms-proxy";
import {V2RayClient} from "@cores/di/v2ray";
import {Tokens} from "@cores/di/tokens";
import {PmsRequest} from "@cores/request";
import {PmsUiInjectModule} from "@analytics/ui";
import {PmsOkRuModule} from "@modules/ok-ru";
import {PmsHydraxInjectBundleModule} from "@modules/hydrax/inject-bundle";
import {PmsHydraxInjectHydraxModule} from "@modules/hydrax/inject-hydrax";
import {PmsModule} from "@cores/module";
import {PmsServerAnalytics} from "@analytics/index";
import {WebManager} from "../../managers";

@injectable()
export class PmsMain {
    private server: PPServerProxy;

    constructor(
        private logger: Logger,
        private config: Config,
        private ca: Ca,
        @multiInject(Tokens.v2RayClients) @optional() private v2RayClients: V2RayClient[]
    ) {
    }

    async start() {
        const https = await this.ca.getCaOption();
        this.server = new PPServerProxy({ https });

        // current support one v2RayClient
        if (this.v2RayClients?.length) {
            const agentGlobal = this.v2RayClients[0].proxyAgents;
            PPPassThroughHttpHandler.agents
                = PPPassThroughWsHandler.agents
                = PmsRequest.agents
                = agentGlobal;
        }

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
            return this.server.addRule(moduleClazz.rule()).then(PmsModule.create(moduleClazz));
        })

        /**
         * Module websocket
         *
         */



        /**
         * Analytics socket
         *
         */
        this.server.getWebsocket()
            .addRule()
            .url(PmsServerAnalytics.mathHost)
            .then(PmsServerAnalytics.instance);

        /**
         * Web Manager
         *
         */
        const webManager = new WebManager(this.server);
        webManager.listen();

        await this.server.listen(this.config.proxyPort);
        this.logger.info(`Server proxy running on port ${this.config.proxyPort}`)
    }
}