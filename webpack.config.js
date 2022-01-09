const webpack = require('webpack');
const path = require('path');

const config = {
  target: 'electron-renderer',
  entry: './src/renderer.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js'
  }
};

module.exports = config;