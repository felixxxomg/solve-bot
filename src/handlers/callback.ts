import { Context } from 'telegraf'
import { authTelegram, updateLanguage, getStats, getSubjects, getCategories, getProblems } from '../api.js'
import { t } from '../i18n.js'
import { mainMenuKeyboard, langKeyboard } from '../keyboards.js'
import { Lang } from '../types.js'
import {
  showSubjects,
  showTopics,
  showProblem,
  handleAnswer,
  showSolution,
  setSession,
  getSession,
  clearSession,
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
    case 'subjects':
      if (parts[1] === 'back') {
        await showSubjects(ctx, lang)
      }
      break
    case 'subject':
      await handleSubject(ctx, parts[1], userId, lang)
      break
    case 'mocksubject':
      await startMockTest(ctx, parts[1], lang)
      break
    case 'topic':
      await handleTopic(ctx, parts[1], parts[2], userId, lang)
      break
    case 'topics':
      if (parts[1] === 'back') {
        const subj = getLastSubject(userId)
        if (subj) await showTopics(ctx, subj, lang)
      }
      break
    case 'answer':
      await handleAnswer(ctx, userId, Number(parts[1]), Number(parts[2]), lang)
      break
    case 'mockanswer':
      await handleMockAnswer(ctx, userId, Number(parts[1]), Number(parts[2]), lang)
      break
    case 'solution':
      await showSolution(ctx, Number(parts[1]), lang)
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
          '',
          `${t(lang, 'totalSolved')}: ${stats.totalSolved}`,
          `${t(lang, 'correct')}: ${stats.totalCorrect}`,
          `${t(lang, 'accuracy')}: ${stats.accuracy}%`,
          `${t(lang, 'tests')}: ${stats.totalTests}`,
          `${t(lang, 'avgScore')}: ${stats.avgScore}%`,
        ].join('\n')
      } catch {
        statsText = `📊 *${t(lang, 'stats')}*\n\n${t(lang, 'totalSolved')}: 0`
      }
      await ctx.editMessageText(
        `*${t(lang, 'start')}*\n\n${statsText}`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard(lang) }
      )
      break

    case 'tasks':
      await showSubjects(ctx, lang)
      break

    case 'mocktest':
      const subs: Record<string, { name: string }> = getSubjects()
      const subjButtons = Object.entries(subs).map(([id, s]: [string, { name: string }]) => ({
        text: s.name,
        callback_data: `mocksubject:${id}`,
      }))
      const subRows: any[] = []
      for (let i = 0; i < subjButtons.length; i += 2) {
        subRows.push(subjButtons.slice(i, i + 2))
      }
      subRows.push([{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }])
      await ctx.editMessageText(t(lang, 'chooseSubject'), {
        reply_markup: { inline_keyboard: subRows },
      })
      break

    case 'lang':
      await ctx.editMessageText(t(lang, 'chooseLang'), { ...langKeyboard() })
      break
  }
}

async function handleSubject(ctx: Context, subjectId: string, userId: number, lang: Lang) {
  setLastSubject(userId, subjectId)
  const cats = getCategories(subjectId)
  const buttons = cats.map((c: any) => ({
    text: `${c.name} (${c.problem_count})`,
    callback_data: `topic:${subjectId}:${c.id}`,
  }))
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([{ text: t(lang, 'backToSubjects'), callback_data: 'subjects:back' }])

  await ctx.editMessageText(t(lang, 'chooseTopic'), {
    reply_markup: { inline_keyboard: rows },
  })
}

async function handleTopic(ctx: Context, subjectId: string, topicId: string, userId: number, lang: Lang) {
  const problems = getProblems(subjectId, Number(topicId))

  if (problems.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToTopics'), callback_data: 'topics:back' }]] },
    })
    return
  }

  const session = {
    problems,
    currentIndex: 0,
    answers: {} as Record<number, number>,
    type: 'browse' as const,
  }
  setSession(userId, session)
  await showProblem(ctx, userId, lang)
}

async function handleNav(ctx: Context, dir: string, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return

  if (dir === 'prev' && session.currentIndex > 0) {
    session.currentIndex--
  } else if (dir === 'next' && session.currentIndex < session.problems.length - 1) {
    session.currentIndex++
  }

  await showProblem(ctx, userId, lang)
}

async function handleLang(ctx: Context, targetLang: string, userId: number, _currentLang: Lang) {
  if (targetLang !== 'en' && targetLang !== 'ru') return

  try {
    updateLanguage(String(userId), targetLang)
    userLangCache.set(userId, targetLang as Lang)
  } catch {}

  const newLang = targetLang as Lang
  const langName = newLang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'

  const text = t(newLang, 'languageSet', { lang: langName })
  await ctx.editMessageText(text, { ...mainMenuKeyboard(newLang) })
}

const lastSubject = new Map<number, string>()

function setLastSubject(userId: number, subjectId: string) {
  lastSubject.set(userId, subjectId)
}

function getLastSubject(userId: number): string | null {
  return lastSubject.get(userId) || null
}
