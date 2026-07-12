import { Context, Input } from 'telegraf'
import { getRandomTasks, saveSolve, imagePath } from '../api.js'
import { t } from '../i18n.js'
import { mockKeyboard } from '../keyboards.js'
import { Lang, Session } from '../types.js'
import { setSession, getSession, clearSession } from './tasks.js'

const MOCK_COUNT = 10

export async function startMockTest(ctx: Context, lang: Lang) {
  const userId = ctx.from!.id
  const tasks = getRandomTasks(MOCK_COUNT)

  if (tasks.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }]] },
    })
    return
  }

  const session: Session = {
    tasks,
    currentIndex: 0,
    answers: {},
    type: 'mocktest',
    startedAt: Date.now(),
  }
  setSession(userId, session)

  await ctx.editMessageText(
    `*${t(lang, 'mockTestTitle')}*\n\n${t(lang, 'mockTestStart', { count: tasks.length })}`,
    { parse_mode: 'Markdown' }
  )

  setTimeout(() => showMockTask(ctx, userId, lang), 1500)
}

async function showMockTask(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session || session.type !== 'mocktest') return

  const task = session.tasks[session.currentIndex]
  if (session.answers[task.id] !== undefined) {
    showNextMock(ctx, userId, lang)
    return
  }

  const caption = `${session.currentIndex + 1}/${session.tasks.length}\n\n${t(lang, 'chooseAnswer')}`
  const fp = imagePath(task.image)

  try {
    await ctx.replyWithPhoto(Input.fromLocalFile(fp), {
      caption,
      parse_mode: 'Markdown',
      ...mockKeyboard(task.id, lang),
    })
  } catch {
    await ctx.reply('Error loading task image.')
    showNextMock(ctx, userId, lang)
  }
}

async function showNextMock(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return

  session.currentIndex++
  if (session.currentIndex >= session.tasks.length) {
    await finishMockTest(ctx, userId, lang)
    return
  }
  showMockTask(ctx, userId, lang)
}

export async function handleMockAnswer(ctx: Context, userId: number, taskId: string, optionIdx: number, lang: Lang) {
  const session = getSession(userId)
  if (!session || session.type !== 'mocktest') return

  const task = session.tasks.find(t => t.id === taskId)
  if (!task || session.answers[taskId] !== undefined) return

  const isCorrect = optionIdx === task.answer
  session.answers[taskId] = optionIdx

  await ctx.answerCbQuery(isCorrect ? '✅' : '❌')

  try {
    saveSolve(userId, taskId, isCorrect)
  } catch {}

  const correctLetter = String.fromCharCode(65 + task.answer)
  const feedback = isCorrect
    ? `✅ ${t(lang, 'correctAnswer')}`
    : `❌ ${t(lang, 'wrongAnswer')} ${correctLetter}`

  await ctx.editMessageText(`#${task.id}\n\n${feedback}`, { parse_mode: 'Markdown' })
  setTimeout(() => showNextMock(ctx, userId, lang), 1500)
}

async function finishMockTest(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return

  const total = session.tasks.length
  let correct = 0
  for (const [tid, ans] of Object.entries(session.answers)) {
    const task = session.tasks.find(t => t.id === tid)
    if (task && ans === task.answer) correct++
  }

  const pct = Math.round((correct / total) * 100)
  const elapsed = Math.round((Date.now() - (session.startedAt || Date.now())) / 1000)

  const text = [
    `*${t(lang, 'mockTestDone', { correct, total, pct })}*`,
    '',
    `${t(lang, 'timeSpent', { time: elapsed })}`,
  ].join('\n')

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }]],
    },
  })

  clearSession(userId)
}
