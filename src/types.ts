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
  totalTests: number
  avgScore: number
}

export interface Session {
  tasks: TaskItem[]
  currentIndex: number
  answers: Record<string, number>
  type: 'browse' | 'mocktest'
  startedAt?: number
}

export interface TaskItem {
  id: string
  image: string
  answer: number
  difficulty: string
  topic: string
}
