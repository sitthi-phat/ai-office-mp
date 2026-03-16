import express from 'express'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { USERS } from './config/users.js'
import { enqueue } from './dispatcher.js'
import { logEmitter } from './utils/logEmitter.js'
import { readHistory, appendHistory, getAvailableDates, getToday } from './utils/historyStore.js'

dotenv.config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// POST /api/upload — accepts { filename, data: base64DataURL }
app.post('/api/upload', (req, res) => {
  const { filename, data } = req.body
  const ext = path.extname(filename).toLowerCase()
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return res.status(400).json({ error: 'Only .jpg and .png allowed' })
  }
  const ts       = Date.now()
  const safeName = `${ts}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer   = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer)
  res.json({ url: `/uploads/${safeName}` })
})

// GET /api/users
app.get('/api/users', (_req, res) => {
  const users = Object.values(USERS).map(u => ({ id: u.id, name: u.name, chief: u.chief }))
  res.json({ users })
})

// GET /api/logs?userId=user_a  — SSE real-time log stream
app.get('/api/logs', (req, res) => {
  const { userId } = req.query
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const handler = (event) => {
    if (!userId || event.userId === userId) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
  }

  logEmitter.on('log', handler)
  req.on('close', () => logEmitter.off('log', handler))
})

// GET /api/history/:userId?date=YYYY-MM-DD
app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params
  const date = req.query.date || getToday()
  const messages = readHistory(userId, date)
  res.json({ date, messages })
})

// GET /api/history/:userId/dates — list all dates with history (latest first)
app.get('/api/history/:userId/dates', (req, res) => {
  const { userId } = req.params
  const dates = getAvailableDates(userId)
  res.json({ dates, today: getToday() })
})

// POST /api/message
// Body: { userId: "user_a" | "user_b", message: "...", imageUrl: "..." (optional) }
app.post('/api/message', async (req, res) => {
  const { userId, message, imageUrl = null } = req.body

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }

  const user = Object.values(USERS).find(u => u.id === userId)
  if (!user) {
    return res.status(404).json({ error: `User "${userId}" not found` })
  }

  console.log(`[Chief ${user.chief}] ${user.name}: ${message}`)

  // Save user message to history
  appendHistory(userId, { role: 'user', text: message })

  const result = await new Promise((resolve) => {
    enqueue(user, message, imageUrl, resolve)
  })

  // Save AI reply to history
  appendHistory(userId, {
    role:       'ai',
    text:       result.reply,
    output:     result.finalOutput,
    qa:         result.qa,
    specialist: result.specialist
  })

  res.json({
    reply:      result.reply,
    specialist: result.specialist,
    output:     result.finalOutput,
    qa:         result.qa
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`AI Office API running on port ${PORT}`)
  console.log(`  GET  http://localhost:${PORT}/api/users`)
  console.log(`  POST http://localhost:${PORT}/api/message`)
  console.log(`  GET  http://localhost:${PORT}/api/logs?userId=user_a`)
  console.log(`  UI   http://localhost:${PORT}`)
})
