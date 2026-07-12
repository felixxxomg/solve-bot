import { Context } from 'telegraf'
import { authTelegram, updateLanguage, getStats, getTopics } from '../api.js'
import { t } from '../i18n.js'
import { mainMenuKeyboard, langKeyboard } from '../keyboards.js'
import { Lang } from '../types.js'
import {
  showTopics,
  showTask,
  handleAnswer,
  clearSession,
  setSession,
  getSession,
} from './tasks.js'
import { startMockTest, handleMockAnswer } from './mocktest.js'

const userLangCache = new Map<number, Lang>()

export async function callbackHandler(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return
  const data = ctx.callbackQuery.data!
  const userId = ctx.from!.id
  const lang = await getUserLang(userId)

  const parts = data.split(':')
  const action = parts[0]

  switch (action) {
    case 'menu':
      await handleMenu(ctx, parts[1], lang)
      break
    case 'topic':
      await handleTopic(ctx, parts[1], userId, lang)
      break
    case 'topics':
      if (parts[1] === 'back') {
        await showTopics(ctx, lang)
      }
      break
    case 'answer':
      await handleAnswer(ctx, userId, parts[1], Number(parts[2]), lang)
      break
    case 'mockanswer':
      await handleMockAnswer(ctx, userId, parts[1], Number(parts[2]), lang)
      break
    case 'nav':
      await handleNav(ctx, parts[1], userId, lang)
      break
    case 'lang':
      await handleLang(ctx, parts[1], userId, lang)
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
  } catch {
    return 'en'
  }
}

async function handleMenu(ctx: Context, action: string, lang: Lang) {
  const userId = ctx.from!.id
  switch (action) {
    case 'main':
      clearSession(userId)
      let statsText = ''
      try {
        const profile = authTelegram(String(userId), '')
        const stats = getStats(profile.id)
        statsText = [
          `📊 *${t(lang, 'stats')}*`,
          '', `${t(lang, 'totalSolved')}: ${stats.totalSolved}`,
          `${t(lang, 'correct')}: ${stats.totalCorrect}`,
          `${t(lang, 'accuracy')}: ${stats.accuracy}%`,
          `${t(lang, 'tests')}: ${stats.totalTests}`,
          `${t(lang, 'avgScore')}: ${stats.avgScore}%`,
        ].join('\n')
      } catch {
        statsText = `📊 *${t(lang, 'stats')}*\n\n${t(lang, 'totalSolved')}: 0`
      }
      await ctx.editMessageText(`*${t(lang, 'start')}*\n\n${statsText}`, {
        parse_mode: 'Markdown', ...mainMenuKeyboard(lang),
      })
      break
    case 'tasks':
      await showTopics(ctx, lang)
      break
    case 'mocktest':
      await startMockTest(ctx, lang)
      break
    case 'lang':
      await ctx.editMessageText(t(lang, 'chooseLang'), { ...langKeyboard() })
      break
  }
}

async function handleTopic(ctx: Context, topicName: string, userId: number, lang: Lang) {
  const { getTasksByTopic } = await import('../api.js')
  const tasks = getTasksByTopic(topicName)

  if (tasks.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToTopics'), callback_data: 'topics:back' }]] },
    })
    return
  }

  const session = {
    tasks,
    currentIndex: 0,
    answers: {} as Record<string, number>,
    type: 'browse' as const,
  }
  setSession(userId, session)
  await showTask(ctx, userId, lang)
}

async function handleNav(ctx: Context, dir: string, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return
  if (dir === 'prev' && session.currentIndex > 0) session.currentIndex--
  else if (dir === 'next' && session.currentIndex < session.tasks.length - 1) session.currentIndex++
  await showTask(ctx, userId, lang)
}

async function handleLang(ctx: Context, targetLang: string, userId: number, _currentLang: Lang) {
  if (targetLang !== 'en' && targetLang !== 'ru') return
  try {
    updateLanguage(String(userId), targetLang)
    userLangCache.set(userId, targetLang as Lang)
  } catch {}
  const newLang = targetLang as Lang
  const langName = newLang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'
  await ctx.editMessageText(t(newLang, 'languageSet', { lang: langName }), { ...mainMenuKeyboard(newLang) })
}
