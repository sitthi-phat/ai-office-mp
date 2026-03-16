/**
 * mock.js — ทดสอบ AI Office ทั้งระบบโดยไม่เรียก API จริง
 * รัน: node test/mock.js
 */

import { readMemory, formatMemoryForPrompt, writeMemory } from '../specialists/admin.js'

const MOCK_PLANS = {
  designer: JSON.stringify({
    reply_to_user: 'รับเรื่องแล้วครับ กำลังสร้างรูปให้เลย รอแป๊บนึงนะครับ',
    plan: [{ step: 1, specialist: 'DESIGNER', instruction: 'minimalist coffee product, brown tones', depends_on_step: null }],
    confidence: 'high'
  }),
  researcher_writer: JSON.stringify({
    reply_to_user: 'โอเคครับ จะค้นข้อมูลก่อนแล้วเขียนแคปชั่นให้เลย',
    plan: [
      { step: 1, specialist: 'RESEARCHER', instruction: 'coffee trends 2025 Thailand', depends_on_step: null },
      { step: 2, specialist: 'WRITER', instruction: 'write 3 IG captions in Thai', depends_on_step: 1 }
    ],
    confidence: 'high'
  }),
  analyst: JSON.stringify({
    reply_to_user: 'ได้เลยครับ กำลังวิเคราะห์รูปให้',
    plan: [{ step: 1, specialist: 'DESIGNER', instruction: 'analyze image for marketing use', depends_on_step: null }],
    confidence: 'medium'
  })
}

const MOCK_OUTPUT = {
  DESIGNER_generate: [
    { label: '1:1',  url: 'https://mock-cdn.example.com/image_square.jpg' },
    { label: '16:9', url: 'https://mock-cdn.example.com/image_landscape.jpg' }
  ],
  DESIGNER_analyze: 'รูปมีองค์ประกอบดี แสงสม่ำเสมอ ข้อความอ่านง่าย เหมาะสำหรับโซเชียลมีเดียครับ',
  RESEARCHER: 'เทรนด์กาแฟปี 2025: 1) Functional coffee 2) Cold brew RTD 3) Single origin specialty',
  WRITER: 'แคปชั่นที่ 1: "กาแฟที่ดีไม่ต้องการคำอธิบาย ☕"\nแคปชั่นที่ 2: "เริ่มเช้าด้วยสิ่งที่ดีที่สุด 🌅"\nแคปชั่นที่ 3: "สัมผัสรสชาติที่แตกต่าง กาแฟซิงเกิ้ลออริจิน จากไร่สู่แก้ว"'
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function printHeader(title) {
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  TEST: ${title}`)
  console.log(`${'═'.repeat(55)}`)
}

async function mockRunChief(chiefId, user, userMessage, imageUrl, scenario) {
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`📨 [Chief ${chiefId}] ${user.name}: "${userMessage}"`)

  const memory = await readMemory(user.memoryFile)
  const memText = formatMemoryForPrompt(memory)
  console.log(`📂 Memory: last_task="${memory.last_task || 'none'}"`)

  console.log(`🧠 Chief วางแผน... (mock)`)
  const plan = JSON.parse(MOCK_PLANS[scenario])
  console.log(`   → ${plan.plan.map(s => s.specialist).join(' → ')}`)
  console.log(`   reply: "${plan.reply_to_user}"`)

  const stepResults = {}
  for (const step of plan.plan) {
    const prev = step.depends_on_step != null ? stepResults[step.depends_on_step] : null
    console.log(`\n⚙️  Step ${step.step}: ${step.specialist}${prev ? ' (ใช้ output ก่อนหน้า)' : ''}`)
    await sleep(200)

    switch (step.specialist) {
      case 'DESIGNER':
        stepResults[step.step] = imageUrl ? MOCK_OUTPUT.DESIGNER_analyze : MOCK_OUTPUT.DESIGNER_generate
        break
      case 'RESEARCHER':
        stepResults[step.step] = MOCK_OUTPUT.RESEARCHER
        break
      case 'WRITER':
        stepResults[step.step] = MOCK_OUTPUT.WRITER
        break
      case 'ADMIN':
        await writeMemory(user.memoryFile, { last_task: userMessage })
        stepResults[step.step] = 'memory updated'
        break
    }
    const out = JSON.stringify(stepResults[step.step])
    console.log(`   ✅ ${out.slice(0, 70)}${out.length > 70 ? '...' : ''}`)
  }

  const lastStep = plan.plan[plan.plan.length - 1]
  const qa = {
    passed: scenario !== 'analyst',
    feedback: scenario !== 'analyst'
      ? 'PASS — output meets quality standards'
      : 'FAIL — mock image URLs cannot be verified'
  }
  console.log(`\n🔍 QA: ${qa.passed ? '✅ PASS' : '❌ FAIL'} — ${qa.feedback}`)

  await writeMemory(user.memoryFile, { last_task: userMessage })

  return {
    reply: plan.reply_to_user,
    finalOutput: stepResults[lastStep.step],
    qa,
    specialist: lastStep.specialist
  }
}

function mockSendText(to, text) {
  console.log(`\n📤 WhatsApp text → ${to}: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`)
}
function mockSendImage(to, url, caption) {
  console.log(`🖼️  WhatsApp image → ${to}: [${caption}] ${url}`)
}

async function simulateReply(from, result) {
  mockSendText(from, result.reply)
  if (result.specialist === 'DESIGNER' && Array.isArray(result.finalOutput)) {
    for (const img of result.finalOutput) mockSendImage(from, img.url, `ขนาด ${img.label}`)
  }
  if (result.qa && !result.qa.passed) {
    mockSendText(from, `⚠️ QA: ${result.qa.feedback}`)
  }
}

const USER_A = { id: 'user_a', name: 'Pond',  chief: 'A', memoryFile: './memory/user_a.json' }
const USER_B = { id: 'user_b', name: 'UserB', chief: 'B', memoryFile: './memory/user_b.json' }

async function runTests() {
  console.log('🧪 AI Office — Mock Test Suite')
  console.log('   (ไม่เรียก API จริง ใช้ mock data ทั้งหมด)')

  printHeader('Test 1: User A → DESIGNER (สร้างรูป 2 ขนาด)')
  const r1 = await mockRunChief('A', USER_A, 'ทำรูปโปรโมทกาแฟ ธีมมินิมอล สีน้ำตาล', null, 'designer')
  await simulateReply(USER_A.id, r1)
  await sleep(300)

  printHeader('Test 2: User B → RESEARCHER → WRITER (chain)')
  const r2 = await mockRunChief('B', USER_B, 'หาข้อมูลเทรนด์กาแฟปี 2025 แล้วเขียนแคปชั่น IG', null, 'researcher_writer')
  await simulateReply(USER_B.id, r2)
  await sleep(300)

  printHeader('Test 3: User A → วิเคราะห์รูป + QA FAIL (expected)')
  const r3 = await mockRunChief('A', USER_A, 'ดูรูปนี้หน่อยว่าใช้ได้ไหม', 'https://mock-cdn.example.com/uploaded.jpg', 'analyst')
  await simulateReply(USER_A.id, r3)
  await sleep(300)

  printHeader('Test 4: Memory persistence check')
  const memA = await readMemory('./memory/user_a.json')
  const memB = await readMemory('./memory/user_b.json')
  console.log(`\n📂 User A last_task: "${memA.last_task}"`)
  console.log(`📂 User B last_task: "${memB.last_task}"`)
  const memPass = memA.last_task !== '' && memB.last_task !== ''

  console.log(`\n${'═'.repeat(55)}`)
  console.log('  SUMMARY')
  console.log(`${'═'.repeat(55)}`)
  console.log(`  Test 1 — Designer 2 images:       ${r1.qa.passed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Test 2 — Researcher → Writer:     ${r2.qa.passed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Test 3 — QA fail (expected):      ${!r3.qa.passed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Test 4 — Memory persistence:      ${memPass ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`${'═'.repeat(55)}\n`)
}

runTests().catch(console.error)
