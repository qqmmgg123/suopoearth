var path = require('path');
var webpack = require('webpack');
//var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");

var args = process.argv,
    capp = args[2];

console.log(capp);

var config =  {
    plugins: [
        //new CommonsChunkPlugin({
            //name: capp + '_common',
            //minChunks: 2
        //}),
        new webpack.optimize.OccurenceOrderPlugin(), // recommanded by webpack
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin() // recommanded by webpack
    ],
    //页面入口文件配置
    entry: [
        'webpack/hot/dev-server',
        'webpack-hot-middleware/client?127.0.0.1:8080/__webpack_hmr'
    ],
    //入口文件输出配置
    output: {
        path: path.resolve(__dirname, 'public/js/dist'),
        filename: capp + '.js',
        publicPath: 'http://127.0.0.1:8080/'
    },
    module: {
        //加载器配置
        loaders: [
            { 
                test: /\.js[x]?$/, 
                loaders: ['babel'],
                include: path.join(__dirname, 'public/js/src/')
            }
        ]
    },
    //其它解决方案配置
    resolve: {
        root: [
            path.resolve(__dirname, 'public/js/src')
        ], //绝对路径
        extensions: ['', '.js', '.jsx']
    }
};

config.entry.push(path.resolve(__dirname, 'public/js/src/' + capp + '.js'));

module.exports = config;
