import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size since book base64 data can be larger (set to 15mb limit)
  app.use(express.json({ limit: "15mb" }));

  // API Route for automatic Book Metadata extraction via Gemini
  app.post("/api/extract-metadata", async (req, res) => {
    const { fileName, fileType, fileHeaderContent } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "fileName parameter is required" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not defined");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Prepare beautiful structured prompt incorporating both filename clues and printable text metadata
      let prompt = `You are a professional academic Data Science & Computer Science librarian & cataloger.
We have received a new book upload.
File name: "${fileName}"
File type: "${fileType}"

Analyze the filename and any document header contents provided below to discover the exact real-world textbook, scientific paper, or technical manual.
Extract its genuine real-life metadata (do not use generic placeholders like "Local Upload" or "Extracted from filename"). Retrieve its precise authors, publisher, actual published year, and a realistic page count.

Select the single, most applicable category from this existing collection:
- AI Automation
- AI Engineering
- Business Analytics
- Computer Vision
- Data Engineering
- Data Visualization
- Machine Learning and Deep Learning
- Math for Data Science
- Programming Languages
- Project Management
- SQL`;

      if (fileHeaderContent) {
        prompt += `\n\nWe extracted the following printable text and metadata markers from the beginning of this document:
=== START OF FILE HEADER ===
${fileHeaderContent}
=== END OF FILE HEADER ===

Use these raw markers (like "/Title", "/Author", "/Creator", "/Producer", copyright page credits, and preface sentences) to identify and extract the exact details of this work.`;
      }

      prompt += `\n\nStrictly output a valid JSON object matching the requested schema. Make sure year and pageCount are realistic integers. Fabricate beautiful outline topics and descriptions based on the real content. For the "coverColor" value, suggest a striking modern technical CSS gradient (e.g. "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)", "linear-gradient(135deg, #312e81 0%, #111827 100%)") that flatters this subject matter.`;

      const targetSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Extract the exact or closest title of the textbook or paper." },
          authors: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Array of human names who authored this book." 
          },
          publisher: { type: Type.STRING, description: "The publishing company or academic press name." },
          year: { type: Type.INTEGER, description: "The standard integer listing when the first edition or this edition printed." },
          category: { type: Type.STRING, description: "One exact category selected from the list of 11 options above." },
          pageCount: { type: Type.INTEGER, description: "A realistic total number of pages." },
          description: { type: Type.STRING, description: "A highly captivating 1-2 sentence promo summary." },
          overview: { type: Type.STRING, description: "A comprehensive syllabus overview summary paragraph." },
          keyTopics: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "List of 4 to 6 core tech skills, math tools or chapters discussed (e.g. ['Linear Regression', 'Overfitting', 'Cross Entropy'])." 
          },
          targetAudience: { type: Type.STRING, description: "Who should read this book?" },
          entryPrerequisites: { type: Type.STRING, description: "Helpful prerequisites to master before reading." },
          coverColor: { type: Type.STRING, description: "A beautiful aesthetic modern CSS linear-gradient." }
        },
        required: [
          "title", "authors", "publisher", "year", "category", 
          "pageCount", "description", "overview", "keyTopics", 
          "targetAudience", "entryPrerequisites", "coverColor"
        ]
      };

      let extractedText = "{}";
      const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
      let lastModelError: any = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Express] Attempting metadata extraction with model: ${modelName}`);
          const aiClient = new GoogleGenAI({
            apiKey,
            httpOptions: {
              timeout: 15000, // 15 seconds timeout per model attempt to prevent connection hanging
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const apiResponse = await aiClient.models.generateContent({
            model: modelName,
            contents: [{ text: prompt }],
            config: {
              responseMimeType: "application/json",
              responseSchema: targetSchema
            }
          });

          if (apiResponse && apiResponse.text) {
            extractedText = apiResponse.text;
            console.log(`[Express] Metadata extraction succeeded with model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.error(`[Express] Model ${modelName} failed:`, err.message || err);
          lastModelError = err;
        }
      }

      if (extractedText === "{}") {
        throw lastModelError || new Error("All tried models failed to extract metadata.");
      }

      const meta = JSON.parse(extractedText);

      // Programmatically map a beautiful high-resolution curated Unsplash background photo based on the extracted book metadata
      const unsplashPool = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe", // Purple fluid grid
        "https://images.unsplash.com/photo-1527474305487-b87b222841cc", // Neon artificial tech
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71", // Modern charts/dashboard
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5", // Dark digital green code lines
        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4", // Abstract code connections
        "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0", // Celestial dark blue dust
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa", // Technological globe node framework
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31", // Datacenter server infrastructure lines
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3", // Financial charts diagram matte
        "https://images.unsplash.com/photo-1639762681485-074b7f938ba0", // White nodes connection mesh
        "https://images.unsplash.com/photo-1635070041078-e363dbe005cb"  // Mathematics wireframe geometric lines
      ];

      // Form a stable hash from full titles to guarantee consistent cover photo rendering across server reloads
      let stableCode = 0;
      const stableSubject = meta.title || fileName;
      for (let i = 0; i < stableSubject.length; i++) {
        stableCode = stableSubject.charCodeAt(i) + ((stableCode << 5) - stableCode);
      }
      const choiceIndex = Math.abs(stableCode) % unsplashPool.length;
      meta.coverImage = `${unsplashPool[choiceIndex]}?auto=format&fit=crop&q=80&w=400`;

      return res.json(meta);
    } catch (err: any) {
      console.error("Gemini metadata extraction error:", err);
      // Fallback response with basic details extracted using standard fallback logic
      const rawCleanedName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      return res.json({
        title: rawCleanedName,
        authors: ["Extracted from filename"],
        publisher: "Local Upload",
        year: new Date().getFullYear(),
        category: "AI Engineering",
        pageCount: 300,
        description: `Uploaded file ${fileName}. Metadata auto-recovery active due to extraction timeout.`,
        overview: "A custom handbook curated inside your local digital bookshelf catalog.",
        keyTopics: ["Data Science fundamentals", "Unstructured Document Analysis"],
        targetAudience: "General AI Practitioners and self-directed learners.",
        entryPrerequisites: "Foundational general data engineering and computer basics.",
        coverColor: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400"
      });
    }
  });

  // API proxy to serve external PDF files seamlessly on the same origin (prevents any CORS 'Failed to fetch' blocks in PDF.js)
  app.get("/api/proxy-pdf", async (req, res) => {
    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid url parameter" });
    }

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from remote source: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "application/pdf";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy PDF] error downloading remote document:", err);
      return res.status(500).json({ error: err.message || "Failed to download proxy file" });
    }
  });

  // Serve front-end assets with Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Full-Stack server running on http://localhost:${PORT}`);
  });
}

startServer();
