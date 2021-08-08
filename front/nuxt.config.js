const parseArgs = require('minimist')
const argv = parseArgs(process.argv.slice(2), {
  alias: {
    H: 'hostname', // eslint-disable-line @typescript-eslint/naming-convention
    p: 'port'
  },
  string: ['H'],
  unknown: parameter => false
})

const port =
  argv.port ||
  process.env.PORT ||
  process.env.npm_package_config_nuxt_port ||
  '3000'
const host =
  argv.hostname ||
  process.env.HOST ||
  process.env.npm_package_config_nuxt_host ||
  'localhost'
const backend =
  argv.backend ||
  process.env.BACKEND ||
  process.env.npm_package_config_nuxt_backend ||
  'http://id-dev.snucse.org:50080'
module.exports = {
  env: {
    baseUrl:
      process.env.BASE_URL ||
      `http://${host}:${port}`
  },
  head: {
    title: 'Bacchus ID',
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1'
      },
      {
        hid: 'description',
        name: 'description',
        content: 'Identity management service for SNUCSE'
      }
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico'
      }
    ]
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#3B8070' },
  /*
  ** Build configuration
  */
  plugins: [
    '~/plugins/element-ui',
  ],

  css: [
    'element-ui/lib/theme-chalk/index.css',
    'element-ui/lib/theme-chalk/reset.css',
    '~/assets/css/main.css',
  ],

  build: {},
  modules: [
    '@nuxtjs/axios',
    '~/modules/typescript.js'
  ],

  proxy: {
    '/api/': backend,
  },

  axios: {
    // baseURL: 'http://id-dev.snucse.org:10101',
    proxy: true,
  }
}
