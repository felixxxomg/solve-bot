export type Difficulty = 'easy' | 'medium' | 'hard'

export type Lang = 'en' | 'ru'

export interface Problem {
  id: number
  bank_id: number | null
  subject_id: string
  topic_id: number
  topic_name?: string
  difficulty: Difficulty
  question: string
  options: string[]
  answer: string
  solution: string[]
  source_type: string
  source_name: string
}

export interface Category {
  id: number
  name: string
  problem_count: number
}

export interface UserStats {
  totalSolved: number
  totalCorrect: number
  accuracy: number
  totalTests: number
  avgScore: number
}

export interface UserProfile {
  id: number
  name: string
  telegram_id: string
  language: Lang
}

export interface Session {
  problems: Problem[]
  currentIndex: number
  answers: Record<number, number>
  type: 'browse' | 'mocktest'
  startedAt?: number
}
