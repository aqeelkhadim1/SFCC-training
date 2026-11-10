'use strict';

var path = require('path');
var baseModules = path.resolve(__dirname, '../../../storefront-reference-architecture-master/node_modules');
var localModules = path.resolve(__dirname, 'node_modules');

function resolveModule(moduleName) {
    try {
        return require(moduleName);
    } catch (e) {
        return require(path.join(baseModules, moduleName));
    }
}

var RemoveEmptyScriptsPlugin = resolveModule('webpack-remove-empty-scripts');
var MiniCssExtractPlugin = resolveModule('mini-css-extract-plugin');
var CssMinimizerPlugin = resolveModule('css-minimizer-webpack-plugin');
var sgmfScripts = resolveModule('sgmf-scripts');
var autoprefixer = resolveModule('autoprefixer');
var sass = resolveModule('sass');

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
        resolve: {
            modules: [localModules, baseModules, 'node_modules']
        },
        resolveLoader: {
            modules: [localModules, baseModules, 'node_modules']
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    require.resolve('@babel/preset-env', { paths: [baseModules, localModules] })
                                ]
                            ],
                            plugins: [
                                require.resolve('@babel/plugin-proposal-object-rest-spread', { paths: [baseModules, localModules] })
                            ],
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
        resolve: {
            modules: [localModules, baseModules, 'node_modules']
        },
        resolveLoader: {
            modules: [localModules, baseModules, 'node_modules']
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
                                    plugins: [autoprefixer()]
                                }
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: sass,
                                sassOptions: {
                                    includePaths: [localModules, baseModules]
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
