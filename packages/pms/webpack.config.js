// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const resolveTsconfigPathsToAlias = require("./webpack/resolve-tsconfig-path-to-webpack-alias");

const isProduction = process.env.NODE_ENV == 'production';


const config = {
    entry: './src/index.ts',
    target: 'node',
    externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
    externalsPresets: {
        node: true // in order to ignore built-in modules like path, fs, etc.
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
    ],
    module: {
        rules: [
            {
                test: /\.ts$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
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
        
        
    } else {
        config.mode = 'development';
    }
    return config;
};
