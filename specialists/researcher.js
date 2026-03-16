import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveImageSource } from '../utils/imageHelper.js'

const client     = new Anthropic()
const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = path.join(__dirname, '..', 'public', 'results')

function saveResult(instruction, content) {
  const ts       = Date.now()
  const slug     = instruction.slice(0, 40).replace(/[^a-zA-Z0-9ก-๙]/g, '_').replace(/_+/g, '_')
  const filename = `${ts}_${slug}.txt`
  const header   = [
    `Research Result`,
    `Generated: ${new Date(ts).toLocaleString()}`,
    `Query: ${instruction}`,
    '─'.repeat(60),
    ''
  ].join('\n')

  fs.writeFileSync(path.join(RESULTS_DIR, filename), header + content, 'utf8')
  return { filename, url: `/results/${filename}` }
}

export async function research(instruction, imageUrl = null) {
  const source  = resolveImageSource(imageUrl)
  const content = source
    ? [{ type: 'image', source }, { type: 'text', text: instruction }]
    : instruction

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
    system:     'You are a research specialist. Search the web and summarize findings clearly and concisely. Always cite sources.',
    messages:   [{ role: 'user', content }]
  })

  const fullText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  const { filename, url } = saveResult(instruction, fullText)

  const preview = fullText.split('\n').slice(0, 10).join('\n')

  return {
    type:     'research',
    preview,
    fullText,
    filename,
    url
  }
}
