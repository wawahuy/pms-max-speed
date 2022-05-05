import {AvlKeyDuplicate} from "@cores/avl-key-duplicate";
import AVLTree, {Node} from "avl";
import {PmsBufferCallback, PmsBufferNode, PmsBufferRange} from "@cores/types";
import {PmsRequest} from "@cores/request";
import {timer} from "@cores/helpers";

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

    insertWaiter(range: PmsBufferRange, waiter: PmsRequest) {
        const node: PmsBufferNode = { ...range, waiter };
        waiter.response$.subscribe(response => {
            if (!response) return;
            response.buffer()
                .then(buffer => {
                    this.insertBuffer(range, buffer);
                })
                .catch(() => {
                    this.removeBuffer(range);
                })
        })
        return this.insertOrReplaceNode(node);
    }

    insertBuffer(range: PmsBufferRange, buffer: Buffer) {
        // console.log('insert', range);
        const node: PmsBufferNode = { ...range, buffer };
        return this.insertOrReplaceNode(node);
    }

    removeBuffer(range: PmsBufferRange) {
        // console.log('remove', range);
        const prev = this.avlOffsetBuffer.nodeBeforeKey(range.start);
        if (prev?.data) {
            const dataPrev = prev.data;
            if (dataPrev.end >= range.start) {
                this.avlOffsetBuffer.remove(dataPrev.end);
                dataPrev.end = range.start - 1;
                this.avlOffsetBuffer.insert(dataPrev.end, dataPrev);
            }
        }

        const next = this.avlOffsetBuffer.nodeAfterKey(range.end);
        if (next?.data) {
            const dataNext = next.data;
            if (dataNext.start <= range.end) {
                this.avlOffsetBuffer.remove(dataNext.start);
                dataNext.start = range.end + 1;
                this.avlOffsetBuffer.insert(dataNext.start, dataNext);
            }
        }

        const nodesInRange = this.nodeInRange(range);
        nodesInRange.forEach(node => {
            this.avlOffsetBuffer.remove(node.key || 0)
        })
    }

    private insertOrReplaceNode(node: PmsBufferNode) {
        if (node.start >= node.end) {
            // throw  this.debug();
            throw "hmm... " + node.start + ' -> ' + node.end;
        }

        const nodesExists = this.nodeInRange(node as PmsBufferRange);
        // console.log(nodesExists.map(n => [n.data?.start, n.data?.end]));
        if (nodesExists?.length) {
            this.removeBuffer({ start: node.start, end: node.end });
            this.insertOrReplaceNode(node);
        } else {
            this.avlOffsetBuffer.insert(node.start, node);
            this.avlOffsetBuffer.insert(node.end, node);
        }
        this.handleGetCallback();
        return true;
    }

    waitBuffer(range: PmsBufferRange, callback: PmsBufferCallback) {
        const key = range.start + '_' + range.end;
        const buffer = this.get(range);
        if (buffer) {
            callback(buffer, {...range});
            return;
        }

        this.avlGetCallback.add(key, callback);
    }

    getNoDataRanges(range: PmsBufferRange, isWaiterNotData?: boolean) {
        const ranges: PmsBufferRange[] = [];
        let nodes = this.nodeInRange(range);
        if (isWaiterNotData) {
            nodes = nodes.filter(node => !node.data?.waiter);
        }

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

    has(range: PmsBufferRange, includeWaiter?: boolean, nodes?: PmsBufferNode[]): boolean {
        if (!nodes) {
            nodes = this.getNodeNecessary(range);
        }
        if (!includeWaiter) {
            nodes = nodes.filter(node => !node.waiter);
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

    get(range: PmsBufferRange): Buffer | null {
        const nodes = this.getNodeNecessary(range);
        if (!this.has(range, false, nodes)) {
            return null;
        }
        const buffers = nodes.reduce<Buffer[]>((list, bufferNode) => {
            if (bufferNode.buffer) {
                list.push(bufferNode.buffer);
            }
            return list;
        }, []);
        const t = timer('buffer concat');
        const buffer = Buffer.concat(buffers);
        const start = range.start - nodes[0].start;
        const end = start + (range.end - range.start) + 1;
        const result = buffer.slice(start, end);
        t();
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
            const buffer = this.get({ start, end });
            if (buffer) {
                if (node.key) {
                    removeKeys.push(node.key);
                }
                node.data?.forEach(callback => {
                    callback(buffer, { start, end });
                })

                /**
                 * need add ttl or maxSizeBuffer
                 * tmp delete buffer
                 */
                this.removeBuffer({start, end})
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
