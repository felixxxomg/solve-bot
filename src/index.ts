import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { Telegraf } from 'telegraf'
import { initDB } from './db.js'
import { startHandler } from './handlers/start.js'
import { callbackHandler } from './handlers/callback.js'
import { setCallbackWebappUrl } from './handlers/callback.js'
import { authTelegram, getStats, saveSolve, saveTestResult, getSolveStats } from './api.js'
import { loadProblems, getCategories, getProblemsByTopic, getRandomProblems, getProblem } from './problems.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const token: string = process.env.BOT_TOKEN ?? ''
if (!token) { console.error('BOT_TOKEN missing'); process.exit(1) }

// ─── Platform detection ───────────────────────────────────────────
const isRailway = !!process.env.RAILWAY_PUBLIC_DOMAIN || !!process.env.RAILWAY_URL
const isRender = !!process.env.RENDER_EXTERNAL_URL
const PUBLIC_URL = (process.env.WEBAPP_URL
  || process.env.RENDER_EXTERNAL_URL
  || (isRailway ? `https://${(process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_URL || '').replace(/^https?:\/\//, '')}` : '')).replace(/\/+$/, '')

console.log('=== PLATFORM ===')
console.log('RENDER:', process.env.RENDER)
console.log('RENDER_EXTERNAL_URL:', process.env.RENDER_EXTERNAL_URL)
console.log('RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN)
console.log('WEBAPP_URL (manual):', process.env.WEBAPP_URL)
console.log('PUBLIC_URL (resolved):', `"${PUBLIC_URL}"`)
console.log('================')

// ─── Express ──────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'webapp')))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/debug', (_req, res) => res.json({
  RENDER: process.env.RENDER || null,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || null,
  WEBAPP_URL: process.env.WEBAPP_URL || null,
  RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN || null,
  isRender, isRailway, PUBLIC_URL: PUBLIC_URL || '(empty)',
  PORT: process.env.PORT || null,
}))

app.get('/api/categories', (_req, res) => res.json(getCategories()))
app.get('/api/problems', (req, res) => {
  const topic = req.query.topic as string
  const difficulty = req.query.difficulty as string
  let problems = topic ? getProblemsByTopic(topic) : loadProblems()
  if (difficulty) problems = problems.filter(p => p.difficulty === difficulty)
  res.json(problems)
})
app.get('/api/problems/:id', (req, res) => {
  const problem = getProblem(Number(req.params.id))
  if (!problem) return res.status(404).json({ error: 'Not found' })
  res.json(problem)
})
app.get('/api/problems/random', (req, res) => {
  const count = Math.min(Number(req.query.count) || 10, 50)
  const topic = req.query.topic as string
  res.json(getRandomProblems(count, topic))
})
app.get('/api/stats', (req, res) => {
  const userId = Number(req.query.user_id)
  if (!userId) return res.json({})
  res.json(getStats(userId))
})
app.post('/api/solve', (req, res) => {
  const { user_id, problem_id, is_correct, topic } = req.body
  if (!user_id || !problem_id) return res.json({ success: false })
  saveSolve(user_id, problem_id, is_correct, topic || '')
  res.json({ success: true })
})
app.post('/api/test/complete', (req, res) => {
  const { user_id, correct, wrong, total } = req.body
  if (!user_id) return res.json({ success: false })
  saveTestResult(user_id, correct || 0, wrong || 0, total || 0)
  res.json({ success: true, id: 0 })
})
app.get('/api/solves', (req, res) => {
  const userId = Number(req.query.user_id)
  const problemIds = (req.query.ids as string || '').split(',').map(Number).filter(Boolean)
  const map = getSolveStats(userId, problemIds)
  res.json(Object.fromEntries(map))
})
app.get('/api/profile', (req, res) => {
  const tgId = req.query.telegram_id as string
  if (!tgId) return res.status(400).json({ error: 'Missing telegram_id' })
  res.json(authTelegram(tgId, ''))
})

const PORT = Number(process.env.PORT) || 8080
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// ─── Bot ──────────────────────────────────────────────────────────
setCallbackWebappUrl(PUBLIC_URL)
const bot = new Telegraf(token, { handlerTimeout: 30_000 })
bot.start(startHandler)
bot.on('callback_query', callbackHandler)

async function main() {
  await initDB()
  console.log('Database initialized')

  if (loadProblems().length === 0) {
    console.log('No problems found. Create data/problems.json with your tasks.')
  }

  if (PUBLIC_URL) {
    const whPath = `/telegraf/${token.substring(0, 8)}`
    app.use(whPath, bot.webhookCallback(whPath))
    await bot.telegram.setWebhook(`${PUBLIC_URL}${whPath}`, { drop_pending_updates: true })
    console.log(`🤖 Webhook set: ${PUBLIC_URL}${whPath}`)
  } else {
    await bot.launch()
    console.log('🤖 Bot polling started')
  }

  console.log(`📱 Mini App: ${PUBLIC_URL || '(not set)'}`)
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close() })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close() })
