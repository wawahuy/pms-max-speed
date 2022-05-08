import React from "react";
import styles from "./styles.scss";
import {useWsContext, WsStatus} from "../../ws-context";

export const StatusBar = () => {
    const {status, statusBar} = useWsContext();

    if (status !== WsStatus.open) {
        return (
            <div className={styles.statusBar}>
                <div className={styles.containerBadge}>
                    <div className={styles.badge}>
                        {status === WsStatus.connecting ? 'PMS connecting...' : 'PMS Closed' }
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.statusBar}>
            <div className={styles.containerBadge}>
                <div className={styles.badge}>
                    <div className={styles.title}>request:</div>
                    <div className={styles.description}>{statusBar.requestCurrent}/{statusBar.requestQueue}</div>
                </div>
                <div className={styles.badge}>
                    <div className={styles.title}>bw:</div>
                    <div className={styles.description}>{(statusBar.bandwidth/1024/1024).toFixed(1)}Mb</div>
                </div>
                <div className={styles.badge}>
                    <div className={styles.title}>speed:</div>
                    <div className={styles.description}>{(statusBar.speed/1024).toFixed(1)}Kb/s</div>
                </div>
            </div>
        </div>
    )
}