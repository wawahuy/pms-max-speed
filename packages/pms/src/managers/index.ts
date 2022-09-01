import {PPServerProxy} from "pms-proxy";

export class WebManager {
    public readonly host = 'pms.abc';

    constructor(
        private server: PPServerProxy
    ) {
    }

    listen() {
        // forward to https
        this.server.addRule()
            .url(new RegExp(`http:\\/\\/${this.host}`, 'g'))
            .then((req, res) => {
                res.redirect(`https://${this.host}`);
            })

        // listen req, res
        this.server.addRule()
            .host(this.host)
            .then((req, res) => {
                res.send('oke!')
            })
    }
}