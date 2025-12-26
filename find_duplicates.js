const fs = require('fs');
const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');
const lines = content.split('\n');
const keyMap = new Map();
lines.forEach((line, index) => {
    const match = line.match(/^\s*'([^']+)'/);
    if (match) {
        const key = match[1];
        if (keyMap.has(key)) {
            console.log(`Duplicate key found: "${key}" at lines ${keyMap.get(key) + 1} and ${index + 1}`);
        }
        keyMap.set(key, index);
    }
});
