import "reflect-metadata";
import {Container} from "inversify";
import {Config} from "@cores/config";
import {Logger} from "@cores/logger";
import {Ca} from "@cores/di/ca";
import {V2RayClient, V2RayClientProvider} from "@cores/di/v2ray";
import {Tokens} from "@cores/di/tokens";
import {PmsMain} from "@cores/di/main";

export const container = new Container({ defaultScope: "Singleton" });
container.bind(Config).to(Config);
container.bind(Logger).to(Logger);
container.bind(Ca).to(Ca);

(async () => {
    const config = container.get(Config);

    /**
     * V2Ray run process
     *
     */
    const v2rayFilesConfig = await config.dataV2RayConfigFiles;
    v2rayFilesConfig.forEach((file, index) => {
        container.bind<V2RayClient>(Tokens.v2RayClients).to(V2RayClient);
        container.bind<V2RayClientProvider>(Tokens.v2RayClientProviders).toProvider<boolean>(context => {
            return () => {
                const v2rayClients = context.container.getAll<V2RayClient>(Tokens.v2RayClients);
                const v2rayClient = v2rayClients[index];
                v2rayClient.setPathFileConfig(file);
                return v2rayClient.start()
            }
        })
    })

    container.bind(PmsMain).to(PmsMain);
    const main = container.resolve(PmsMain);
    const v2rayClientProviders = container.getAll<V2RayClientProvider>(Tokens.v2RayClientProviders);

    /**
     * Main loop
     *
     */
    await Promise.all(v2rayClientProviders.map(func => func()));
    await main.start();
})();
