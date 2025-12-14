const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '../dist/content.js');
let content = fs.readFileSync(contentPath, 'utf8');

// Remove CommonJS exports line
content = content.replace(/^"use strict";\nObject\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/, '');

fs.writeFileSync(contentPath, content);
console.log('Fixed content.js - removed CommonJS exports');

