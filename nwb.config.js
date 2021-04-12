module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: false
  },
  babel: {
    plugins: [
      [
        // Remove the CSS included in the modules
        // (the CSS is optional and must be required by the user)
        "babel-plugin-transform-remove-imports", {
          "test": "\\.(css)$"
        }
      ]
    ]
  }
}
