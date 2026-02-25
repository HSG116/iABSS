const fs = require('fs');

const fawazirTxt = fs.readFileSync('fawazir.txt', 'utf8');

const parseFawazir = (txt) => {
    const lines = txt.split('\n');
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
                id: questions.length + 1,
                day: Math.floor(questions.length / 33) + 1,
                category: 'ramadan',
                text: line.replace(/^\d+[\.-]\s*(?:فزورة:)?\s*/i, '').trim(),
                options: [],
                correctIndex: undefined
            };
            if (currentQuestion.day > 30) currentQuestion.day = 30;
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
    return questions;
};

const res = parseFawazir(fawazirTxt);
console.log(`Total parsed questions: ${res.length}`);
if (res.length > 0) {
    console.log(`First question: ${JSON.stringify(res[0], null, 2)}`);
    console.log(`Last question: ${JSON.stringify(res[res.length - 1], null, 2)}`);
}
