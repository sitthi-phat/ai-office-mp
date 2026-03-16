/**
 * mock-single.js — พิมพ์ข้อความทดสอบตรงๆ ใน terminal
 * รัน: node test/mock-single.js "ข้อความที่ต้องการทดสอบ" [a|b]
 * 
 * ตัวอย่าง:
 *   node test/mock-single.js "เขียนแคปชั่น IG เกี่ยวกับกาแฟ" a
 *   node test/mock-single.js "หาข้อมูล AI tools 2025" b
 */

import dotenv from 'dotenv'
dotenv.config()

import { getUserByPhone } from '../config/users.js'
import { enqueue } from '../dispatcher.js'

const message = process.argv[2]
const whichUser = (process.argv[3] || 'a').toLowerCase()

if (!message) {
  console.log('Usage: node test/mock-single.js "message" [a|b]')
  process.exit(1)
}

const phone = whichUser === 'b'
  ? process.env.USER_B_PHONE
  : process.env.USER_A_PHONE

const user = getUserByPhone(phone)

if (!user) {
  console.error(`❌ User not found — เช็ค .env`)
  process.exit(1)
}

console.log(`\n📨 Sending to Chief ${user.chief} (${user.name}): "${message}"\n`)

enqueue(user, message, null, async (result) => {
  console.log('─'.repeat(50))
  console.log('💬 Reply:', result.reply)
  console.log('')

  if (result.specialist === 'DESIGNER' && Array.isArray(result.finalOutput)) {
    for (const img of result.finalOutput) {
      console.log(`🖼  [${img.label}] ${img.url}`)
    }
  } else if (result.finalOutput) {
    const out = typeof result.finalOutput === 'string'
      ? result.finalOutput
      : JSON.stringify(result.finalOutput, null, 2)
    console.log('📄 Output:\n' + out.slice(0, 500))
  }

  console.log('')
  console.log(`QA: ${result.qa?.passed ? '✅ PASS' : '❌ FAIL'} — ${result.qa?.feedback}`)
  console.log('─'.repeat(50))
  process.exit(0)
})
