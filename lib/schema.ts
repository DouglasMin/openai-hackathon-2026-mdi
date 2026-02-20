import { z } from "zod";

export const stepSchema = z.object({
  step_no: z.number().int().min(1),
  asset_index: z.number().int().min(0),
  title: z.string().min(1),
  instruction: z.string().min(1),
  highlight: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number()
  }),
  tts_script: z.string(),
  notes: z.string()
});

export const tutorialSchema = z.object({
  tutorial_title: z.string().min(1),
  language: z.literal("ko-KR"),
  steps: z.array(stepSchema).min(1)
});

export const tutorialJsonSchema = {
  name: "flowtutor_steps",
  strict: true,
  schema: {
    type: "object",
    properties: {
      tutorial_title: { type: "string" },
      language: { type: "string", enum: ["ko-KR"] },
      steps: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            step_no: { type: "integer", minimum: 1 },
            asset_index: { type: "integer", minimum: 0 },
            title: { type: "string" },
            instruction: { type: "string" },
            highlight: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" }
              },
              required: ["x", "y", "w", "h"],
              additionalProperties: false
            },
            tts_script: { type: "string" },
            notes: { type: "string" }
          },
          required: ["step_no", "asset_index", "title", "instruction", "highlight", "tts_script", "notes"],
          additionalProperties: false
        }
      }
    },
    required: ["tutorial_title", "language", "steps"],
    additionalProperties: false
  }
} as const;
