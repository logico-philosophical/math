const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	mode: 'production',
	entry: './src/entry.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'math.min.js',
		library: 'math',
		libraryTarget: 'umd',
		globalObject: 'typeof self !== \'undefined\' ? self : this'
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					keep_fnames: true
				}
			})
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.__webpack__': true
		})
	],
	devtool: 'source-map',
	stats: {
		cached: false,
		cachedAssets: false,
		chunks: false,
		chunkModules: false,
		chunkOrigins: false,
		modules: false
	}
};