var path = require('path');
var webpack = require('webpack');
var env = process.env.WEBPACK_ENV;
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");

module.exports = {
    plugins: [
        new CommonsChunkPlugin({
            name: "commons",
            minChunks: 2
        }),
        new webpack.DefinePlugin({ 
            'process.env.NODE_ENV': '"development"' 
        })
    ],
    //页面入口文件配置
    entry: {
        guide : path.join(__dirname, 'public/js/src/guide.js')
    },
    //入口文件输出配置
    output: {
        path: path.join(__dirname, 'public/js/dist'),
        filename: '[name].js'
    },
    module: {
        //加载器配置
        loaders: [
            { 
                test: /\.js$/, 
                loader: 'babel',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    //其它解决方案配置
    resolve: {
        root: [
            path.join(__dirname, 'public/js/src')
        ], //绝对路径
        extensions: ['', '.js'],
        alias: {}
    }
};
