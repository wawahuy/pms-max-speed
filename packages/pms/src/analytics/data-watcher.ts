import {BehaviorSubject, Observable, Subject} from "rxjs";


export class PmsDataWatcher<T> {
    private dataSubject: BehaviorSubject<T>;
    private data$: Observable<T>;
    private dataSnapshots: T;
    private dataChange: Partial<T>;
    private sending: boolean;

    private changeSubject = new Subject<Partial<T>>();
    readonly change$: Observable<Partial<T>> = this.changeSubject.asObservable();

    get value() {
        return this.dataSubject.value;
    }

    constructor(time: number, initData: T) {
        this.dataSubject = new BehaviorSubject<T>(initData);
        this.data$ = this.dataSubject.asObservable();
        this.snapshots();
        this.data$.subscribe(value => {
            if (!value) {
                return;
            }
            const keys = Object.keys(value) as Array<keyof T>;
            this.dataChange = keys.reduce((result, k) => {
                if (this.dataSnapshots[k] !== value[k]) {
                    result[k] = value[k];
                }
                return result;
            }, this.dataChange || {});
            this.snapshots(value);

            if (!this.sending) {
                this.sending = true;
                setTimeout(() => {
                    this.changeSubject.next(this.dataChange);
                    this.sending = false;
                    this.dataChange = {};
                }, time)
            }
        })
    }

    private snapshots(value?: T) {
        this.dataSnapshots = value ? {...value} : {...this.dataSubject.value};
    }

    change(change: Partial<T>) {
        this.dataSubject.next({
            ...this.value,
            ...change
        })
    }

}