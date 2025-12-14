// Simple script to create placeholder icons using Node.js
// This creates basic colored square icons for the extension

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#FF0000" rx="3"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.4}" fill="white" text-anchor="middle" dominant-baseline="middle">YT</text>
</svg>`;
};

// Note: This creates SVG files. For PNG, you would need a library like sharp or canvas
// For now, users can convert these SVGs to PNG or create their own icons

const iconSizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

iconSizes.forEach(size => {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, createSVGIcon(size));
  console.log(`Created ${svgPath}`);
});

console.log('\nNote: These are SVG files. For the extension to work, you need PNG files.');
console.log('You can convert these SVGs to PNG using an online converter or image editor.');
console.log('Or create your own icons and save them as icon16.png, icon48.png, icon128.png');

