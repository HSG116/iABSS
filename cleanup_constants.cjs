const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'constants.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const newLines = [];
let insideRamadan = false;
let ramadanCount = 0;
let skipNextEmpty = false;

// The 100 new questions are already in the file at IDs 81-180 (Lines 192-291)
// We want to KEEP them, but re-index them to 1-100.
// We want to REMOVE the old 1-80 (Lines 110-189).

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of Ramadan block
    if (line.includes("category: 'ramadan'")) {
        const idMatch = line.match(/id:\s*(\d+)/);
        if (idMatch) {
            const id = parseInt(idMatch[1]);

            if (id <= 80) {
                // Skip these (old questions)
                continue;
            }

            if (id >= 81 && id <= 180) {
                // Keep these and re-index
                ramadanCount++;
                const newLine = line.replace(/id:\s*(\d+)/, `id: ${ramadanCount}`);
                newLines.push(newLine);
                continue;
            }
        }
    }

    // Skip the comment "// New Ramadan Questions (81-180)"
    if (line.includes("// New Ramadan Questions")) {
        continue;
    }

    // Skip the redundant header "// فوازير رمضان (40 سؤال)" at the very beginning of the block
    if (line.includes("// فوازير رمضان (40 سؤال)") && i < 115) {
        newLines.push("  // فوازير رمضان (100 سؤال)");
        continue;
    }

    // Cleanup redundant headers at lines 358-362
    // We already have "358: // إسلاميات (30 سؤال)", "360: // عالم السيارات (30 سؤال)", "362: // إسلاميات (30 سؤال)"
    // The Cars section ends at 355-356.
    // So 358-361 are messy.
    if (i >= 357 && i <= 361) {
        if (line.trim() === '' || line.includes('//')) {
            continue;
        }
    }

    newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Successfully updated constants.ts with 100 Ramadan questions and cleaned up headers.');
