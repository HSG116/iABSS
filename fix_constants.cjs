const fs = require('fs');
const filePath = 'constants.ts';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // If the file is just one huge line with literal \n
    if (content.includes('\\n') && content.split('\n').length < 10) {
        content = content.replace(/\\n/g, '\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully fixed constants.ts by restoring newlines!');
    } else {
        console.log('constants.ts seems to already have proper newlines or is not corrupted in that specific way.');
    }
} catch (e) {
    console.error('Error fixing constants.ts:', e);
}
