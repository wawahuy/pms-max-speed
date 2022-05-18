import {AvlKeyDuplicate} from "@cores/avl-key-duplicate";
import AVLTree, {Node} from "avl";
import {PmsBufferCallback, PmsBufferNode, PmsBufferRange} from "@cores/types";
import {Readable} from "stream";
import {PmsFilterOffsetStream, PmsConcatStream} from "@cores/custom-stream";

export class PmsBufferTree {
    private avlGetCallback: AvlKeyDuplicate<string, PmsBufferCallback>;
    private avlOffsetBuffer: AVLTree<number, PmsBufferNode>

    constructor() {
        this.avlGetCallback = new AvlKeyDuplicate<string, PmsBufferCallback>(undefined, true);
        this.avlOffsetBuffer = new AVLTree<number, PmsBufferNode>(undefined, true);
    }

    maxOffset() {
        return this.avlOffsetBuffer.max();
    }

    insertStream(range: PmsBufferRange, stream: Readable) {
        const node: PmsBufferNode = { ...range, stream };
        return this.insertOrReplaceNode(node);
    }

    insertBuffer(range: PmsBufferRange, buffer: Buffer) {
        const stream = Readable.from(buffer);
        const node: PmsBufferNode = { ...range, stream };
        return this.insertOrReplaceNode(node);
    }

    remove(range: PmsBufferRange) {
        const nodes = this.getNodeNecessary(range);
        nodes.forEach(node => {
            this.avlOffsetBuffer.remove(node.start);
            this.avlOffsetBuffer.remove(node.end);
        })
    }

    private insertOrReplaceNode(node: PmsBufferNode) {
        if (node.start >= node.end) {
            throw "hmm... " + node.start + ' -> ' + node.end;
        }

        const nodesExists = this.nodeInRange(node as PmsBufferRange);
        if (nodesExists?.length) {
            this.remove({ start: node.start, end: node.end });
            this.insertOrReplaceNode(node);
        } else {
            this.avlOffsetBuffer.insert(node.start, node);
            this.avlOffsetBuffer.insert(node.end, node);
        }
        this.handleGetCallback();
        return true;
    }

    wait(range: PmsBufferRange, callback: PmsBufferCallback) {
        const key = range.start + '_' + range.end;
        const stream = this.get(range);
        if (stream) {
            callback(stream, {...range});
            return;
        }

        this.avlGetCallback.add(key, callback);
    }

    getNoDataRanges(range: PmsBufferRange) {
        const ranges: PmsBufferRange[] = [];
        let nodes = this.nodeInRange(range);
        let offsetCurrent: number = range.start;
        let iNode = 0;
        while (iNode < nodes.length) {
            const node = nodes[iNode++];
            if (!node.data) {
                continue;
            }

            // if offset is between node
            const { start, end } = node.data
            if (offsetCurrent >= start && offsetCurrent <= end) {
                offsetCurrent = end + 1;
                continue;
            }

            // if node is common buffer - two node nested point to buffer
            if (end === offsetCurrent - 1) {
                continue;
            }

            // pass all test
            ranges.push({
                start: offsetCurrent,
                end: start - 1
            })

            offsetCurrent = end + 1;
        }

        if (offsetCurrent < range.end) {
            ranges.push({
                start: offsetCurrent,
                end: range.end
            })
        }

        return ranges;
    }

    has(range: PmsBufferRange, nodes?: PmsBufferNode[]): boolean {
        if (!nodes) {
            nodes = this.getNodeNecessary(range);
        }
        if (
            !nodes.length ||
            nodes[0].start > range.start ||
            nodes[nodes.length -1].end < range.end ||
            this.isDataBroken(nodes)
        ) {
            return false;
        }
        return true;
    }

    get(range: PmsBufferRange): Readable | null {
        const nodes = this.getNodeNecessary(range);
        if (!this.has(range, nodes)) {
            return null;
        }
        const streams = nodes.reduce<Readable[]>((list, bufferNode) => {
            if (bufferNode.stream) {
                list.push(bufferNode.stream);
            }
            return list;
        }, []);

        const concatStream = new PmsConcatStream(...streams);
        const start = range.start - nodes[0].start;
        const len = range.end - range.start;
        const result = concatStream.pipe(new PmsFilterOffsetStream({ start, len }));
        return result;
    }

    debug() {
        return this.avlOffsetBuffer.toString();
    }

    private isDataBroken(bufferNodes: PmsBufferNode[]) {
        let nodePrev: PmsBufferNode;
        return !bufferNodes.every(item => {
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
            const stream = this.get({ start, end });

            if (stream) {
                this.remove({start, end})
                if (node.key) {
                    removeKeys.push(node.key);
                }
                node.data?.forEach(callback => {
                    callback(stream, { start, end });
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
            const prev = this.avlOffsetBuffer.nodeBeforeKey(range.start);
            if (!prev) {
                return []
            }

            const next = this.avlOffsetBuffer.nodeAfterKey(range.end);
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
