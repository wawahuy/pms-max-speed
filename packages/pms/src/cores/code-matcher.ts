
export interface PmsCodeMatcherOption {
    trim?: boolean
}

export interface IPmsCodeMatcher {
    test(source: string): void;
    replace(source: string, replaceSource: string): string;
    injectAfter(source: string, injectSource: string): string;
    injectBefore(source: string, injectSource: string): string;
}

export class PmsCodeMatcher implements IPmsCodeMatcher {
    private regexp: RegExp;

    constructor(
        private code: string,
        private options?: PmsCodeMatcherOption
    ) {
        this.buildRegexp();
    }

    private buildRegexp() {
        let code = this.code;
        let rs: string[] = [];

        if (this.options?.trim) {
            code = code.trim();
        }

        // support regexp
        const pR = /;reg_([^;reg_]*)_reg;/gmi;
        const tmpR = ';reg_YUH_reg;';
        code = code.replace(pR, (reg, index, source) => {
            rs.push(reg)
            return tmpR;
        })

        // insert \ to symbol
        const symbols = "\\()[].*+/?<>{}^$|-:".split("");
        symbols.forEach(s => {
            code = code.replace(new RegExp(`\\${s}`, 'g'), `\\${s}`);
        })

        // reverse regexp
        code = code.replace(tmpR, (match) => {
            const r = rs.shift();
            if (!r) {
                throw 'Error reverse' + match;
            }
            return r;
        })

        // build
        this.regexp = new RegExp(code, 'gmi');
    }

    replaceCallback(source: string, callback: (match: string) => string) {
        return source.replace(this.regexp, (match) => {
            return callback(match || "");
        });
    }

    test(source: string): boolean {
        return this.regexp.test(source);
    }

    replace(source: string, replaceSource: string): string {
        return source.replace(this.regexp, replaceSource);
    }

    injectAfter(source: string, injectSource: string): string {
        return source.replace(this.regexp, (str) => {
            return str + injectSource
        });
    }

    injectBefore(source: string, injectSource: string): string {
        return source.replace(this.regexp, (str) => {
            return injectSource + str
        });
    }
}