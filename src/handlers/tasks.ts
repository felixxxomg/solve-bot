import { Context, Input } from 'telegraf'
import { getTopics, getTasksByTopic, saveSolve } from '../api.js'
import { t } from '../i18n.js'
import { taskKeyboard } from '../keyboards.js'
import { Lang, Session, TaskItem } from '../types.js'

const sessions = new Map<number, Session>()

export function getSession(userId: number): Session | undefined {
  return sessions.get(userId)
}

export function setSession(userId: number, session: Session) {
  sessions.set(userId, session)
}

export function clearSession(userId: number) {
  sessions.delete(userId)
}

export async function showTopics(ctx: Context, lang: Lang) {
  const topics = getTopics()
  const buttons = topics.map(t => ({
    text: `${t.name} (${t.count})`,
    callback_data: `topic:${t.name}`,
  }))
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }])

  await ctx.editMessageText(t(lang, 'chooseTopic'), {
    reply_markup: { inline_keyboard: rows },
  })
}

export async function showTask(ctx: Context, userId: number, lang: Lang) {
  const session = sessions.get(userId)
  if (!session || session.tasks.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToTopics'), callback_data: 'topics:back' }]] },
    })
    return
  }

  const task = session.tasks[session.currentIndex]
  const answered = session.answers[task.id] !== undefined
  const caption = `${t(lang, 'chooseAnswer')}\n\n${session.currentIndex + 1}/${session.tasks.length}`

  const { imagePath } = await import('../api.js')
  const fp = imagePath(task.image)

  try {
    const body = answered
      ? getAnswerFeedback(task, session.answers[task.id], lang)
      : caption
    await ctx.replyWithPhoto(Input.fromLocalFile(fp), {
      caption: body,
      parse_mode: 'Markdown',
      ...taskKeyboard(task.id, session.currentIndex, session.tasks.length, answered, lang),
    })
  } catch {
    await ctx.reply('Error displaying task image.')
  }
}

export async function handleAnswer(ctx: Context, userId: number, taskId: string, optionIdx: number, lang: Lang) {
  const session = sessions.get(userId)
  if (!session) return

  if (session.answers[taskId] !== undefined) return

  const task = session.tasks.find(t => t.id === taskId)
  if (!task) return

  const isCorrect = optionIdx === task.answer
  session.answers[taskId] = optionIdx

  await ctx.answerCbQuery(isCorrect ? '✅' : '❌')

  try {
    saveSolve(userId, taskId, isCorrect)
  } catch {}

  const { imagePath } = await import('../api.js')
  const fp = imagePath(task.image)
  const feedback = getAnswerFeedback(task, optionIdx, lang)

  try {
    await ctx.replyWithPhoto(Input.fromLocalFile(fp), {
      caption: feedback,
      parse_mode: 'Markdown',
      ...taskKeyboard(task.id, session.currentIndex, session.tasks.length, true, lang),
    })
  } catch {}
}

export async function showSolution(ctx: Context, taskId: string, lang: Lang) {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  const task = session.tasks.find(t => t.id === taskId)
  if (!task) return

  const correctLetter = String.fromCharCode(65 + task.answer)
  await ctx.answerCbQuery('💡')
  await ctx.reply(`${t(lang, 'correct')}: ${correctLetter}`)
}

function getAnswerFeedback(task: TaskItem, chosenIdx: number, lang: Lang): string {
  const correctLetter = String.fromCharCode(65 + task.answer)
  const chosenLetter = String.fromCharCode(65 + chosenIdx)
  const isCorrect = chosenIdx === task.answer
  if (isCorrect) {
    return `✅ ${t(lang, 'correctAnswer')}`
  }
  return `❌ ${t(lang, 'wrongAnswer')} ${correctLetter}`
}
