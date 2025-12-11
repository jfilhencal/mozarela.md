import { DiagnosisResponse, CaseData, Diagnosis } from "../types";

// SECURITY: Do not place provider API keys in client-side code. Use a server proxy
// endpoint (e.g., POST /api/score) that calls the AI provider using a server-side secret.
if (typeof window !== 'undefined' && (process as any)?.env?.API_KEY) {
  console.warn('Client-side API key detected in scoringService. Remove it and use a server-side proxy.');
}

export const getTemplateCSV = () => {
  const headers = "Disease,Symptom_Keywords,Base_Probability,Match_Weight,Suggested_Tests,Treatment_Plan";
  const row1 = "Pneumonia,\"cough,fever,dyspnea,lethargy\",10,20,\"Chest X-ray, CBC\",\"Antibiotics, Nebulization\"";
  const row2 = "Kennel Cough,\"cough,dry,hacking,history of boarding\",20,15,\"PCR Panel\",\"Cough suppressants, Isolation\"";
  const row3 = "CHF,\"cough,murmur,exercise intolerance,dyspnea\",5,25,\"Echocardiogram, ProBNP\",\"Diuretics, Pimobendan, ACE inhibitors\"";
  
  return `${headers}\n${row1}\n${row2}\n${row3}`;
};

export const analyzeWithScoring = async (caseData: CaseData): Promise<DiagnosisResponse> => {
  if (!caseData.scoringFile) {
    throw new Error("No scoring file provided");
  }

  // 1. Local Processing: Parse CSV and Match Symptoms
  let text = "";
  try {
    text = await caseData.scoringFile.text();
  } catch (e) {
    throw new Error("Failed to read scoring file");
  }

  const lines = text.split('\n');
  const potentialMatches: any[] = [];
  const symptoms = caseData.clinicalSigns.toLowerCase();

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to split by comma but ignore commas inside quotes
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const cols = matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : line.split(',');

    if (cols.length >= 6) {
      const diseaseName = cols[0];
      const keywords = cols[1].toLowerCase().split(',').map(k => k.trim());
      const baseProb = parseInt(cols[2]) || 0;
      const weight = parseInt(cols[3]) || 0;
      const tests = cols[4];
      const plan = cols[5];

      let currentScore = baseProb;
      let matchCount = 0;
      const matchedKeywords: string[] = [];

      keywords.forEach(keyword => {
        if (keyword && symptoms.includes(keyword)) {
          currentScore += weight;
          matchCount++;
          matchedKeywords.push(keyword);
        }
      });

      // Keep matches that have at least one keyword hit OR a high base probability (>0)
      if (matchCount > 0 || baseProb > 0) {
        // Cap initial local score at 99
        if (currentScore > 99) currentScore = 99;
        
        potentialMatches.push({
          name: diseaseName,
          base_score: currentScore, // This is the score from the "Vet's File"
          matched_keywords: matchedKeywords,
          original_tests: tests,
          original_plan: plan
        });
      }
    }
  }

  // If no matches found locally, return early
  if (potentialMatches.length === 0) {
    return {
      summary: `Analysis performed using Weighted Scoring System based on "${caseData.scoringFile?.name}". No conditions in the protocol matched the clinical signs provided.`,
      diagnoses: []
    };
  }

  // 2. AI Refinement Step
  // We send the locally calculated matches to Gemini to adjust for Signalment (Breed, Age, Weight)
  const model = "gemini-2.5-flash";
  const prompt = `You are a veterinary clinical assistant helping to refine a weighted scoring analysis.\n
PATIENT DATA:\n- Species: ${caseData.species}\n- Breed: ${caseData.breed || 'Unknown'}\n- Age: ${caseData.age}\n- Weight: ${caseData.weight}\n- Clinical Signs: ${caseData.clinicalSigns}\n- Lab Findings: ${caseData.labFindings || 'None'}\n\nPROTOCOL MATCHES (Baseline):\n${JSON.stringify(potentialMatches, null, 2)}\n\nINSTRUCTIONS: Adjust the scores moderately (+/-10-20) based on signalment and lab findings. Return strict JSON with { summary, diagnoses } as described.`;

  // Proxy to server-side AI endpoint
  const apiBase = (import.meta.env?.VITE_API_BASE as string) || '';
  if (!apiBase) {
    // No server configured — fallback immediately
    const fallbackDiagnoses = potentialMatches
      .sort((a, b) => b.base_score - a.base_score)
      .map(m => ({
        name: m.name,
        probability: m.base_score,
        reasoning: `Protocol Match: ${m.matched_keywords.join(', ')}. (No server configured)` ,
        suggested_tests: [m.original_tests],
        treatment_plan: m.original_plan
      }));

    return { summary: 'Local-only analysis (no server AI proxy configured).', diagnoses: fallbackDiagnoses };
  }

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('model', model);
  form.append('matches', JSON.stringify(potentialMatches));

  const csrf = (() => { try { return localStorage.getItem('mozarela_csrf') } catch(e){ return null } })();

  try {
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
      throw new Error(`AI proxy error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    if (json.parsed) return json.parsed as DiagnosisResponse;
    if (json.text) return JSON.parse(json.text) as DiagnosisResponse;
    if (json.raw && json.raw.text) return JSON.parse(json.raw.text) as DiagnosisResponse;
    throw new Error('Unexpected AI proxy response');
  } catch (err) {
    console.warn('AI Refinement failed, falling back to raw protocol scores.', err);
    const fallbackDiagnoses = potentialMatches
      .sort((a, b) => b.base_score - a.base_score)
      .map(m => ({
        name: m.name,
        probability: m.base_score,
        reasoning: `Protocol Match: ${m.matched_keywords.join(', ')}. (AI Refinement unavailable)`,
        suggested_tests: [m.original_tests],
        treatment_plan: m.original_plan
      }));

    return { summary: 'Analysis based strictly on protocol file (AI refinement unavailable).', diagnoses: fallbackDiagnoses };
  }
};