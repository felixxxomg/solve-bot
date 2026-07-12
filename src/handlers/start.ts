import { Context } from 'telegraf'
import { authTelegram, getStats } from '../api.js'
import { t } from '../i18n.js'
import { mainMenuKeyboard } from '../keyboards.js'
import { Lang } from '../types.js'

let _webappUrl = ''

export function setWebappUrl(url: string) { _webappUrl = url }

export async function startHandler(ctx: Context) {
  const tgId = String(ctx.from!.id)
  const name = ctx.from!.first_name || 'User'
  let profile
  try {
    profile = authTelegram(tgId, name)
  } catch {
    await ctx.reply('Server error.')
    return
  }

  const lang = (profile.language as Lang) || 'en'
  let statsText = ''
  try {
    const stats = getStats(profile.id)
    const lines: string[] = [
      `📊 *${t(lang, 'stats')}*`,
      '',
      `${t(lang, 'totalSolved')}: ${stats.totalSolved}`,
      `${t(lang, 'correct')}: ${stats.totalCorrect} (${stats.accuracy}%)`,
    ]
    if (stats.totalTasks > 0) {
      lines.push(`${t(lang, 'tests')}: ${stats.totalTasks} (${t(lang, 'avgScore')}: ${stats.avgScore}%)`)
    }
    if (stats.weekActivity.length > 0) {
      lines.push('', `📅 *${t(lang, 'weekActivity')}*:`)
      for (const day of stats.weekActivity.slice(-5)) {
        lines.push(`  ${day.day}: ${day.solved} ${t(lang, 'tasks')}`)
      }
    }
    if (stats.byTopic.length > 0) {
      lines.push('', `📂 *${t(lang, 'byTopic')}*:`)
      for (const t of stats.byTopic.slice(0, 5)) {
        const pct = t.solved > 0 ? Math.round((t.correct / t.solved) * 100) : 0
        lines.push(`  ${t.topic}: ${t.solved} (${pct}%)`)
      }
    }
    statsText = lines.join('\n')
  } catch {
    statsText = `📊 *${t(lang, 'stats')}*\n\n${t(lang, 'totalSolved')}: 0`
  }

  await ctx.reply(`*${t(lang, 'start')}*\n\n${statsText}`, {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(lang, _webappUrl),
  })
}
