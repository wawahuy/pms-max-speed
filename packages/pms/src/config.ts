const getRootAppDir = () => {
    if (process.env.NODE_ENV == 'production') {
        if (process.env.IS_ANDROID) {
            return __dirname
        }
        return process.cwd();
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