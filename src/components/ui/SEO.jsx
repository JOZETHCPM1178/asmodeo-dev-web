// src/components/ui/SEO.jsx
// ════════════════════════════════════════
//  SEO — Meta tags dinámicos sin librerías
//  Modifica el <head> directamente con useEffect
// ════════════════════════════════════════
import { useEffect } from 'react'

const SITE_NAME   = 'AsmodeoDev'
const SITE_URL    = 'https://asmodeo-dev-web.pages.dev'
const DEFAULT_IMG = `${SITE_URL}/icon-512x512.png`
const DEFAULT_DESC = 'La plataforma #1 de mods, APKs y scripts. Descarga apps modificadas, juegos con recursos ilimitados y scripts potentes. Todo gratis y verificado.'

// Keywords base que se agregan a todos los posts
const BASE_KEYWORDS = 'apk mod gratis, descargar gratis android, asmodeo dev, mod apk 2025, sin anuncios, desbloqueado'

function setMeta(name, content, isProperty = false) {
  if (!content) return
  const attr = isProperty ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  noIndex = false,
}) {
  const fullTitle  = title ? `Descargar ${title} Mod APK Gratis — ${SITE_NAME}` : `${SITE_NAME} – APK Mods · Juegos · Scripts`
  const fullDesc   = description ? `${description} | Descargar gratis en ${SITE_NAME}` : DEFAULT_DESC
  const fullImage  = image || DEFAULT_IMG
  const fullUrl    = url ? `${SITE_URL}${url}` : SITE_URL

  useEffect(() => {
    // Título
    document.title = fullTitle

    // Meta básicos
    setMeta('description', fullDesc)
    const allKeywords = keywords ? `${keywords}, ${BASE_KEYWORDS}` : BASE_KEYWORDS
    setMeta('keywords', allKeywords)
    setMeta('robots', noIndex ? 'noindex,nofollow' : 'index,follow')
    setMeta('author', SITE_NAME)

    // Open Graph (Facebook, WhatsApp, Telegram)
    setMeta('og:type',        type,       true)
    setMeta('og:title',       fullTitle,  true)
    setMeta('og:description', fullDesc,   true)
    setMeta('og:image',       fullImage,  true)
    setMeta('og:url',         fullUrl,    true)
    setMeta('og:site_name',   SITE_NAME,  true)
    setMeta('og:locale',      'es_ES',    true)

    // Twitter Card
    setMeta('twitter:card',        'summary_large_image')
    setMeta('twitter:title',       fullTitle)
    setMeta('twitter:description', fullDesc)
    setMeta('twitter:image',       fullImage)
    setMeta('twitter:site',        '@asmodeodev')

    // Canonical URL
    setLink('canonical', fullUrl)

    return () => {
      // Restaurar título por defecto al desmontar
      document.title = `${SITE_NAME} – APK Mods · Juegos · Scripts`
    }
  }, [fullTitle, fullDesc, fullImage, fullUrl, type, keywords, noIndex])

  return null
}
