import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_DIR  = path.join(__dirname, '..', 'history')

function getFilePath(userId, date) {
  const dir = path.join(HISTORY_DIR, userId)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${date}.json`)
}

export function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function readHistory(userId, date = getToday()) {
  const fp = getFilePath(userId, date)
  if (!fs.existsSync(fp)) return []
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')) } catch { return [] }
}

export function appendHistory(userId, message) {
  const date = getToday()
  const fp   = getFilePath(userId, date)
  const msgs = readHistory(userId, date)
  msgs.push({ ...message, ts: Date.now() })
  fs.writeFileSync(fp, JSON.stringify(msgs, null, 2))
}

export function getAvailableDates(userId) {
  const dir = path.join(HISTORY_DIR, userId)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a)) // latest first
}
