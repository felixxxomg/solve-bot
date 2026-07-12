import { getDB, saveDB } from './db.js'
import { UserProfile, UserStats } from './types.js'

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
  getDB().run("UPDATE users SET language = ? WHERE telegram_id = ?", [language, telegramId])
  saveDB()
}

export function saveSolve(userId: number, problemId: number, isCorrect: boolean, topic: string): void {
  getDB().run("INSERT INTO solves (user_id, problem_id, is_correct, topic) VALUES (?, ?, ?, ?)",
    [userId, problemId, isCorrect ? 1 : 0, topic])
  saveDB()
}

export function saveTestResult(userId: number, correct: number, wrong: number, total: number): void {
  getDB().run("INSERT INTO test_results (user_id, correct, wrong, total) VALUES (?, ?, ?, ?)",
    [userId, correct, wrong, total])
  saveDB()
}

export function getStats(userId: number): UserStats {
  const db = getDB()
  const totalSolved = db.exec("SELECT COUNT(*) as c FROM solves WHERE user_id = ?", [userId])
  const totalCorrect = db.exec("SELECT COUNT(*) as c FROM solves WHERE user_id = ? AND is_correct = 1", [userId])
  const ts = totalSolved.length ? totalSolved[0].values[0][0] : 0
  const tc = totalCorrect.length ? totalCorrect[0].values[0][0] : 0
  const accuracy = ts > 0 ? Math.round((tc / ts) * 100) : 0

  const testData = db.exec("SELECT COUNT(*) as c, COALESCE(SUM(correct), 0) as tc, COALESCE(SUM(wrong), 0) as tw, COALESCE(SUM(total), 0) as tt FROM test_results WHERE user_id = ?", [userId])
  const totalTests = testData.length ? testData[0].values[0][0] : 0
  const totalTestCorrect = testData.length ? testData[0].values[0][1] : 0
  const totalTestTotal = testData.length ? testData[0].values[0][3] : 0
  const avgScore = totalTestTotal > 0 ? Math.round((totalTestCorrect / totalTestTotal) * 100) : 0

  const byTopicRows = db.exec("SELECT topic, COUNT(*) as solved, SUM(is_correct) as correct FROM solves WHERE user_id = ? AND topic != '' GROUP BY topic ORDER BY solved DESC", [userId])
  const byTopic: { topic: string; solved: number; correct: number }[] = []
  if (byTopicRows.length) {
    for (const row of byTopicRows[0].values) {
      byTopic.push({ topic: row[0], solved: row[1], correct: row[2] })
    }
  }

  const weekRows = db.exec("SELECT date(solved_at) as day, COUNT(*) as c FROM solves WHERE user_id = ? AND solved_at >= datetime('now', '-7 days') GROUP BY day ORDER BY day", [userId])
  const weekActivity: { day: string; solved: number }[] = []
  if (weekRows.length) {
    for (const row of weekRows[0].values) {
      weekActivity.push({ day: row[0], solved: row[1] })
    }
  }

  const testRows = db.exec("SELECT id, correct, total, completed_at FROM test_results WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10", [userId])
  const lastTests: { id: number; correct: number; total: number; completed_at: string }[] = []
  if (testRows.length) {
    for (const row of testRows[0].values) {
      lastTests.push({ id: row[0], correct: row[1], total: row[2], completed_at: row[3] })
    }
  }

  return {
    totalSolved: ts, totalCorrect: tc, accuracy,
    totalTasks: totalTests, avgScore,
    byTopic, weekActivity, lastTests,
  }
}

export function getSolveStats(userId: number, problemIds: number[]): Map<number, boolean> {
  if (problemIds.length === 0) return new Map()
  const db = getDB()
  const result = new Map<number, boolean>()
  for (const pid of problemIds) {
    const rows = db.exec("SELECT is_correct FROM solves WHERE user_id = ? AND problem_id = ? ORDER BY id DESC LIMIT 1", [userId, pid])
    if (rows.length && rows[0].values.length) {
      result.set(pid, rows[0].values[0][0] === 1)
    }
  }
  return result
}
