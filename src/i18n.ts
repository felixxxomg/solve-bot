import { Lang } from './types.js'

const strings: Record<Lang, Record<string, string>> = {
  en: {
    start: 'Welcome to CSCA Problem Bot! 🧮\nSolve problems, take mock tests, and track your progress.',
    stats: '📊 Your Statistics',
    totalSolved: 'Total solved',
    correct: 'Correct',
    accuracy: 'Accuracy',
    tests: 'Tests',
    avgScore: 'Avg. score',
    menu: 'Main Menu',
    solveTasks: '📚 Solve Tasks',
    mockTest: '🧪 Mock Test',
    language: '🌐 Language',
    chooseSubject: 'Choose a subject:',
    chooseTopic: 'Choose a topic:',
    chooseAnswer: 'Choose your answer:',
    backToTopics: '◀ Back to topics',
    backToSubjects: '◀ Back to subjects',
    backToMenu: '◀ Main Menu',
    prevProblem: '◀',
    nextProblem: '▶',
    correctAnswer: '✅ Correct!',
    wrongAnswer: '❌ Wrong! Correct answer:',
    solution: '💡 Solution',
    taskProgress: 'Task {current} of {total}',
    noProblems: 'No problems in this topic yet.',
    mockTestTitle: '🧪 Mock Test',
    mockTestStart: 'Starting mock test ({count} problems). Good luck! 🍀',
    mockTestDone: '🎯 Mock Test Complete!\n\nCorrect: {correct}/{total}\nAccuracy: {pct}%',
    result: 'Result',
    languageSet: 'Language set to {lang}',
    langEn: 'English',
    langRu: 'Русский',
    chooseLang: 'Choose your language:',
    timeSpent: 'Time: {time}s',
  },
  ru: {
    start: 'Добро пожаловать в CSCA Problem Bot! 🧮\nРешай задачи, проходи мок-тесты и отслеживай прогресс.',
    stats: '📊 Твоя статистика',
    totalSolved: 'Всего решено',
    correct: 'Правильно',
    accuracy: 'Точность',
    tests: 'Тесты',
    avgScore: 'Средний балл',
    menu: 'Главное меню',
    solveTasks: '📚 Решать задачи',
    mockTest: '🧪 Мок-тест',
    language: '🌐 Язык',
    chooseSubject: 'Выбери предмет:',
    chooseTopic: 'Выбери тему:',
    chooseAnswer: 'Выбери ответ:',
    backToTopics: '◀ Назад к темам',
    backToSubjects: '◀ Назад к предметам',
    backToMenu: '◀ Главное меню',
    prevProblem: '◀',
    nextProblem: '▶',
    correctAnswer: '✅ Правильно!',
    wrongAnswer: '❌ Неправильно! Правильный ответ:',
    solution: '💡 Решение',
    taskProgress: 'Задача {current} из {total}',
    noProblems: 'В этой теме пока нет задач.',
    mockTestTitle: '🧪 Мок-тест',
    mockTestStart: 'Начинаем мок-тест ({count} задач). Удачи! 🍀',
    mockTestDone: '🎯 Мок-тест завершён!\n\nПравильно: {correct}/{total}\nТочность: {pct}%',
    result: 'Результат',
    languageSet: 'Язык изменён на {lang}',
    langEn: 'English',
    langRu: 'Русский',
    chooseLang: 'Выбери язык:',
    timeSpent: 'Время: {time}с',
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
