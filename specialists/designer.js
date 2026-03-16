import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const openai    = new OpenAI()
const anthropic = new Anthropic()

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images')

async function downloadImage(url, filename) {
  const res    = await fetch(url)
  const buffer = await res.arrayBuffer()
  const dest   = path.join(IMAGES_DIR, filename)
  fs.writeFileSync(dest, Buffer.from(buffer))
  return `/images/${filename}`
}

export async function generateImages(instruction) {
  const results = []
  const ts = Date.now()

  // กฎเหล็ก: ส่ง 2 ขนาดเสมอ
  const sizes = [
    { size: '1024x1024', label: '1:1' },
    { size: '1792x1024', label: '16:9' }
  ]

  for (const { size, label } of sizes) {
    const response = await openai.images.generate({
      model:   'dall-e-3',
      prompt:  instruction,
      n:       1,
      size,
      quality: 'hd'
    })

    const remoteUrl = response.data[0].url
    const slug      = label.replace(':', 'x')
    const filename  = `${ts}_${slug}.jpg`
    const localUrl  = await downloadImage(remoteUrl, filename)

    results.push({
      label,
      url:            localUrl,
      revised_prompt: response.data[0].revised_prompt
    })
  }

  return results
}

export async function analyzeImage(imageUrl, instruction) {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role:    'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text',  text: instruction }
      ]
    }]
  })

  return response.content[0].text
}
