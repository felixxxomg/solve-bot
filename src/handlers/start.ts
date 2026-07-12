import { Context } from 'telegraf'
import { authTelegram, getStats } from '../api.js'
import { t } from '../i18n.js'
import { mainMenuKeyboard } from '../keyboards.js'
import { Lang } from '../types.js'

export async function startHandler(ctx: Context) {
  const tgId = String(ctx.from!.id)
  const name = ctx.from!.first_name || 'User'

  let profile
  try {
    profile = authTelegram(tgId, name)
  } catch {
    await ctx.reply('Server error. Try again later.')
    return
  }

  const lang = (profile.language as Lang) || 'en'

  let statsText = ''
  try {
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

  const welcome = `*${t(lang, 'start')}*\n\n${statsText}`

  await ctx.reply(welcome, {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(lang),
  })
}
