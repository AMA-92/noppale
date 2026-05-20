#!/usr/bin/env node

/**
 * Génère les icônes PWA correctes pour Noppale
 * Cela crée des PNG valides avec les bonnes dimensions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fonction pour créer un PNG simple avec Canvas
function createPNG(width, height, color = '#f97316') {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);      // bit depth
  ihdr.writeUInt8(2, 9);      // color type (RGB)
  ihdr.writeUInt8(0, 10);     // compression
  ihdr.writeUInt8(0, 11);     // filter
  ihdr.writeUInt8(0, 12);     // interlace

  // Calculer CRC pour IHDR
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crc ^ buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Créer chunk IHDR
  const ihdrType = Buffer.from('IHDR');
  const ihdrChunk = Buffer.concat([ihdrType, ihdr]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrChunk), 0);

  // Créer les données d'image (pixel data)
  // Convertir la couleur hex en RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Créer les données compressées (zlib)
  // Pour simplifier, créer une image unie
  const pixelData = Buffer.alloc(height * (width * 3 + 1));
  let idx = 0;
  for (let y = 0; y < height; y++) {
    pixelData[idx++] = 0; // filter type
    for (let x = 0; x < width; x++) {
      pixelData[idx++] = r;
      pixelData[idx++] = g;
      pixelData[idx++] = b;
    }
  }

  // Compresser avec zlib
  const compressed = zlib.deflateSync(pixelData);

  const idatType = Buffer.from('IDAT');
  const idatChunk = Buffer.concat([idatType, compressed]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatChunk), 0);

  // IEND chunk
  const iendType = Buffer.from('IEND');
  const iendChunk = Buffer.concat([iendType, Buffer.alloc(0)]);
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendChunk), 0);

  // Assembler le PNG
  const lengthIhdr = Buffer.alloc(4);
  lengthIhdr.writeUInt32BE(13, 0);
  
  const lengthIdat = Buffer.alloc(4);
  lengthIdat.writeUInt32BE(compressed.length, 0);
  
  const lengthIend = Buffer.alloc(4);
  lengthIend.writeUInt32BE(0, 0);

  return Buffer.concat([
    signature,
    lengthIhdr, ihdrChunk, ihdrCrc,
    lengthIdat, idatChunk, idatCrc,
    lengthIend, iendChunk, iendCrc
  ]);
}

// Créer les icônes
const publicDir = path.join(__dirname, 'public');

console.log('🎨 Génération des icônes PWA...\n');

try {
  // Créer 192x192
  const icon192 = createPNG(192, 192, '#f97316');
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  console.log('✅ Créé: icon-192.png (192x192)');

  // Créer 512x512
  const icon512 = createPNG(512, 512, '#f97316');
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  console.log('✅ Créé: icon-512.png (512x512)');

  console.log('\n✨ Icônes PWA générées avec succès!');
  console.log('💡 Les fichiers sont maintenant aux bonnes dimensions.');
  console.log('🎯 Redéployez pour voir les changements sur Vercel.');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
