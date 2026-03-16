import dotenv from 'dotenv'
dotenv.config()

export const USERS = {
  [process.env.USER_A_PHONE]: {
    id: 'user_a',
    name: process.env.USER_A_NAME,
    chief: 'A',
    memoryFile: './memory/user_a.json'
  },
  [process.env.USER_B_PHONE]: {
    id: 'user_b',
    name: process.env.USER_B_NAME,
    chief: 'B',
    memoryFile: './memory/user_b.json'
  }
}

export function getUserByPhone(phone) {
  return USERS[phone] || null
}
