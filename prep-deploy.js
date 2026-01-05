const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Memulai persiapan deployment...');

// Konfigurasi
const BUILD_DIR = path.join(__dirname, '.next');
const STANDALONE_DIR = path.join(BUILD_DIR, 'standalone');
const STATIC_DIR = path.join(BUILD_DIR, 'static');
const PUBLIC_DIR = path.join(__dirname, 'public');
const OUTPUT_DIR = path.join(__dirname, 'deploy-ready');
const ZIP_NAME = 'project.zip';

// Bersihkan folder output lama
if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR);

console.log('📦 Menyalin file standalone...');
if (!fs.existsSync(STANDALONE_DIR)) {
    console.error('❌ Error: Folder .next/standalone tidak ditemukan. Jalankan `npm run build` terlebih dahulu.');
    process.exit(1);
}

// Copy standalone content to output
// Gunakan command line cp untuk recursive copy yang handal
execSync(`cp -R "${STANDALONE_DIR}/" "${OUTPUT_DIR}/"`);

console.log('📦 Menyalin file static (.next/static)...');
const destNextDir = path.join(OUTPUT_DIR, '.next');
const destStaticDir = path.join(destNextDir, 'static');

// Pastikan struktur folder .next ada
if (!fs.existsSync(destNextDir)) {
    fs.mkdirSync(destNextDir, { recursive: true });
}

// Copy static folder
execSync(`cp -R "${STATIC_DIR}" "${destStaticDir}"`);

console.log('📦 Menyalin folder public...');
const destPublicDir = path.join(OUTPUT_DIR, 'public');
execSync(`cp -R "${PUBLIC_DIR}" "${destPublicDir}"`);

// Copy database_setup.sql if exists
const sqlFile = path.join(__dirname, 'database_setup.sql');
if (fs.existsSync(sqlFile)) {
    console.log('📦 Menyertakan database_setup.sql...');
    execSync(`cp "${sqlFile}" "${OUTPUT_DIR}/"`);
}

console.log('🗜️  Membuat file ZIP...');
try {
    // Masuk ke folder output dan zip isinya
    // Menggunakan zip command line
    execSync(`cd "${OUTPUT_DIR}" && zip -r "../${ZIP_NAME}" .`);
    console.log(`✅ Sukses! File siap upload: ${ZIP_NAME}`);
    console.log(`   Lokasi: ${path.join(__dirname, ZIP_NAME)}`);
} catch (error) {
    console.error('❌ Gagal membuat zip (pastikan command zip terinstall).');
    console.error('   Error detail:', error.message);
    console.log('   Folder siap upload tersedia di:', OUTPUT_DIR);
}

// Opsional: Bersihkan folder temp
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
