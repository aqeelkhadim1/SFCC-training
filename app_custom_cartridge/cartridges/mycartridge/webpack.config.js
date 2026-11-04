'use strict';

var path = require('path');
var RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
var sgmfScripts = require('sgmf-scripts');

var cartridgeStatic = path.resolve('./cartridges/mycartridge/cartridge/static');

module.exports = [
    {
        mode: 'production',
        name: 'js',
        entry: sgmfScripts.createJsPath(),
        output: {
            path: cartridgeStatic,
            filename: '[name].js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: ['@babel/plugin-proposal-object-rest-spread'],
                            cacheDirectory: true
                        }
                    }
                }
            ]
        }
    },
    {
        mode: 'none',
        name: 'scss',
        entry: sgmfScripts.createScssPath(),
        output: {
            path: cartridgeStatic
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: { esModule: false }
                        },
                        {
                            loader: 'css-loader',
                            options: { url: false }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [require('autoprefixer')()]
                                }
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: require('sass'),
                                sassOptions: {
                                    includePaths: [path.resolve('node_modules')]
                                }
                            }
                        }
                    ]
                }
            ]
        },
        plugins: [
            new RemoveEmptyScriptsPlugin(),
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[name].css'
            })
        ],
        optimization: {
            minimizer: ['...', new CssMinimizerPlugin()]
        }
    }
];
