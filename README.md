# Calculus Coach — AP Calculus AB Study App

An AI-powered tutoring app that quizzes you on AP Calculus AB through interactive multiple-choice and free-response questions. Built with a React + Vite frontend and an Express backend, streaming answers in real time via OpenAI's Assistants API.

<img width="1488" height="841" alt="image" src="https://github.com/user-attachments/assets/04ec3b5e-e911-41b6-9af6-f14067d8ebcb" />

<img width="1490" height="847" alt="image" src="https://github.com/user-attachments/assets/c6f40e8d-cc5f-46e6-89f6-a41321060892" />

---

## Features

- **Guided setup flow** — choose a unit (Limits & Continuity, Differentiation, Integration, etc.) or General Review, then pick MCQ, FRQ, or Mixed format
- **Streaming responses** — answers stream token-by-token via Server-Sent Events so you never wait on a spinner
- **Interactive MCQ** — answer choices are rendered as clickable buttons; once you pick one the question locks and the tutor explains the answer
- **LaTeX math rendering** — all expressions render beautifully via KaTeX (inline and display math)
- **Question variety** — random seed prompts ensure you get fresh questions every session, not the same ones repeated
- **Answer verification** — the AI verifies its own arithmetic before presenting choices, so the correct answer is always one of A/B/C/D
- **File upload** — attach a PDF or image to ask questions about your own notes or practice problems
- **Dark mode UI** — clean, distraction-free interface optimised for studying

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express 5, TypeScript, Node.js 24 |
| AI | OpenAI Assistants API (`gpt-4o-mini`), SSE streaming |
| Math rendering | KaTeX (via `react-katex`) |
| Monorepo | pnpm workspaces |
| Build | esbuild (server), Vite (client) |

---

## Project Structure

```
artifacts/
  api-server/          # Express API — chat threads, SSE streaming, file upload
  calculus-tutor/      # React + Vite frontend
lib/
  api-spec/            # OpenAPI spec + generated Zod schemas & React Query hooks
  db/                  # Drizzle ORM schema (PostgreSQL)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- An OpenAI API key

### Install

```bash
pnpm install
```

### Environment variables

Create a `.env` file in `artifacts/api-server/`:

```env
OPENAI_API_KEY=sk-...
SESSION_SECRET=your-secret-here
```

### Run in development

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 20092)
pnpm --filter @workspace/calculus-tutor run dev
```

Open `http://localhost:20092` in your browser.

---

## AP Calculus AB Units Covered

1. Limits and Continuity
2. Differentiation: Definition and Fundamental Properties
3. Differentiation: Composite, Implicit, and Inverse Functions
4. Contextual Applications of Differentiation
5. Applying Derivatives to Analyze Functions
6. Integration and Accumulation of Change
7. Differential Equations
8. Applications of Integration
9. General Review (randomised across all units)

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api` | Health check |
| `GET` | `/api/healthz` | Health check (detailed) |
| `GET` | `/api/chat/assistant` | Assistant status |
| `POST` | `/api/chat/thread` | Create a new conversation thread |
| `POST` | `/api/chat/thread/:id/message` | Send a message, stream response via SSE |
| `POST` | `/api/chat/thread/:id/upload` | Upload a file for context |

---

## License

MIT
