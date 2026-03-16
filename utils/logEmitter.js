import { EventEmitter } from 'events'

export const logEmitter = new EventEmitter()
logEmitter.setMaxListeners(50)

export function emitLog(userId, type, message) {
  const event = { userId, type, message, ts: Date.now() }
  logEmitter.emit('log', event)
  console.log(`[${userId}] [${type}] ${message}`)
}
