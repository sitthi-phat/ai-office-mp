import express from 'express'
import dotenv from 'dotenv'
import { getUserByPhone } from './config/users.js'
import { enqueue } from './dispatcher.js'
import { sendText, sendImage } from './utils/whatsapp.js'

dotenv.config()
const app = express()
app.use(express.json())

app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified')
    return res.status(200).send(challenge)
  }
  res.sendStatus(403)
})

app.post('/webhook', async (req, res) => {
  res.sendStatus(200)
  const entry = req.body?.entry?.[0]?.changes?.[0]?.value
  if (!entry?.messages) return
  const msg  = entry.messages[0]
  const from = msg.from
  const user = getUserByPhone(from)
  if (!user) return

  let text = '', imageUrl = null
  if (msg.type === 'text') {
    text = msg.text.body
  } else if (msg.type === 'image') {
    text     = msg.image?.caption || 'วิเคราะห์รูปนี้ให้หน่อย'
    imageUrl = await fetchMediaUrl(msg.image.id)
  } else {
    await sendText(from, 'ขออภัยครับ รองรับเฉพาะข้อความและรูปภาพครับ')
    return
  }

  console.log(`[Chief ${user.chief}] ${user.name}: ${text}`)

  enqueue(user, text, imageUrl, async (result) => {
    await sendText(from, result.reply)
    if (result.specialist === 'DESIGNER' && Array.isArray(result.finalOutput)) {
      for (const img of result.finalOutput) {
        await sendImage(from, img.url, `ขนาด ${img.label}`)
      }
    }
    if (result.qa && !result.qa.passed) {
      await sendText(from, `หมายเหตุ QA: ${result.qa.feedback}`)
    }
    console.log(`Done [Chief ${user.chief}] QA: ${result.qa?.passed ? 'PASS' : 'FAIL'}`)
  })
})

async function fetchMediaUrl(mediaId) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  )
  const data = await res.json()
  return data.url
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`AI Office running on port ${PORT}`)
  console.log(`User A: ${process.env.USER_A_NAME}`)
  console.log(`User B: ${process.env.USER_B_NAME}`)
})
