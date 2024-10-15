const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
})

module.exports = {
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
}

