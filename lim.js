require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const IDENTIFIER = process.env.MINEGREY_IDENTIFIER || process.env.MINEGREY_EMAIL;
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

// Endpoint-endpoint berdasarkan log curl terbaru
const PROFILE_PATH = '/api/users/profile';
const UNREAD_PATH = '/api/notifications/unread-count';
const SOCIAL_SHARE_PATH = '/api/tasks/social-share';
const CHECKIN_PATH = '/api/tasks/checkin';
const MINING_PATH = '/api/mining';

const CF_CLEARANCE = process.env.MINEGREY_CF_CLEARANCE || '';
const TOKEN_FILE = path.join(__dirname, 'token.json');

// Loop otomatisasi setiap 24 Jam
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// Helper untuk standarisasi waktu tunggu / delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getBaseHeaders() {
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.7',
    'origin': BASE_URL,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-gpc': '1',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin'
  };

  if (CF_CLEARANCE) {
    headers['Cookie'] = `cf_clearance=${CF_CLEARANCE}`;
  }

  return headers;
}

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error('MINEGREY_IDENTIFIER dan MINEGREY_PASSWORD belum diisi di file .env');
  }

  const url = `${BASE_URL}${LOGIN_PATH}`;
  const headers = {
    ...getBaseHeaders(),
    'content-type': 'application/json',
    'referer': `${BASE_URL}/login`,
  };

  try {
    console.log('Mencoba login...');
    const response = await axios.post(url, { identifier: IDENTIFIER, password: PASSWORD }, { headers, timeout: 15000 });

    const token = response.data?.token || response.data?.accessToken || response.data?.data?.token;

    if (!token) {
      console.warn('Login berhasil, tetapi token tidak ditemukan dalam payload.');
      return null;
    }

    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2));
    console.log('Login berhasil. Token baru disimpan di token.json');
    return token;
  } catch (err) {
    console.error('Login gagal:', err.response?.data || err.message);
    return null;
  }
}

// Fungsi generik untuk request GET ber-pola (Profile, Unread, Social Share, Checkin, Mining)
async function sendGetRequest(token, pathEndpoint, taskName) {
  const url = `${BASE_URL}${pathEndpoint}`;
  const headers = {
    ...getBaseHeaders(),
    'authorization': `Bearer ${token}`,
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'referer': `${BASE_URL}/dashboard`,
  };

  try {
    console.log(`Menjalankan task: ${taskName}...`);
    const response = await axios.get(url, { headers, timeout: 15000 });
    console.log(`✓ ${taskName} Sukses!`, response.data ? JSON.stringify(response.data) : '');
    return true;
  } catch (err) {
    console.error(`❌ ${taskName} Gagal:`, err.response?.data || err.message);
    return false;
  }
}

// Fungsi utama eksekusi rangkaian task harian
async function runBot() {
  console.log(`\n======================================================`);
  console.log(`[${new Date().toLocaleString()}] Memulai Rutinitas Klaim`);
  console.log(`======================================================`);
  
  let token = null;

  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      token = tokenData.token;
    } catch (e) {
      console.log('Gagal membaca token.json lokal, beralih ke login ulang.');
    }
  }

  if (!token) {
    token = await login();
  }

  if (token) {
    // Mengikuti sekuens persis seperti alur aktivitas di log curl peramban:
    await sendGetRequest(token, PROFILE_PATH, 'Fetch Profile');
    await delay(1500);

    await sendGetRequest(token, UNREAD_PATH, 'Check Unread Notifications');
    await delay(1500);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Pre-check)');
    await delay(2000);

    await sendGetRequest(token, CHECKIN_PATH, 'Daily Check-In');
    await delay(2000);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Mid-check)');
    await delay(2000);

    // FITUR UTAMA: Memicu Start Mining harian
    await sendGetRequest(token, MINING_PATH, 'Start Mining');
    await delay(1500);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Post-check)');
    
    console.log(`\n======================================================`);
    console.log(`Semua task selesai! Bot standby & melakukan hit ulang dalam 24 jam.`);
    console.log(`======================================================`);
  } else {
    console.error('Rutinitas dibatalkan karena masalah autentikasi token.');
  }
}

async function main() {
  // Langsung eksekusi begitu script dinyalakan
  await runBot();

  // Jadwalkan ulang secara otomatis setiap 24 jam sekali tanpa mematikan proses node
  setInterval(async () => {
    await runBot();
  }, TWENTY_FOUR_HOURS);
}

main();
