// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const resolveTsconfigPathsToAlias = require("./webpack/resolve-tsconfig-path-to-webpack-alias");

const isProduction = process.env.NODE_ENV == 'production';


const externals = () => {
    const externalLibs = [
        'mockttp',
        // '_stream_wrap',  // mockttp lib exclude http toolkit
        // 'coffee-script', // vm2 lib
        // 'bufferutil', 'utf-8-validate', //ws lib
    ];
    if (isProduction) {
        const check = lib => {
            return !externalLibs.includes(lib);
        }
        return [nodeExternals({ allowlist: check })]
    }

    // in order to ignore all modules in node_modules folder
    return [nodeExternals()];
}

const config = {
    entry: './src/index.ts',
    target: 'node',
    externals: externals(),
    externalsPresets: {
        node: true // in order to ignore built-in modules like path, fs, etc.
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
        new NodemonPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.ts$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.txt$/i,
                loader: 'raw-loader'
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.jsx'],
        alias: resolveTsconfigPathsToAlias(),
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
        config.plugins.push(new BundleAnalyzerPlugin());
    } else {
        config.mode = 'development';
    }
    return config;
};
