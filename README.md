# FlowTutor MVP (Hackathon)

FlowTutor converts uploaded screenshots into a step-by-step web tutorial and exports a SCORM 1.2 package with `Completed` tracking.

## Stack

- Next.js App Router + Route Handlers
- SQLite (`better-sqlite3`) for metadata
- Local filesystem for assets/exports (`data/`)
- OpenAI Responses API for vision + structured outputs

## Implemented MVP scope

- Multi-image upload
- Screenshot ordering (drag-and-drop)
- AI step generation to fixed schema (`tutorial_title`, `language`, `steps[]`)
- Step-by-step TTS audio generation (mp3) and playback
- Tutorial player (image, highlight overlay, title/instruction, next/back/progress)
- SCORM 1.2 zip export with `Completed` status write (`cmi.core.lesson_status=completed`)
- Demo safety fallback: automatic sample project load when AI generation fails

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env
# required: OPENAI_API_KEY
# optional: OPENAI_MODEL, ENABLE_TTS, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE
```

3. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## API routes

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/[projectId]`
- `POST /api/projects/[projectId]/assets`
- `POST /api/projects/[projectId]/reorder`
- `POST /api/projects/[projectId]/generate`
- `POST /api/projects/[projectId]/export`
- `GET /api/projects/[projectId]/export?download=1`
- `GET /api/assets/[assetId]`

## OpenAI API alignment

This implementation uses the official OpenAI Responses API patterns from OpenAI docs:

- `input` content with `input_text` + `input_image` blocks (image data URL support)
- `text.format` with `type: "json_schema"` and `strict: true` for structured outputs

Model is configurable via `OPENAI_MODEL` and defaults to `gpt-4.1`.
TTS model is configurable via `OPENAI_TTS_MODEL` and defaults to `gpt-4o-mini-tts`.

## Notes for Day 6-7 AWS move

Keep the same repository/service interfaces and replace:

- local asset files -> S3 object storage
- SQLite metadata -> DynamoDB or Postgres
- host on AWS Amplify SSR for App Router + Route Handlers
