REFRACTOR SPRINT: Add Step Editor + Micro-steps (multi-steps per screenshot) WITHOUT breaking the existing end-to-end flow (upload → AI steps with bbox → optional audio → SCORM export → SCORM Cloud Completed).

GOALS
1) Step Editor: Human-in-the-loop corrections for complex enterprise forms.
2) Micro-steps: Allow multiple steps to reference the same screenshot (asset) so one screenshot can yield 2–5 instructional steps with different bboxes.
3) Keep existing demo stability: pre-generated fallback sample must still work.
4) All OpenAI usage MUST be based on the official docs via the OpenAI API docs MCP server (no guessing).

NON-GOALS (do not add in this sprint)
- Chrome extension / click recorder
- Multi-tenant / roles / analytics dashboards
- SCORM score tracking (keep completion only)

--------------------------------------------
A) DATA MODEL / SCHEMA CHANGES

1) Update Step model to explicitly reference which screenshot it belongs to.
   Add these fields to each Step:
   - assetId (or imageKey)  // reference to the screenshot asset
   - imageWidth, imageHeight // original pixel dimensions (for bbox coordinate mapping)
   - highlight {x,y,w,h} in original image pixel coordinates
   - (optional) bboxConfidence (0..1) or needsReview boolean

   Rationale:
   Previously step_no implied screenshot order. Thatlocks micro-steps. Now steps can reference the same asset multiple times.

2) Store tutorial JSON in DB but normalize steps so editor/player/export use the same source of truth.

3) Backward compatibility migration:
   For existing projects where steps have no assetId:
   - Map step_no to uploaded image order (step 1 -> image 1, etc.)
   - Populate assetId + imageWidth/Height for each step.

--------------------------------------------
B) AI OUTPUT JSON SCHEMA (STRICT)

Update the strict json_schema used in Responses API to include asset reference.

Example (shape, not exact implementation detail):
{
  "tutorial_title": "string",
  "language": "ko-KR",
  "steps": [
    {
      "step_no": 1,
      "asset_index": 0,                 // 0-based index into uploaded images array
      "title": "string",
      "instruction": "string",
      "highlight": { "x": 0, "y": 0, "w": 0, "h": 0 },
      "notes": "string (optional)",
      "tts_script": "string (optional)"
    }
  ]
}

Rules:
- step_no strictly increasing from 1..N
- asset_index must be a valid index (0..images.length-1)
- Multiple steps may share the same asset_index (this is Micro-steps)
- If unsure bbox: highlight must be {0,0,0,0} and explain in notes
- Do NOT output any extra text outside JSON

IMPORTANT: Put the “you are FlowTutor tutorial generator” directive in Responses API instructions/developer message, not in user input. Keep user content minimal (workflow name, language, step count guidance).

--------------------------------------------
C) PROMPT/INSTRUCTIONS UPDATE (STABILITY)

Move current directive out of lib/openai.ts user content and into Responses "instructions".
Instructions must explicitly say:
- The screenshots are ordered chronologically.
- You may output 1–4 steps per screenshot if needed (micro-steps), but keep total steps reasonable (e.g., 6–14).
- Each step must include asset_index and bbox.
- No hallucination of non-visible UI elements.

--------------------------------------------
D) STEP EDITOR (NEW UI)

Add an Editor route:
- /projects/[projectId]/edit  (or /editor/[projectId])

Editor requirements (minimal but product-like):
1) Step list (left panel)
   - shows step_no, title
   - reorder via drag & drop
   - duplicate step (creates a new step referencing the same assetId)
   - delete step

2) Step details (right panel)
   - editable title (input)
   - editable instruction (textarea)
   - screenshot preview for the step’s assetId
   - bbox editor overlay:
     - draw/move/resize rectangle
     - save bbox in ORIGINAL image pixel coordinates

3) Asset binding
   - show which screenshot the step references
   - optionally allow changing the screenshot via dropdown (nice-to-have)

Coordinate mapping (critical):
- Store bbox in original image pixels.
- When rendering on-screen at scaled size, convert:
  displayX = x * scale, displayY = y * scale, etc.
- When user edits rectangle in display coords:
  x = round(displayX / scale), etc.
- Use image naturalWidth/naturalHeight to compute scale reliably.

4) Needs-review UX (optional but recommended)
- If bbox is {0,0,0,0} or bboxConfidence low:
  show “Needs Review” badge and open editor automatically.

--------------------------------------------
E) PLAYER UPDATES (MICRO-STEPS)

Player must render based on step.assetId (not step_no->image mapping).
- If multiple steps use same assetId, it’s fine: the image stays the same, only bbox + text changes.
- Ensure Next/Back increments over steps list.

Optional (high impact, low complexity): “Zoom inset”
- On complex screens, add a small zoomed-in preview of bbox area:
  - Cropped/zoomed view based on bbox
  - Makes minor bbox errors less harmful and improves clarity.

--------------------------------------------
F) SCORM EXPORT UPDATES (MICRO-STEPS COMPAT)

SCORM exporter must:
- Use the canonical steps list (post-edit)
- Reference screenshot assets by step.assetId
- Support repeated use of the same screenshot across multiple steps
- Keep completion logic unchanged (Completed only)

--------------------------------------------
G) QA / ACCEPTANCE CRITERIA (MUST PASS)

1) Local smoke test:
- Upload 5–7 images → Generate → Steps render in Player with bbox
- Open Editor → modify bbox + instruction → Player reflects changes
- Export SCORM zip → upload to SCORM Cloud → Completed on finish

2) Micro-steps test:
- Upload 1 complex form screenshot
- Generate should be allowed to create 3–5 steps referencing the same asset_index
- Player shows multiple steps on the same screenshot with different bboxes
- Editor can duplicate a step and adjust bbox

3) Fallback sample:
- Always available and unchanged behavior

--------------------------------------------
H) IMPLEMENTATION ORDER (SAFE REFACTOR SEQUENCE)

1) Add assetId to Step + migration/backfill mapping old steps to image order
2) Update Player & SCORM exporter to use assetId mapping (keep existing behavior with backfill)
3) Add Step Editor UI (manual edits persist)
4) Update AI schema to include asset_index and allow micro-steps
5) Add optional zoom inset + needs-review badge if time remains

Remember: use OpenAI official docs MCP server for all API details. No guessing.
