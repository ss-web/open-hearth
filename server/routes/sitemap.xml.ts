const pages = ['', '/apply', '/queue', '/finances', '/rules', '/pastors', '/open-source', '/reports']

export default defineEventHandler(async (event) => {
  const snapshot = await getSnapshot()
  const config = useRuntimeConfig()
  const base = String(config.public.siteUrl).replace(/\/$/, '')
  const paths = [
    ...pages,
    ...snapshot.reports.map((report) => `/reports/${report.id}`),
    ...snapshot.rounds.filter((round) => round.official).map((round) => `/lottery/${round.id}`),
  ]
  const locales = [
    { code: 'ru', prefix: '' },
    { code: 'en', prefix: '/en' },
    { code: 'hy', prefix: '/hy' },
  ]
  const urls = paths.flatMap((path) => locales.map((locale) => {
    const loc = `${base}${locale.prefix}${path || '/'}`
    const alternates = locales.map((item) => {
      const href = `${base}${item.prefix}${path || '/'}`
      return `    <xhtml:link rel="alternate" hreflang="${item.code}" href="${href}"/>`
    }).join('\n')
    return `  <url>\n    <loc>${loc}</loc>\n${alternates}\n  </url>`
  }))
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
})
