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
    rootAppDir: process.env.NODE_ENV == 'production' ? process.cwd() : __dirname,


    proxyPort: 1234
}