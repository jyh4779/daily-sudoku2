export const TEXTS = {
  appName: 'Daily Sudoku',
  home: {
    newGame: '\uC0C8 \uAC8C\uC784',
    continue: '\uC774\uC5B4\uD558\uAE30',
    stats: '\uD1B5\uACC4',
    settings: '\uC124\uC815',
  },
  game: {
    difficulty: {
      easy: 'Easy',
    },
    overlayTitle: {
      pause: 'Pause',
      loss: 'Loss',
      success: 'Success',
    },
    overlayButtons: {
      continue: 'Continue',
      restart: 'Restart',
      newGame: 'New Game',
      home: 'Home',
    },
    mistakeCounter: (mistakes: number, limit: number) => `\uC2E4\uC218 ${mistakes}/${limit}`,
    actions: {
      undo: '\uB418\uB3CC\uB9AC\uAE30',
      erase: '\uC9C0\uC6B0\uAC1C',
      hint: '\uD78C\uD2B8',
      note: '\uB178\uD2B8',
      padMode: '\uD0ED \uC785\uB825',
    },
  },
} as const;

export type TextResources = typeof TEXTS;
