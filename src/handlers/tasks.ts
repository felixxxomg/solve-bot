import { Context } from 'telegraf'
import { getProblems, getCategories, getSubjects, saveSolve } from '../api.js'
import { t } from '../i18n.js'
import { problemKeyboard } from '../keyboards.js'
import { Lang, Session } from '../types.js'

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

export async function showSubjects(ctx: Context, lang: Lang) {
  const subjects = getSubjects()
  const buttons = Object.entries(subjects).map(([id, s]) => ({
    text: s.name,
    callback_data: `subject:${id}`,
  }))
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }])

  await ctx.editMessageText(t(lang, 'chooseSubject'), {
    reply_markup: { inline_keyboard: rows },
  })
}

export async function showTopics(ctx: Context, subjectId: string, lang: Lang) {
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

export async function showProblem(ctx: Context, userId: number, lang: Lang) {
  const session = sessions.get(userId)
  if (!session || session.problems.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToTopics'), callback_data: 'topics:back' }]] },
    })
    return
  }

  const problem = session.problems[session.currentIndex]
  const answered = session.answers[problem.id] !== undefined
  const hasPrev = session.currentIndex > 0
  const hasNext = session.currentIndex < session.problems.length - 1

  const labels = ['A', 'B', 'C', 'D']
  const optionsText = problem.options.map((opt: string, i: number) => `${labels[i]}. ${opt}`).join('\n')

  const text = [
    `*#${problem.bank_id || problem.id}*  •  ${problem.difficulty.toUpperCase()}  •  ${session.currentIndex + 1}/${session.problems.length}`,
    '',
    problem.question,
    '',
    optionsText,
  ].join('\n')

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...problemKeyboard(
      problem.id,
      problem.options,
      session.currentIndex,
      session.problems.length,
      hasPrev,
      hasNext,
      answered,
      lang
    ),
  })
}

export async function handleAnswer(ctx: Context, userId: number, problemId: number, optionIdx: number, lang: Lang) {
  const session = sessions.get(userId)
  if (!session) return

  const problem = session.problems.find(p => p.id === problemId)
  if (!problem) return
  if (session.answers[problemId] !== undefined) return

  const correctIdx = problem.options.indexOf(problem.answer)
  const isCorrect = optionIdx === correctIdx
  session.answers[problemId] = optionIdx

  const correctLetter = String.fromCharCode(65 + correctIdx)

  let feedback: string
  if (isCorrect) {
    feedback = `✅ *${t(lang, 'correctAnswer')}*`
  } else {
    feedback = `❌ *${t(lang, 'wrongAnswer')}* ${correctLetter}. ${problem.answer}`
  }

  await ctx.answerCbQuery(isCorrect ? '✅' : '❌')

  try {
    saveSolve(userId, problemId, isCorrect)
  } catch {}

  const labels = ['A', 'B', 'C', 'D']
  const optionsText = problem.options.map((opt: string, i: number) => `${labels[i]}. ${opt}`).join('\n')

  const text = [
    `*#${problem.bank_id || problem.id}*  •  ${problem.difficulty.toUpperCase()}`,
    '',
    problem.question,
    '',
    optionsText,
    '',
    feedback,
  ].join('\n')

  const hasPrev = session.currentIndex > 0
  const hasNext = session.currentIndex < session.problems.length - 1

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...problemKeyboard(
      problem.id,
      problem.options,
      session.currentIndex,
      session.problems.length,
      hasPrev,
      hasNext,
      true,
      lang
    ),
  })
}

export async function showSolution(ctx: Context, problemId: number, lang: Lang) {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  const problem = session.problems.find(p => p.id === problemId)
  if (!problem) return

  const solutionText = [
    `*💡 ${t(lang, 'solution')}*`,
    '',
    ...problem.solution.map((s: string, i: number) => `${i + 1}. ${s}`),
    '',
    `*${t(lang, 'correct')}:* ${problem.answer}`,
  ].join('\n')

  await ctx.answerCbQuery('💡')
  await ctx.reply(solutionText, { parse_mode: 'Markdown' })
}
