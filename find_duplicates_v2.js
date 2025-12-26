const fs = require('fs');
const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');
const lines = content.split('\n');
const keyMap = new Map();
let inTranslations = false;

lines.forEach((line, index) => {
    // Translation lines usually look like: 'key': { ... },
    const match = line.match(/^\s*'([^']+)'\s*:/);
    if (match) {
        const key = match[1];
        if (keyMap.has(key)) {
            console.log(`DUPLICATE: "${key}" at lines ${keyMap.get(key) + 1} and ${index + 1}`);
        } else {
            keyMap.set(key, index);
        }
    }
});
