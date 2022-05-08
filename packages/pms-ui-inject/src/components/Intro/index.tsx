import React, {useEffect, useState} from "react";
import styles from "./styles.scss";

export const Intro = () => {
    const [show, setShow] = useState<boolean>(true);
    useEffect(() => {
        const s = setTimeout(() => {
            setShow(false);
        }, 1700)
        return () => {
            clearTimeout(s);
        }
    })

    if (!show) {
        return  <></>
    }

    return (
        <section className={styles.container}>
            <div className={styles.cdIntro}>
                <div className={styles.cdIntroContent + " " + styles.bouncy}>
                    <h1>PMS</h1>
                </div>
            </div>
        </section>
    );
}