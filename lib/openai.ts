import OpenAI from "openai";
import { tutorialJsonSchema, tutorialSchema } from "@/lib/schema";
import { readStorageObject } from "@/lib/storage";
import type { AssetRecord, TutorialSchema } from "@/lib/types";

function toDataUrl(mimeType: string, content: Buffer): string {
  return `data:${mimeType};base64,${content.toString("base64")}`;
}

export async function generateTutorialFromAssets(assets: AssetRecord[], workflowName: string): Promise<TutorialSchema> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  const openai = new OpenAI({ apiKey });

  const instructions =
    "You are an LMS tutorial generation engine.\n" +
    "Return output ONLY as JSON that matches the provided json_schema. Do not add any text outside JSON.\n" +
    "Screenshots are in chronological order.\n" +
    "Generate concise step-by-step instructions from screenshots.\n" +
    "You may output 1-4 micro-steps per screenshot when the UI is dense, but keep total steps reasonable (6-14 if possible).\n" +
    "Each step MUST include asset_index that points to the screenshot index (0-based).\n" +
    "Step order must follow screenshot chronology (asset_index non-decreasing unless strongly justified by UI flow).\n" +
    "Language must be ko-KR.\n" +
    "Each instruction should be short and clear (1-2 sentences).\n" +
    "Do not hallucinate non-visible UI elements.\n" +
    "Highlight coordinates are PIXELS relative to the full image with origin at top-left: {x,y,w,h}.\n" +
    "If unsure about bbox, set highlight to {x:0,y:0,w:0,h:0} and explain uncertainty in notes.";

  const detail: "auto" | "low" | "high" =
    process.env.OPENAI_IMAGE_DETAIL === "high" ? "high" : process.env.OPENAI_IMAGE_DETAIL === "low" ? "low" : "auto";

  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "auto" | "low" | "high" }> = [
    {
      type: "input_text",
      text: `language=ko-KR; workflow_name=${workflowName}; image_count=${assets.length}`
    }
  ];

  const imageContent = await Promise.all(
    assets.map(async (asset) => {
      const file = await readStorageObject(asset.filePath);
      return {
        type: "input_image" as const,
        image_url: toDataUrl(asset.mimeType, file),
        detail
      };
    })
  );
  content.push(...imageContent);

  const model = process.env.OPENAI_MODEL_TUTORIAL ?? "gpt-4.1-mini";

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
    },
    max_output_tokens: 1800
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("Model did not return output_text");
  }

  const parsed = tutorialSchema.parse(JSON.parse(outputText));
  const maxAssetIndex = Math.max(0, assets.length - 1);
  parsed.steps = parsed.steps
    .sort((a, b) => a.step_no - b.step_no)
    .map((step, idx) => ({
      ...step,
      step_no: idx + 1,
      asset_index: Math.min(maxAssetIndex, Math.max(0, step.asset_index))
    }));

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
