import express from 'express'
import dotenv from 'dotenv'
import { USERS } from './config/users.js'
import { enqueue } from './dispatcher.js'

dotenv.config()
const app = express()
app.use(express.json())

// GET /api/users — ดู user ที่มีในระบบ
app.get('/api/users', (_req, res) => {
  const users = Object.values(USERS).map(u => ({ id: u.id, name: u.name, chief: u.chief }))
  res.json({ users })
})

// POST /api/message — ส่งข้อความเข้าระบบ
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

  enqueue(user, message, imageUrl, (result) => {
    console.log(`Done [Chief ${user.chief}] QA: ${result.qa?.passed ? 'PASS' : 'FAIL'}`)
  })

  // ส่ง result กลับตรงๆ (synchronous wait)
  const result = await new Promise((resolve) => {
    enqueue(user, message, imageUrl, resolve)
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
  console.log(`Endpoints:`)
  console.log(`  GET  http://localhost:${PORT}/api/users`)
  console.log(`  POST http://localhost:${PORT}/api/message`)
})
