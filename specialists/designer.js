import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI()
const anthropic = new Anthropic()

export async function generateImages(instruction) {
  const results = []

  // กฎเหล็ก: ส่ง 2 ขนาดเสมอ
  const sizes = [
    { size: '1024x1024', label: '1:1' },
    { size: '1792x1024', label: '16:9' }
  ]

  for (const { size, label } of sizes) {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: instruction,
      n: 1,
      size,
      quality: 'hd'
    })
    results.push({
      label,
      url: response.data[0].url,
      revised_prompt: response.data[0].revised_prompt
    })
  }

  return results
}

export async function analyzeImage(imageUrl, instruction) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: instruction }
      ]
    }]
  })

  return response.content[0].text
}
