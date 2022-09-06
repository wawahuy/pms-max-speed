import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import {log, Logger} from "@cores/logger";
import * as fs from "fs";
import {SocksProxyAgent} from "socks-proxy-agent";
import {injectable} from "inversify";
import {Config} from "@cores/config";

export enum V2RayStatus {
    Idle,
    Started,
    Error,
    Closed
}

export type V2RayClientProvider = () => Promise<V2RayClient>;

@injectable()
export class V2RayClient {
    private fileConfig: string;
    process: ChildProcessWithoutNullStreams;
    dataConfig: any;
    _status: V2RayStatus = V2RayStatus.Idle;
    _waiterStarted: Promise<boolean>;

    get status() {
        return this._status;
    }

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
        private config: Config,
        private logger: Logger
    ) {
    }

    getPathFileConfig() {
        return this.fileConfig;
    }

    setPathFileConfig(fileConfig: string) {
        this.fileConfig = fileConfig;
    }

    start() {
        if (this.status !== V2RayStatus.Idle) {
            return Promise.reject();
        }
        return new Promise<boolean>((resolve, reject) => {
            this.dataConfig = JSON.parse(fs.readFileSync(this.fileConfig).toString());
            this.process = spawn(this.config.binV2RayFile, [
                '--config', this.fileConfig
            ]);
            this.process.stdout.on('data', (chunk) => {
                this.onData(chunk);
                if (this._status !== V2RayStatus.Idle) {
                    return;
                }
                if (chunk.toString().indexOf('started') > -1) {
                    this._status = V2RayStatus.Started;
                    resolve(true);
                }
                if (chunk.toString().indexOf('failed') > -1) {
                    this._status = V2RayStatus.Error;
                    reject(new Error(`V2ray can't run with config file: ${this.fileConfig}`));
                }
            });
            this.process.stderr.on('error', this.onError.bind(this));
            this.process.on('close', this.onClose.bind(this));
        })
    }

    release() {
        if (this._status == V2RayStatus.Started) {
            this.process.kill();
            this._status = V2RayStatus.Closed;
            return true;
        }
        return false;
    }

    private onData(chunk: any) {
        this.logger.info('v2ray: ' + chunk.toString());
    }

    private onError(err: Error) {
        this.logger.info(err);
        this._status = V2RayStatus.Error;
    }

    private onClose(code: number) {
        this.logger.info('v2ray: close!');
        this._status = V2RayStatus.Closed;
    }
}