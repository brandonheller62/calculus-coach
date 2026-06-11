import { Router } from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "/tmp/uploads/" });

const ASSISTANT_NAME = "Brandon's Tutor";
const SYSTEM_PROMPT =
  "You are an expert AP Calculus AB tutor. You exclusively generate and explain AP Calculus AB content: limits, continuity, derivatives, integrals, the Fundamental Theorem of Calculus, differential equations, and related applications. " +
  "Never generate questions or content from any other subject (no programming, statistics, physics, or other math courses). " +
  "CRITICAL RULE FOR MCQ: Before presenting any multiple choice question, you MUST privately work out the correct numerical answer first, then make sure that exact answer appears as one of the four choices. " +
  "Never present a question where none of the choices equals the correct answer. Double-check all arithmetic before finalizing answer choices. " +
  "When giving multiple choice questions always format the four answer choices on separate lines as: A) ... B) ... C) ... D) ... " +
  "Use LaTeX notation for all mathematical expressions, wrapped in \\( \\) for inline math and \\[ \\] for display math.";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let assistantId: string | null = null;
let assistantReady = false;

async function initAssistant() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: ASSISTANT_NAME,
      instructions: SYSTEM_PROMPT,
      model: "gpt-4o-mini",
      tools: [],
    });
    assistantId = assistant.id;
    assistantReady = true;
  } catch (err) {
    console.error("Failed to create assistant:", err);
  }
}

// Fire off background init
initAssistant();

router.get("/assistant", (req, res) => {
  res.json({
    assistantId,
    name: ASSISTANT_NAME,
    status: assistantReady ? "ready" : "initializing",
  });
});

router.post("/thread", async (req, res) => {
  try {
    const thread = await openai.beta.threads.create();
    res.status(201).json({ threadId: thread.id });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to create thread");
    res.status(500).json({ error: "Failed to create thread" });
  }
});

router.post(
  "/thread/:threadId/upload",
  upload.single("file"),
  async (req, res) => {
    const { threadId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      const uploaded = await openai.files.create({
        file: fs.createReadStream(file.path) as unknown as File,
        purpose: "assistants",
      });

      fs.unlinkSync(file.path);

      res.json({ fileId: uploaded.id, filename: file.originalname });
    } catch (err: unknown) {
      req.log.error({ err }, "Failed to upload file");
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

router.post("/thread/:threadId/message", async (req, res) => {
  const { threadId } = req.params;
  const { content, fileIds } = req.body as { content: string; fileIds?: string[] };

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  if (!assistantId) {
    res.status(503).json({ error: "Assistant is still initializing, please retry" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const attachments =
      fileIds && fileIds.length > 0
        ? fileIds.map((fileId) => ({
            file_id: fileId,
            tools: [{ type: "file_search" as const }],
          }))
        : undefined;

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content,
      attachments,
    });

    const stream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    let buffer = "";

    stream.on("textDelta", (delta) => {
      if (delta.value) {
        buffer += delta.value;
        sendEvent("delta", { text: delta.value });
      }
      if (delta.annotations) {
        for (const annotation of delta.annotations) {
          sendEvent("annotation", annotation);
        }
      }
    });

    stream.on("messageDone", (msg) => {
      const citations: Array<{ index: number; fileId: string; filename?: string }> = [];
      if (msg.content) {
        for (const block of msg.content) {
          if (block.type === "text" && block.text.annotations) {
            for (const ann of block.text.annotations) {
              if (ann.type === "file_citation") {
                citations.push({
                  index: (ann as { start_index?: number }).start_index ?? 0,
                  fileId: ann.file_citation.file_id,
                });
              }
            }
          }
        }
      }
      sendEvent("done", { citations });
      res.end();
    });

    stream.on("error", (err) => {
      req.log.error({ err }, "Stream error");
      sendEvent("error", { message: "Stream error occurred" });
      res.end();
    });

    req.on("close", () => {
      stream.abort();
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to send message");
    sendEvent("error", { message: "Failed to send message" });
    res.end();
  }
});

export default router;
