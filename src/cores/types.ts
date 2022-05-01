import requestLib from "request";

export interface PmsResponse { response: requestLib.Response, err: any };

export interface PmsWaiterResponse { waiter: Promise<PmsResponse>, request: requestLib.Request }

export interface KeyPair<T> { [key: string]: T }

export type NoValue = null | undefined;

export interface PmsBufferRange {
    start: number;
    end: number;
}

export type PmsBufferNode = PmsBufferRange & {
    buffer: Buffer
}

export type PmsBufferCallback = (buffer: Buffer, range: PmsBufferRange) => void;
