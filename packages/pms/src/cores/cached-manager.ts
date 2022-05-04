import {KeyPair} from "@cores/types";
import {PmsCached} from "@cores/cached";
import AVLTree from "avl";
import {CompletedRequest} from "mockttp";
import Url from "url";
import {log} from "@cores/logger";

export abstract class PmsCachedManager<T extends PmsCached> {
    private cachedTree: AVLTree<string, T>;

    constructor() {
        this.cachedTree = new AVLTree<string, T>();
    }

    protected abstract isRenewCached(cached: T, request: CompletedRequest, url: Url.UrlWithParsedQuery): boolean;
    protected abstract buildCachedNode(): T;
    protected abstract makeQueryKey(request: CompletedRequest, url: Url.UrlWithParsedQuery): KeyPair<string>;

    getCached(request: CompletedRequest): T | undefined {
        const url = Url.parse(request.url, true);
        const key = this.buildKey(this.makeQueryKey(request, url));
        if (!key){
            log.error(`${request.url} not query keys`);
            return ;
        }

        let node = this.cachedTree.find(key);
        let insertNode = false;
        if (!node) {
            insertNode = true;
        } else {
            if (node.data) {
                if (this.isRenewCached(node.data, request, url)) {
                    node.data.release();
                    this.cachedTree.remove(key);
                    insertNode = true;
                }
            } else {
                log.error(`${request.url} node data is null`);
                return;
            }
        }

        if (insertNode) {
            node = this.cachedTree.insert(key, this.buildCachedNode());
        }

        if (node?.data) {
            node.data.setRequest(request);
            return node.data;
        }
    }

    buildKey(query: KeyPair<string>) {
        return Object.keys(query).sort()
            .map(key => `${key}=${query[key]}`)
            .join('&')
    }

    getKeys() {
        return this.cachedTree.keys();
    }

    getCachedByKey(key: string) {
        return this.cachedTree.find(key)?.data;
    }
}