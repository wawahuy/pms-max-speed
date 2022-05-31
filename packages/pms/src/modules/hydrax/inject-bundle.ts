import {CodeMatcherConfig, CodeMatcherItem, PmsInjectModule} from "@cores/module";
import {PPHttpRule} from "pms-proxy";

enum NameCodeMatcher {
    RmDebugger,
    RmEncryptEncoding,
    RmImportDecryptKeyModule,
    RmGetDecryptKey,
    RmChangeUrlWs,
    Test
}

export class PmsHydraxInjectBundleModule extends PmsInjectModule<NameCodeMatcher> {
    static rule() {
        const r = new PPHttpRule();
        r.url(/iamcdn\.net\/players\/bundle\.min\.js/gmi)
        return r;
    }

    protected getConfig(): CodeMatcherItem<CodeMatcherConfig, NameCodeMatcher> {
        return {
            /**
             * Remove debugger
             *
             */
            [NameCodeMatcher.RmDebugger]: {
                code: `debugger`,
                replace: 'cc'
            },

            /**
             * Encrypt function, Change Buffer.from with encoding "binary"
             *
             */
            [NameCodeMatcher.RmEncryptEncoding]: {
                code: `t[_a[7]](e,_a[5],_a[6])+t[_a[8]](_a[6])`,
                injectAfter: ',"binary"'
            },

            /**
             * Import module decrypt key to module ws
             *
             */
            // [NameCodeMatcher.RmImportDecryptKeyModule]: {
            //     code: `const n=r(1227)("SoTrym:socket"),`,
            //     injectAfter: 'yuhDecryptKey = __webpack_require__(2568),'
            // },

            /**
             * Get decrypt key
             *
             */
            [NameCodeMatcher.RmGetDecryptKey]: {
                code: `_[_a[2]]=(e,t=_a[1])=>{`,
                injectBefore: 'window.yuhGetDecryptKey = () => s(a);'
            },

            /**
             * Change url connect ws with key
             *
             */
            // [NameCodeMatcher.RmChangeUrlWs]: {
            //     code: `var f=new WebSocket(e.url,e.opts)`,
            //     replaceCallback: (source, match) => {
            //         const patternKey = /\["(?<key>[^\[]*)","","\\x66\\x72\\x6F\\x6D"/gmi;
            //         const execKey = patternKey.exec(source);
            //         let key;
            //         if (execKey?.groups) {
            //             key = execKey.groups['key'];
            //             key = key.replace(/\\x/g, '');
            //             key = Buffer.from(key, 'hex');
            //             key = key.toString();
            //         }
            //         if (!key) {
            //             return match;
            //         }
            //         return `var f=new WebSocket(e.url + "/?key=" + yuhDecryptKey("${key}"),e.opts)`;
            //     }
            // },
            [NameCodeMatcher.RmChangeUrlWs]: {
                code: `var f=new WebSocket(e.url,e.opts)`,
                replace: `var f=new WebSocket(e.url + "/?key=" + window.yuhGetDecryptKey(),e.opts)`
            },

            // [NameCodeMatcher.Test]: {
            //     code: `var t=_d[_a[4]](_a[3],s(a),o)`,
            //     injectAfter: ';console.log(a, s(a))'
            // }
        };
    }

}