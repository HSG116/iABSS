const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'constants.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// We want to delete the block of old questions.
// Based on the last view_file:
// Line 110 is ID 1 (Ramadan)
// Line 189 is ID 80 (Ramadan)
// Line 190 is empty
// Line 191 is comment // New Ramadan Questions (81-180)
// Line 192 starts ID 81 (the new questions)

// So we remove indices 109 to 190 (0-indexed).
const removedCount = 191 - 110 + 1; // 82 lines
const newLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip the old range
    if (lineNum >= 110 && lineNum <= 191) {
        continue;
    }

    // Re-index the NEW Ramadan questions (which were 192-291)
    if (lineNum >= 192 && lineNum <= 291) {
        const idMatch = line.match(/id:\s*(\d+)/);
        if (idMatch) {
            const oldId = parseInt(idMatch[1]);
            const newId = oldId - 80;
            newLines.push(line.replace(/id:\s*\d+/, `id: ${newId}`));
            continue;
        }
    }

    // Handle header at line 109: // فوازير رمضان (40 سؤال)
    if (lineNum === 109) {
        newLines.push('  // فوازير رمضان (100 سؤال)');
        continue;
    }

    // Cleanup messy headers near 358-362
    // Currently: 
    // 357: 
    // 358: // إسلاميات (30 سؤال)
    // 359: 
    // 360: // عالم السيارات (30 سؤال)
    // 361: 
    // 362: // إسلاميات (30 سؤال)
    if (lineNum >= 358 && lineNum <= 361) {
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Update successful! Ramadan questions are now indexed 1-100 and headers are cleaned.');
