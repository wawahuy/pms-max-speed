import winston from "winston";
import path from "path";
import {configs} from "../config";
import {injectable} from "inversify";

export const log = winston.createLogger({
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp({
            format: 'DD-MM-YYYY HH:mm:ss'
        }),
        winston.format.colorize(),
        winston.format.printf(
            log => {
                if(log.stack) return `[${log.timestamp}] [${log.level}] ${log.stack}`;
                return  `[${log.timestamp}] [${log.level}] ${log.message}`;
            },
        ),
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            level: 'error',
            filename: path.join(configs.rootAppDir, 'data/errors.log')
        })
    ],
})

@injectable()
export class Logger {
    constructor() {
    }

    info(...data: any[]) {
        log.info(data.join(' '));
    }

    error(data: any) {
        log.error(data);
    }
}