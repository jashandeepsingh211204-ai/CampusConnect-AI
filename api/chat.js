
const { GoogleGenAI } = require("@google/genai");
const academicData = require("../data/pu-data-science-2026-27.json");

const MODEL = "gemini-3.5-flash";
const NOT_AVAILABLE = "Not available in the provided document.";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function semesterFromQuery(q) {
  const match = q.match(/(?:semester|sem)\s*(1|2|3|4)\b/);
  return match ? Number(match[1]) : null;
}

function buildAcademicContext(question) {
  const q = normalize(question);
  const sem = semesterFromQuery(q);
  const allSubjects = [
    ...academicData.subjects,
    ...academicData.projectSubjects,
    ...academicData.semester4Components
  ];

  const matched = allSubjects.filter((s) => {
    const haystack = normalize([
      s.code, s.name, s.category,
      ...(s.units || []).flatMap((u) => u),
      ...(s.books || []).flatMap((b) => b),
      s.objectives, s.outcomes
    ].join(" "));
    const codeMatch = q.includes(normalize(s.code));
    const nameWords = normalize(s.name).split(" ").filter((w) => w.length > 3);
    const nameMatch = nameWords.some((w) => q.includes(w));
    const keywordMatch = ["unit", "topic", "syllabus", "book", "objective", "outcome", "marks", "credit", "exam", "paper"]
      .some((w) => q.includes(w)) && nameWords.some((w) => haystack.includes(w) && q.includes(w));
    return codeMatch || nameMatch || keywordMatch || (sem && s.semester === sem);
  });

  const selected = matched.length ? matched : [];
  const wantsAllSubjects = /\b(all|list|subjects|papers|courses|curriculum|course structure)\b/.test(q);

  let context = {
    source: academicData.source,
    programme: academicData.programme,
    semesters: academicData.semesters,
  };

  if (wantsAllSubjects || sem) {
    context.subjects = allSubjects
      .filter((s) => !sem || s.semester === sem)
      .map(s => ({
        semester: s.semester,
        code: s.code,
        name: s.name,
        category: s.category,
        lectures: s.lectures,
        universityExamMarks: s.exam,
        internalAssessmentMarks: s.internal,
        totalMarks: s.total,
        credits: s.credits
      }));
  }

  if (selected.length) {
    context.selectedSubjects = selected.slice(0, 3);
  }

  if (/\b(project|major project|seminar|training|viva|report)\b/.test(q)) {
    context.projectSubjects = academicData.projectSubjects;
    context.majorProjectRequirements = academicData.majorProjectRequirements;
  }

  return JSON.stringify(context, null, 2);
}

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
    const question = String(message).slice(0, 6000);
    const academicContext = buildAcademicContext(question);

    const safeHistory = Array.isArray(history)
      ? history
          .filter(x => x && (x.role === "user" || x.role === "model") && typeof x.text === "string")
          .slice(-10)
          .map(x => ({ role: x.role, parts: [{ text: x.text.slice(0, 6000) }] }))
      : [];

    const systemInstruction = `You are CampusConnect AI, the academic assistant inside the CampusConnect student platform.

PRIMARY SOURCE OF TRUTH
The supplied ACADEMIC CONTEXT comes from the official Panjab University syllabus for:
M.Sc. (Hons.) (Two-Year programme) in Computer Science, Specialization in Data Science,
Honours School System, Examinations 2026-2027.

RULES
1. For university/programme-specific questions, use the supplied ACADEMIC CONTEXT as the source of truth.
2. Never invent or guess PU-specific subjects, syllabus units, marks, credits, books, exam rules, project rules, dates, notices or policies.
3. If the requested exact PU information is not present in the supplied context, say exactly: "Not available in the provided document." Then briefly explain what information is available if useful.
4. You may explain general academic concepts using your own knowledge, but clearly distinguish general explanations from official PU information.
5. When listing subjects, preserve their official paper codes and names.
6. Be concise, student-friendly, and practical. Use tables or bullets when helpful.
7. If asked about a semester, give the relevant semester's complete subject list and credits/marks when present.
8. If asked about a subject, use its objectives, outcomes, units and books when supplied.
9. Do not claim that information comes from a document unless it is present in ACADEMIC CONTEXT.

ACADEMIC CONTEXT
${academicContext}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        ...safeHistory,
        { role: "user", parts: [{ text: question }] }
      ],
      config: {
        systemInstruction
      }
    });

    return res.status(200).json({
      reply: response.text || "I couldn't generate a response. Please try again."
    });
  } catch (error) {
    console.error("CampusConnect AI error:", error);
    return res.status(500).json({
      error: "The AI service could not respond right now. Please try again."
    });
  }
};
