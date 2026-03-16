# AI Office — Twin-Lead Multi-Agent System

A multi-agent AI office system with two parallel Chief Managers and a shared pool of 6 specialists. Users interact via a real-time chat web UI. Each Chief manages its own user context and memory independently.

---

## Architecture

```
User (Browser Chat UI)
        │
        ▼
  POST /api/message
        │
   dispatcher.js  ──── serial queue (prevents A/B collision)
        │
   Chief A  or  Chief B
        │
   chiefBase.js  ──── asks Claude to build a plan (JSON)
        │
   ┌────┴─────────────────────────┐
   │  Specialist Pool (shared)    │
   │  ├── DESIGNER  (DALL·E 3)   │
   │  ├── RESEARCHER (web search)│
   │  ├── WRITER    (content)    │
   │  ├── ADMIN     (memory)     │
   │  └── QA REVIEWER            │
   └──────────────────────────────┘
        │
   Reply → saved to history → returned to browser
```

---

## Features

- **Dual Chief Officers** — Chief A serves User A, Chief B serves User B. Same capabilities, separate memory.
- **6 Specialists** — DESIGNER, RESEARCHER, WRITER, ADMIN, QA (shared pool, called by either Chief)
- **AI Planning** — Chief uses Claude to decide which specialist(s) to call and in what order
- **Specialist Chaining** — e.g. RESEARCHER → WRITER for research-then-write tasks
- **QA Gate** — every output is reviewed by QA before returning to user
- **Image Generation** — DALL·E 3 generates 2 sizes (1:1 and 16:9), saved locally to `public/images/`
- **Image Upload** — attach `.jpg`/`.png` to any message; all specialists can view and analyze the image
- **Research Output** — saved as `.txt` to `public/results/`, first 10 lines shown in chat with link to full report
- **Writer Output** — same as researcher: `.txt` saved, preview + link in chat
- **Real-time Logs** — SSE stream shows specialist steps live in the chat UI sidebar
- **Chat History** — all conversations persisted to `history/{userId}/YYYY-MM-DD.json`
- **Date Picker** — browse past conversations by date, latest on top (read-only for past dates)

---

## Project Structure

```
├── index.js                  # Express server, REST API, SSE, static files
├── dispatcher.js             # Serial queue — routes to Chief A or B
├── chiefs/
│   ├── chiefBase.js          # Core orchestration: plan → execute → QA
│   ├── chiefA.js             # Wrapper for User A
│   └── chiefB.js             # Wrapper for User B
├── specialists/
│   ├── designer.js           # DALL·E 3 image gen + Claude image analysis
│   ├── researcher.js         # Claude web_search tool
│   ├── writer.js             # Claude content writing
│   ├── admin.js              # Read/write user memory JSON
│   └── qa.js                 # Claude QA review
├── utils/
│   ├── logEmitter.js         # EventEmitter for real-time SSE log broadcast
│   ├── historyStore.js       # File-based chat history (per user, per date)
│   └── imageHelper.js        # resolveImageSource — converts local uploads to base64 for Claude API
├── config/
│   └── users.js              # User registry (userId → user object)
├── public/
│   ├── index.html            # Chat web UI (vanilla JS, SSE, date picker, image upload)
│   ├── images/               # DALL·E generated images stored here
│   ├── uploads/              # User-uploaded images stored here
│   └── results/              # Research/writer output .txt files stored here
├── memory/
│   ├── user_a.json           # Persistent memory for User A
│   └── user_b.json           # Persistent memory for User B
├── history/
│   ├── user_a/YYYY-MM-DD.json
│   └── user_b/YYYY-MM-DD.json
└── test/
    ├── mock.js               # Full mock test suite (no real API calls)
    └── mock-single.js        # CLI tool for single message testing
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/sitthi-phat/ai-office-mp.git
cd ai-office-mp
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

USER_A_PHONE=66891069891
USER_A_NAME=Pond
USER_B_PHONE=66898765432
USER_B_NAME=UserB

PORT=3000
```

### 3. Run

```bash
npm start
```

Open **http://localhost:3000**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/message` | Send a message to a user's Chief |
| `POST` | `/api/upload` | Upload an image (`.jpg`/`.png`), returns local URL |
| `GET` | `/api/logs` | SSE stream of real-time specialist logs |
| `GET` | `/api/history/:userId` | Get chat history for a date (`?date=YYYY-MM-DD`) |
| `GET` | `/api/history/:userId/dates` | List all dates with history (latest first) |

### POST /api/message

```json
{
  "userId": "user_a",
  "message": "ทำรูปโปรโมทกาแฟ ธีมมินิมอล สีน้ำตาล",
  "imageUrl": "/uploads/1234567890_photo.jpg"
}
```

### POST /api/upload

```json
{
  "filename": "photo.jpg",
  "data": "data:image/jpeg;base64,..."
}
```

Response:
```json
{ "url": "/uploads/1234567890_photo.jpg" }
```

Response:
```json
{
  "reply": "รับเรื่องแล้วครับ กำลังสร้างรูปให้เลย",
  "specialist": "DESIGNER",
  "output": [
    { "label": "1:1",  "url": "/images/1234567890_1x1.jpg" },
    { "label": "16:9", "url": "/images/1234567890_16x9.jpg" }
  ],
  "qa": { "passed": true, "feedback": "output meets quality standards" }
}
```

---

## Sample Prompts

| Specialist | Prompt |
|---|---|
| DESIGNER | `ทำรูปโปรโมทกาแฟ ธีมมินิมอล สีน้ำตาล` |
| RESEARCHER | `หาข้อมูลเทรนด์กาแฟปี 2025` |
| WRITER | `เขียนแคปชั่น Instagram สำหรับร้านกาแฟ 3 แบบ` |
| RESEARCHER→WRITER | `หาข้อมูลเทรนด์กาแฟปี 2025 แล้วเขียนบทความ Facebook` |
| ADMIN | `จำไว้ด้วยว่าฉันชอบโทนสีน้ำตาล สไตล์มินิมอล` |

**With image attached:**

| Specialist | Prompt |
|---|---|
| WRITER | `please review the attached image and write a proper caption` |
| DESIGNER | `please review the attached image and design a similar image with blue tone` |
| RESEARCHER | `please review the attached image and research for it` |

---

## Run Mock Tests (no API keys needed)

```bash
node test/mock.js
```

```bash
# Test single message
node test/mock-single.js "ทำรูปโปรโมทกาแฟ" a
node test/mock-single.js "หาข้อมูลเทรนด์กาแฟ" b
```

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **AI**: Claude Sonnet 4 (Anthropic SDK) + DALL·E 3 (OpenAI SDK)
- **Realtime**: Server-Sent Events (SSE)
- **Frontend**: Vanilla JS + CSS (no build step)
- **Storage**: JSON files (memory, history, images)
