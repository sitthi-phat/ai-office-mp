import { runChief } from './chiefBase.js'

export async function handleUserB(user, message, imageUrl = null) {
  return runChief('B', user, message, imageUrl)
}
