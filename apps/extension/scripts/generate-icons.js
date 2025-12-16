// Script to generate PNG icons for the Chrome extension
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Red background (YouTube red)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, 0, size, size);

  // White play icon (simplified triangle)
  ctx.fillStyle = '#FFFFFF';
  const centerX = size / 2;
  const centerY = size / 2;
  const triangleSize = size * 0.4;

  ctx.beginPath();
  ctx.moveTo(centerX - triangleSize * 0.3, centerY - triangleSize * 0.5);
  ctx.lineTo(centerX - triangleSize * 0.3, centerY + triangleSize * 0.5);
  ctx.lineTo(centerX + triangleSize * 0.7, centerY);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

function generateIcons() {
  const iconSizes = [16, 48, 128];
  const iconsDir = path.join(__dirname, '..', 'icons');

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  iconSizes.forEach(size => {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Created ${filePath}`);
  });

  console.log('\n✓ All icons generated successfully!');
}

generateIcons();



