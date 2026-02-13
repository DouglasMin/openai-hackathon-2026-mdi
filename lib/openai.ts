import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { tutorialJsonSchema, tutorialSchema } from "@/lib/schema";
import type { AssetRecord, TutorialSchema } from "@/lib/types";

function toDataUrl(mimeType: string, content: Buffer): string {
  return `data:${mimeType};base64,${content.toString("base64")}`;
}

export async function generateTutorialFromAssets(assets: AssetRecord[]): Promise<TutorialSchema> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  const openai = new OpenAI({ apiKey });

  const instructions =
    "You are an LMS tutorial generation engine.\n" +
    "Return output ONLY as JSON that matches the provided json_schema. Do not add any text outside JSON.\n" +
    "Generate concise step-by-step instructions from screenshots.\n" +
    "Screenshots are in chronological order; step order MUST follow screenshot order.\n" +
    "Language must be ko-KR.\n" +
    "Each instruction should be short and clear (1-2 sentences).\n" +
    "Highlight coordinates are PIXELS relative to the full image with origin at top-left: {x,y,w,h}.\n" +
    "If unsure about bbox, set highlight to {x:0,y:0,w:0,h:0} and explain uncertainty in notes.";

  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "auto" }> = [
    {
      type: "input_text",
      text: "language=ko-KR; workflow_name=CRM 리드 등록"
    }
  ];

  for (const asset of assets) {
    const file = await fs.readFile(path.resolve(asset.filePath));
    content.push({
      type: "input_image",
      image_url: toDataUrl(asset.mimeType, file),
      detail: "auto"
    });
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1";

  const response = await openai.responses.create({
    model,
    instructions,
    input: [
      {
        role: "user",
        content
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...tutorialJsonSchema
      }
    }
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("Model did not return output_text");
  }

  const parsed = tutorialSchema.parse(JSON.parse(outputText));
  parsed.steps = parsed.steps
    .sort((a, b) => a.step_no - b.step_no)
    .map((step, idx) => ({ ...step, step_no: idx + 1 }));

  return parsed;
}

export async function synthesizeStepVoice(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
  const voice = process.env.OPENAI_TTS_VOICE ?? "alloy";

  const speech = await openai.audio.speech.create({
    model,
    voice,
    input: text
  });

  const data = await speech.arrayBuffer();
  return Buffer.from(data);
}
