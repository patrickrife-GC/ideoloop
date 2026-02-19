# Ideoloop Dev Workflow

## Every work session

### START (pull latest from GitHub)
```
git pull
```

### END (save your work to GitHub + deploy)
```
git add -A
git commit -m "describe what you changed"
git push
npm run build
npx firebase deploy --only hosting
```

---

## Setting up a new machine (first time only)
```
git clone git@github.com:patrickrife-GC/ideoloop.git
cd ideoloop
npm install
```
Then **manually copy your `.env.local` file** to the new machine.
It contains your API keys and is never stored in GitHub (intentionally).

### Contents of .env.local (keep this somewhere safe):
```
AI_PROVIDER=gemini
AI_LIVE_PROVIDER=gemini
AI_IMAGE_PROVIDER=gemini
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Where everything lives
| What | Where |
|------|-------|
| Source code | github.com/patrickrife-GC/ideoloop |
| Live app | app.ideoloop.ai |
| Database & Auth | console.firebase.google.com/project/ideoloop-webapp |
| Local code (this machine) | ~/Desktop/AI-PROJECTS/ideoloop |

---

## If you forget to pull before editing (got out of sync)
Tell Claude Code: "I think I'm out of sync with GitHub, can you help me merge?"
