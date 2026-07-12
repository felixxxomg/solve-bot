import { getDB, saveDB } from './db.js'
import { Problem, Category, UserStats, UserProfile } from './types.js'

function rowToProblem(row: any): Problem {
  return {
    id: row.id,
    bank_id: row.bank_id ?? null,
    subject_id: row.subject_id,
    topic_id: row.topic_id,
    topic_name: row.topic_name || '',
    difficulty: row.difficulty,
    question: row.question,
    options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
    answer: row.answer,
    solution: typeof row.solution === 'string' ? JSON.parse(row.solution) : row.solution,
    source_type: row.source_type || '',
    source_name: row.source_name || '',
  }
}

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

export function getSubjects(): Record<string, { name: string }> {
  const db = getDB()
  const rows = db.exec('SELECT * FROM subjects ORDER BY display_order')
  const subjects: Record<string, { name: string }> = {}
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      subjects[row[0]] = { name: row[1] }
    }
  }
  return subjects
}

export function getCategories(subjectId: string): Category[] {
  const db = getDB()
  const rows = db.exec(`
    SELECT t.id, t.name, COUNT(p.id) as problem_count
    FROM topics t LEFT JOIN problems p ON p.topic_id = t.id AND p.subject_id = ?
    WHERE t.subject_id = ?
    GROUP BY t.id ORDER BY t.display_order, t.name
  `, [subjectId, subjectId])
  const cats: Category[] = []
  if (rows.length) {
    for (const row of rows[0].values) {
      cats.push({ id: row[0], name: row[1], problem_count: row[2] })
    }
  }
  return cats
}

export function getProblems(subject: string, topicId?: number, sort?: string): Problem[] {
  const db = getDB()
  let sql = 'SELECT p.*, t.name AS topic_name FROM problems p LEFT JOIN topics t ON p.topic_id = t.id WHERE p.subject_id = ?'
  const params: any[] = [subject]

  if (topicId) {
    sql += ' AND p.topic_id = ?'
    params.push(topicId)
  }

  if (sort === 'oldest') sql += ' ORDER BY p.id ASC'
  else if (sort === 'easiest') sql += " ORDER BY CASE p.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END"
  else if (sort === 'hardest') sql += " ORDER BY CASE p.difficulty WHEN 'hard' THEN 1 WHEN 'medium' THEN 2 WHEN 'easy' THEN 3 END"
  else sql += ' ORDER BY p.id DESC'

  const stmt = db.prepare(sql)
  stmt.bind(params)
  const problems: Problem[] = []
  while (stmt.step()) {
    problems.push(rowToProblem(stmt.getAsObject()))
  }
  stmt.free()
  return problems
}

export function getRandomProblems(subject: string, count: number): Problem[] {
  const db = getDB()
  const n = Math.min(Math.max(count, 1), 50)
  const sql = 'SELECT p.*, t.name AS topic_name FROM problems p LEFT JOIN topics t ON p.topic_id = t.id WHERE p.subject_id = ? ORDER BY RANDOM() LIMIT ?'
  const stmt = db.prepare(sql)
  stmt.bind([subject, n])
  const problems: Problem[] = []
  while (stmt.step()) {
    problems.push(rowToProblem(stmt.getAsObject()))
  }
  stmt.free()
  return problems
}

export function saveSolve(userId: number, problemId: number, isCorrect: boolean): void {
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

  return {
    totalSolved: ts,
    totalCorrect: tc,
    accuracy,
    totalTests,
    avgScore: totalTests > 0 ? Math.round(totalTestCorrect / totalTests) : 0,
  }
}
