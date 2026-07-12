import { Context } from 'telegraf'
import { t } from '../i18n.js'
import { Lang } from '../types.js'

const TELEGRAPH_URL = 'https://telegra.ph'

const articles: Record<string, { en: string; ru: string }> = {
  'getting-started': {
    en: `${TELEGRAPH_URL}/CSCA-Getting-Started-07-12`,
    ru: `${TELEGRAPH_URL}/CSCA-Getting-Started-07-12`,
  },
}

export function getArticleLinks(lang: Lang): { title: string; url: string }[] {
  return [
    { title: lang === 'en' ? 'Getting Started' : 'Начало работы', url: articles['getting-started'][lang] },
  ]
}

export async function articlesHandler(ctx: Context, lang: Lang) {
  const links = getArticleLinks(lang)
  const text = links.map((a, i) => `${i + 1}. <a href="${a.url}">${a.title}</a>`).join('\n')
  await ctx.reply(`📖 *${t(lang, 'articles')}*:\n\n${text}`, { parse_mode: 'HTML' })
}
