// utils/sudokuParser.ts
const digitsOnly = (s: string) => s.trim().replace(/[^0-9.]/g, '');

export type Grid = number[][];

export function parseGridsAuto(text: string): { grid: Grid; startLine: number }[] {
  const lines = text.split(/\r?\n/);
  const cleaned = lines.map(digitsOnly);
  const valid = cleaned.filter(c => c.length > 0);
  const longRatio = valid.length ? valid.filter(c => c.length >= 81).length / valid.length : 0;
  const oneLine = longRatio >= 0.7;

  const toNumRow = (row: string) => [...row].map(ch => (ch === '.' || ch === '0' ? 0 : Number(ch)));

  const out: { grid: Grid; startLine: number }[] = [];
  if (oneLine) {
    // 한 줄에 81자 → 9줄로 슬라이스
    cleaned.forEach((c, idx) => {
      if (c.length >= 81) {
        const s = c.slice(0, 81);
        const grid: Grid = [];
        for (let i = 0; i < 81; i += 9) grid.push(toNumRow(s.slice(i, i + 9)));
        out.push({ grid, startLine: idx + 1 });
      }
    });
  } else {
    // 9줄×9자 묶음
    let buf: string[] = [];
    let startLine = -1;
    cleaned.forEach((c, idx) => {
      if (c.length < 9) return;
      const row = c.slice(0, 9);
      if (buf.length === 0) startLine = idx + 1;
      buf.push(row);
      if (buf.length === 9) {
        const grid: Grid = buf.map(r => toNumRow(r));
        out.push({ grid, startLine });
        buf = [];
        startLine = -1;
      }
    });
  }
  return out;
}
