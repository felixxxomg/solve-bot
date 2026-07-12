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

export function statsKeyboard(lang: Lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'solveTasks'), 'menu:tasks')],
    [Markup.button.callback(t(lang, 'mockTest'), 'menu:mocktest')],
    [Markup.button.callback(t(lang, 'language'), 'menu:lang')],
  ])
}

export function subjectsKeyboard(subjects: Record<string, { name: string }>, lang: Lang) {
  const buttons = Object.entries(subjects).map(([id, s]) =>
    Markup.button.callback(s.name, `subject:${id}`)
  )
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([Markup.button.callback(t(lang, 'backToMenu'), 'menu:main')])
  return Markup.inlineKeyboard(rows)
}

export function topicsKeyboard(topics: { id: number; name: string }[], subjectId: string, lang: Lang) {
  const buttons = topics.map(t =>
    Markup.button.callback(t.name, `topic:${subjectId}:${t.id}`)
  )
  const rows: any[] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  rows.push([Markup.button.callback(t(lang, 'backToSubjects'), 'subjects:back')])
  return Markup.inlineKeyboard(rows)
}

export function problemKeyboard(
  problemId: number,
  options: string[],
  currentIndex: number,
  total: number,
  hasPrev: boolean,
  hasNext: boolean,
  answered: boolean,
  lang: Lang
) {
  const rows: any[] = []

  const labels = ['A', 'B', 'C', 'D']
  const optionButtons = options.map((opt, i) =>
    Markup.button.callback(
      `${labels[i]}`,
      `answer:${problemId}:${i}`
    )
  )
  for (let i = 0; i < optionButtons.length; i += 2) {
    rows.push(optionButtons.slice(i, i + 2))
  }

  const navRow: any[] = []
  if (hasPrev) {
    navRow.push(Markup.button.callback(t(lang, 'prevProblem'), `nav:prev`))
  }
  navRow.push(Markup.button.callback(`${currentIndex + 1}/${total}`, 'nav:info'))
  if (hasNext) {
    navRow.push(Markup.button.callback(t(lang, 'nextProblem'), `nav:next`))
  }
  rows.push(navRow)

  if (answered) {
    rows.push([Markup.button.callback(t(lang, 'solution'), `solution:${problemId}`)])
  }

  rows.push([Markup.button.callback(t(lang, 'backToTopics'), 'topics:back')])

  return Markup.inlineKeyboard(rows)
}

export function mockTestKeyboard(problemId: number, options: string[], lang: Lang) {
  const rows: any[] = []
  const labels = ['A', 'B', 'C', 'D']
  const optionButtons = options.map((opt, i) =>
    Markup.button.callback(
      `${labels[i]}`,
      `mockanswer:${problemId}:${i}`
    )
  )
  for (let i = 0; i < optionButtons.length; i += 2) {
    rows.push(optionButtons.slice(i, i + 2))
  }
  return Markup.inlineKeyboard(rows)
}

export function langKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇬🇧 English', 'lang:en')],
    [Markup.button.callback('🇷🇺 Русский', 'lang:ru')],
  ])
}
