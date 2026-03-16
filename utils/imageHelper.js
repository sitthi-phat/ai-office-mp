import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Convert a local /uploads/... URL to a Claude-compatible image source (base64)
// Or return a URL source for external http:// links
export function resolveImageSource(imageUrl) {
  if (!imageUrl) return null

  if (imageUrl.startsWith('/')) {
    // Local file — read and encode as base64
    const filepath = path.join(__dirname, '..', 'public', imageUrl)
    if (!fs.existsSync(filepath)) return null
    const buffer    = fs.readFileSync(filepath)
    const ext       = path.extname(imageUrl).toLowerCase()
    const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg'
    return { type: 'base64', media_type: mediaType, data: buffer.toString('base64') }
  }

  // External URL
  return { type: 'url', url: imageUrl }
}
