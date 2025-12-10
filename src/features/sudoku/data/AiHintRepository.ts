import { SudokuSolver, HintDetails } from '../model/SudokuSolver';
import { useLanguageStore } from '../../settings/store/languageStore';

export interface AiHintResponse {
    r: number;
    c: number;
    value: number;
    reasoning: string;
    technique: string;
    techniqueKey: string;
    relatedCells?: number[];
    relatedRegions?: { type: 'row' | 'col' | 'box'; index: number }[];
}

export const fetchAiHint = async (board: number[][]): Promise<AiHintResponse> => {
    // Simulate async delay for better UX (optional, but good for feeling "processing")
    await new Promise(resolve => setTimeout(resolve, 500));

    const solver = new SudokuSolver(board);
    const hint = solver.getNextHint();

    if (!hint) {
        throw new Error('No logical hint found. The puzzle might be solved or requires advanced techniques not yet implemented.');
    }

    const language = useLanguageStore.getState().language;
    const isKo = language === 'ko';

    return formatHintResponse(hint, isKo);
};

const formatHintResponse = (hint: HintDetails, isKo: boolean): AiHintResponse => {
    let r = 0, c = 0, value = 0;
    let reasoning = "";
    let technique: string = hint.type;
    const techniqueKey = hint.type;

    // Map technique names to Korean if needed
    if (isKo) {
        const techMap: Record<string, string> = {
            'Naked Single': '네이키드 싱글',
            'Hidden Single': '히든 싱글',
            'Naked Pair': '네이키드 페어',
            'Naked Triple': '네이키드 트리플',
            'Hidden Pair': '히든 페어',
            'Hidden Triple': '히든 트리플',
            'Pointing': '포인팅',
            'Claiming': '클레임',
            'X-Wing': 'X-윙',
            'Y-Wing': 'Y-윙'
        };
        technique = techMap[hint.type] || hint.type;
    }

    // Determine target cell and value based on hint type
    if (hint.cell !== undefined && hint.val !== undefined) {
        // Single cell hints (Naked/Hidden Single)
        r = Math.floor(hint.cell / 9);
        c = hint.cell % 9;
        value = hint.val;
    } else if (hint.eliminations && hint.eliminations.length > 0) {
        // Elimination hints (Pairs, Triples, Wings, Locked Candidates)
        const targetIdx = hint.eliminations[0];
        r = Math.floor(targetIdx / 9);
        c = targetIdx % 9;
        value = hint.val || 0;
    }

    // Generate Reasoning Text
    if (isKo) {
        reasoning = translateReasoning(hint);
    } else {
        reasoning = hint.description;
    }

    return {
        r,
        c,
        value,
        reasoning,
        technique,
        techniqueKey,
        relatedCells: hint.relatedCells,
        relatedRegions: hint.relatedRegions
    };
};

const translateReasoning = (hint: HintDetails): string => {
    // Basic translation logic based on hint type
    // This can be expanded for better localization
    if (hint.type === 'Naked Single') {
        const r = Math.floor(hint.cell! / 9) + 1;
        const c = (hint.cell! % 9) + 1;
        return `${r}행 ${c}열에는 ${hint.val}만 들어갈 수 있습니다.`;
    }
    if (hint.type === 'Hidden Single') {
        const r = Math.floor(hint.cell! / 9) + 1;
        const c = (hint.cell! % 9) + 1;
        return `${hint.val}은(는) 이 구역(행/열/박스)에서 ${r}행 ${c}열에만 들어갈 수 있습니다.`;
    }

    // For complex hints, we might just return the English description or a generic message for now,
    // as full translation requires parsing the dynamic parts of the description string.
    // Or we can reconstruct it from the hint data.

    if (hint.type === 'Pointing' || hint.type === 'Claiming') {
        return `후보 숫자 ${hint.val}이(가) 특정 라인에 한정되어 있어, 다른 칸에서 제거할 수 있습니다.`;
    }

    if (hint.type.includes('Pair') || hint.type.includes('Triple')) {
        return `특정 칸들에 후보 숫자가 묶여 있어(${hint.type}), 다른 칸에서 해당 후보를 제거할 수 있습니다.`;
    }

    if (hint.type === 'X-Wing' || hint.type === 'Y-Wing') {
        return `${hint.type} 패턴이 발견되어 후보 숫자 ${hint.val}을(를) 제거할 수 있습니다.`;
    }

    return hint.description; // Fallback to English if not handled
};
