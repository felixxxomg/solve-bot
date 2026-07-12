import { Context } from 'telegraf'
import { getRandomProblems, saveSolve } from '../api.js'
import { t } from '../i18n.js'
import { mockTestKeyboard } from '../keyboards.js'
import { Lang, Session } from '../types.js'
import { setSession, getSession, clearSession } from './tasks.js'

const MOCK_COUNT = 10

export async function startMockTest(ctx: Context, subjectId: string, lang: Lang) {
  const userId = ctx.from!.id

  let problems
  try {
    problems = getRandomProblems(subjectId, MOCK_COUNT)
  } catch {
    await ctx.editMessageText('Error loading problems.')
    return
  }

  if (problems.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }]] },
    })
    return
  }

  const session: Session = {
    problems,
    currentIndex: 0,
    answers: {},
    type: 'mocktest',
    startedAt: Date.now(),
  }
  setSession(userId, session)

  await ctx.editMessageText(
    `*${t(lang, 'mockTestTitle')}*\n\n${t(lang, 'mockTestStart', { count: problems.length })}`,
    { parse_mode: 'Markdown' }
  )

  setTimeout(() => showMockProblem(ctx, userId, lang), 1500)
}

async function showMockProblem(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session || session.type !== 'mocktest') return

  const problem = session.problems[session.currentIndex]
  const answered = session.answers[problem.id] !== undefined

  if (answered) {
    showNextMock(ctx, userId, lang)
    return
  }

  const labels = ['A', 'B', 'C', 'D']
  const optionsText = problem.options.map((opt: string, i: number) => `${labels[i]}. ${opt}`).join('\n')

  const text = [
    `*${t(lang, 'mockTestTitle')}*  •  ${session.currentIndex + 1}/${session.problems.length}`,
    '',
    problem.question,
    '',
    optionsText,
  ].join('\n')

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...mockTestKeyboard(problem.id, problem.options, lang),
  })
}

async function showNextMock(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return

  session.currentIndex++

  if (session.currentIndex >= session.problems.length) {
    await finishMockTest(ctx, userId, lang)
    return
  }

  showMockProblem(ctx, userId, lang)
}

export async function handleMockAnswer(ctx: Context, userId: number, problemId: number, optionIdx: number, lang: Lang) {
  const session = getSession(userId)
  if (!session || session.type !== 'mocktest') return

  const problem = session.problems.find(p => p.id === problemId)
  if (!problem) return
  if (session.answers[problemId] !== undefined) return

  const correctIdx = problem.options.indexOf(problem.answer)
  const isCorrect = optionIdx === correctIdx
  session.answers[problemId] = optionIdx

  await ctx.answerCbQuery(isCorrect ? '✅' : '❌')

  try {
    saveSolve(userId, problemId, isCorrect)
  } catch {}

  const correctLetter = String.fromCharCode(65 + correctIdx)
  const labels = ['A', 'B', 'C', 'D']
  const optionsText = problem.options.map((opt: string, i: number) => `${labels[i]}. ${opt}`).join('\n')

  let feedback: string
  if (isCorrect) {
    feedback = `✅ ${t(lang, 'correctAnswer')}`
  } else {
    feedback = `❌ ${t(lang, 'wrongAnswer')} ${correctLetter}. ${problem.answer}`
  }

  await ctx.editMessageText(
    `*#${problem.bank_id || problem.id}*\n\n${problem.question}\n\n${optionsText}\n\n${feedback}`,
    { parse_mode: 'Markdown' }
  )

  setTimeout(() => showNextMock(ctx, userId, lang), 1500)
}

async function finishMockTest(ctx: Context, userId: number, lang: Lang) {
  const session = getSession(userId)
  if (!session) return

  const total = session.problems.length
  let correct = 0
  for (const [pid, ans] of Object.entries(session.answers)) {
    const problem = session.problems.find(p => p.id === Number(pid))
    if (problem) {
      const correctIdx = problem.options.indexOf(problem.answer)
      if (ans === correctIdx) correct++
    }
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
      inline_keyboard: [
        [{ text: t(lang, 'backToMenu'), callback_data: 'menu:main' }],
      ],
    },
  })

  clearSession(userId)
}
