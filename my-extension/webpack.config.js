const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.jsx',
    content: './src/content.js'  // 👈 Add this
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // outputs popup.js and content.js
    clean: true,
  },
  module: {
    rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/popup.html',
      filename: 'popup.html',
      chunks: ['popup']  // 👈 only inject popup.js into popup.html
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
      ],
    }),
  ],
};
