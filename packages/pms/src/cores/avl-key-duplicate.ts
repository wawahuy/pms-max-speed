import AVLTree, {Node} from "avl";
import {NoValue} from "@cores/types";

export class AvlKeyDuplicate<Key, Value> extends AVLTree<Key, Value[]> {
    insert(key: Key, data?: Value[]): Node<Key, Value[]> {
        throw "not use method insert, use: 'add'"
    }

    add(key: Key, data?: Value): Node<Key, Value[]> {
        const node = this.find(key);
        if (node) {
            if (data) {
                node.data?.push(data);
            }
            return node;
        } else {
            const values: Value[] = [];
            if (data) {
                values.push(data);
            }
            return super.insert(key, values);
        }
    }

    removeValue(key: Key, value: Value): Node<Key, Value[]> | undefined {
        const node = this.find(key);
        if (node) {
            node.data = node.data?.filter(item => item != value);
            if (!node.data?.length) {
                return this.remove(key)
            }
            return node;
        }
    }

}
