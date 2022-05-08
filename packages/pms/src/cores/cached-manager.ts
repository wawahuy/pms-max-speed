import {KeyPair} from "@cores/types";
import {PmsCached} from "@cores/cached";
import AVLTree from "avl";
import Url from "url";
import {log} from "@cores/logger";
import {PmsRequest} from "@cores/request";
import {PPServerRequest} from "pms-proxy";

export abstract class PmsCachedManager<T extends PmsCached> {
    private cachedTree: AVLTree<string, T>;
    private cachedLasted: PmsCached;
    private cachedLastedTimeout: NodeJS.Timeout | null;

    constructor() {
        this.cachedTree = new AVLTree<string, T>();
        PmsRequest.mutex.on('free', () => {
            this.cachedLastedTimeout = setTimeout(() => {
                this.cachedLasted?.loadFeature();
            }, 500);
        })
    }

    protected abstract isRenewCached(cached: T, request: PPServerRequest, url: Url.UrlWithParsedQuery): boolean;
    protected abstract buildCachedNode(): T;
    protected abstract makeQueryKey(request: PPServerRequest, url: Url.UrlWithParsedQuery): KeyPair<string>;

    getCached(request: PPServerRequest): T | undefined {
        if (this.cachedLastedTimeout) {
            clearTimeout(this.cachedLastedTimeout);
            this.cachedLastedTimeout = null;
        }

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

            /**
             * TMP Load feature
             *
             */
            if (this.cachedLasted) {
                this.cachedLasted.cancelFeature();
            }
            this.cachedLasted = node.data;

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