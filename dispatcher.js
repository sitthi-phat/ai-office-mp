import { handleUserA } from './chiefs/chiefA.js'
import { handleUserB } from './chiefs/chiefB.js'

// In-memory queue — ป้องกัน Chief A กับ B ชนกัน
const queue = []
let isProcessing = false

export function enqueue(user, message, imageUrl, replyFn) {
  queue.push({ user, message, imageUrl, replyFn })
  console.log(`📋 Queue size: ${queue.length}`)
  processNext()
}

async function processNext() {
  if (isProcessing || queue.length === 0) return
  isProcessing = true

  const { user, message, imageUrl, replyFn } = queue.shift()

  try {
    const handler = user.chief === 'A' ? handleUserA : handleUserB
    const result = await handler(user, message, imageUrl)
    await replyFn(result)
  } catch (err) {
    console.error('❌ Dispatcher error:', err.message)
    await replyFn({
      reply: 'ขออภัยครับ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      error: true,
      finalOutput: null,
      qa: { passed: false },
      specialist: null
    })
  }

  isProcessing = false
  processNext()
}
