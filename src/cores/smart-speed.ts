export class SmartSpeed {
    private timeCompute: number = new Date().getTime();
    private speeds: number[] = [];
    private _speed: number = 200 * 1024;

    readonly maxTimeCompute = 5000;

    get speed() {
        return this._speed;
    }

    constructor(
        private name: string
    ) {
    }

    /**
     *
     * @param size: bytes
     * @param time: ms
     */
    add(size: number, time: number) {
        // this.speeds.push(size/(time/1000));
        // console.log(size/(time/1000))
        // const t = new Date().getTime();
        // if (t - this.timeCompute > this.maxTimeCompute) {
        //     const totalSpeed = this.speeds.reduce((v, item) => {
        //         return v + item;
        //     }, 0);
        //     this._speed = totalSpeed / this.speeds.length;
        //     this._speed = Math.max(this._speed, 150 * 1024);
        //     console.log(this.name + ':', this._speed, 'bytes/s')
        //     this.timeCompute = t;
        // }
    }
}