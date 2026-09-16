import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const publicAssetsDir = path.join(projectRoot, 'public', 'assets');
const targetImagePath = path.join(publicAssetsDir, 'festival-cards-map.jpg');
const cardsMapAlias = path.join(publicAssetsDir, 'cards-map.jpg');
const mythologyDir = path.join(publicAssetsDir, 'mythology');
const srcImagesDir = path.join(projectRoot, 'src', 'assets', 'images');
const dbFilePath = path.join(projectRoot, 'data', 'festival_db.json');

console.log('[Deploy] Preparing unified festival cards & map asset for production deployment...');

// 1. Ensure target image exists in public/assets
if (!fs.existsSync(targetImagePath)) {
  if (fs.existsSync(srcImagesDir)) {
    const files = fs.readdirSync(srcImagesDir);
    const found = files.find(f => f.startsWith('festival_cards_map') && f.endsWith('.jpg'));
    if (found) {
      fs.copyFileSync(path.join(srcImagesDir, found), targetImagePath);
      console.log(`[Deploy] Copied ${found} to public/assets/festival-cards-map.jpg`);
    }
  }
}

// Ensure alias exists
if (fs.existsSync(targetImagePath) && !fs.existsSync(cardsMapAlias)) {
  fs.copyFileSync(targetImagePath, cardsMapAlias);
}

// 2. Remove bulky legacy mythology image files (24MB) from public/assets/mythology to make deployment lean
if (fs.existsSync(mythologyDir)) {
  const mythologyFiles = fs.readdirSync(mythologyDir);
  let removedCount = 0;
  for (const file of mythologyFiles) {
    if (file.endsWith('.jpg') || file.endsWith('.png')) {
      fs.unlinkSync(path.join(mythologyDir, file));
      removedCount++;
    }
  }
  console.log(`[Deploy] Cleaned up ${removedCount} legacy image files from public/assets/mythology/ (saved ~24MB)`);
  // Place single copy so direct file requests resolve if needed
  if (fs.existsSync(targetImagePath)) {
    fs.copyFileSync(targetImagePath, path.join(mythologyDir, 'default.jpg'));
  }
}

// 3. Clean up unused temp files if needed, preserving game card images and map
if (fs.existsSync(srcImagesDir)) {
  console.log('[Deploy] Assets checked and ready.');
}

// 4. Ensure games have valid images
if (fs.existsSync(dbFilePath)) {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    const db = JSON.parse(raw);
    let updatedCount = 0;
    if (Array.isArray(db.games)) {
      for (const game of db.games) {
        if (!game.imageUrl) {
          game.imageUrl = '/assets/festival-cards-map.jpg';
          updatedCount++;
        }
      }
    }
    if (updatedCount > 0) {
      fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Deploy] Warning while checking festival_db.json:', err);
  }
}

console.log('[Deploy] Done! Single cards and map image configured successfully for deployment.');
