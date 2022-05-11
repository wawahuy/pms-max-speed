const getRootAppDir = () => {
    if (process.env.NODE_ENV == 'production') {
        if (process.env.type == 'android') {
            return __dirname
        } else if(process.env.type == 'win32') {
            return process.cwd();
        } else {
            throw 'Not support system ' + process.env.type;
        }
    } else {
        return __dirname;
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


    proxyPort: 1234
}