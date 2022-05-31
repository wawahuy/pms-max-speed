import {CodeMatcherConfig, CodeMatcherItem, PmsInjectModule, PmsModule} from "@cores/module";
import {PPHttpRule} from "pms-proxy";

enum NameCodeMatcher {
    RmDevtoolsDetect1,
    RmDevtoolsDetect2,
    RmDebugger,
}

export class PmsHydraxInjectHydraxModule extends PmsInjectModule<NameCodeMatcher> {
    static rule() {
        const r = new PPHttpRule();
        r.url(/iamcdn\.net\/players\/playhydrax\.min\.js/gmi)
        return r;
    }

    protected getConfig(): CodeMatcherItem<CodeMatcherConfig, NameCodeMatcher> {
        return {
            /**
             * Remove devtool detector
             *
             */
            [NameCodeMatcher.RmDevtoolsDetect1]: {
                code: `function removeJwp(){`,
                injectAfter: 'return;'
            },
            [NameCodeMatcher.RmDevtoolsDetect2]: {
                code: `devtoolsDetector[_0x2b36[11]]()`,
                replace: 'false'
            },

            /**
             * Remove debugger
             *
             */
            [NameCodeMatcher.RmDebugger]: {
                code: `debugger`,
                replace: 'cc'
            },
        };
    }


}