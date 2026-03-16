import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const BASE_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`
const HEADERS = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json'
}

export async function sendText(to, text) {
  await axios.post(`${BASE_URL}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  }, { headers: HEADERS })
}

export async function sendImage(to, imageUrl, caption = '') {
  await axios.post(`${BASE_URL}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link: imageUrl, caption }
  }, { headers: HEADERS })
}
