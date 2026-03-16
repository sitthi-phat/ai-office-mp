import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function write(instruction, researchContext = '') {
  const userContent = researchContext
    ? `Research context:\n${researchContext}\n\nTask:\n${instruction}`
    : instruction

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: 'You are a professional content writer fluent in Thai and English. Write engaging, on-brand content as instructed.',
    messages: [{ role: 'user', content: userContent }]
  })

  return response.content[0].text
}
