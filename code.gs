// ============================================
// KONFIGURASI
// ============================================
const SPREADSHEET_ID  = 'ID SPREADSHEET';
const SHEET_NAME      = 'NAMA SHEET'; // Pastikan nama tab di Sheet persis seperti ini
const DRIVE_FOLDER_ID = '1ID FOLDER GDRIVE';

// ============================================
// FUNGSI TES IZIN & KONEKSI
// (Jalankan fungsi ini manual dari editor untuk memancing pop-up Izin Google)
// ============================================
function tesKoneksi() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    if (!sheet) {
      Logger.log("❌ ERROR: Tab Sheet '" + SHEET_NAME + "' tidak ditemukan! Periksa nama tab di Spreadsheet.");
    } else {
      Logger.log("✅ OK: Google Sheet berhasil terhubung.");
    }
    
    if (!folder) {
      Logger.log("❌ ERROR: Folder Drive tidak ditemukan!");
    } else {
      Logger.log("✅ OK: Google Drive berhasil terhubung.");
    }
  } catch (e) {
    Logger.log("❌ ERROR KONEKSI: " + e.toString());
  }
}

// ============================================
// MENERIMA DATA POST DARI WEB
// ============================================
function doPost(e) {
  try {
    // 1. Validasi Keberadaan Parameter
    if (!e || !e.parameter) {
      return ContentService.createTextOutput("Error: Request tidak valid / e.parameter kosong");
    }

    const nama  = String(e.parameter.nama || '').trim();
    const acara = String(e.parameter.acara || '').trim();
    const foto  = String(e.parameter.foto || '').trim();

    if (!nama || !acara || !foto) {
      return ContentService.createTextOutput("Error: Data tidak lengkap (Nama, Acara, atau Foto kosong)");
    }

    // 2. Decode Gambar Base64 dengan Aman
    if (!foto.includes(',')) {
      return ContentService.createTextOutput("Error: Format foto Base64 tidak valid");
    }

    const splitFoto  = foto.split(',');
    const header     = splitFoto[0];
    const base64Data = splitFoto[1];

    // Cek MIME Type secara aman
    const match = header.match(/data:(.*?);base64/);
    const contentType = (match && match[1]) ? match[1] : 'image/jpeg';
    const bytes = Utilities.base64Decode(base64Data);

    // 3. Simpan Foto ke Google Drive
    const sekarang  = new Date();
    const timestamp = Utilities.formatDate(sekarang, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const namaAman  = nama.replace(/[^a-zA-Z0-9]/g, '_');
    const acaraAman = acara.replace(/[^a-zA-Z0-9]/g, '_');
    const namaFile  = `${timestamp}_${namaAman}_${acaraAman}.jpg`;

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const blob   = Utilities.newBlob(bytes, contentType, namaFile);
    const file   = folder.createFile(blob);

    // Ubah izin foto agar bisa diakses public via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fotoUrl = file.getUrl();

    // 4. Simpan Data ke Google Sheets
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput("Error: Tab '" + SHEET_NAME + "' tidak ditemukan pada Spreadsheet");
    }

    const tanggalFormatted = Utilities.formatDate(sekarang, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([tanggalFormatted, nama, acara, fotoUrl]);

    return ContentService.createTextOutput("Sukses");

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}
