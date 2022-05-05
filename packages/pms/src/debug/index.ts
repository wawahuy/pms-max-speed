import express, { Router } from 'express';
import {configs} from "../config";
import {PmsOkRuModule} from "@modules/ok-ru";
import {log} from "@cores/logger";

const app = express();

const cacheOkRu = Router();
cacheOkRu.get('/', (req, res) => {
    res.json(PmsOkRuModule.cachedManager.getKeys());
})
cacheOkRu.get('/:key', (req, res) => {
    const key = req.params.key;
    const cached = PmsOkRuModule.cachedManager.getCachedByKey(key);
    if (cached) {
        res.setHeader('content-type', 'text/plain');
        res.send(cached.debug())
    } else {
        res.status(500).json({ msg: key + ' not exists' });
    }
})

app.use('/ok.ru', cacheOkRu)
app.listen(configs.debugPort, () => log.info(`Server debug running on port ${configs.debugPort}`));