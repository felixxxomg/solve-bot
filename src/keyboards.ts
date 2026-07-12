import { Markup } from 'telegraf'
import { Lang } from './types.js'
import { t } from './i18n.js'

export function mainMenuKeyboard(lang: Lang, webappUrl?: string) {
  const rows: any[] = []
  if (webappUrl) {
    rows.push([Markup.button.webApp(t(lang, 'openApp'), webappUrl)])
  }
  rows.push([Markup.button.callback(t(lang, 'mockTest'), 'menu:mocktest')])
  rows.push([
    Markup.button.callback(t(lang, 'articles'), 'menu:articles'),
    Markup.button.callback(t(lang, 'language'), 'menu:lang'),
  ])
  return Markup.inlineKeyboard(rows)
}

export function statsKeyboard(lang: Lang, webappUrl?: string) {
  return mainMenuKeyboard(lang, webappUrl)
}

export function langKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇬🇧 English', 'lang:en')],
    [Markup.button.callback('🇷🇺 Русский', 'lang:ru')],
  ])
}
