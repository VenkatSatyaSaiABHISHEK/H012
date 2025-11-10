const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            const isProd = process.env.NODE_ENV === 'production';

            // Enable filesystem caching (helps both dev and prod)
            webpackConfig.cache = {
                type: 'filesystem',
                allowCollectingMemory: true,
            };

            // Only enable heavy optimizations (minification) for production builds.
            // Running Terser/minification in development makes `npm start` very slow.
            if (isProd) {
                webpackConfig.optimization = {
                    ...webpackConfig.optimization,
                    moduleIds: 'deterministic',
                    minimize: true,
                    minimizer: [
                        new TerserPlugin({
                            parallel: true,
                            terserOptions: {
                                compress: {
                                    inline: 2,
                                },
                            },
                        }),
                    ],
                    splitChunks: {
                        chunks: 'all',
                        minSize: 20000,
                        minChunks: 1,
                        maxAsyncRequests: 30,
                        maxInitialRequests: 30,
                        cacheGroups: {
                            defaultVendors: {
                                test: /[\\/]node_modules[\\/]/,
                                priority: -10,
                                reuseExistingChunk: true,
                            },
                            default: {
                                minChunks: 2,
                                priority: -20,
                                reuseExistingChunk: true,
                            },
                        },
                    },
                };
                // Use full source maps in production
                webpackConfig.devtool = 'source-map';
            } else {
                // Faster source maps for development to speed up rebuilds
                webpackConfig.devtool = 'eval-cheap-module-source-map';
            }


            webpackConfig.resolve = {
                ...webpackConfig.resolve,
                fallback: {
                    // Use fully-specified path (.js) so ESM `.mjs` imports resolve correctly
                    process: require.resolve('process/browser.js'),
                    url: require.resolve('url/'),
                    buffer: require.resolve('buffer/'),
                    stream: require.resolve('stream-browserify'),
                    crypto: require.resolve('crypto-browserify'),
                }
            };

            // Add explicit aliases so imports like 'process/browser' resolve to the .js file
            webpackConfig.resolve.alias = {
                ...(webpackConfig.resolve.alias || {}),
                'process/browser': require.resolve('process/browser.js'),
                'process': require.resolve('process/browser.js'),
            };

            webpackConfig.plugins = [
                ...webpackConfig.plugins,
                // Provide absolute module paths to avoid "fully specified" resolution errors
                new webpack.ProvidePlugin({
                    process: require.resolve('process/browser.js'),
                    Buffer: ['buffer', 'Buffer']
                })
            ];

            return webpackConfig;
        }
    },
    babel: {
        presets: [
            ['@babel/preset-env', { 
                targets: { node: 'current' },
                loose: true,
                modules: false // Enable tree shaking
            }],
            ['@babel/preset-react', {
                runtime: 'automatic' // Use new JSX transform
            }],
            '@babel/preset-typescript'
        ],
        plugins: [
            ['@babel/plugin-transform-runtime', { 
                loose: true
                // Removed corejs: 3 to prevent global-this polyfill conflicts
            }],
            ['@babel/plugin-transform-class-properties', { loose: true }],
            ['@babel/plugin-transform-private-methods', { loose: true }],
            ['@babel/plugin-transform-private-property-in-object', { loose: true }],
            ['@babel/plugin-proposal-object-rest-spread', { loose: true }]
        ]
    }
};