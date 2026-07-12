import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite')

let db: any = null

export async function initDB() {
  const SQL = await initSqlJs()
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON;')
  createTables()
  seedIfEmpty()
  return db
}

export function getDB() {
  return db
}

export function saveDB() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, display_order INTEGER DEFAULT 0
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id TEXT NOT NULL,
    name TEXT NOT NULL, display_order INTEGER DEFAULT 0,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id TEXT NOT NULL,
    topic_id INTEGER NOT NULL, difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')) NOT NULL,
    question TEXT NOT NULL, options TEXT NOT NULL, answer TEXT NOT NULL,
    solution TEXT NOT NULL DEFAULT '[]', source_type TEXT DEFAULT '', source_name TEXT DEFAULT '',
    bank_id INTEGER UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    telegram_id TEXT UNIQUE DEFAULT '', language TEXT DEFAULT 'en',
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP, last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL, is_correct INTEGER DEFAULT 0,
    solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    correct INTEGER DEFAULT 0, wrong INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`)
}

function seedIfEmpty() {
  const count = db.exec("SELECT COUNT(*) FROM subjects")
  if (count.length && count[0].values[0][0] > 0) return

  const subjects = [
    ['math', 'Mathematics', 1],
    ['physics', 'Physics', 2],
    ['chemistry', 'Chemistry', 3],
    ['chinese', 'Chinese Language', 4],
  ]
  const subStmt = db.prepare('INSERT INTO subjects (id, name, display_order) VALUES (?, ?, ?)')
  subjects.forEach((s: any) => subStmt.run(s))
  subStmt.free()

  const topicSeed: Record<string, string[]> = {
    math: ['Sets & Inequalities', 'Logarithms', 'Trigonometry', 'Functions', 'Lines & Slope', 'Conic Sections', 'Vectors', 'Complex Numbers', 'Sequences & Series', 'Probability Theory'],
    physics: ['Kinematics', 'Dynamics', 'Work & Energy', 'Electrostatics', 'Circuits', 'Oscillations & Waves'],
    chemistry: ['Atomic Structure', 'Chemical Bonding', 'Stoichiometry', 'Organic Chemistry'],
    chinese: ['HSK 1-2 Vocabulary', 'Grammar Particles', 'Sentence Structure', 'Reading Comprehension'],
  }

  const topicStmt = db.prepare('INSERT INTO topics (subject_id, name, display_order) VALUES (?, ?, ?)')
  Object.entries(topicSeed).forEach(([subj, topics]) => {
    topics.forEach((t, i) => topicStmt.run([subj, t, i + 1]))
  })
  topicStmt.free()

  const tidMap: Record<string, number> = {}
  const trows = db.exec('SELECT id, name FROM topics')
  if (trows.length) trows[0].values.forEach((r: any[]) => tidMap[r[1]] = r[0])

  const pStmt = db.prepare(`INSERT INTO problems (subject_id, topic_id, difficulty, question, options, answer, solution, source_type, source_name, bank_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const problems: any[] = [
    // ── Sets & Inequalities ──
    { s: 'math', t: 'Sets & Inequalities', d: 'easy', q: 'If $ A = \\{1, 2, 3\\} $ and $ B = \\{3, 4, 5\\} $, what is $ A \\cup B $?', o: '["$ \\\\{3\\\\} $","$ \\\\{1, 2, 3, 4, 5\\\\} $","$ \\\\{1, 2, 4, 5\\\\} $","$ \\\\{1, 2\\\\} $"]', a: '$ \\{1, 2, 3, 4, 5\\} $', sol: '["Union combines all unique elements: $ \\\\{1,2,3,4,5\\\\} $"]', st: 'mock', sn: 'CSCA Mock #1', bid: 526001 },
    { s: 'math', t: 'Sets & Inequalities', d: 'easy', q: 'What is $ A \\cap B $ if $ A = \\{1, 2, 3\\} $ and $ B = \\{3, 4, 5\\} $?', o: '["$ \\\\{3\\\\} $","$ \\\\{1, 2, 3, 4, 5\\\\} $","$ \\\\{1, 2, 4, 5\\\\} $","$ \\\\{1, 2\\\\} $"]', a: '$ \\{3\\} $', sol: '["Intersection contains only common elements: $ 3 $"]', st: 'mock', sn: 'CSCA Mock #1', bid: 526002 },
    { s: 'math', t: 'Sets & Inequalities', d: 'medium', q: 'Find the domain of $ f(x) = \\sqrt{x^2 - 4} $.', o: '["$ (-\\\\infty, \\\\infty) $","$ [-2, 2] $","$ (-\\\\infty, -2] \\\\cup [2, \\\\infty) $","$ (0, \\\\infty) $"]', a: '$ (-\\infty, -2] \\cup [2, \\infty) $', sol: '["$ x^2 - 4 \\\\ge 0 $","$ x \\\\le -2 $ or $ x \\\\ge 2 $"]', st: 'real', sn: 'CSCA 2024', bid: 526003 },
    { s: 'math', t: 'Sets & Inequalities', d: 'hard', q: 'Find domain of $ f(x) = \\sqrt{\\log_{0.5}(x^2 - 5x + 6)} $.', o: '["$ [2, 3] $","$ (-\\\\infty, 2] $","$ (2, 3) $","$ \\\\emptyset $"]', a: '$ [2, 3] $', sol: '["$ x^2 - 5x + 6 > 0 $","$ \\\\log_{0.5}(...) \\\\ge 0 \\\\Rightarrow x^2 - 5x + 6 \\\\le 1 $","Intersection: $ [2,3] $"]', st: 'author', sn: '', bid: 526004 },
    { s: 'math', t: 'Sets & Inequalities', d: 'medium', q: 'Solve $ |x - 3| < 5 $.', o: '["$ (-2, 8) $","$ (-\\\\infty, -2) \\\\cup (8, \\\\infty) $","$ (-8, 2) $","$ (2, 8) $"]', a: '$ (-2, 8) $', sol: '["$ -5 < x - 3 < 5 $","$ -2 < x < 8 $"]', st: 'real', sn: 'CSCA 2023', bid: 526005 },

    // ── Logarithms ──
    { s: 'math', t: 'Logarithms', d: 'easy', q: 'Evaluate: $ \\log_2 8 + \\log_3 9 - \\log_5 25 $.', o: '["$ 1 $","$ 2 $","$ 3 $","$ 4 $"]', a: '$ 3 $', sol: '["$ \\\\log_2 8 = 3 $","$ \\\\log_3 9 = 2 $","$ \\\\log_5 25 = 2 $","$ 3+2-2=3 $"]', st: 'mock', sn: 'CSCA Mock #11', bid: 526006 },
    { s: 'math', t: 'Logarithms', d: 'medium', q: 'Solve for $ x $: $ \\log_2 x = 5 $.', o: '["$ 10 $","$ 25 $","$ 32 $","$ 64 $"]', a: '$ 32 $', sol: '["$ 2^5 = x $","$ x = 32 $"]', st: 'mock', sn: 'CSCA Mock #9', bid: 526007 },
    { s: 'math', t: 'Logarithms', d: 'medium', q: 'Simplify: $ \\log_3 27 + \\log_3 1 $.', o: '["$ 0 $","$ 1 $","$ 3 $","$ 81 $"]', a: '$ 3 $', sol: '["$ \\\\log_3 27 = 3 $","$ \\\\log_3 1 = 0 $","$ 3 + 0 = 3 $"]', st: 'mock', sn: 'CSCA Mock #10', bid: 526008 },
    { s: 'math', t: 'Logarithms', d: 'hard', q: 'If $ \\log_a 16 = 4 $, find $ a $.', o: '["$ 2 $","$ 4 $","$ 8 $","$ 16 $"]', a: '$ 2 $', sol: '["$ a^4 = 16 $","$ a = \\\\sqrt[4]{16} = 2 $"]', st: 'real', sn: 'CSCA 2025', bid: 526009 },

    // ── Trigonometry ──
    { s: 'math', t: 'Trigonometry', d: 'easy', q: 'In $ \\triangle ABC $, $ C = 90^\\circ $. If $ AB=10 $ and $ \\sin A = \\frac{7}{25} $, find $ AC $.', o: '["$ 24 $","$ 7 $","$ 10 $","$ \\\\sqrt{51} $"]', a: '$ 24 $', sol: '["$ \\\\cos A = \\\\frac{24}{25} $","$ AC = 10 \\\\cdot \\\\frac{24}{25} = 9.6 $"]', st: 'real', sn: 'CSCA 2026 Main Wave', bid: 526010 },
    { s: 'math', t: 'Trigonometry', d: 'easy', q: 'What is $ \\sin^2 \\theta + \\cos^2 \\theta $ equal to?', o: '["$ 0 $","$ 1 $","$ 2 $","$ -1 $"]', a: '$ 1 $', sol: '["By the Pythagorean identity: $ \\\\sin^2 \\\\theta + \\\\cos^2 \\\\theta = 1 $"]', st: 'mock', sn: 'CSCA Mock #2', bid: 526011 },
    { s: 'math', t: 'Trigonometry', d: 'medium', q: 'If $ \\sin \\theta = \\frac{3}{5} $ and $ \\theta $ is acute, find $ \\cos \\theta $.', o: '["$ \\\\frac{2}{5} $","$ \\\\frac{4}{5} $","$ \\\\frac{3}{5} $","$ \\\\frac{5}{3} $"]', a: '$ \\frac{4}{5} $', sol: '["$ \\\\cos^2 \\\\theta = 1 - \\\\sin^2 \\\\theta = 1 - \\\\frac{9}{25} = \\\\frac{16}{25} $","$ \\\\cos \\\\theta = \\\\frac{4}{5} $"]', st: 'real', sn: 'CSCA 2025', bid: 526012 },
    { s: 'math', t: 'Trigonometry', d: 'hard', q: 'Find $ \\tan 60^\\circ $.', o: '["$ 1 $","$ \\\\sqrt{2} $","$ \\\\sqrt{3} $","$ \\\\frac{1}{\\\\sqrt{3}} $"]', a: '$ \\sqrt{3} $', sol: '["$ \\\\tan 60^\\\\circ = \\\\frac{\\\\sin 60}{\\\\cos 60} = \\\\frac{\\\\sqrt{3}/2}{1/2} = \\\\sqrt{3} $"]', st: 'mock', sn: 'CSCA Mock #3', bid: 526013 },

    // ── Functions ──
    { s: 'math', t: 'Functions', d: 'easy', q: 'What is the domain of $ f(x) = \\frac{1}{x-2} $?', o: '["$ \\\\mathbb{R} $","$ \\\\mathbb{R} \\\\setminus \\\\{2\\\\} $","$ x > 2 $","$ x < 2 $"]', a: '$ \\mathbb{R} \\setminus \\{2\\} $', sol: '["Denominator cannot be zero: $ x-2 \\\\neq 0 $","$ x \\\\neq 2 $"]', st: 'mock', sn: 'CSCA Mock #5', bid: 526014 },
    { s: 'math', t: 'Functions', d: 'medium', q: 'If $ f(x) = 2x + 3 $, what is $ f^{-1}(x) $?', o: '["$ \\\\frac{x-3}{2} $","$ \\\\frac{x+3}{2} $","$ 2x - 3 $","$ \\\\frac{3-x}{2} $"]', a: '$ \\frac{x-3}{2} $', sol: '["$ y = 2x + 3 $","$ x = 2y + 3 $","$ f^{-1}(x) = \\\\frac{x-3}{2} $"]', st: 'real', sn: 'CSCA 2024', bid: 526015 },
    { s: 'math', t: 'Functions', d: 'hard', q: 'Find the range of $ f(x) = x^2 - 4x + 5 $.', o: '["$ (-\\\\infty, \\\\infty) $","$ [1, \\\\infty) $","$ (-\\\\infty, 1] $","$ [5, \\\\infty) $"]', a: '$ [1, \\infty) $', sol: '["Complete square: $ x^2 - 4x + 5 = (x-2)^2 + 1 $","Minimum at $ x=2 $, value $ 1 $","Range: $ [1, \\\\infty) $"]', st: 'author', sn: '', bid: 526016 },

    // ── Lines & Slope ──
    { s: 'math', t: 'Lines & Slope', d: 'easy', q: 'What is the slope of the line $ y = 3x + 2 $?', o: '["$ 2 $","$ 3 $","$ -3 $","$ \\\\frac{1}{3} $"]', a: '$ 3 $', sol: '["Slope-intercept form: $ y = mx + b $","$ m = 3 $"]', st: 'mock', sn: 'CSCA Mock #4', bid: 526017 },
    { s: 'math', t: 'Lines & Slope', d: 'medium', q: 'Find the equation of line through $ (2, 3) $ with slope $ 4 $.', o: '["$ y = 4x - 5 $","$ y = 4x + 3 $","$ y = 2x - 4 $","$ y = 4x + 5 $"]', a: '$ y = 4x - 5 $', sol: '["$ y - 3 = 4(x - 2) $","$ y = 4x - 8 + 3 = 4x - 5 $"]', st: 'real', sn: 'CSCA 2023', bid: 526018 },
    { s: 'math', t: 'Lines & Slope', d: 'hard', q: 'Find the distance between $ (1, 2) $ and $ (4, 6) $.', o: '["$ 3 $","$ 4 $","$ 5 $","$ 7 $"]', a: '$ 5 $', sol: '["$ d = \\\\sqrt{(4-1)^2 + (6-2)^2} $","$ = \\\\sqrt{9 + 16} = \\\\sqrt{25} = 5 $"]', st: 'mock', sn: 'CSCA Mock #6', bid: 526019 },

    // ── Probability Theory ──
    { s: 'math', t: 'Probability Theory', d: 'easy', q: 'What is the probability of rolling a 3 on a fair 6-sided die?', o: '["$ \\\\frac{1}{2} $","$ \\\\frac{1}{3} $","$ \\\\frac{1}{6} $","$ \\\\frac{1}{4} $"]', a: '$ \\frac{1}{6} $', sol: '["One favorable outcome out of six possible: $ \\\\frac{1}{6} $"]', st: 'mock', sn: 'CSCA Mock #7', bid: 526020 },
    { s: 'math', t: 'Probability Theory', d: 'medium', q: 'A bag has 3 red and 5 blue marbles. Probability of drawing a red one?', o: '["$ \\\\frac{3}{8} $","$ \\\\frac{5}{8} $","$ \\\\frac{3}{5} $","$ \\\\frac{1}{8} $"]', a: '$ \\frac{3}{8} $', sol: '["Total marbles: 8","Favorable (red): 3","$ P = \\\\frac{3}{8} $"]', st: 'real', sn: 'CSCA 2024', bid: 526021 },
    { s: 'math', t: 'Probability Theory', d: 'hard', q: 'What is the probability of getting exactly 2 heads in 3 coin flips?', o: '["$ \\\\frac{1}{4} $","$ \\\\frac{3}{8} $","$ \\\\frac{1}{2} $","$ \\\\frac{5}{8} $"]', a: '$ \\frac{3}{8} $', sol: '["Total outcomes: $ 2^3 = 8 $","Favorable: HHT, HTH, THH = 3","$ P = \\\\frac{3}{8} $"]', st: 'author', sn: '', bid: 526022 },

    // ── Vectors ──
    { s: 'math', t: 'Vectors', d: 'easy', q: 'What is the dot product of $ \\vec{a} = (2, 3) $ and $ \\vec{b} = (4, -1) $?', o: '["$ 5 $","$ 10 $","$ 8 $","$ 11 $"]', a: '$ 5 $', sol: '["$ 2 \\\\cdot 4 + 3 \\\\cdot (-1) = 8 - 3 = 5 $"]', st: 'mock', sn: 'CSCA Mock #8', bid: 526023 },
    { s: 'math', t: 'Vectors', d: 'medium', q: 'Find the magnitude of $ \\vec{v} = (3, 4) $.', o: '["$ 5 $","$ 7 $","$ 12 $","$ 25 $"]', a: '$ 5 $', sol: '["$ |\\\\vec{v}| = \\\\sqrt{3^2 + 4^2} = \\\\sqrt{25} = 5 $"]', st: 'real', sn: 'CSCA 2025', bid: 526024 },

    // ── Complex Numbers ──
    { s: 'math', t: 'Complex Numbers', d: 'easy', q: 'Simplify $ (3 + 2i) + (1 - 4i) $.', o: '["$ 4 - 2i $","$ 2 + 6i $","$ 4 + 6i $","$ 4 - 6i $"]', a: '$ 4 - 2i $', sol: '["$ (3+1) + (2-4)i = 4 - 2i $"]', st: 'mock', sn: 'CSCA Mock #9', bid: 526025 },
    { s: 'math', t: 'Complex Numbers', d: 'medium', q: 'What is $ i^2 $?', o: '["$ 1 $","$ -1 $","$ i $","$ -i $"]', a: '$ -1 $', sol: '["By definition: $ i = \\\\sqrt{-1} $, so $ i^2 = -1 $"]', st: 'mock', sn: 'CSCA Mock #10', bid: 526026 },

    // ── Sequences & Series ──
    { s: 'math', t: 'Sequences & Series', d: 'easy', q: 'Find the 5th term of arithmetic sequence: $ 2, 5, 8, 11, ... $', o: '["$ 12 $","$ 14 $","$ 16 $","$ 18 $"]', a: '$ 14 $', sol: '["Common difference: $ d = 3 $","$ a_5 = 2 + (5-1)\\\\cdot 3 = 2 + 12 = 14 $"]', st: 'mock', sn: 'CSCA Mock #11', bid: 526027 },
    { s: 'math', t: 'Sequences & Series', d: 'medium', q: 'Sum of infinite geometric series: $ 1 + \\frac{1}{2} + \\frac{1}{4} + ... $?', o: '["$ 1.5 $","$ 2 $","$ 3 $","$ \\\\infty $"]', a: '$ 2 $', sol: '["$ S = \\\\frac{a}{1-r} = \\\\frac{1}{1-1/2} = 2 $"]', st: 'real', sn: 'CSCA 2026', bid: 526028 },

    // ── Physics: Kinematics ──
    { s: 'physics', t: 'Kinematics', d: 'easy', q: 'A car travels at 20 m/s for 15 s. How far does it go?', o: '["150 m","200 m","300 m","400 m"]', a: '300 m', sol: '["$ s = v \\\\cdot t = 20 \\\\cdot 15 = 300 $ m"]', st: 'mock', sn: 'Physics Mock #1', bid: 526029 },
    { s: 'physics', t: 'Kinematics', d: 'medium', q: 'A ball dropped from rest. Speed after 3 s? ($ g = 10 $ m/s²)', o: '["10 m/s","20 m/s","30 m/s","40 m/s"]', a: '30 m/s', sol: '["$ v = g \\\\cdot t = 10 \\\\cdot 3 = 30 $ m/s"]', st: 'mock', sn: 'Physics Mock #2', bid: 526030 },

    // ── Physics: Dynamics ──
    { s: 'physics', t: 'Dynamics', d: 'easy', q: 'A 5 kg block pulled with 20 N on frictionless surface. Acceleration?', o: '["2 m/s²","4 m/s²","5 m/s²","10 m/s²"]', a: '4 m/s²', sol: '["$ F = ma $","$ a = 20/5 = 4 $ m/s²"]', st: 'mock', sn: 'Physics Mock #1', bid: 526031 },

    // ── Chemistry: Atomic Structure ──
    { s: 'chemistry', t: 'Atomic Structure', d: 'easy', q: 'How many protons in a neutral carbon atom?', o: '["4","6","8","12"]', a: '6', sol: '["Carbon has atomic number 6, so 6 protons."]', st: 'mock', sn: 'Chemistry Mock #1', bid: 526032 },

    // ── Chinese: HSK Vocabulary ──
    { s: 'chinese', t: 'HSK 1-2 Vocabulary', d: 'easy', q: 'What does 谢谢 (xièxie) mean?', o: '["Hello","Thank you","Goodbye","Sorry"]', a: 'Thank you', sol: '["谢谢 = thank you"]', st: 'mock', sn: 'HSK Practice #1', bid: 526033 },
  ]

  problems.forEach(p => {
    pStmt.run([p.s, tidMap[p.t], p.d, p.q, p.o, p.a, p.sol, p.st, p.sn, p.bid])
  })
  pStmt.free()
  saveDB()
}
