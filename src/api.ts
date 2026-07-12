import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDB, saveDB } from './db.js'
import { UserStats, UserProfile } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface TaskData {
  image: string
  answer: number
  difficulty: string
  topic: string
}

interface TaskWithId extends TaskData {
  id: string
}

let tasksCache: TaskWithId[] | null = null

function loadTasks(): TaskWithId[] {
  if (tasksCache) return tasksCache
  const p = path.join(__dirname, '..', 'data', 'tasks.json')
  if (!fs.existsSync(p)) {
    tasksCache = []
    return tasksCache
  }
  const raw = fs.readFileSync(p, 'utf-8')
  const data: TaskData[] = JSON.parse(raw)
  tasksCache = data.map((t, i) => ({ ...t, id: `task_${String(i + 1).padStart(3, '0')}` }))
  return tasksCache
}

export function reloadTasks() {
  tasksCache = null
  loadTasks()
}

export function imagePath(imageName: string): string {
  return path.join(__dirname, '..', 'images', imageName)
}

export function getTopics(): { id: string; name: string; count: number }[] {
  const tasks = loadTasks()
  const map = new Map<string, number>()
  for (const t of tasks) {
    map.set(t.topic, (map.get(t.topic) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count], i) => ({
    id: `topic_${i}`,
    name,
    count,
  }))
}

export function getTasksByTopic(topicName: string): TaskWithId[] {
  return loadTasks().filter(t => t.topic === topicName)
}

export function getRandomTasks(count: number, topicName?: string): TaskWithId[] {
  let pool = topicName ? getTasksByTopic(topicName) : loadTasks()
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function getTaskAnswer(taskId: string): number | null {
  const tasks = loadTasks()
  const task = tasks.find(t => t.id === taskId)
  return task ? task.answer : null
}

export function getTaskDifficulty(taskId: string): string {
  const tasks = loadTasks()
  const task = tasks.find(t => t.id === taskId)
  return task?.difficulty || 'medium'
}

// ── User / Auth ──

export function authTelegram(telegramId: string, name: string): UserProfile {
  const db = getDB()
  const existing = db.exec("SELECT id, name, telegram_id, language FROM users WHERE telegram_id = ?", [telegramId])
  if (existing.length && existing[0].values.length) {
    const row = existing[0].values[0]
    db.run("UPDATE users SET last_seen = CURRENT_TIMESTAMP, name = ? WHERE id = ?", [name || row[1], row[0]])
    saveDB()
    return { id: row[0], name: row[1], telegram_id: row[2], language: row[3] || 'en' }
  }
  const displayName = name || `tg_${telegramId}`
  db.run("INSERT INTO users (name, telegram_id, language) VALUES (?, ?, 'en')", [displayName, telegramId])
  saveDB()
  const newId = db.exec("SELECT last_insert_rowid() AS id")[0].values[0][0]
  return { id: newId, name: displayName, telegram_id: telegramId, language: 'en' }
}

export function updateLanguage(telegramId: string, language: string): void {
  const db = getDB()
  db.run("UPDATE users SET language = ? WHERE telegram_id = ?", [language, telegramId])
  saveDB()
}

export function saveSolve(userId: number, problemId: string, isCorrect: boolean): void {
  const db = getDB()
  db.run("INSERT INTO solves (user_id, problem_id, is_correct) VALUES (?, ?, ?)", [userId, problemId, isCorrect ? 1 : 0])
  saveDB()
}

export function getStats(userId: number): UserStats {
  const db = getDB()
  const totalSolved = db.exec("SELECT COUNT(*) as c FROM solves WHERE user_id = ?", [userId])
  const totalCorrect = db.exec("SELECT COUNT(*) as c FROM solves WHERE user_id = ? AND is_correct = 1", [userId])
  const ts = totalSolved.length ? totalSolved[0].values[0][0] : 0
  const tc = totalCorrect.length ? totalCorrect[0].values[0][0] : 0
  const accuracy = ts > 0 ? Math.round((tc / ts) * 100) : 0

  const testData = db.exec("SELECT COUNT(*) as c, COALESCE(SUM(correct), 0) as tc FROM test_results WHERE user_id = ?", [userId])
  const totalTests = testData.length ? testData[0].values[0][0] : 0
  const totalTestCorrect = testData.length ? testData[0].values[0][1] : 0

  return { totalSolved: ts, totalCorrect: tc, accuracy, totalTests, avgScore: totalTests > 0 ? Math.round(totalTestCorrect / totalTests) : 0 }
}
