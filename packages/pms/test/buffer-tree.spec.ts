import {PmsBufferTree} from "../src/cores/buffer-tree";

describe('Buffer Tree Tests', () => {
    const bufferTree = new PmsBufferTree();
    const buffer = Buffer.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

    test('Get no data ranges 0 -> 10', () => {
        const range = { start: 0, end: 10 };
        expect(bufferTree.getNoDataRanges(range)).toEqual([
            { start: 0, end: 10 }
        ])
    })

    test('Insert offset: 2 -> 4', () => {
        const range = { start: 2, end: 4 };
        const data = buffer.slice(2, 5);
        expect(bufferTree.insertBuffer(range, data)).toBe(true)
    })

    test('Get offset: 2 -> 4', () => {
        const range = { start: 2, end: 4 };
        bufferTree.waitBuffer(range, (...args) => {
            expect(args).toEqual([buffer.slice(2, 5), range]);
        })
    })

    test('Get no data ranges 0 -> 3', () => {
        const range = { start: 0, end: 3 };
        expect(bufferTree.getNoDataRanges(range)).toEqual([
            { start: 0, end: 1 }
        ])
    })

    test('Get no data ranges 0 -> 10, has 2 -> 4', () => {
        const range = { start: 0, end: 10 };
        expect(bufferTree.getNoDataRanges(range)).toEqual([
            { start: 0, end: 1 },
            { start: 5, end: 10 }
        ])
    })

    test('Get offsets: 6 -> 7 with insert outside', async () => {
        // get
        const rangeGet = { start: 6, end: 7 };
        const promise = new Promise(resolve => {
            bufferTree.waitBuffer(rangeGet, (...args) => {
                resolve(args);
            })
        });

        // insert outside
        const rangeInsert = { start: 5, end: 9 };
        const data = buffer.slice(5, 10);
        expect(bufferTree.insertBuffer(rangeInsert, data)).toBe(true)

        // wait callback
        await expect(promise).resolves.toEqual([buffer.slice(rangeGet.start, rangeGet.end + 1), rangeGet]);
    })

    test('Get offset: 3 -> 8', () => {
        const range = { start: 3, end: 8 };
        bufferTree.waitBuffer(range, (...args) => {
            expect(args).toEqual([buffer.slice(3, 9), range]);
        })
    })

    test('test insert waiter 3 -> 7', async () => {
        const rangeGet = {start: 3, end: 7};
        bufferTree.removeBuffer(rangeGet);
        expect(bufferTree.has(rangeGet)).toBe(false);
        expect(bufferTree.getNoDataRanges({ start: 0, end: 9 })).toEqual([
            { start: 0, end: 1},
            { start: 3, end: 7}
        ])
    })


        // test('test insert waiter 3 -> 7', async () => {
    //     const rangeGet = { start: 3, end: 7 };
    //     bufferTree.removeBuffer(rangeGet);
    //     expect(bufferTree.has(rangeGet)).toBe(false);
    //
    //     const request = PmsCached.network('https://google.com', {});
    //     bufferTree.insertWaiter(rangeGet, request);
    //     expect(bufferTree.has(rangeGet)).toBe(false);
    //     expect(bufferTree.has(rangeGet, true)).toBe(true);
    //
    //     await request.waiter;
    //     expect(bufferTree.has(rangeGet)).toBe(true);
    // })

})
