import { OPENAI_API_KEY } from '../../../config/api';
import { useLanguageStore } from '../../settings/store/languageStore';

export interface AiHintResponse {
    r: number;
    c: number;
    value: number;
    reasoning: string;
}

export const fetchAiHint = async (board: number[][]): Promise<AiHintResponse> => {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API Key is missing. Please check src/config/api.ts');
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

    IMPORTANT:
    - ${langInstruction}
    - The "r" and "c" fields in the JSON response must be 0-indexed (0-8).
    - However, in the "reasoning" text, you MUST refer to Rows and Columns using 1-based indexing (Row 1-9, Column 1-9) to be user-friendly.
    - For example, if you return "r": 0, "c": 0, the reasoning should say "Row 1, Column 1".
    - Ensure the reasoning text matches the coordinates in "r" and "c".
    - **REASONING QUALITY**:
      - Do NOT hallucinate. Verify every fact (e.g., "Row 1 has a 7") against the board before stating it.
      - Use clear logic: "Row 2 needs a 7. It cannot be in Col 6 because Row 9 Col 6 is 7..."
      - Explain *why* other candidates are impossible if applicable.

    Return ONLY a JSON object with the following format (no markdown, no code blocks):
    {
      "r": number (0-8, row index),
      "c": number (0-8, column index),
      "value": number (1-9),
      "reasoning": "string (Explain why this number must go here. Be concise but logical. Mention specific rows, columns, or boxes using 1-9 indexing.)"
    }
  `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: `You are a helpful Sudoku assistant. You always return valid JSON. ${langInstruction}` },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No response from AI');
        }

        const result = JSON.parse(content) as AiHintResponse;

        // Validate result
        if (typeof result.r !== 'number' || typeof result.c !== 'number' || typeof result.value !== 'number' || !result.reasoning) {
            throw new Error('Invalid AI response format');
        }

        return result;

    } catch (error: any) {
        console.error('AI Hint Error:', error);
        throw error;
    }
};
