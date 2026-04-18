import { GoogleGenAI, Type } from "@google/genai";
import { RiskRow, PhotoHints } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const generateRiskDraft = async (activity: string, photoBase64?: string): Promise<RiskRow[]> => {
  const prompt = `
    Conduct a construction site risk assessment for: "${activity}".
    ${photoBase64 ? "Analyze the attached photo for environmental hazards." : ""}
    
    CATEGORIES: 'Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychosocial'
    SOURCE: If derived from photo, use 'Photo', else 'Baseline'.
    SCORING: 
    - Likelihood (1-5): 1=Rare, 5=Almost Certain
    - Severity (1-5): 1=Insignificant, 5=Catastrophic
    
    CRITICAL RULES:
    1. AI never makes definitive site safety claims.
    2. Any hazard identified purely from AI inference MUST be marked as 'requiresReview: true'.
    3. Format the response as a JSON array of RiskRow objects.
  `;

  try {
    const contents = photoBase64 ? {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: photoBase64 } },
        { text: prompt }
      ]
    } : prompt;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              source: { type: Type.STRING, enum: ['Baseline', 'Photo'] },
              category: { type: Type.STRING, enum: ['Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychosocial'] },
              hazard: { type: Type.STRING },
              impact: { type: Type.STRING },
              likelihood: { type: Type.INTEGER },
              severity: { type: Type.INTEGER },
              controls: { type: Type.STRING },
              requiresReview: { type: Type.BOOLEAN },
              status: { type: Type.STRING, enum: ['draft'] }
            },
            required: ['id', 'source', 'category', 'hazard', 'impact', 'likelihood', 'severity', 'controls', 'requiresReview', 'status']
          }
        }
      }
    });

    const parsed: any[] = JSON.parse(response.text || "[]");
    return parsed.map(item => ({
      ...item,
      riskScore: item.likelihood * item.severity
    }));
  } catch (error) {
    console.error("AI Risk Generation Error:", error);
    return [];
  }
};
