import { Context } from 'telegraf'
import { getRandomProblems } from '../problems.js'
import { saveSolve, saveTestResult } from '../api.js'
import { t } from '../i18n.js'
import { Lang } from '../types.js'

const MOCK_COUNT = 10

export async function mockTestMenu(ctx: Context, lang: Lang) {
  const problems = getRandomProblems(MOCK_COUNT)
  if (problems.length === 0) {
    await ctx.editMessageText(t(lang, 'noProblems'), {
      reply_markup: { inline_keyboard: [[{ text: '◀ Menu', callback_data: 'menu:main' }]] },
    })
    return
  }

  const txt = problems.map((p, i) => {
    const labels = ['A', 'B', 'C', 'D']
    return `*${i + 1}.* ${p.question.substring(0, 60)}...\n${labels.map((l, j) => `${l}) ${p.options[j].substring(0, 30)}`).join(' · ')}`
  }).join('\n\n')

  await ctx.reply(`*${t(lang, 'mockTestTitle')}*\n\n${t(lang, 'mockTestStart', { count: MOCK_COUNT })}\n\n_This is a preview. Full mock test is available in the Mini App._`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: t(lang, 'openApp'), web_app: { url: process.env.WEBAPP_URL || '' } }]],
    },
  })
}
