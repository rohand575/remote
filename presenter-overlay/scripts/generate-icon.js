/**
 * Icon Generator Script
 * Creates a PNG icon and converts it to ICO format
 */

const fs = require('fs');
const path = require('path');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

// Create a simple icon using raw pixel data (256x256 PNG)
function createIconPNG() {
  const size = 256;
  const PNG = require('pngjs').PNG;
  const png = new PNG({ width: size, height: size });

  // Colors
  const bgColor = { r: 99, g: 102, b: 241 }; // Indigo (#6366f1)
  const white = { r: 255, g: 255, b: 255 };

  // Draw background with rounded corners simulation
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Calculate distance from center
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 10;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle mask
      if (dist <= radius) {
        png.data[idx] = bgColor.r;
        png.data[idx + 1] = bgColor.g;
        png.data[idx + 2] = bgColor.b;
        png.data[idx + 3] = 255;
      } else if (dist <= radius + 2) {
        // Anti-aliasing edge
        const alpha = Math.max(0, 1 - (dist - radius) / 2);
        png.data[idx] = bgColor.r;
        png.data[idx + 1] = bgColor.g;
        png.data[idx + 2] = bgColor.b;
        png.data[idx + 3] = Math.floor(alpha * 255);
      } else {
        // Transparent
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }

  // Draw a simple "play" triangle or "LR" text effect in the center
  // Let's draw a stylized "L" shape
  const lineWidth = 20;
  const margin = 70;

  // Draw "L" shape
  for (let y = margin; y < size - margin; y++) {
    for (let x = margin; x < margin + lineWidth; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }
  for (let y = size - margin - lineWidth; y < size - margin; y++) {
    for (let x = margin; x < margin + 80; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }

  // Draw "R" shape to the right
  const rStartX = margin + 90;
  // Vertical line of R
  for (let y = margin; y < size - margin; y++) {
    for (let x = rStartX; x < rStartX + lineWidth; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }
  // Top curve of R (simplified as horizontal line)
  for (let y = margin; y < margin + lineWidth; y++) {
    for (let x = rStartX; x < rStartX + 60; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }
  // Middle of R
  const midY = (margin + (size - margin)) / 2;
  for (let y = midY - lineWidth/2; y < midY + lineWidth/2; y++) {
    for (let x = rStartX; x < rStartX + 50; x++) {
      const idx = (size * Math.floor(y) + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }
  // Right side of R top half
  for (let y = margin + lineWidth; y < midY; y++) {
    for (let x = rStartX + 60 - lineWidth; x < rStartX + 60; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        png.data[idx] = white.r;
        png.data[idx + 1] = white.g;
        png.data[idx + 2] = white.b;
      }
    }
  }

  return png;
}

// Alternative simpler approach - create a gradient circle with emoji-style design
function createSimpleIconPNG() {
  const size = 256;

  // Create raw RGBA buffer
  const buffer = Buffer.alloc(size * size * 4);

  // Colors - indigo theme
  const bgR = 99, bgG = 102, bgB = 241;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Calculate distance from center
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 5;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient effect - lighter at top
        const gradientFactor = 1 - (y / size) * 0.3;
        buffer[idx] = Math.min(255, Math.floor(bgR * gradientFactor + 30));
        buffer[idx + 1] = Math.min(255, Math.floor(bgG * gradientFactor + 30));
        buffer[idx + 2] = Math.min(255, Math.floor(bgB * gradientFactor));
        buffer[idx + 3] = 255;
      } else if (dist <= radius + 2) {
        // Anti-aliasing
        const alpha = Math.max(0, 1 - (dist - radius) / 2);
        buffer[idx] = bgR;
        buffer[idx + 1] = bgG;
        buffer[idx + 2] = bgB;
        buffer[idx + 3] = Math.floor(alpha * 255);
      } else {
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }

  // Draw a simple "play" triangle in center (white)
  const triSize = 60;
  const triCx = size / 2 + 10;
  const triCy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check if point is inside triangle
      const relX = x - (triCx - triSize);
      const relY = y - triCy;

      if (relX >= 0 && relX <= triSize * 1.5) {
        const maxY = (relX / (triSize * 1.5)) * triSize;
        if (Math.abs(relY) <= maxY && buffer[idx + 3] > 0) {
          buffer[idx] = 255;
          buffer[idx + 1] = 255;
          buffer[idx + 2] = 255;
        }
      }
    }
  }

  return { data: buffer, width: size, height: size };
}

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Create a simpler base64 PNG icon programmatically
  // Using a pre-made minimal PNG approach

  const size = 256;
  const { PNG } = require('pngjs');
  const png = new PNG({ width: size, height: size });

  // Colors - indigo theme matching the app
  const bgR = 99, bgG = 102, bgB = 241;

  // Fill with circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 8;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient - lighter at top-left
        const gradientFactor = 1 + (1 - y / size) * 0.2 + (1 - x / size) * 0.1;
        png.data[idx] = Math.min(255, Math.floor(bgR * gradientFactor));
        png.data[idx + 1] = Math.min(255, Math.floor(bgG * gradientFactor));
        png.data[idx + 2] = Math.min(255, Math.floor(bgB * gradientFactor));
        png.data[idx + 3] = 255;
      } else if (dist <= radius + 3) {
        const alpha = Math.max(0, 1 - (dist - radius) / 3);
        png.data[idx] = bgR;
        png.data[idx + 1] = bgG;
        png.data[idx + 2] = bgB;
        png.data[idx + 3] = Math.floor(alpha * 255);
      } else {
        png.data[idx + 3] = 0;
      }
    }
  }

  // Draw stylized reaction symbol (sparkles/burst pattern)
  const cx = size / 2;
  const cy = size / 2;

  // Draw 4 lines emanating from center (like a reaction burst)
  const drawLine = (startX, startY, endX, endY, width) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(len);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = Math.floor(startX + dx * t);
      const py = Math.floor(startY + dy * t);

      for (let oy = -width; oy <= width; oy++) {
        for (let ox = -width; ox <= width; ox++) {
          if (ox * ox + oy * oy <= width * width) {
            const x = px + ox;
            const y = py + oy;
            if (x >= 0 && x < size && y >= 0 && y < size) {
              const idx = (size * y + x) << 2;
              if (png.data[idx + 3] > 0) {
                png.data[idx] = 255;
                png.data[idx + 1] = 255;
                png.data[idx + 2] = 255;
              }
            }
          }
        }
      }
    }
  };

  // Draw burst lines
  const innerR = 25;
  const outerR = 70;
  const lineWidth = 8;
  const angles = [0, Math.PI/2, Math.PI, Math.PI * 1.5];

  angles.forEach(angle => {
    const startX = cx + Math.cos(angle) * innerR;
    const startY = cy + Math.sin(angle) * innerR;
    const endX = cx + Math.cos(angle) * outerR;
    const endY = cy + Math.sin(angle) * outerR;
    drawLine(startX, startY, endX, endY, lineWidth);
  });

  // Draw diagonal lines (smaller)
  const diagAngles = [Math.PI/4, Math.PI * 3/4, Math.PI * 5/4, Math.PI * 7/4];
  const diagOuterR = 55;
  const diagLineWidth = 6;

  diagAngles.forEach(angle => {
    const startX = cx + Math.cos(angle) * innerR;
    const startY = cy + Math.sin(angle) * innerR;
    const endX = cx + Math.cos(angle) * diagOuterR;
    const endY = cy + Math.sin(angle) * diagOuterR;
    drawLine(startX, startY, endX, endY, diagLineWidth);
  });

  // Draw center circle
  const centerR = 20;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= centerR) {
        const idx = (size * y + x) << 2;
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
      }
    }
  }

  // Save PNG
  const pngPath = path.join(assetsDir, 'icon.png');
  const pngBuffer = PNG.sync.write(png);
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('Created PNG icon:', pngPath);

  // Convert to ICO
  try {
    const icoBuffer = await pngToIco(pngPath);
    const icoPath = path.join(assetsDir, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Created ICO icon:', icoPath);
  } catch (err) {
    console.error('Error creating ICO:', err);
  }

  // Create 16x16 and 32x32 versions for tray
  const sizes = [16, 32, 48];
  for (const s of sizes) {
    const smallPng = new PNG({ width: s, height: s });

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        // Sample from larger image
        const srcX = Math.floor(x * size / s);
        const srcY = Math.floor(y * size / s);
        const srcIdx = (size * srcY + srcX) << 2;
        const dstIdx = (s * y + x) << 2;

        smallPng.data[dstIdx] = png.data[srcIdx];
        smallPng.data[dstIdx + 1] = png.data[srcIdx + 1];
        smallPng.data[dstIdx + 2] = png.data[srcIdx + 2];
        smallPng.data[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }

    const smallPath = path.join(assetsDir, `icon-${s}.png`);
    fs.writeFileSync(smallPath, PNG.sync.write(smallPng));
    console.log(`Created ${s}x${s} PNG:`, smallPath);
  }

  console.log('Icon generation complete!');
}

main().catch(console.error);
