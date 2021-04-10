module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: false
  },
  webpack: {
    rules: {
      'sass-css': {
        modules: {
          localIdentName: '[name]__[local]__[hash:base64:5]'
        }
      }
    }
  }
}
