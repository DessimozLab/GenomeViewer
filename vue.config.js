const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    // vue-cli's dev default (eval-cheap-module-source-map) wraps every module in its own eval()
    // with an inline map, so Chrome can't compose one coherent original file per component - lines
    // don't match the source and everything gets fragmented under webpack-internal://. A plain
    // source-map gives a clean webpack:// tree with real line numbers, at the cost of slower
    // incremental rebuilds. Production already used 'source-map', so this only changes dev.
    devtool: 'source-map',
  },
  pages: {
    'demo_human': {
      entry: 'src/main_human.js',
      template: 'public/index.html',
      filename: 'demo_human.html',
      title: 'Demo Human Page',

    },
    'demo_primates': {
      entry: 'src/main_primates.js',
      template: 'public/index.html',
      filename: 'demo_primates.html',
      title: 'Demo Primates Page',
    }
  },
})
