import {Duplex, PassThrough, Readable} from "stream";
import * as Buffer from "buffer";


export class PmsConcatStream extends PassThrough {
    private readonly readableList: Readable[];
    private readableCurrent: Readable;
    private positionCurrent: number;

    constructor(...readableList: Readable[]) {
        super();
        this.positionCurrent = -1;
        this.readableList = readableList;
        this.nextReadable();
    }

    private nextReadable() {
        this.positionCurrent++;
        this.readableCurrent = this.readableList[this.positionCurrent];
        this.readableCurrent.pipe(this, { end: false });
        this.readableCurrent.once('error', (err) => this.destroy(err));
        this.readableCurrent.once('end', () => {
            if (this.positionCurrent === this.readableList.length - 1) {
                this.emit('end');
            } else {
                this.nextReadable();
            }
        })
    }
}

export class PmsFilterOffsetStream extends Duplex {
    private offsetCurrent = 0;

    constructor(private readonly options?: { start?: number; len?: number }) {
        super();
    }

    _read(size?: number) {}

    _write(chunk: Buffer, encoding: BufferEncoding, callback: () => void) {
        const sizeChunk = chunk.length;
        const offsetStart = this.options?.start || 0;

        let s = 0;
        let e;

        const offsetPrev = this.offsetCurrent;
        this.offsetCurrent += sizeChunk;
        if (offsetPrev <= offsetStart) {
            if (this.offsetCurrent >= offsetStart) {
                s = offsetStart - offsetPrev;
            }
        }

        if (this.options?.len) {
            const len = this.options?.len;
            const maxEnd = offsetStart + len -  1;
            if (this.offsetCurrent > maxEnd) {
                e = sizeChunk - (this.offsetCurrent - maxEnd) + 1;
            }
        }

        this.push(chunk.slice(s, e))
        callback();
    }

    _final() {
        this.push(null);
    }
}