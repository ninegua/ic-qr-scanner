const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InlineChunkHtmlPlugin = require("inline-chunk-html-plugin");
const HTMLInlineCSSWebpackPlugin =
  require("html-inline-css-webpack-plugin").default;

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "main.bundle.js",
  },
  target: "web",
  devtool: "source-map",
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new HtmlWebpackPlugin({
      inject: true,
      title: "Scan and send transactions",
      myPageHeader: "Scan & Send",
      template: "./src/index.html",
      filename: "./index.html",
    }),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve("buffer/"), "Buffer"],
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/.*/]),
    new HTMLInlineCSSWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.bin$/,
        type: "asset/inline",
      },
    ],
  },
  optimization: {
    minimize: true,
  },
};
