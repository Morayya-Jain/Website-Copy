import { resolve } from 'path'
import { defineConfig } from 'vite'

const base = '/Website-Copy'
const posthogTag = `<script src="${base}/js/posthog.js" defer></script>`

// CSP matching netlify.toml (minus frame-ancestors which cannot be set via meta tag)
const cspContent = "default-src 'self'; script-src 'self' https://js.stripe.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://yviegtpsklovoyltpnml.supabase.co https://api.stripe.com https://us.i.posthog.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'"

// Known route prefixes for navigation link rewriting
const routePrefixes = ['auth', 'sessions', 'settings', 'dashboard', 'download', 'pricing', 'about', 'how-to-use', 'account', 'privacy', 'terms', 'demo']
const routePattern = routePrefixes.join('|')

export default defineConfig({
  base: `${base}/`,
  // Rewrite "/" to "/index.html" so public/index.html serves as the landing page
  plugins: [
    {
      name: 'serve-public-index',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/') {
            req.url = '/index.html'
          }
          next()
        })
      },
    },
    {
      name: 'inject-posthog',
      transformIndexHtml(html) {
        if (html.includes('/js/posthog.js')) return html
        return html.replace('</head>', `${posthogTag}\n</head>`)
      },
    },
    {
      name: 'inject-csp-and-referrer',
      transformIndexHtml(html) {
        if (html.includes('Content-Security-Policy')) return html
        const meta = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">\n  <meta name="referrer" content="strict-origin-when-cross-origin">`
        return html.replace('<head>', `<head>\n  ${meta}`)
      },
    },
    {
      name: 'rewrite-nav-links',
      transformIndexHtml(html, ctx) {
        // Only rewrite in build mode (dev server runs at root)
        if (ctx.server) return html
        return html
          .replace(new RegExp(`href="/(${routePattern})([^"]*)"`, 'g'), `href="${base}/$1$2"`)
          .replace(/href="\/#/g, `href="${base}/#`)
          .replace(/href="\/"/g, `href="${base}/"`)
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'auth/login/index.html'),
        signup: resolve(__dirname, 'auth/signup/index.html'),
        callback: resolve(__dirname, 'auth/callback/index.html'),
        forgotPassword: resolve(__dirname, 'auth/forgot-password/index.html'),
        resetPassword: resolve(__dirname, 'auth/reset-password/index.html'),
        dashboard: resolve(__dirname, 'dashboard/index.html'),
        settingsConfiguration: resolve(__dirname, 'settings/blocklist/index.html'),
        settingsDevices: resolve(__dirname, 'settings/devices/index.html'),
        sessions: resolve(__dirname, 'sessions/index.html'),
        sessionDetail: resolve(__dirname, 'sessions/detail/index.html'),
        account: resolve(__dirname, 'account/index.html'),
        accountSubscription: resolve(__dirname, 'account/subscription/index.html'),
        pricing: resolve(__dirname, 'pricing/index.html'),
        howToUse: resolve(__dirname, 'how-to-use/index.html'),
        about: resolve(__dirname, 'about/index.html'),
        download: resolve(__dirname, 'download/index.html'),
        demo: resolve(__dirname, 'demo/index.html'),
      },
    },
  },
})
