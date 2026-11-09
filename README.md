# BOON.SS Pro

BOON.SS Pro is a responsive AI co-pilot for brainstorming, learning, and turning questions into useful next steps. It combines a Gemini-powered chat experience with a portfolio-style landing page, optional guest chat, account-based cloud history, and a Formspree contact form.

## Live experience

- **Home:** introduction, animated Earth, project sections, and contact form.
- **Try demo:** opens chat without requiring an account.
- **Sign in / sign up:** unlocks account-specific chat history and profile controls.
- **Contact:** sends a portfolio message through the configured Formspree form.

## Features

### AI chat

- Gemini responses streamed as they are generated
- English and Hinglish replies with Markdown formatting
- Edit and retry a prompt, regenerate a response, or stop generation
- Copy, share, and read responses aloud
- Text and image attachments
- Browser-based speech-to-text input

### Accounts and chat history

- Email and password sign-up/sign-in with a display name, backed by MongoDB
- Signed session tokens retained across page refreshes
- Account-specific, searchable cloud chat history
- Archive and restore conversations
- Move conversations to Trash, restore them, or permanently delete them
- Update the display name from the profile menu
- Guest conversations and archives stay in the current browser
- Guest mode has a seven-message allowance

### Portfolio and contact

- Responsive landing page with an animated, locally hosted Earth illustration
- Explore, technology, journal, and contact sections
- Formspree form endpoint configurable without exposing a private API token
- LinkedIn and GitHub profile links

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript |
| UI icons | Lucide React |
| AI | Google Gemini API (`@google/genai`) |
| Server | Node.js HTTP server |
| Accounts and chat history | MongoDB |
| Contact form | Formspree |
| Hosting blueprint | Render |

## Project structure

```text
BOON.SS-Pro/
├── public/
│   ├── earth-map.svg       # Local map texture for the rotating Earth
│   ├── favicon.svg
│   ├── icons.svg
│   └── robots.txt
├── src/
│   ├── App.jsx             # Landing page, chat, contact form, account UI
│   ├── App.css             # App and landing page styles
│   ├── ProfileMenu.css     # Profile menu and chat actions
│   ├── AskAi.js            # Browser-side API client
│   ├── index.css           # Global styles
│   └── main.jsx            # React entry point
├── server.js               # Gemini, auth, MongoDB, and chat API
├── dev.js                  # Runs Vite and the API server together
├── render.yaml             # Render Blueprint
├── .env.example            # Environment variable template
└── README.md
```

## Requirements

- Node.js 22 (or a Node release supported by the installed Vite version)
- npm
- A Google Gemini API key to use AI chat
- A MongoDB database for account sign-in and cloud chat history
- A Formspree form endpoint to receive portfolio contact submissions

The app can build and show its landing page without Gemini or MongoDB credentials. Those services are needed for their corresponding features.

## Local setup

1. Install packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the variables you need.

3. Start the frontend and API together:

   ```bash
   npm run dev
   ```

4. Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

The development server proxies `/api` requests to the Node API on port `8787`.

## Environment variables

| Variable | Required for | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | AI chat | Server-side Google Gemini API key |
| `GEMINI_MODEL` | AI chat | Optional model name; defaults to `gemini-3.1-flash-lite` |
| `MONGODB_URI` | Accounts and cloud chats | MongoDB connection URI |
| `MONGODB_DB` | Accounts and cloud chats | Database name; defaults to `boon` |
| `SESSION_SECRET` | Sign-in | Long random secret used to sign sessions |
| `VITE_FORMSPREE_ENDPOINT` | Contact form | Public endpoint in the form `https://formspree.io/f/your_form_id` |
| `PORT` | API server | Server port; defaults to `8787` |

Never commit `.env` or put private backend credentials in `VITE_` variables. The Formspree form endpoint is intended to be public; do not put a private Formspree API token in the frontend.

## Configure Formspree

1. Create a form in Formspree and set the destination inbox to `sonalsuryvanshi@95gmail.com`.
2. Copy the form endpoint, for example `https://formspree.io/f/your_form_id`.
3. Add it to the local `.env`:

   ```env
   VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/your_form_id
   ```

4. Restart the dev server after changing `.env`.
5. Optionally enable an autoresponder in Formspree for visitor thank-you emails.

The form includes a honeypot field to help deter automated spam. Formspree may require you to confirm or activate the form before it accepts submissions.

## Accounts and data

On first use, the API creates a unique index for user emails and an index for each user's recent chats. Passwords are salted and hashed before storage. Chat API operations are scoped to the signed-in user.

```text
MongoDB
├── users
│   └── email, salt, passwordHash, displayName, createdAt
└── chats
    └── userId, title, messages, status, updatedAt
```

Chat status is `active`, `archived`, or `trash`. Permanent deletion removes a chat record. Guest chat sessions and archives are stored in that browser's local storage; signing out does not sign the user out automatically or delete the account's MongoDB data.

## Run and validate

```bash
npm run build       # Production frontend build in dist/
npm run lint        # Oxlint
npm run preview     # Preview the production frontend
npm run server      # Run only the Node API server
npm start           # Production API and static frontend server
```

### Lighthouse

Run Lighthouse against the production build served by `npm start` or `npm run preview`. Example:

```bash
npx lighthouse http://localhost:8787 \
  --chrome-flags="--headless" \
  --only-categories=performance,accessibility,best-practices,seo
```

Scores depend on browser, machine load, network, viewport, and enabled external services. Run more than once and compare the same Lighthouse version and settings; no score is guaranteed across all environments.

## Deploy to Render

The repository includes a Render Blueprint in `render.yaml`.

1. Push the project to a Git provider and connect it to Render.
2. In Render, choose **New → Blueprint** and select the repository's `render.yaml`.
3. Configure the requested secrets, including `GEMINI_API_KEY` and `MONGODB_URI`. The Blueprint generates `SESSION_SECRET`.
4. Set `VITE_FORMSPREE_ENDPOINT` to the Formspree endpoint in the service's environment settings. As a `VITE_` variable, it must be available during the frontend build.
5. Deploy. The Blueprint runs `npm install && npm run build`, then `npm start`, and checks `/api/health`.
6. Submit a test contact form and verify delivery in the configured Formspree inbox.

For MongoDB Atlas, allow connections from the deployed Render service. A free Render web service may sleep when idle and take longer to answer its first request.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| AI chat reports a server error | Confirm `GEMINI_API_KEY`, model availability, and server logs |
| Sign-in or chat history fails | Check `MONGODB_URI`, Atlas network access, and `SESSION_SECRET` |
| Contact form says it cannot send | Check the Formspree endpoint, form activation, inbox verification, and Formspree dashboard |
| Microphone does not start | Use a supported browser, allow microphone access, and use HTTPS or localhost |
| Direct asset or page fails after deployment | Check Render build output and that the service is serving the `dist/` directory |
| Render health check fails | Open `/api/health` and inspect the service logs |

## Maintainer

**Sonal Suryvanshi**

- [LinkedIn](https://www.linkedin.com/in/sonal-suryvanshi-45a400335)
- [GitHub](https://github.com/Sonal-Suryvanshi10)
