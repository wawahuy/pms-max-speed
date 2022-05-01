import {AvlKeyDuplicate} from "@cores/avl-key-duplicate";
import AVLTree, {Node} from "avl";
import {PmsBufferCallback, PmsBufferNode, PmsBufferRange} from "@cores/types";

export class PmsBufferTree {
    private avlGetCallback: AvlKeyDuplicate<string, PmsBufferCallback>;
    private avlOffsetBuffer: AVLTree<number, PmsBufferNode>

    constructor() {
        this.avlGetCallback = new AvlKeyDuplicate<string, PmsBufferCallback>()
        this.avlOffsetBuffer = new AVLTree<number, PmsBufferNode>()
    }

    insert(range: PmsBufferRange, buffer: Buffer) {
        const nodesExists = this.nodeInRange(range);
        if (nodesExists?.length) {
            // 'false' because replace data
            return false;
        }

        const data: PmsBufferNode = {
            ...range,
            buffer
        }

        this.avlOffsetBuffer.insert(range.start, data);
        this.avlOffsetBuffer.insert(range.end, data);
        this.handleGetCallback();
        return true;
    }

    get(range: PmsBufferRange, callback: PmsBufferCallback) {
        const key = range.start + '_' + range.end;
        const buffer = this.getBufferCurrent(range);
        if (buffer) {
            callback(buffer, {...range});
            return;
        }

        this.avlGetCallback.add(key, callback);
    }

    private getBufferCurrent(range: PmsBufferRange): Buffer | null {
        const nodes = this.getNodeNecessary(range);
        if (
            !nodes.length ||
            nodes[0].start > range.start ||
            nodes[nodes.length -1].end < range.end ||
            this.isDataNotBroken(nodes)
        ) {
            return null;
        }
        const buffer = Buffer.concat(nodes.map(bufferNode => bufferNode.buffer));
        const start = range.start - nodes[0].start;
        const end = start + (range.end - range.start) + 1;
        return buffer.slice(start, end);
    }

    private isDataNotBroken(bufferNodes: PmsBufferNode[]) {
        let nodePrev: PmsBufferNode;
        return !bufferNodes.some(item => {
            const status = !nodePrev || (item.start === nodePrev.end + 1);
            nodePrev = item;
            return status;
        });
    }

    private handleGetCallback() {
        const removeKeys: string[] = [];
        this.avlGetCallback.forEach(node => {
            const range = node.key?.split("_");
            if (!range?.length) {
                return;
            }

            const start = Number(range[0]);
            const end = Number(range[1]);
            const buffer = this.getBufferCurrent({ start, end });
            if (buffer) {
                if (node.key) {
                    removeKeys.push(node.key);
                }
                node.data?.forEach(callback => {
                    callback(buffer, { start, end });
                })
            }
        })

        removeKeys.forEach(key => {
            this.avlGetCallback.remove(key);
        })
    }

    protected nodeInRange(range: PmsBufferRange) {
        const segments: Node<number, PmsBufferNode>[] = [];
        this.avlOffsetBuffer.range(range.start, range.end, (node) => {
            if (node.data) {
                segments.push(node);
            }
        })
        return segments;
    }

    protected getNodeNecessary(range: PmsBufferRange) {
        let centerNodes = this.nodeInRange(range);
        if (!centerNodes.length) {
            const prevList = this.nodeInRange({ start: this.avlOffsetBuffer.min() || 0, end: range.end });
            const prev = prevList?.[prevList?.length - 1];
            if (!prev) {
                return []
            }

            const nextList = this.nodeInRange({ end: this.avlOffsetBuffer.max() || 0, start: range.start });
            const next = nextList?.[0];
            if (!next) {
                return []
            }

            if (prev.data?.start === next.data?.start && prev.data?.end === next.data?.end) {
                centerNodes = [prev];
            }
        }

        const necessaryNodes = centerNodes.reduce<PmsBufferNode[]>((list, node, index) => {
            const key = node.key;
            const data = node.data;
            const listNext: PmsBufferNode[] = [];
            if (!data) {
                throw 'what? why null getNodeNecessary';
            }

            let isInsert = data.start === key;
            if (data.end === key) {
                if (index === 0) {
                    const nodePrev = this.avlOffsetBuffer.prev(node);
                    if (nodePrev?.data) {
                        listNext.push(nodePrev.data);
                    }
                }
            }
            if (isInsert) {
                listNext.push(data);
            }
            return list.concat(listNext);
        }, []);
        return necessaryNodes;
    }
}
