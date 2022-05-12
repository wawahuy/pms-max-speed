import {PmsCachedManager} from "@cores/cached-manager";
import {KeyPair} from "@cores/types";
import Url from "url";
import {PPServerRequest} from "pms-proxy";
import {PmsMotChillCached} from "@modules/motchill/cached";

export class PmsMotChillCachedManager extends PmsCachedManager<PmsMotChillCached> {

    protected buildCachedNode(): PmsMotChillCached {
        return new PmsMotChillCached();
    }

    protected makeQueryKey(request: PPServerRequest, url: Url.UrlWithParsedQuery): KeyPair<string> {
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

    protected isRenewCached(cached: PmsMotChillCached, request: PPServerRequest, url: Url.UrlWithParsedQuery): boolean {
        // const queryCached = cached.getUrl().query;
        // const queryUrl = url.query;
        // return queryCached['sig'] != queryUrl['sig'] || queryCached['type'] != queryUrl['type'];
        return false;
    }
}