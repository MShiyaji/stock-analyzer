
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Polyfill for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Try to find the API Key
let apiKey = process.env.VITE_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  try {
    const envPath = path.resolve(__dirname, ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/VITE_API_KEY=(.*)/);
      if (match && match[1]) {
        apiKey = match[1].trim().replace(/["']/g, ""); // Remove quotes if present
      }
    }
  } catch (e) {
    console.warn("Could not read .env.local");
  }
}

if (!apiKey) {
  console.error("❌ No API Key found. Please set VITE_API_KEY in .env.local or passes as env var.");
  process.exit(1);
}

console.log(`Using API Key: ${apiKey.slice(0, 5)}...`);

// 2. Client Setup
// Note: @google/genai syntax might differ slightly between versions, using standard listModels approach
const genAI = new GoogleGenAI({ apiKey });

async function list() {
  try {
    console.log("Fetching available models...");
    // The SDK structure is genAI.models.list() for v1, let's try that wrapper
    // Or direct request if sdk version issues.
    
    // Attempting via SDK
    // note: the user has @google/genai ^1.34.0 installed
    // In strict v1 SDK:
    // const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    // Usually via genAI.makeRequest or similar for listing if not exposed on top level.
    // Actually, newer SDKs expose `models` namespace.
    
    // If the high level SDK doesn't expose list easily, we can stick to REST for the query to be sure.
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    
    if (data.models) {
        console.log("\n✅ Available Models:");
        data.models.forEach(m => {
            if (m.name.includes("gemini")) {
                console.log(` - ${m.name.replace('models/', '')} \t(Version: ${m.version})`);
            }
        });
        console.log("\nNote: Use the names above (without 'models/' prefix) in your MODEL_POOL.");
    } else {
        console.log("No models found in response.");
    }

  } catch (err) {
    console.error("Failed to list models:", err);
  }
}

list();
