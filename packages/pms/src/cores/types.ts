import {Readable} from "stream";

export interface KeyPair<T> { [key: string]: T }

export type NoValue = null | undefined;

export interface PmsBufferRange {
    start: number;
    end: number;
}

export type PmsBufferNode = PmsBufferRange & {
    stream: Readable
}

export type PmsBufferCallback = (stream: Readable, range: PmsBufferRange) => void;

export const PromiseNoError = (p: Promise<any>): void => {
    p.then(() => {}).catch(() => {});
}

export type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];