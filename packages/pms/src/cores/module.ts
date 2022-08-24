import {
    PPCallbackHttpHandler, PPCallbackWsHandler,
    PPHttpRule,
    PPPassThroughHttpHandler,
    PPServerRequest,
    PPServerResponse, PPWebsocket
} from "pms-proxy";
import {IPmsCodeMatcher, PmsCodeMatcher, PmsCodeMatcherOption} from "@cores/code-matcher";
import {log} from "@cores/logger";
import {AtLeastOne, PromiseNoError} from "@cores/types";

/**
 * --------------------------------------------
 * Pms Module
 * - support handle http connection
 *
 * --------------------------------------------
 */
export abstract class PmsModule {
    private static id: number = 0;

    protected id = PmsModule.id++;

    constructor(
        protected request: PPServerRequest,
        protected response: PPServerResponse
    ) {
        this.initBefore();
        this.init();
    }

    static rule: () => PPHttpRule;
    static create<T extends PmsModule>(clazz: new (...args: any[]) => T, ...args: any[]): PPCallbackHttpHandler {
        return (req, res) => {
            new clazz(req, res);
        }
    }

    public abstract init(): void;

    protected initBefore() {
    };
}


/***
 * --------------------------------------------
 * Pms Base Inject Module
 * - support inject code on body
 *
 * --------------------------------------------
 */
// @ts-ignore
export type CodeMatcherItem<T, V> = Partial<{ [key in V]: T }>

export type CodeMatcherConfig = { code: string } & AtLeastOne<
    { [key in keyof IPmsCodeMatcher]: string } &
    {
        replaceCallback: (source: string, match: string) => string
    }
    >;

export abstract class PmsInjectModule<E> extends PmsModule {
    private codeMatcher: CodeMatcherItem<PmsCodeMatcher, E>;
    private codeConfig: CodeMatcherItem<CodeMatcherConfig, E>;

    protected abstract getConfig(): CodeMatcherItem<CodeMatcherConfig, E>;

    protected initBefore() {
        this.codeConfig = this.getConfig();
        this.buildCodeMatcher();
    }

    init(): void {
        const handler = new PPPassThroughHttpHandler(true, true);
        handler.injectBuffer((request, buffer) => {
            return {
                data: this.editSource(buffer.toString())
            }
        })
        PromiseNoError(handler.handle(this.request, this.response));
    }

    buildCodeMatcher() {
        this.codeMatcher = {};
        const option: PmsCodeMatcherOption = { trim: true };
        const keys = Object.keys(this.codeConfig) as unknown[] as E[];
        keys.forEach(key => {
            const c = this.codeConfig[key];
            if (c) {
                this.codeMatcher[key] = new PmsCodeMatcher(c.code, option);
            }
        })
    }

    private editSource(source: string) {
        const keys = Object.keys(this.codeConfig) as unknown[] as E[];
        keys.forEach(key => {
            const matcher = this.codeMatcher[key];
            const config = this.codeConfig[key];
            if (!matcher || !config) {
                log.error('Matcher or config undefined');
                return;
            }
            if (config.replace) {
                source = matcher.replace(source, config.replace);
            } else if (config.injectAfter) {
                source = matcher.injectAfter(source, config.injectAfter);
            } else if (config.injectBefore) {
                source = matcher.injectBefore(source, config.injectBefore);
            } else if (config.replaceCallback) {
                // @ts-ignore
                source = matcher.replaceCallback(source, match => config.replaceCallback(source, match))
            } else {
                log.error('Matcher no support config');
            }
        })
        return source;
    }
}


/**
 * ---------------------------------------------
 * Pms Websocket Module
 * - Support Websocket module
 *
 * ---------------------------------------------
 */
export abstract class PmsWsModule {
    private static id: number = 0;

    protected id = PmsWsModule.id++;

    protected constructor(
        protected request: PPServerRequest,
        protected ws: PPWebsocket
    ) {
        this.initBefore();
        this.init();
    }

    static rule: () => PPHttpRule;
    static create<T extends PmsWsModule>(clazz: new (...args: any[]) => T, ...args: any[]): PPCallbackWsHandler {
        return (req, ws) => {
            new clazz(req, ws);
        }
    }

    public abstract init(): void;

    protected initBefore() {
    };
}

