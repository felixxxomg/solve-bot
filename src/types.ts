export type Lang = 'en' | 'ru'

export interface UserProfile {
  id: number
  name: string
  telegram_id: string
  language: Lang
}

export interface UserStats {
  totalSolved: number
  totalCorrect: number
  accuracy: number
  totalTasks: number
  avgScore: number
  byTopic: { topic: string; solved: number; correct: number }[]
  weekActivity: { day: string; solved: number }[]
  lastTests: { id: number; correct: number; total: number; completed_at: string }[]
}

export interface Problem {
  id: number
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options: string[]
  answer: number
}

export interface Category {
  name: string
  count: number
}

export interface Session {
  problems: Problem[]
  currentIndex: number
  answers: Record<number, number>
  type: 'browse' | 'mocktest'
  startedAt?: number
}
