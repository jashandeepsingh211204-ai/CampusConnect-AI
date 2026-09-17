# CampusConnect AI — GCR-ready deployment package

This version is designed for a **public link**. Users only need a modern browser; they do not need Node.js,
Python, an `.env` file, or localhost.

## Recommended deployment: Vercel

1. Create a GitHub repository and upload all files in this folder.
2. Import that repository into Vercel.
3. In Vercel: Project → Settings → Environment Variables.
4. Add:
   - Name: `GEMINI_API_KEY`
   - Value: your Gemini API key
   - Environment: Production (and Preview if you want)
5. Deploy/redeploy.
6. Vercel gives you a public HTTPS URL. Share that URL in Google Classroom.

The secret key is server-side only. Do NOT put it in `app.js`, `index.html`, or a public GitHub file.

## AI model
Uses stable `gemini-2.5-flash`.

## GCR submission
Submit the project ZIP/source code plus the public URL in the assignment comments or README if your teacher requests it.

## Next CampusConnect upgrade
Add the official university syllabus/PDF knowledge base and citations so the chatbot can answer university-specific questions from your provided documents rather than general AI knowledge.
