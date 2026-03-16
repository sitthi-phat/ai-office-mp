import { runChief } from './chiefBase.js'

export async function handleUserA(user, message, imageUrl = null) {
  return runChief('A', user, message, imageUrl)
}
