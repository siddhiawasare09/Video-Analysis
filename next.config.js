module.exports = {
  webpack: (config, { isServer }) => {
    // Suppress source map warnings for face-api.js
    if (!isServer) {
      config.module.rules.push({
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: [/node_modules\/face-api.js/],
      });
    }

    // Disable source maps for better build performance
    config.devtool = false;

    return config;
  },
};
