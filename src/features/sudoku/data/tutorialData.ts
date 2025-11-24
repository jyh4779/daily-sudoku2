// src/features/sudoku/data/tutorialData.ts

export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    highlights?: { r: number; c: number }[];
    expectedAction?: { type: 'input' | 'select'; r: number; c: number; val?: number };
};

export const TUTORIAL_PUZZLE = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

export const TUTORIAL_SOLUTION = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 1,
        title: '목표 (Goal)',
        text: '스도쿠는 9x9 격자를 숫자로 채우는 게임입니다.\n각 칸에는 1부터 9까지의 숫자가 들어갑니다.',
        highlights: Array.from({ length: 81 }, (_, i) => ({ r: Math.floor(i / 9), c: i % 9 })),
    },
    {
        id: 2,
        title: '가로 규칙 (Row Rule)',
        text: '각 가로줄에는 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.\n\n빈 칸을 눌러 숫자를 채워보세요.',
        highlights: Array.from({ length: 9 }, (_, c) => ({ r: 0, c })),
    },
    {
        id: 3,
        title: '세로 규칙 (Column Rule)',
        text: '각 세로줄에도 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.',
        highlights: Array.from({ length: 9 }, (_, r) => ({ r, c: 0 })),
    },
    {
        id: 4,
        title: '박스 규칙 (Box Rule)',
        text: '굵은 선으로 둘러싸인 3x3 박스 안에도\n1부터 9까지의 숫자가 중복 없이 들어갑니다.',
        highlights: [
            { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
            { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
            { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 },
        ],
    },
    {
        id: 5,
        title: '기본 전략 (Cross-Hatching)',
        text: '가장 중요한 전략입니다!\n우측 상단 박스를 보세요.\n다른 박스의 5번 숫자가 가로/세로를 채우고 있어,\n5가 들어갈 수 있는 칸은 단 하나뿐입니다.',
        highlights: [
            { r: 0, c: 0 }, // 5 in Row 0
            { r: 1, c: 5 }, // 5 in Row 1
            { r: 7, c: 8 }, // 5 in Col 8
            { r: 2, c: 6 }, // Target cell
        ],
    },
    {
        id: 6,
        title: '조작법 & 메모 (Controls & Notes)',
        text: '숫자 패드를 눌러 숫자를 입력합니다.\n연필 아이콘을 누르면 메모 모드가 되어\n후보 숫자를 작게 적어둘 수 있습니다.',
        highlights: [],
    },
    {
        id: 7,
        title: '실수 (Mistakes)',
        text: '잘못된 숫자를 입력하면 실수가 기록됩니다.\n3번 실수하면 게임이 종료되니 주의하세요!\n(튜토리얼에서는 괜찮습니다)',
        highlights: [],
    },
];
