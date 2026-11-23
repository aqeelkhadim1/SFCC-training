'use strict';

var path = require('path');
var fs = require('fs');
var webpack = require('sgmf-scripts').webpack;
var ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'];
var sgmfScripts = require('sgmf-scripts');
const shell = require('shelljs');

var bootstrapPackages = {
    Popper: 'popper.js',
    Alert: 'exports-loader?Alert!bootstrap/js/src/alert',
    Button: 'exports-loader?Button!bootstrap/js/src/button',
    Carousel: 'exports-loader?Carousel!bootstrap/js/src/carousel',
    Collapse: 'exports-loader?Collapse!bootstrap/js/src/collapse',
    Dropdown: 'exports-loader?Dropdown!bootstrap/js/src/dropdown',
    Modal: 'exports-loader?Modal!bootstrap/js/src/modal',
    Popover: 'exports-loader?Popover!bootstrap/js/src/popover',
    Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/src/scrollspy',
    Tab: 'exports-loader?Tab!bootstrap/js/src/tab',
    Tooltip: 'exports-loader?Tooltip!bootstrap/js/src/tooltip',
    Util: 'exports-loader?Util!bootstrap/js/src/util'
};

var sfccPath = {
    base: '../sfcc-base'
};

var configs = [];

if (fs.existsSync(path.join(__dirname, './cartridge/client/default/scss/'))) {
    var cssFiles = shell.ls(
        path.join(__dirname, './cartridge/client/default/scss/*.scss')
    );
    cssFiles = cssFiles.filter(
        (filename) => path.basename(filename).indexOf('_') !== 0
    );
    var cssEntries = {};
    cssFiles.forEach((filename) => {
        var location = path.relative(
            path.join(__dirname, './cartridge/client/default/scss/'),
            filename
        );
        var basename = location.substr(
            0,
            location.length - (location.length - location.indexOf('.scss'))
        );

        cssEntries[basename] = path.resolve(filename);
    });
    configs.push({
        mode: 'production',
        name: 'scss',
        entry: cssEntries,
        output: {
            path: path.resolve('./cartridge/static/default/css'),
            filename: '[name].css'
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        use: [
                            {
                                loader: 'css-loader',
                                options: {
                                    url: false,
                                    minimize: true
                                }
                            },
                            {
                                loader: 'postcss-loader',
                                options: {
                                    plugins: [require('autoprefixer')()]
                                }
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    includePaths: [
                                        path.resolve(
                                            process.cwd(),
                                            sfccPath.base + '/node_modules/'
                                        ),
                                        path.resolve(
                                            process.cwd(),
                                            sfccPath.base +
                                                '/node_modules/flag-icon-css/sass'
                                        )
                                    ]
                                }
                            }
                        ]
                    })
                }
            ]
        },
        plugins: [new ExtractTextPlugin({ filename: '[name].css' })]
    });
}
if (fs.existsSync(path.join(__dirname, './cartridge/client/default/js/'))) {
    var jsFiles = shell.ls(
        path.join(__dirname, './cartridge/client/default/js/*.js')
    );
    jsFiles = jsFiles.filter(
        (filename) => path.basename(filename).indexOf('_') !== 0
    );
    var jsEntries = {};
    jsFiles.forEach((filename) => {
        var basename = path.basename(filename, '.js');
        jsEntries[basename] = path.resolve(filename);
    });

    configs.push({
        mode: 'none',
        name: 'js',
        entry: jsEntries,

        output: {
            path: path.resolve('./cartridge/static/default/js'),
            filename: '[name].js'
        },
        resolve: {
            alias: {
                jquery: path.resolve('../node_modules/jquery'),
                bootstrap: path.resolve('../node_modules/bootstrap'),
                lodash: path.resolve('../node_modules/lodash')
            }
        },
        module: {
            rules: [
                {
                    test: /bootstrap(.)*\.js$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/env'],
                            plugins: [
                                '@babel/plugin-proposal-object-rest-spread'
                            ],
                            cacheDirectory: true
                        }
                    }
                }
            ]
        },
        plugins: [new webpack.ProvidePlugin(bootstrapPackages)]
    });
}

module.exports = configs;
