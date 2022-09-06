import {injectable} from "inversify";
import * as path from "path";
import {glob} from "glob";

@injectable()
export class Config {
    public readonly proxyPort = 1234;
    public readonly cacheMaxSize = 1024 * 1024 * 1024;
    public readonly nameCertKey = 'rootCA.key';
    public readonly nameCertPem = 'rootCA.pem';

    get isProduction() {
        return this.get('NODE_ENV') === 'production';
    }

    get rooDirectory() {
        return this.isProduction ? process.cwd() : path.join(__dirname, '..');
    }

    get dataDirectory() {
        return path.join(this.rooDirectory, 'data');
    }

    get dataV2RayDirectory() {
        return path.join(this.dataDirectory, 'v2ray-configs');
    }

    get dataV2RayConfigFiles() {
        return new Promise<string[]>((resolve, reject) => {
            const dir = path.join(this.dataV2RayDirectory, '*.json').replace(/\\/g, '/');
            glob(dir, {}, function (er, files) {
                if(er) {
                    reject(er);
                    return;
                }
                resolve(files);
            })
        })
    }

    get dataCertDirectory() {
        return path.join(this.dataDirectory, 'certs');
    }

    get binDirectory() {
        return path.join(this.rooDirectory, 'bin');
    }

    get binV2RayFile() {
        return path.join(this.binDirectory, 'v2ray/v2ray.exe')
    }

    get(name: string) {
        return process.env[name];
    }
}