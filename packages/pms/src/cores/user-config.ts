import * as path from "path";
import {configs} from "../config";
import * as fs from "fs";
import {log} from "@cores/logger";

export interface UserConfigData {

}

export class UserConfig {
    public readonly pathFile = path.join(configs.rootAppDir, 'config.json');
    private data: UserConfigData = {};

    constructor() {
        this.load();
    }

    private load() {
        const content = fs.readFileSync(this.pathFile).toString();
        try {
            this.data = JSON.parse(content);
        } catch (e) {
            log.error(e);
        }
    }
}