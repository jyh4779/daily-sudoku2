const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/classified-puzzles.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const puzzles = JSON.parse(rawData);

let count40 = 0;
let count38 = 0;
let count36 = 0;

puzzles.forEach(p => {
    const zeros = p.board.split('0').length - 1;
    const clues = 81 - zeros;

    if (clues >= 40 && clues <= 45) count40++;
    if (clues >= 38 && clues <= 45) count38++;
    if (clues >= 36 && clues <= 45) count36++;
});

console.log(`Puzzles with 40-45 clues: ${count40}`);
console.log(`Puzzles with 38-45 clues: ${count38}`);
console.log(`Puzzles with 36-45 clues: ${count36}`);
