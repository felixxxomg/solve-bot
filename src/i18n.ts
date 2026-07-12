import { Lang } from './types.js'

const strings: Record<Lang, Record<string, string>> = {
  en: {
    start: 'Welcome to CSCA Problem Bot! 🧮\nSolve problems, take mock tests, track your progress.',
    stats: '📊 Your Statistics',
    totalSolved: 'Total solved',
    correct: 'Correct',
    accuracy: 'Accuracy',
    tests: 'Tests',
    avgScore: 'Avg. score',
    tasks: 'Tasks',
    menu: 'Main Menu',
    openApp: '📱 Open App',
    mockTest: '🧪 Mock Test',
    articles: '📖 Articles',
    language: '🌐 Language',
    chooseAnswer: 'Choose your answer:',
    correctAnswer: '✅ Correct!',
    wrongAnswer: '❌ Wrong! Correct answer:',
    noProblems: 'No problems in this topic yet.',
    mockTestTitle: '🧪 Mock Test',
    mockTestStart: 'Starting mock test ({count} problems). Good luck! 🍀',
    mockTestDone: '🎯 Mock Test Complete!\n\nCorrect: {correct}/{total}\nAccuracy: {pct}%',
    languageSet: 'Language set to {lang}',
    chooseLang: 'Choose your language:',
    timeSpent: 'Time: {time}s',
    weekActivity: 'Last 7 days',
    byTopic: 'By topic',
  },
  ru: {
    start: 'Добро пожаловать в CSCA Problem Bot! 🧮\nРешай задачи, проходи мок-тесты и отслеживай прогресс.',
    stats: '📊 Твоя статистика',
    totalSolved: 'Всего решено',
    correct: 'Правильно',
    accuracy: 'Точность',
    tests: 'Тесты',
    avgScore: 'Средний балл',
    tasks: 'Задачи',
    menu: 'Главное меню',
    openApp: '📱 Открыть App',
    mockTest: '🧪 Мок-тест',
    articles: '📖 Статьи',
    language: '🌐 Язык',
    chooseAnswer: 'Выбери ответ:',
    correctAnswer: '✅ Правильно!',
    wrongAnswer: '❌ Неправильно! Правильный ответ:',
    noProblems: 'В этой теме пока нет задач.',
    mockTestTitle: '🧪 Мок-тест',
    mockTestStart: 'Начинаем мок-тест ({count} задач). Удачи! 🍀',
    mockTestDone: '🎯 Мок-тест завершён!\n\nПравильно: {correct}/{total}\nТочность: {pct}%',
    languageSet: 'Язык изменён на {lang}',
    chooseLang: 'Выбери язык:',
    timeSpent: 'Время: {time}с',
    weekActivity: 'Последние 7 дней',
    byTopic: 'По темам',
  }
}

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let text = strings[lang]?.[key] ?? strings.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}
