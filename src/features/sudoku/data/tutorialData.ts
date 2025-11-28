export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    highlights?: { r: number; c: number }[];
    expectedAction?: { type: 'input' | 'select'; r: number; c: number; val?: number };
    placement?: 'top' | 'bottom' | 'center';
};

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

export const TUTORIAL_PUZZLE_60 = [
    [5, 3, 4, 6, 7, 8, 9, 0, 2],
    [6, 0, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 0, 3, 0, 2, 5, 6, 0],
    [8, 5, 0, 7, 6, 1, 0, 2, 0],
    [0, 0, 6, 8, 5, 3, 7, 0, 1],
    [7, 1, 3, 0, 2, 4, 8, 5, 0],
    [0, 6, 1, 5, 3, 7, 0, 8, 0],
    [2, 0, 7, 4, 1, 9, 6, 0, 0],
    [0, 4, 5, 2, 8, 6, 1, 0, 0],
];

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 1,
        title: '목표 (Goal)',
        text: '스도쿠는 9x9 격자를 숫자로 채우는 게임입니다.\n각 칸에는 1부터 9까지의 숫자가 들어갑니다.',
        highlights: Array.from({ length: 81 }, (_, i) => ({ r: Math.floor(i / 9), c: i % 9 })),
        placement: 'bottom',
    },
    {
        id: 2,
        title: '가로 규칙 (Row Rule)',
        text: '각 가로줄에는 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.',
        highlights: Array.from({ length: 9 }, (_, c) => ({ r: 0, c })),
        placement: 'bottom',
    },
    {
        id: 3,
        title: '세로 규칙 (Column Rule)',
        text: '각 세로줄에도 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.',
        highlights: Array.from({ length: 9 }, (_, r) => ({ r, c: 0 })),
        placement: 'bottom',
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
        placement: 'bottom',
    },
    {
        id: 5,
        title: '기본 전략 (Basic Strategy)',
        text: '가장 중요한 전략입니다!\n가로, 세로, 박스에 이미 있는 숫자를 확인하여\n빈 칸에 들어갈 수 있는 유일한 숫자를 찾아보세요.',
        highlights: [],
        placement: 'center',
    },
    {
        id: 6,
        title: '조작법 & 메모 (Controls & Notes)',
        text: '숫자 패드를 눌러 숫자를 입력합니다.\n연필 아이콘을 누르면 메모 모드가 되어\n후보 숫자를 작게 적어둘 수 있습니다.',
        highlights: [],
        placement: 'top',
    },
    {
        id: 7,
        title: '실수 (Mistakes)',
        text: '잘못된 숫자를 입력하면 실수가 기록됩니다.\n3번 실수하면 게임이 종료되니 주의하세요!\n(튜토리얼에서는 괜찮습니다)',
        highlights: [],
        placement: 'center',
    },
    {
        id: 8,
        title: '실전 풀이 1 (Practice 1)',
        text: '두 번째 줄을 보세요. 7이 빠져 있습니다.\n빈 칸을 선택하고 7을 입력해보세요.',
        highlights: [
            { r: 1, c: 0 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 }, { r: 1, c: 6 }, { r: 1, c: 7 }, { r: 1, c: 8 }, // Row 1 existing
            { r: 1, c: 1 }, // Target
        ],
        placement: 'center',
    },
    {
        id: 9,
        title: '실전 풀이 2 (Practice 2)',
        text: '첫 번째 줄의 마지막 빈 칸입니다.\n이 줄에는 1이 빠져 있습니다.\n1을 입력하여 줄을 완성해보세요.',
        highlights: [
            { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }, { r: 0, c: 6 }, { r: 0, c: 8 }, // Row 0 existing
            { r: 0, c: 7 }, // Target
        ],
        placement: 'center',
    },
    {
        id: 10,
        title: '게임 시작 (Start Game)',
        text: '튜토리얼이 끝났습니다!\n이제 남은 빈 칸을 모두 채워보세요.\n행운을 빕니다!',
        highlights: [],
        placement: 'center',
    },
];
