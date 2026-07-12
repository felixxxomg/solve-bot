// ─── Telegram Mini App ────────────────────────────────────────────
const tg = window.Telegram?.WebApp
if (tg) {
  tg.expand()
  tg.ready()
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor)
}

const API = ''
let userId = null
let userData = null
let allProblems = []
let currentTopic = null
let currentProblems = []
let currentIdx = 0
let answers = {}
let mockMode = false
let mockCorrect = 0
let mockTotal = 0
let viewHistory = []

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  userData = tg?.initDataUnsafe?.user
  if (userData) {
    const res = await fetch(`${API}/api/profile?telegram_id=${userData.id}`)
    const profile = await res.json()
    userId = profile.id
  }
  loadCategories()
}

async function loadCategories() {
  const res = await fetch(`${API}/api/categories`)
  const cats = await res.json()
  renderCategories(cats)
}

async function loadStats() {
  if (!userId) return
  const res = await fetch(`${API}/api/stats?user_id=${userId}`)
  return res.json()
}

// ─── Render: Categories ───────────────────────────────────────────
function renderCategories(cats) {
  const content = document.getElementById('content')
  const title = document.getElementById('title')

  if (tg) tg.BackButton?.hide()
  title.textContent = 'CSCA'
  viewHistory = ['categories']

  Promise.all([loadStats(), Promise.resolve(cats)]).then(([stats]) => {
    let html = ''
    if (stats) {
      html += `<div class="stats-grid">
        <div class="stat-box"><div class="num">${stats.totalSolved || 0}</div><div class="label">Solved</div></div>
        <div class="stat-box"><div class="num">${stats.accuracy || 0}%</div><div class="label">Accuracy</div></div>
        <div class="stat-box"><div class="num">${stats.totalTasks || 0}</div><div class="label">Tests</div></div>
        <div class="stat-box"><div class="num">${stats.avgScore || 0}%</div><div class="label">Avg Score</div></div>
      </div>`
    }

    html += `<div class="filters">
      <button class="filter-btn active" onclick="loadCategories()">📚 Topics</button>
      <button class="filter-btn" onclick="startMock()">🧪 Mock Test</button>
    </div>`

    cats.forEach(c => {
      html += `<div class="card" onclick="loadTopic('${c.name}')">
        <h3>${c.name}</h3>
        <p>${c.count} problems</p>
      </div>`
    })
    content.innerHTML = html
  })
}

// ─── Render: Problems List ────────────────────────────────────────
async function loadTopic(topic) {
  currentTopic = topic
  viewHistory.push('topic')

  const res = await fetch(`${API}/api/problems?topic=${encodeURIComponent(topic)}`)
  const problems = await res.json()
  currentProblems = problems
  answers = {}
  currentIdx = 0

  renderProblemList()
}

function renderProblemList() {
  const content = document.getElementById('content')
  const title = document.getElementById('title')
  title.textContent = currentTopic

  if (tg) tg.BackButton?.show()

  const solvedMap = new Map()
  if (userId) {
    const ids = currentProblems.map(p => p.id).join(',')
    fetch(`${API}/api/solves?user_id=${userId}&ids=${ids}`)
      .then(r => r.json()).then(data => {
        Object.entries(data).forEach(([id, correct]) => solvedMap.set(Number(id), correct))
        updateListWithSolves(solvedMap)
      })
  }

  let html = `<div class="filters">
    <button class="filter-btn" onclick="startMock('${currentTopic}')">🧪 Mock</button>
    <button class="filter-btn" onclick="loadCategories()">← Back</button>
  </div>`

  currentProblems.forEach((p, i) => {
    html += `<div class="card" onclick="showProblem(${i})">
      <h3>#${p.id} ${p.difficulty.toUpperCase()}</h3>
      <p>${stripLatex(p.question).substring(0, 80)}...</p>
    </div>`
  })
  content.innerHTML = html
  document.getElementById('footer').style.display = 'none'
}

function updateListWithSolves(solvedMap) {
  const cards = document.querySelectorAll('.card')
  currentProblems.forEach((p, i) => {
    if (solvedMap.has(p.id)) {
      const icon = solvedMap.get(p.id) ? '✅' : '❌'
      if (cards[i]) cards[i].querySelector('h3').textContent = `${icon} #${p.id} ${p.difficulty.toUpperCase()}`
    }
  })
}

// ─── Render: Single Problem ───────────────────────────────────────
function showProblem(idx) {
  currentIdx = idx
  const p = currentProblems[idx]
  viewHistory.push('problem')

  const content = document.getElementById('content')
  const title = document.getElementById('title')
  title.textContent = `${currentIdx + 1}/${currentProblems.length}`

  if (tg) tg.BackButton?.show()

  const labels = ['A', 'B', 'C', 'D']
  const answered = answers[p.id] !== undefined

  let html = `<div class="problem-card">
    <div class="problem-text">${renderLatex(p.question)}</div>`

  html += '<div class="options">'
  p.options.forEach((opt, i) => {
    const cls = []
    if (answered) {
      if (i === p.answer) cls.push('correct')
      if (i === answers[p.id] && i !== p.answer) cls.push('wrong')
    } else if (answers[p.id] === i) {
      cls.push('selected')
    }
    html += `<div class="option ${cls.join(' ')}" onclick="${answered ? '' : `selectAnswer(${i})`}">
      <div class="letter">${labels[i]}</div>
      <div class="text">${renderLatex(opt)}</div>
    </div>`
  })
  html += '</div>'

  if (answered) {
    const isCorrect = answers[p.id] === p.answer
    html += `<div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
      ${isCorrect ? '✅ Correct!' : `❌ Wrong! Correct: ${labels[p.answer]}`}
    </div>`
  }

  html += `<div class="nav">
    <button ${currentIdx === 0 ? 'disabled' : ''} onclick="navProblem(-1)">←</button>
    <span>${currentIdx + 1} / ${currentProblems.length}</span>
    <button ${currentIdx >= currentProblems.length - 1 ? 'disabled' : ''} onclick="navProblem(1)">→</button>
  </div>
  </div>`

  content.innerHTML = html
  document.getElementById('footer').style.display = 'none'
}

async function selectAnswer(idx) {
  const p = currentProblems[currentIdx]
  answers[p.id] = idx

  if (userId) {
    await fetch(`${API}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, problem_id: p.id, is_correct: idx === p.answer, topic: currentTopic || '' }),
    })
  }

  showProblem(currentIdx)
}

function navProblem(dir) {
  const newIdx = currentIdx + dir
  if (newIdx < 0 || newIdx >= currentProblems.length) return
  showProblem(newIdx)
}

// ─── Mock Test ────────────────────────────────────────────────────
async function startMock(topic) {
  mockMode = true
  mockCorrect = 0
  mockTotal = 0

  const count = 10
  const url = topic
    ? `${API}/api/problems/random?count=${count}&topic=${encodeURIComponent(topic)}`
    : `${API}/api/problems/random?count=${count}`
  const res = await fetch(url)
  currentProblems = await res.json()
  answers = {}
  currentIdx = 0
  viewHistory.push('mock')

  const title = document.getElementById('title')
  title.textContent = '🧪 Mock Test'
  if (tg) tg.BackButton?.show()

  showMockProblem()
}

function showMockProblem() {
  if (currentIdx >= currentProblems.length) {
    finishMock()
    return
  }

  const p = currentProblems[currentIdx]
  const content = document.getElementById('content')
  const labels = ['A', 'B', 'C', 'D']

  let html = `<div class="problem-card">
    <div style="text-align:center;margin-bottom:12px;font-size:13px;color:var(--tg-theme-hint-color)">
      ${currentIdx + 1} / ${currentProblems.length}
    </div>
    <div class="problem-text">${renderLatex(p.question)}</div>
    <div class="options">`

  p.options.forEach((opt, i) => {
    html += `<div class="option" onclick="mockAnswer(${i})">
      <div class="letter">${labels[i]}</div>
      <div class="text">${renderLatex(opt)}</div>
    </div>`
  })

  html += '</div></div>'
  content.innerHTML = html
  document.getElementById('footer').style.display = 'none'
}

async function mockAnswer(idx) {
  const p = currentProblems[currentIdx]
  const isCorrect = idx === p.answer
  answers[p.id] = idx
  if (isCorrect) mockCorrect++
  mockTotal++

  if (userId) {
    await fetch(`${API}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, problem_id: p.id, is_correct: isCorrect, topic: '' }),
    })
  }

  currentIdx++
  setTimeout(showMockProblem, 600)
}

async function finishMock() {
  if (userId) {
    await fetch(`${API}/api/test/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId, correct: mockCorrect, wrong: mockTotal - mockCorrect, total: mockTotal
      }),
    })
  }

  const pct = mockTotal > 0 ? Math.round((mockCorrect / mockTotal) * 100) : 0
  const content = document.getElementById('content')
  const title = document.getElementById('title')
  title.textContent = 'Result'

  content.innerHTML = `
    <div class="mock-result">
      <div class="score">${pct}%</div>
      <div class="detail">${mockCorrect} / ${mockTotal} correct</div>
      <br>
      <button style="padding:10px 24px;border:none;border-radius:10px;background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color);font-size:16px;font-weight:700;cursor:pointer" onclick="loadCategories()">Back</button>
    </div>
  `
  document.getElementById('footer').style.display = 'none'
}

// ─── Navigation ───────────────────────────────────────────────────
function goBack() {
  const prev = viewHistory.pop()
  if (prev === 'problem' || prev === 'topic') {
    renderProblemList()
  } else if (prev === 'mock') {
    loadCategories()
  } else {
    loadCategories()
  }
}

// ─── KaTeX Rendering ──────────────────────────────────────────────
function renderLatex(text) {
  if (!text) return ''
  let html = ''
  let lastIdx = 0
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g
  let match

  while ((match = regex.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIdx, match.index))
    const formula = match[1] || match[2]
    const display = !!match[1]
    try {
      html += katex.renderToString(formula, { displayMode: display, throwOnError: false })
    } catch {
      html += escapeHtml(match[0])
    }
    lastIdx = match.index + match[0].length
  }
  html += escapeHtml(text.slice(lastIdx))
  return html
}

function stripLatex(text) {
  return text.replace(/\$\$[^$]+\$\$/g, '').replace(/\$[^$]+\$/g, '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Start ────────────────────────────────────────────────────────
init()
