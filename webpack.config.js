const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: {
    main: './src/index.js',
    preview: './src/preview.js'
    rd1: './src/rd/1.js',  // 추가
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      chunks: ['main'],
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      template: './src/preview.html',
      chunks: ['preview'],
      filename: 'preview.html'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].bundle.css'
    })
    new HtmlWebpackPlugin({
      template: './src/rd/1.html',
      filename: 'rd/1.html',
      chunks: ['rd1']
    })
  ],
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8080,
    open: true,
    hot: true,
  }
};
