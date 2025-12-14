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

  // 2. Use Protocol Scores Directly (No AI Adjustment)
  // Map protocol matches to diagnosis format using base_score as probability
  const diagnoses = potentialMatches
    .sort((a, b) => b.base_score - a.base_score)
    .map(m => ({
      name: m.name,
      probability: m.base_score,
      reasoning: `Protocol match based on: ${m.matched_keywords.join(', ')}`,
      suggested_tests: m.original_tests ? m.original_tests.split(',').map(t => t.trim()) : [],
      treatment_plan: m.original_plan || 'See protocol file for details'
    }));

  console.log('[Scoring] Protocol-based diagnoses:', diagnoses);

  // 3. Optional AI Considerations (does not modify scores)
  let summary = `Analysis performed using Weighted Scoring System based on "${caseData.scoringFile?.name}". ${diagnoses.length} condition(s) matched the clinical presentation.`;
  
  const apiBase = (import.meta.env?.VITE_API_BASE as string) || '';
  console.log('[Scoring] Attempting AI considerations. API Base:', apiBase);
  
  if (apiBase) {
    try {
      const considerationsPrompt = `You are a veterinary clinical assistant. Based on the protocol analysis below, provide brief clinical considerations.

PATIENT DATA:
- Species: ${caseData.species}
- Breed: ${caseData.breed || 'Unknown'}
- Age: ${caseData.age}
- Weight: ${caseData.weight}
- Clinical Signs: ${caseData.clinicalSigns}
- Lab Findings: ${caseData.labFindings || 'None'}

PROTOCOL ANALYSIS RESULTS (scores based on protocol file):
${diagnoses.slice(0, 5).map(d => `- ${d.name}: ${d.probability}% probability`).join('\n')}

Provide 2-3 sentences of clinical considerations based on the signalment and findings. Do NOT adjust the scores. Return ONLY plain text, no JSON.`;

      const form = new FormData();
      form.append('prompt', considerationsPrompt);
      form.append('model', 'gemini-2.0-flash-exp');
      
      const csrf = (() => { try { return localStorage.getItem('mozarela_csrf') } catch(e){ return null } })();
      const base = apiBase.replace(/\/$/, '');
      const url = base === '' ? '/api/analyze' : (base === '/api' ? `${base}/analyze` : `${base}/api/analyze`);

      console.log('[Scoring] Fetching AI considerations from:', url);

      const res = await fetch(url, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: csrf ? { 'x-csrf-token': csrf } : undefined
      });

      console.log('[Scoring] AI response status:', res.status);

      if (res.ok) {
        const json = await res.json();
        console.log('[Scoring] AI response JSON:', json);
        
        // Try multiple paths to get the text
        const considerations = json.text || json.parsed || (json.raw && json.raw.text) || '';
        console.log('[Scoring] Extracted considerations:', considerations);
        
        if (considerations && typeof considerations === 'string' && considerations.trim()) {
          summary += `\n\nClinical Considerations: ${considerations.trim()}`;
        } else if (typeof considerations === 'object' && considerations.text) {
          summary += `\n\nClinical Considerations: ${considerations.text.trim()}`;
        }
      } else {
        console.warn('[Scoring] AI response not OK:', await res.text());
      }
    } catch (err) {
      console.warn('[Scoring] AI considerations error:', err);
    }
  }

  return {
    summary,
    diagnoses
  };
};