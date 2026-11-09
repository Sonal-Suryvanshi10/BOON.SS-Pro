# BOON.SS Pro

BOON.SS Pro is a Gemini powered AI chat app with streaming replies, MongoDB backed accounts and synced conversation history.

The first screen keeps the BOON.SS welcome layout. Choose **Try demo** to open the full chat page. Guests can send seven messages before BOON asks them to create an account or sign in. The guest counter is stored in that browser; signing in or creating an account resets it.

## Features

- Streaming AI responses, with stop and regenerate controls
- English and Hinglish replies, with Markdown formatting for headings, lists, links and code
- MongoDB email and password accounts, signed sessions and per-user cloud chat history
- Local conversation history, search and saved prompts
- Image and text file attachments
- Browser voice input and read-aloud, plus copy and share actions
- Edit a prompt and regenerate its answer, or remove a message
- Responsive desktop and mobile chat layout
- BOON.SS welcome page with a full-screen chat demo and seven-message guest allowance

## Requirements

- Node.js 20 or newer
- A Gemini API key
- MongoDB local instance or MongoDB Atlas database

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the values below.
3. Start the frontend and API server: `npm run dev`
4. Open the Vite URL printed in the terminal (usually `http://localhost:5173`).

The development command runs Vite and the Node API together. The Vite server proxies `/api` calls to `http://localhost:8787`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API key |
| `GEMINI_MODEL` | Optional model override; defaults to `gemini-3.1-flash-lite` |
| `MONGODB_URI` | MongoDB connection URI |
| `MONGODB_DB` | Database name; defaults to `boon` |
| `SESSION_SECRET` | Long random secret for signing login sessions |
| `PORT` | API server port; defaults to `8787` |

Keep credentials in the backend `.env` file or your hosting provider's secret settings. Do not use the `VITE_` prefix for secrets or commit `.env`.

## MongoDB and accounts

Create a MongoDB database user and allow the development machine or hosted backend in Atlas Network Access. On first use, BOON creates a unique index for user emails and an index for each user's recent chats. Sign-up and sign-in use email and password; passwords are salted and hashed on the server. Chat records are scoped to the signed-in account. Guest chats and saved prompts remain in that browser's local storage.

## Production deployment

Deploy the built Vite frontend and Node server. Configure the host to route `/api/*` to the Node server, provide the environment variables through host secrets, and set `PORT` to the port supplied by the platform. The MongoDB URI must be reachable from the backend host.

## Scripts

- `npm run dev` — run Vite and the API server together
- `npm run build` — build the frontend into `dist/`
- `npm run preview` — preview the production frontend build
- `npm run server` — run only the API server
