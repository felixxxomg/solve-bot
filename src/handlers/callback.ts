import { Context } from 'telegraf'
import { authTelegram, updateLanguage, getStats } from '../api.js'
import { t } from '../i18n.js'
import { mainMenuKeyboard, langKeyboard } from '../keyboards.js'
import { Lang } from '../types.js'
import { articlesHandler } from './articles.js'
import { setWebappUrl, startHandler } from './start.js'

const userLangCache = new Map<number, Lang>()
let _webappUrl = ''

export function setCallbackWebappUrl(url: string) { _webappUrl = url; setWebappUrl(url) }

export async function callbackHandler(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return
  const data = ctx.callbackQuery.data!
  const userId = ctx.from!.id
  const lang = await getUserLang(userId)
  const parts = data.split(':')

  switch (parts[0]) {
    case 'menu':
      await handleMenu(ctx, parts[1], lang)
      break
    case 'lang':
      await handleLang(ctx, parts[1], userId)
      break
  }
  await ctx.answerCbQuery()
}

async function getUserLang(userId: number): Promise<Lang> {
  if (userLangCache.has(userId)) return userLangCache.get(userId)!
  try {
    const profile = authTelegram(String(userId), '')
    const lang = (profile.language as Lang) || 'en'
    userLangCache.set(userId, lang)
    return lang
  } catch { return 'en' }
}

async function handleMenu(ctx: Context, action: string, lang: Lang) {
  const userId = ctx.from!.id
  switch (action) {
    case 'main':
      await startHandler(ctx)
      break
    case 'mocktest': {
      const { mockTestMenu } = await import('./mocktest.js')
      await mockTestMenu(ctx, lang)
      break
    }
    case 'articles':
      await articlesHandler(ctx, lang)
      break
    case 'lang':
      await ctx.editMessageText(t(lang, 'chooseLang'), { ...langKeyboard() })
      break
  }
}

async function handleLang(ctx: Context, targetLang: string, userId: number) {
  if (targetLang !== 'en' && targetLang !== 'ru') return
  try {
    updateLanguage(String(userId), targetLang)
    userLangCache.set(userId, targetLang as Lang)
  } catch {}
  const newLang = targetLang as Lang
  const langName = newLang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'
  await ctx.editMessageText(t(newLang, 'languageSet', { lang: langName }), {
    ...mainMenuKeyboard(newLang, _webappUrl),
  })
}
