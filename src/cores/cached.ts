import * as Buffer from "buffer";


export abstract class Cached {
    abstract getBuffer(start: number, end: number): Buffer;
}