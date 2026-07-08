require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Field ini fleksibel: isi salah satu di .env
const IDENTIFIER = process.env.MINEGREY_IDENTIFIER || process.env.MINEGREY_EMAIL;
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';
const CHECKIN_PATH = '/api/tasks/checkin'; // Endpoint baru berdasarkan log curl

// Opsional: cookie cf_clearance hasil capture manual dari browser
const CF_CLEARANCE = process.env.MINEGREY_CF_CLEARANCE || '';

const TOKEN_FILE = path.join(__dirname, 'token.json');

// Helper untuk membuat base header agar tidak redundan
function getBaseHeaders() {
  const headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.7',
    'Origin': BASE_URL,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-gpc': '1',
  };

  if (CF_CLEARANCE) {
    headers['Cookie'] = `cf_clearance=${CF_CLEARANCE}`;
  }

  return headers;
}

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error(
      'MINEGREY_IDENTIFIER (atau MINEGREY_EMAIL) dan MINEGREY_PASSWORD belum diisi di file .env'
    );
  }

  const url = `${BASE_URL}${LOGIN_PATH}`;
  const headers = {
    ...getBaseHeaders(),
    'Content-Type': 'application/json',
    'Referer': `${BASE_URL}/login`,
  };

  try {
    console.log('Mencoba login...');
    const response = await axios.post(
      url,
      { identifier: IDENTIFIER, password: PASSWORD },
      { headers, timeout: 15000 }
    );

    const token =
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.data?.token;

    if (!token) {
      console.warn('Login sepertinya berhasil, tapi token tidak ditemukan di lokasi yang diharapkan.');
      console.log('Response penuh:', JSON.stringify(response.data, null, 2));
      return null;
    }

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2)
    );
    console.log('Login berhasil. Token disimpan di token.json');
    return token;
  } catch (err) {
    if (err.response) {
      console.error(`Login gagal (status ${err.response.status}):`, err.response.data);
      if (err.response.status === 403) {
        console.error('Status 403: Diblok oleh Cloudflare. Periksa cf_clearance di .env Anda.');
      }
    } else {
      console.error('Login gagal:', err.message);
    }
    return null;
  }
}

async function dailyCheckIn(token) {
  const url = `${BASE_URL}${CHECKIN_PATH}`;
  const headers = {
    ...getBaseHeaders(),
    'Authorization': `Bearer ${token}`,
    'Referer': `${BASE_URL}/dashboard`,
  };

  try {
    console.log('Mencoba melakukan Daily Check-in...');
    const response = await axios.get(url, { headers, timeout: 15000 });
    
    console.log('Daily Check-in Berhasil!');
    console.log('Response:', response.data);
  } catch (err) {
    if (err.response) {
      console.error(`Daily Check-in gagal (status ${err.response.status}):`, err.response.data);
    } else {
      console.error('Daily Check-in gagal:', err.message);
    }
  }
}

// Fungsi utama alur kerja script
async function main() {
  let token = null;

  // Coba muat token dari berkas lokal terlebih dahulu
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      token = tokenData.token;
      console.log('Menggunakan token yang tersimpan di token.json');
    } catch (e) {
      console.log('Gagal membaca token.json, akan mencoba login ulang.');
    }
  }

  // Jika token belum ada, lakukan login
  if (!token) {
    token = await login();
  }

  // Jika token berhasil didapatkan/tersedia, lakukan check-in
  if (token) {
    await dailyCheckIn(token);
  } else {
    console.error('Proses dihentikan karena token tidak tersedia.');
    process.exitCode = 1;
  }
}

main();
