import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Problem, Category } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '..', 'data', 'problems.json')

let cache: Problem[] | null = null

export function loadProblems(): Problem[] {
  if (cache) return cache
  if (!fs.existsSync(DATA_PATH)) {
    cache = []
    return cache
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  cache = JSON.parse(raw) as Problem[]
  return cache
}

export function getCategories(): Category[] {
  const tasks = loadProblems()
  const map = new Map<string, number>()
  for (const t of tasks) {
    map.set(t.topic, (map.get(t.topic) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}

export function getProblemsByTopic(topic: string): Problem[] {
  return loadProblems().filter(p => p.topic === topic)
}

export function getRandomProblems(count: number, topic?: string): Problem[] {
  const pool = topic ? getProblemsByTopic(topic) : loadProblems()
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function getProblem(id: number): Problem | undefined {
  return loadProblems().find(p => p.id === id)
}
