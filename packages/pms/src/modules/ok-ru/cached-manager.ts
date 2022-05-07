import {PmsCachedManager} from "@cores/cached-manager";
import {PmsOkRuCached} from "@modules/ok-ru/cached";
import {KeyPair} from "@cores/types";
import Url from "url";
import {PmsServerRequest} from "pms-proxy/dist/server";

export class PmsOkRuCachedManager extends PmsCachedManager<PmsOkRuCached> {

    protected buildCachedNode(): PmsOkRuCached {
        return new PmsOkRuCached();
    }

    protected makeQueryKey(request: PmsServerRequest, url: Url.UrlWithParsedQuery): KeyPair<string> {
        const id = url.query['id'];
        const sig = url.query['sig'];
        const type = url.query['type'];
        const pr = url.query['pr'];
        const ct = url.query['ct'];
        const clientType = url.query['clientType'];
        return {
            id: String(id),
            sig: String(sig),
            type: String(type),
            ct: String(ct),
            pr: String(pr),
            clientType: String(clientType),
        };
    }

    protected isRenewCached(cached: PmsOkRuCached, request: PmsServerRequest, url: Url.UrlWithParsedQuery): boolean {
        // const queryCached = cached.getUrl().query;
        // const queryUrl = url.query;
        // return queryCached['sig'] != queryUrl['sig'] || queryCached['type'] != queryUrl['type'];
        return false;
    }
}