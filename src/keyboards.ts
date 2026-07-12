import { Markup } from 'telegraf'
import { Lang } from './types.js'
import { t } from './i18n.js'

export function mainMenuKeyboard(lang: Lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'solveTasks'), 'menu:tasks')],
    [Markup.button.callback(t(lang, 'mockTest'), 'menu:mocktest')],
    [Markup.button.callback(t(lang, 'language'), 'menu:lang')],
  ])
}

export function topicsKeyboard(topics: { id: string; name: string; count: number }[], lang: Lang) {
  const buttons = topics.map(t =>
    Markup.button.callback(`${t.name} (${t.count})`, `topic:${t.name}`)
  )
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([Markup.button.callback(t(lang, 'backToMenu'), 'menu:main')])
  return Markup.inlineKeyboard(rows)
}

export function taskKeyboard(
  taskId: string,
  currentIndex: number,
  total: number,
  answered: boolean,
  lang: Lang
) {
  const rows: any[] = []

  const labels = ['A', 'B', 'C', 'D']
  const row1 = labels.slice(0, 2).map(l =>
    Markup.button.callback(l, `answer:${taskId}:${labels.indexOf(l)}`)
  )
  const row2 = labels.slice(2, 4).map(l =>
    Markup.button.callback(l, `answer:${taskId}:${labels.indexOf(l)}`)
  )
  rows.push(row1, row2)

  const navRow: any[] = []
  if (currentIndex > 0) {
    navRow.push(Markup.button.callback(t(lang, 'prevProblem'), 'nav:prev'))
  }
  navRow.push(Markup.button.callback(`${currentIndex + 1}/${total}`, 'nav:info'))
  if (currentIndex < total - 1) {
    navRow.push(Markup.button.callback(t(lang, 'nextProblem'), 'nav:next'))
  }
  rows.push(navRow)

  rows.push([Markup.button.callback(t(lang, 'backToTopics'), 'topics:back')])

  return Markup.inlineKeyboard(rows)
}

export function mockKeyboard(taskId: string, lang: Lang) {
  const labels = ['A', 'B', 'C', 'D']
  const row1 = labels.slice(0, 2).map(l =>
    Markup.button.callback(l, `mockanswer:${taskId}:${labels.indexOf(l)}`)
  )
  const row2 = labels.slice(2, 4).map(l =>
    Markup.button.callback(l, `mockanswer:${taskId}:${labels.indexOf(l)}`)
  )
  return Markup.inlineKeyboard([row1, row2])
}

export function langKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇬🇧 English', 'lang:en')],
    [Markup.button.callback('🇷🇺 Русский', 'lang:ru')],
  ])
}
