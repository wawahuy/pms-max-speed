import * as Buffer from "buffer";


export abstract class PmsCached {
    abstract getBuffer(start: number, end: number): Buffer | undefined;
}