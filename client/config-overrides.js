module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
  };

  return config;
}; 