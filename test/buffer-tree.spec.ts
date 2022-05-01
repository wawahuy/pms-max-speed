import {PmsBufferTree} from "../src/cores/buffer-tree";

describe('Buffer Tree Tests', () => {
    const bufferTree = new PmsBufferTree();
    const buffer = Buffer.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

    test('Insert offset: 2 -> 4', () => {
        const range = { start: 2, end: 4 };
        const data = buffer.slice(2, 5);
        expect(bufferTree.insert(range, data)).toBe(true)
    })

    test('Get offset: 2 -> 4', () => {
        const range = { start: 2, end: 4 };
        bufferTree.get(range, (...args) => {
            expect(args).toEqual([buffer.slice(2, 5), range]);
        })
    })

    test('Get offsets: 6 -> 7 with insert outside', async () => {
        // get
        const rangeGet = { start: 6, end: 7 };
        const promise = new Promise(resolve => {
            bufferTree.get(rangeGet, (...args) => {
                resolve(args);
            })
        });

        // insert outside
        const rangeInsert = { start: 5, end: 9 };
        const data = buffer.slice(5, 10);
        expect(bufferTree.insert(rangeInsert, data)).toBe(true)

        // waiting
        await expect(promise).resolves.toEqual([buffer.slice(rangeGet.start, rangeGet.end + 1), rangeGet]);
    })


    test('Get offset: 3 -> 8', () => {
        const range = { start: 3, end: 8 };
        bufferTree.get(range, (...args) => {
            expect(args).toEqual([buffer.slice(3, 9), range]);
        })
    })
})
