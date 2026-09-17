const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Please enter a message." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "The AI service is not configured. Add GEMINI_API_KEY in the deployment's environment variables."
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const safeHistory = Array.isArray(history)
      ? history
          .filter(x => x && (x.role === "user" || x.role === "model") && typeof x.text === "string")
          .slice(-10)
          .map(x => ({ role: x.role, parts: [{ text: x.text.slice(0, 6000) }] }))
      : [];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...safeHistory,
        { role: "user", parts: [{ text: String(message).slice(0, 6000) }] }
      ],
      config: {
        systemInstruction: `You are CampusConnect AI, the academic assistant inside the CampusConnect student platform.
Help students with learning, data science, computer science, programming, study planning, exams, assignments,
projects, and general academic guidance.

Be friendly, concise, and practical. Use headings or bullets when helpful.
Do not invent university-specific facts, dates, marks, syllabus details, notices, or policies.
If exact university information is requested but no official CampusConnect document has been supplied to you,
say that the exact information is not available in the current knowledge base and ask the student to provide
the relevant official document. Never pretend that a guess is an official university fact.
`
      }
    });

    return res.status(200).json({ reply: response.text || "I couldn't generate a response. Please try again." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "The AI service could not respond right now. Please try again."
    });
  }
};
