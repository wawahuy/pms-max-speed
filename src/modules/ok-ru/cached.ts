import {PmsCached} from "@cores/cached";
import {KeyPair} from "@cores/types";

export class PmsOkRuCached extends PmsCached  {

    constructor(
        private keys: KeyPair<string>
    ) {
        super();
    }

    getBuffer(start: number, end: number): Buffer | undefined {
        return undefined;
    }
}