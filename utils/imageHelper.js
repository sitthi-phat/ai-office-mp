import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Detect actual image media type from file magic bytes (ignore file extension)
function detectMediaType(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'           // PNG: 89 50 4E 47
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'          // JPEG: FF D8
  if (buffer[0] === 0x52 && buffer[1] === 0x49 &&
      buffer[8] === 0x57 && buffer[9] === 0x45) return 'image/webp'          // WebP: RIFF....WEBP
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif'           // GIF: GIF8
  return 'image/jpeg'                                                          // fallback
}

// Convert a local /uploads/... URL to a Claude-compatible image source (base64)
// Or return a URL source for external http:// links
export function resolveImageSource(imageUrl) {
  if (!imageUrl) return null

  if (imageUrl.startsWith('/')) {
    // Local file — read and encode as base64
    const filepath = path.join(__dirname, '..', 'public', imageUrl)
    if (!fs.existsSync(filepath)) return null
    const buffer    = fs.readFileSync(filepath)
    const mediaType = detectMediaType(buffer)
    return { type: 'base64', media_type: mediaType, data: buffer.toString('base64') }
  }

  // External URL
  return { type: 'url', url: imageUrl }
}
