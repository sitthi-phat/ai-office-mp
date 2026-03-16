import fs from 'fs/promises'

export async function readMemory(memoryFile) {
  try {
    const raw = await fs.readFile(memoryFile, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function writeMemory(memoryFile, updates) {
  const current = await readMemory(memoryFile)
  const updated = { ...current, ...updates }
  await fs.writeFile(memoryFile, JSON.stringify(updated, null, 2))
  return updated
}

export function formatMemoryForPrompt(memory) {
  return `
## User Profile: ${memory.name}
- Language: ${memory.preferred_language}
- Brand tone: ${memory.brand_tone || 'not set'}
- Preferred colors: ${memory.preferred_colors?.join(', ') || 'not set'}
- Ongoing projects: ${memory.ongoing_projects?.join(', ') || 'none'}
- Last task: ${memory.last_task || 'none'}
- History summary: ${memory.history_summary || 'none'}
`.trim()
}
