import Anthropic from '@anthropic-ai/sdk'
import { readMemory, formatMemoryForPrompt, writeMemory } from '../specialists/admin.js'
import { research } from '../specialists/researcher.js'
import { write } from '../specialists/writer.js'
import { generateImages, analyzeImage } from '../specialists/designer.js'
import { review } from '../specialists/qa.js'
import { emitLog } from '../utils/logEmitter.js'

const client = new Anthropic()

function buildSystemPrompt(chiefId, userName, memoryText) {
  return `# IDENTITY
You are Chief Manager ${chiefId} — personal AI executive for ${userName}.
You serve ONLY this user. You have zero knowledge of other users.

# LANGUAGE
Always reply in the same language the user writes in.
Thai → Thai. English → English. Mixed → follow dominant language.

# USER CONTEXT
${memoryText}

# YOUR ROLE
Understand request → pick specialist(s) → coordinate → return clean result.
Do NOT do specialist work yourself. Plan, delegate, summarize.

# SPECIALISTS
- DESIGNER     → image generation (DALL·E 3) or image analysis
- RESEARCHER   → search and summarize from the internet  
- WRITER       → write articles, captions, translations
- ADMIN        → update user memory/preferences

# ROUTING RULES
- When in doubt → make best guess and proceed
- Chain specialists when needed (RESEARCHER → WRITER)
- DESIGNER image gen → always request 2 sizes (1:1 and 16:9)

# OUTPUT (strict JSON only, no other text)
{
  "reply_to_user": "<friendly message in user's language>",
  "plan": [
    {
      "step": 1,
      "specialist": "RESEARCHER",
      "instruction": "<precise instruction>",
      "depends_on_step": null
    }
  ],
  "confidence": "high|medium|low"
}`
}

export async function runChief(chiefId, user, userMessage, imageUrl = null) {
  // 1. โหลด memory
  const memory = await readMemory(user.memoryFile)
  const memoryText = formatMemoryForPrompt(memory)

  // 2. Chief วางแผน
  const messageContent = imageUrl
    ? [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: userMessage }
      ]
    : userMessage

  const planResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: buildSystemPrompt(chiefId, user.name, memoryText),
    messages: [{ role: 'user', content: messageContent }]
  })

  let plan
  try {
    const raw = planResponse.content[0].text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    plan = JSON.parse(raw)
    emitLog(user.id, 'plan', `Plan: ${plan.plan.length} step(s), confidence=${plan.confidence}`)
  } catch {
    // Chief ตอบ plain text (กรณี simple conversation)
    return {
      reply: planResponse.content[0].text,
      results: {},
      finalOutput: null,
      qa: { passed: true, feedback: 'PASS — plain text response' },
      specialist: null
    }
  }

  // 3. รัน specialists ตาม plan
  const stepResults = {}

  for (const step of plan.plan) {
    const prevOutput = step.depends_on_step != null
      ? stepResults[step.depends_on_step]
      : null

    emitLog(user.id, 'step', `Step ${step.step}: ${step.specialist} — ${step.instruction}`)

    switch (step.specialist) {
      case 'RESEARCHER':
        stepResults[step.step] = await research(step.instruction)
        break

      case 'WRITER':
        stepResults[step.step] = await write(step.instruction, prevOutput)
        break

      case 'DESIGNER':
        if (imageUrl) {
          stepResults[step.step] = await analyzeImage(imageUrl, step.instruction)
        } else {
          stepResults[step.step] = await generateImages(step.instruction)
        }
        break

      case 'ADMIN':
        await writeMemory(user.memoryFile, { last_task: userMessage })
        stepResults[step.step] = 'memory updated'
        break

      default:
        stepResults[step.step] = `unknown specialist: ${step.specialist}`
    }
  }

  // 4. QA
  const lastStep = plan.plan[plan.plan.length - 1]
  const finalOutput = stepResults[lastStep.step]
  const qa = await review(lastStep.specialist, finalOutput)
  emitLog(user.id, 'qa', `QA: ${qa.passed ? 'PASS' : 'FAIL'} — ${qa.feedback}`)

  // 5. อัพเดท last_task ใน memory
  await writeMemory(user.memoryFile, { last_task: userMessage })

  return {
    reply: plan.reply_to_user,
    results: stepResults,
    finalOutput,
    qa,
    specialist: lastStep.specialist
  }
}
