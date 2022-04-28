import requestLib from "request";

export interface PmsResponse { response: requestLib.Response, err: any };

export interface PmsWaiterResponse { waiter: Promise<PmsResponse>, request: requestLib.Request }

export interface KeyPair<T> { [key: string]: T }