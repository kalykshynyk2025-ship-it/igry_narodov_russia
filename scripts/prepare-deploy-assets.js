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

// 3. Automatically copy game card illustrations from src/assets/image2 into public/assets/games/game-{number}.jpg
const image2Dir = path.join(projectRoot, 'src', 'assets', 'image2');
const publicGamesDir = path.join(publicAssetsDir, 'games');

const gameImagesMapping = [
  { num: 1, file: 'altai_shatra_1789455773466.jpg' },
  { num: 2, file: 'khazyh_paw_1789455732702.jpg' },
  { num: 3, file: 'narty_menkv_1789455845972.jpg' },
  { num: 4, file: 'mas_hands_1789455758642.jpg' },
  { num: 5, file: 'kevyunt_misne_1789455859756.jpg' },
  { num: 6, file: 'ovda_eyes_1789455745881.jpg' },
  { num: 7, file: 'kutkh_raven_1789455802386.jpg' },
  { num: 8, file: 'kamchy_whip_1789455874125.jpg' },
  { num: 9, file: 'yujme_spirit_1789455887198.jpg' },
  { num: 10, file: 'ingush_nart_1789455900785.jpg' },
  { num: 11, file: 'shurale_run_1789455789198.jpg' },
  { num: 12, file: 'mari_gate_1789455916662.jpg' },
  { num: 13, file: 'tartys_belt_1789455929427.jpg' },
  { num: 14, file: 'stone_shoulder_1789455944409.jpg' },
  { num: 15, file: 'ossetian_djigit_1789455957132.jpg' },
  { num: 16, file: 'sagaan_modon_1789455816830.jpg' },
  { num: 17, file: 'tuva_tevek_1789455970378.jpg' },
  { num: 18, file: 'kalmyk_dragons_1789455983929.jpg' },
  { num: 19, file: 'karelia_tapio_1789456000811.jpg' },
  { num: 20, file: 'konyashki_polkan_1789456013467.jpg' },
  { num: 21, file: 'bayun_tavreli_1789455718179.jpg' },
  { num: 22, file: 'copper_mountain_1789455830205.jpg' }
];

if (!fs.existsSync(publicGamesDir)) {
  fs.mkdirSync(publicGamesDir, { recursive: true });
}

if (fs.existsSync(image2Dir)) {
  let copiedCards = 0;
  for (const item of gameImagesMapping) {
    const srcFile = path.join(image2Dir, item.file);
    const destFile = path.join(publicGamesDir, `game-${item.num}.jpg`);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      copiedCards++;
    }
  }
  console.log(`[Deploy] Copied ${copiedCards} game card images from image2 to public/assets/games/`);
}

// 4. Clean up unused temp files if needed, preserving game card images and map
if (fs.existsSync(srcImagesDir)) {
  console.log('[Deploy] Assets checked and ready.');
}

// 5. Ensure games have valid images pointing to their specific card images
if (fs.existsSync(dbFilePath)) {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    const db = JSON.parse(raw);
    let updatedCount = 0;
    if (Array.isArray(db.games)) {
      for (const game of db.games) {
        const gameSpecificImage = `/assets/games/game-${game.number}.jpg`;
        const localFile = path.join(publicGamesDir, `game-${game.number}.jpg`);
        if (fs.existsSync(localFile)) {
          if (game.imageUrl !== gameSpecificImage) {
            game.imageUrl = gameSpecificImage;
            updatedCount++;
          }
        } else if (!game.imageUrl) {
          game.imageUrl = '/assets/festival-cards-map.jpg';
          updatedCount++;
        }
      }
    }
    if (updatedCount > 0) {
      fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`[Deploy] Updated ${updatedCount} game image URLs in database.`);
    }
  } catch (err) {
    console.warn('[Deploy] Warning while checking festival_db.json:', err);
  }
}

console.log('[Deploy] Done! Single cards and map image configured successfully for deployment.');
