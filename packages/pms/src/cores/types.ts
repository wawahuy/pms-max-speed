import {PmsRequest} from "@cores/request";

export interface KeyPair<T> { [key: string]: T }

export type NoValue = null | undefined;

export interface PmsBufferRange {
    start: number;
    end: number;
}

export type PmsBufferNode = PmsBufferRange & {
    buffer?: Buffer,
    waiter?: PmsRequest
}

export type PmsBufferCallback = (buffer: Buffer, range: PmsBufferRange) => void;

export const PromiseNoError = (p: Promise<any>): void => {
    p.then(() => {}).catch(() => {});
}