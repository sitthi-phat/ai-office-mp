import fs from 'fs/promises'
import os from 'os'

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

export function getSystemInfo() {
  const totalMem  = os.totalmem()
  const freeMem   = os.freemem()
  const usedMem   = totalMem - freeMem
  const toMB      = b => (b / 1024 / 1024).toFixed(1)
  const toGB      = b => (b / 1024 / 1024 / 1024).toFixed(2)
  const cpus      = os.cpus()
  const loadAvg   = os.loadavg()
  const uptime    = os.uptime()
  const uptimeMin = Math.floor(uptime / 60)
  const uptimeH   = Math.floor(uptimeMin / 60)

  // Compute CPU usage % from cumulative times across all cores
  let idle = 0, total = 0
  for (const cpu of cpus) {
    for (const type of Object.values(cpu.times)) total += type
    idle += cpu.times.idle
  }
  const cpuUsedPct = (100 - (idle / total) * 100).toFixed(1)

  return {
    cpu: {
      model:    cpus[0]?.model?.trim() ?? 'unknown',
      cores:    cpus.length,
      usedPct:  parseFloat(cpuUsedPct),
      loadAvg1: loadAvg[0].toFixed(2)
    },
    memory: {
      totalGB:  parseFloat(toGB(totalMem)),
      usedGB:   parseFloat(toGB(usedMem)),
      freeGB:   parseFloat(toGB(freeMem)),
      usedMB:   parseFloat(toMB(usedMem)),
      freeMB:   parseFloat(toMB(freeMem)),
      usedPct:  parseFloat(((usedMem / totalMem) * 100).toFixed(1))
    },
    uptime: `${uptimeH}h ${uptimeMin % 60}m`,
    platform: os.platform(),
    hostname: os.hostname()
  }
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
