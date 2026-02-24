const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, 'fawazir.txt');
const constantsPath = path.join(__dirname, 'constants.ts');

const txtContent = fs.readFileSync(txtPath, 'utf8');
const lines = txtContent.split('\n');

const questions = [];
let currentQuestion = null;

const optionLetterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^\d+[\.-]/.test(line)) {
        if (currentQuestion && currentQuestion.options && currentQuestion.options.length >= 2 && currentQuestion.correctIndex !== undefined) {
            questions.push(currentQuestion);
        }
        currentQuestion = {
            text: line.replace(/^\d+[\.-]\s*(?:فزورة:)?\s*/i, '').trim(),
            options: [],
            correctIndex: undefined
        };
    } else if (currentQuestion && line.includes('A)') && line.includes('B)')) {
        const optsArgs = line.split('|').map(o => o.trim());
        optsArgs.forEach(o => {
            const match = o.match(/^([A-D])\)\s*(.*)/);
            if (match) {
                currentQuestion.options.push(match[2].trim());
            } else {
                currentQuestion.options.push(o.replace(/^[A-D]\)\s*/, '').trim());
            }
        });
    } else if (currentQuestion && line.includes('الإجابة:')) {
        const ansMatch = line.match(/الإجابة:\s*([A-D])/i);
        if (ansMatch) {
            currentQuestion.correctIndex = optionLetterToIndex[ansMatch[1].toUpperCase()];
        }
    }
}
if (currentQuestion && currentQuestion.options && currentQuestion.options.length >= 2 && currentQuestion.correctIndex !== undefined) {
    questions.push(currentQuestion);
}

console.log(`Parsed ${questions.length} questions.`);

const constantsContent = fs.readFileSync(constantsPath, 'utf8');
const linesArr = constantsContent.split('\n');

const startTag = 'export const QUESTIONS_DB: Question[] = [';
const startIndex = linesArr.findIndex(l => l.includes(startTag));

let firstCategoryAfterRamadanIndex = -1;
if (startIndex !== -1) {
    for (let i = startIndex + 1; i < linesArr.length; i++) {
        if ((linesArr[i].includes('category: \'') || linesArr[i].includes('category: "')) && !linesArr[i].includes('ramadan')) {
            let commentStart = i;
            while (commentStart > startIndex && linesArr[commentStart - 1].trim() === '') commentStart--;
            while (commentStart > startIndex && linesArr[commentStart - 1].trim().startsWith('//')) commentStart--;
            firstCategoryAfterRamadanIndex = commentStart;
            break;
        }
    }
}

if (startIndex !== -1 && firstCategoryAfterRamadanIndex !== -1) {
    const outputLines = ['  // فوازير رمضان (مقسمة على 30 يوم)'];
    questions.forEach((q, index) => {
        let day = Math.floor(index / 33) + 1;
        if (day > 30) day = 30;

        const textEscape = q.text.replace(/'/g, "\\'");
        const optsEscape = q.options.map(o => `'${o.replace(/'/g, "\\'")}'`).join(', ');

        outputLines.push(`  { id: ${index + 1}, day: ${day}, category: 'ramadan', text: '${textEscape}', options: [${optsEscape}], correctIndex: ${q.correctIndex} },`);
    });

    outputLines.push('');

    const newContent = [
        ...linesArr.slice(0, startIndex + 1),
        ...outputLines,
        ...linesArr.slice(firstCategoryAfterRamadanIndex)
    ].join('\n');

    fs.writeFileSync(constantsPath, newContent, 'utf8');
    console.log('Successfully updated constants.ts with mapped daily Ramadan questions.');
} else {
    console.error('Could not find the bounds for replacing ramadan category.', startIndex, firstCategoryAfterRamadanIndex);
}

