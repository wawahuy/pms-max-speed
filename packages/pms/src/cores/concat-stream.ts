import {PassThrough, Readable} from "stream";


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