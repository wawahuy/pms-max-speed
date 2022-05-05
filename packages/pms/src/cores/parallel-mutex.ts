import {EventEmitter} from "events";

export declare interface PmsParallelMutex {
    on(event: 'free', listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class PmsParallelMutex extends EventEmitter {
    private resolves: (() => void)[] = [];
    private parallelCurrent: number = 0;

    constructor(
        private parallel: number = 1
    ) {
        super();
    }

    acquire() {
        if (this.parallelCurrent >= this.parallel) {
            return new Promise<void>(resolve => {
                this.resolves.push(resolve);
            })
        } else {
            this.parallelCurrent++;
        }
    }

    release() {
        const resolve = this.resolves.shift();
        if (resolve) {
            resolve();
        } else {
            this.parallelCurrent--;
        }

        if (!this.parallelCurrent) {
            this.emit('free');
        }
    }
}