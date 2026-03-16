import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function research(instruction) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    system: 'You are a research specialist. Search the web and summarize findings clearly and concisely. Always cite sources.',
    messages: [{ role: 'user', content: instruction }]
  })

  return response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}
