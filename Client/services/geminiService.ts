import { CaseData, DiagnosisResponse } from "../types";

// SECURITY: Do NOT embed API keys in client-side code. The server should proxy requests
// to the AI provider using a server-side secret (e.g., process.env.GOOGLE_API_KEY).
// If you have accidentally placed an API key in the client environment, remove it
// and instead implement a server endpoint (e.g., POST /api/analyze) that calls the
// provider with your server-side key.
if (typeof window !== 'undefined' && (process as any)?.env?.API_KEY) {
  console.warn('Client-side API key detected. Do NOT store provider API keys in client code. Use a server proxy.');
}

// Analysis is proxied through the API server to keep provider keys secret.

export const analyzeCase = async (caseData: CaseData): Promise<DiagnosisResponse> => {
  // Proxy the analysis request to the server-side AI endpoint to keep keys secret
  const apiBase = (import.meta.env?.VITE_API_BASE as string) || '';
  if (!apiBase) throw new Error('VITE_API_BASE not configured - server proxy required for AI calls');

  // Build prompt (same prompt as before)
  const textPrompt = `Act as a Board-Certified Veterinary Internal Medicine Specialist.\nAnalyze the following case: Patient: ${caseData.patientName}; Species: ${caseData.species}; Breed: ${caseData.breed || 'Not specified'}; Age: ${caseData.age}; Weight: ${caseData.weight}; Clinical Signs: ${caseData.clinicalSigns}; Lab Findings: ${caseData.labFindings}`;

  const form = new FormData();
  form.append('prompt', textPrompt);
  form.append('model', 'models/gemini-1.5-flash'); // Use full model path
  caseData.attachments.forEach((f) => form.append('files', f));

  const csrf = (() => { try { return localStorage.getItem('mozarela_csrf') } catch(e){ return null } })();

  // Avoid duplicating /api when apiBase is '/api'
  const base = apiBase.replace(/\/$/, '');
  const url = base === '' ? '/api/analyze' : (base === '/api' ? `${base}/analyze` : `${base}/api/analyze`);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: csrf ? { 'x-csrf-token': csrf } : undefined
  });

  if (!res.ok) {
    try {
      // Try to parse the error response from the server
      const errorJson = await res.json();
      const serverError = errorJson.error || JSON.stringify(errorJson);

      // Friendly messages for common, non-actionable errors
      if (res.status === 503 || serverError.includes('Service Unavailable')) {
        throw new Error('The AI model is temporarily overloaded. Please try again in a few moments.');
      }
      if (res.status === 429 || serverError.includes('Too Many Requests')) {
        throw new Error('You have exceeded the request limit for the AI service. Please check your plan and billing details, or try again later.');
      }

      // For other errors, show the specific message from the server
      throw new Error(serverError);
    } catch (e: any) {
      // If parsing the error JSON fails, or for any other issue, fall back to the original logic
      if (e.message.startsWith('The AI model') || e.message.startsWith('You have exceeded')) {
        throw e; // Re-throw our friendly error
      }
      throw new Error(`AI proxy error ${res.status}: ${await res.text()}`);
    }
  }

  const json = await res.json();
  // If server returned parsed JSON under `parsed`, use it; otherwise try to parse text
  if (json.parsed) return json.parsed as DiagnosisResponse;
  if (json.text) return JSON.parse(json.text) as DiagnosisResponse;
  // Otherwise, if raw contains text, attempt parse
  if (json.raw && json.raw.text) return JSON.parse(json.raw.text) as DiagnosisResponse;
  throw new Error('AI proxy returned unexpected response');
};