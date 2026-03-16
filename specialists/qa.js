import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function review(taskType, output) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: 'You are a QA reviewer. Check if the output meets requirements. Reply with: PASS or FAIL, then one sentence reason.',
    messages: [{
      role: 'user',
      content: `Task type: ${taskType}\nOutput to review:\n${JSON.stringify(output)}`
    }]
  })

  const result = response.content[0].text
  return {
    passed: result.startsWith('PASS'),
    feedback: result
  }
}
