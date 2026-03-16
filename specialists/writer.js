import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveImageSource } from '../utils/imageHelper.js'

const client      = new Anthropic()
const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = path.join(__dirname, '..', 'public', 'results')

function saveResult(instruction, content) {
  const ts       = Date.now()
  const slug     = instruction.slice(0, 40).replace(/[^a-zA-Z0-9ก-๙]/g, '_').replace(/_+/g, '_')
  const filename = `${ts}_${slug}.txt`
  const header   = [
    `Content Writing Result`,
    `Generated: ${new Date(ts).toLocaleString()}`,
    `Task: ${instruction}`,
    '─'.repeat(60),
    ''
  ].join('\n')

  fs.writeFileSync(path.join(RESULTS_DIR, filename), header + content, 'utf8')
  return { filename, url: `/results/${filename}` }
}

export async function write(instruction, researchContext = '', imageUrl = null) {
  const source  = resolveImageSource(imageUrl)
  const text    = researchContext
    ? `Research context:\n${researchContext}\n\nTask:\n${instruction}`
    : instruction

  const content = source
    ? [{ type: 'image', source }, { type: 'text', text }]
    : text

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system:     'You are a professional content writer fluent in Thai and English. Write engaging, on-brand content as instructed.',
    messages:   [{ role: 'user', content }]
  })

  const fullText = response.content[0].text
  const { filename, url } = saveResult(instruction, fullText)
  const preview = fullText.split('\n').slice(0, 10).join('\n')

  return {
    type: 'writer',
    preview,
    fullText,
    filename,
    url
  }
}
