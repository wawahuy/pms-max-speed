import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import * as path from "path";
import {configs} from "../config";
import {log} from "@cores/logger";
import * as fs from "fs";
import {SocksProxyAgent} from "socks-proxy-agent";


export class V2Ray {
    private static clients: { [key: string]: V2Ray } = {};
    public static getClientByFile(file: string) {
        return V2Ray.clients[file];
    }

    public static getClientByIndex(index: number) {
        return Object.values(V2Ray.clients)[index];
    }

    public static getClients() {
        return V2Ray.clients;
    }

    public static countClient() {
        return Object.values(V2Ray.clients).length;
    }

    readonly binV2Ray = path.join(configs.rootBinDir, 'v2ray/v2ray.exe');
    process: ChildProcessWithoutNullStreams;
    dataConfig: any;

    get proxyUrls(): string[] {
        const inbounds = this.dataConfig['inbounds'];
        return inbounds.map((inbound: any) => {
            return `${inbound['protocol']}://${inbound['listen']}:${inbound['port']}`;
        })
    }

    get proxyAgents() {
        return this.proxyUrls.map(url => {
            return new SocksProxyAgent(url);
        })
    }

    constructor(
        private fileConfig: string
    ) {
        this.init();
    }

    private init() {
        this.dataConfig = JSON.parse(fs.readFileSync(this.fileConfig).toString());
        this.process = spawn(this.binV2Ray, [
            '--config', this.fileConfig
        ]);

        const name = path.basename(this.fileConfig)
        V2Ray.clients[name] = this;

        this.process.stdout.on('data', (chunk) => {
            // log.info('v2ray: ' + chunk.toString());
        });

        this.process.stderr.on('error', (err) => {
            log.info(err);
            delete V2Ray.clients[name];
        })

        this.process.on('close', (code) => {
            log.info('v2ray: close!');
            delete V2Ray.clients[name];
        });
    }
}