import * as path from "path";

const getRootAppDir = () => {
    if (process.env.NODE_ENV == 'production') {
        if(process.env.type == 'win32') {
            return process.cwd();
        } else {
            throw 'Not support system ' + process.env.type;
        }
    } else {
        return __dirname;
    }
}

const getBinDirectory = () => {
    if (process.env.NODE_ENV == 'production') {
        return process.cwd();
    } else {
        return path.join(__dirname, '../bin');
    }
}

const getV2RayConfigDirectory = () => {
    if (process.env.NODE_ENV == 'production') {
        return path.join(process.cwd(), 'v2ray-configs');
    } else {
        return path.join(__dirname, '../v2ray-configs');
    }
}

export const configs = {
    /**
     * Cache size in app
     *
     */
    cacheMaxSize: 1024 * 1024 * 1024,


    /**
     * Root App Directory
     *
     */
    rootAppDir: getRootAppDir(),
    rootBinDir: getBinDirectory(),

    configV2RayDirectory: getV2RayConfigDirectory(),


    proxyPort: 1234
}