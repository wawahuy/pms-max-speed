
export class PmsParallelMutex {
    private resolves: (() => void)[] = [];
    private parallelCurrent: number = 0;

    constructor(
        private parallel: number = 1
    ) {
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
    }
}