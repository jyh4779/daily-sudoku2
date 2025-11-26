import { GEMINI_API_KEY } from '../../../config/api';
import { useLanguageStore } from '../../settings/store/languageStore';

export interface AiHintResponse {
    r: number;
    c: number;
    value: number;
    reasoning: string;
}

export const fetchAiHint = async (board: number[][]): Promise<AiHintResponse> => {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API Key is missing. Please check src/config/api.ts');
    }

    const language = useLanguageStore.getState().language;
    const langInstruction = language === 'ko'
        ? "Answer in Korean. (한국어로 답변해줘)"
        : "Answer in English.";

    const prompt = `
    You are a Sudoku expert. Analyze this 9x9 Sudoku board (0 represents empty cells).
    Find the most logical next step.
    
    Board:
    ${JSON.stringify(board)}

    ${langInstruction}
    
    Return ONLY a JSON object with the following format (no markdown, no code blocks):
    {
      "r": number (0-8, row index),
      "c": number (0-8, column index),
      "value": number (1-9),
      "reasoning": "string (Explain why this number must go here. Be concise but logical. Mention specific rows, columns, or boxes.)"
    }
  `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from AI');
        }

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr) as AiHintResponse;

        // Validate result
        if (typeof result.r !== 'number' || typeof result.c !== 'number' || typeof result.value !== 'number' || !result.reasoning) {
            throw new Error('Invalid AI response format');
        }

        return result;

    } catch (error: any) {
        console.error('AI Hint Error:', error);

        // Debugging: Try to list models to see what's available
        try {
            console.log('Attempting to list models...');
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
            const listData = await listResponse.json();
            console.log('Available Models:', JSON.stringify(listData, null, 2));

            if (listData.error) {
                throw new Error(`ListModels failed: ${listData.error.message}`);
            }

            if (listData.models) {
                const modelNames = listData.models.map((m: any) => m.name).join(', ');
                throw new Error(`Model not found. Available models: ${modelNames}`);
            }
        } catch (listError: any) {
            console.error('ListModels Error:', listError);
            throw new Error(`Gemini API Error: ${error.message} (Also failed to list models: ${listError.message})`);
        }

        throw error;
    }
};
