export const TEXTS = {
  common: {
    confirm: '\uD655\uC778',
    cancel: '\uCDE8\uC18C',
  },
  appName: 'Daily Sudoku',
  home: {
    newGame: '\uC0C8 \uAC8C\uC784',
    continue: '\uC774\uC5B4\uD558\uAE30',
    stats: '\uD1B5\uACC4',
    settings: '\uC124\uC815',
    newGameWarning:
      '\uC774\uC5B4\uD558\uAE30 \uB370\uC774\uD130\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uC0C8 \uAC8C\uC784\uC744 \uC2DC\uC791\uD558\uBA74 \uB370\uC774\uD130\uAC00 \uC0AD\uC81C\uB429\uB2C8\uB2E4. \uACC4\uC18D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
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
  stats: {
    title: 'My Statistics',
    tabs: {
      week: 'This Week',
      month: 'This Month',
      allTime: 'All Time',
    },
    summary: {
      gamesPlayed: 'Games Played',
      winRate: 'Win Rate',
      winStreak: 'Win Streak',
      avgTime: 'Avg. Time',
    },
    ratio: {
      title: 'Win / Loss Ratio',
      winsLabel: 'Wins',
      lossesLabel: 'Losses',
    },
    completed: {
      title: 'Completed Games',
      subtitle: 'All Time',
    },
    bestTimes: {
      title: 'Best Times',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    },
  },
} as const;

export type TextResources = typeof TEXTS;
