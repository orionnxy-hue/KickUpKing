import { GoogleGenAI } from "@google/genai";

// Circuit breaker state to prevent spamming the API when quota is exceeded
let isQuotaExhausted = false;

const getAiClient = () => {
  if (isQuotaExhausted) return null;
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const FALLBACK_COMMENTS_GAME_OVER = [
  "Better luck next time!",
  "So close!",
  "Great effort!",
  "Keep practicing!",
  "Not bad!",
  "You can do better!",
  "Oops!",
  "Nice try!",
  "Unlucky!",
  "Next time for sure!"
];

const FALLBACK_COMMENTS_MILESTONE = [
  "Nice!",
  "Great moves!",
  "Keep it up!",
  "On fire!",
  "Wow!",
  "Amazing!",
  "Unstoppable!",
  "Legendary!",
  "Smooth skills!"
];

const getRandomFallback = (type: 'GAME_OVER' | 'MILESTONE') => {
  const list = type === 'GAME_OVER' ? FALLBACK_COMMENTS_GAME_OVER : FALLBACK_COMMENTS_MILESTONE;
  return list[Math.floor(Math.random() * list.length)];
};

export const generateCommentary = async (score: number, type: 'GAME_OVER' | 'MILESTONE'): Promise<string> => {
  // If circuit breaker is tripped, return fallback immediately
  if (isQuotaExhausted) return getRandomFallback(type);

  const ai = getAiClient();
  if (!ai) return getRandomFallback(type);

  const prompt = type === 'GAME_OVER'
    ? `The player just dropped the ball in a keepy-uppy soccer game. They scored ${score} points. Give a short, 10-word witty roast or encouragement.`
    : `The player just reached a score of ${score} in a keepy-uppy game! Give a super enthusiastic, 5-word shoutout.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        maxOutputTokens: 50,
        // Fix: Add thinkingBudget when maxOutputTokens is used, as per guidelines for Gemini 3 models
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: "You are a high-energy soccer commentator. Keep it punchy and fun.",
      }
    });

    return response.text || getRandomFallback(type);
  } catch (error: any) {
    // Handle Quota Exhausted (429) errors gracefully
    if (
        error?.status === 429 || 
        error?.message?.includes('429') || 
        error?.toString().includes('Resource exhausted')
    ) {
        console.warn("Gemini API Quota Exceeded. Switching to offline commentary for 1 minute.");
        isQuotaExhausted = true;
        // Reset the circuit breaker after 60 seconds
        setTimeout(() => isQuotaExhausted = false, 60000); 
    } else {
        console.error("Gemini API Error:", error);
    }
    return getRandomFallback(type);
  }
};