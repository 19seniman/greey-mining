require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const IDENTIFIER = process.env.MINEGREY_IDENTIFIER || process.env.MINEGREY_EMAIL;
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

// Endpoints
const PROFILE_PATH = '/api/users/profile';
const UNREAD_PATH = '/api/notifications/unread-count';
const SOCIAL_SHARE_PATH = '/api/tasks/social-share';
const CHECKIN_PATH = '/api/tasks/checkin';
const MINING_PATH = '/api/mining';

const CF_CLEARANCE = process.env.MINEGREY_CF_CLEARANCE || '';
const TOKEN_FILE = path.join(__dirname, 'token.json');
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== CODE WARNA TERMINAL (ANSI) ====================
const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bgGray: "\x1b[100m"
};

function printBanner() {
  console.log(`${C.magenta}${C.bright}`);
  console.log(` ███▄    █▄▄▄▄ ▄████▄   ▄████▄   ▄██   ▄      ▄████▄   ▄████▄  ▄▄▄▄▄▄ `);
  console.log(` ██ ▀█   █ █ █ ▀█▄▄▄▄   ▀█▄▄▄▄   ███   ██     ▀█▄▄▄▄   ██▄▄▄▄  ▀▀▀▀▀█ `);
  console.log(` ██   █  █ █ █   ▀▀▀▀█▄   ▀▀▀▀█▄ ███▄▄▄██       ▀▀▀▀█▄ ██▀▀▀▀    ▄▄█▀ `);
  console.log(` ██   ██ █   █ ▀█████▀  ▀█████▀   ▀███▀██     ▀█████▀  ▀██████ ▄████▄ `);
  console.log(`========================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bright}                 MINEGREY AUTOMATION BOT v2.0 - 2026${C.reset}\n`);
}

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
  if (CF_CLEARANCE) headers['Cookie'] = `cf_clearance=${CF_CLEARANCE}`;
  return headers;
}

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error('MINEGREY_IDENTIFIER dan MINEGREY_PASSWORD belum diisi di file .env');
  }
  const url = `${BASE_URL}${LOGIN_PATH}`;
  const headers = { ...getBaseHeaders(), 'content-type': 'application/json', 'referer': `${BASE_URL}/login` };

  try {
    console.log(`${C.yellow}🔑 Mencoba login ke sistem...${C.reset}`);
    const response = await axios.post(url, { identifier: IDENTIFIER, password: PASSWORD }, { headers, timeout: 15000 });
    const token = response.data?.token || response.data?.accessToken || response.data?.data?.token;

    if (!token) {
      console.log(`${C.red}❌ Login berhasil, tetapi token gagal diekstrak.${C.reset}`);
      return null;
    }

    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2));
    console.log(`${C.green}✨ Login Sukses! Token disimpan.${C.reset}`);
    return token;
  } catch (err) {
    console.error(`${C.red}❌ Login gagal:${C.reset}`, err.response?.data || err.message);
    return null;
  }
}

// Fungsi khusus Fetch Profile untuk mengambil info balance/saldo
async function checkBalance(token) {
  const url = `${BASE_URL}${PROFILE_PATH}`;
  const headers = { ...getBaseHeaders(), 'authorization': `Bearer ${token}`, 'cache-control': 'no-cache', 'referer': `${BASE_URL}/dashboard` };

  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    const userData = response.data?.data || response.data;
    
    // Mencari kemungkinan properti balance di dalam response API
    const balance = userData?.balance ?? userData?.points ?? userData?.greyBalance ?? userData?.tokens ?? "0";
    const email = userData?.email || IDENTIFIER;

    console.log(`\n${C.bgGray}${C.bright}  [ PROFILE INFO ]  ${C.reset}`);
    console.log(`${C.cyan}📧 Account :${C.reset} ${email}`);
    console.log(`${C.green}💰 Balance :${C.bright} ${balance} $GREY ${C.reset}\n`);
    return true;
  } catch (err) {
    console.error(`${C.red}❌ Gagal mengambil informasi saldo:${C.reset}`, err.response?.data || err.message);
    return false;
  }
}

async function sendGetRequest(token, pathEndpoint, taskName) {
  const url = `${BASE_URL}${pathEndpoint}`;
  const headers = { ...getBaseHeaders(), 'authorization': `Bearer ${token}`, 'cache-control': 'no-cache', 'pragma': 'no-cache', 'referer': `${BASE_URL}/dashboard` };

  try {
    process.stdout.write(`${C.dim}⏳ [Task] ${taskName}... ${C.reset}`);
    const response = await axios.get(url, { headers, timeout: 15000 });
    
    // Bersihkan baris pemrosesan, ganti dengan tanda centang sukses berwarna hijau
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${C.green}✔ [Sukses]${C.reset} ${taskName}`);
    return true;
  } catch (err) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${C.red}❌ [Gagal]${C.reset} ${taskName} ->`, err.response?.data?.message || err.message);
    return false;
  }
}

async function runBot() {
  console.log(`${C.yellow}=======================================================${C.reset}`);
  console.log(`${C.bright}⏰ Waktu Eksekusi: ${new Date().toLocaleString()}${C.reset}`);
  console.log(`${C.yellow}=======================================================${C.reset}`);
  
  let token = null;

  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      token = tokenData.token;
    } catch (e) {
      console.log(`${C.yellow}⚠️ Gagal membaca token lokal, mencoba login ulang...${C.reset}`);
    }
  }

  if (!token) {
    token = await login();
  }

  if (token) {
    // 1. Cek info akun dan total Balance awal
    await checkBalance(token);
    await delay(1500);

    // 2. Rangkaian rutinitas task harian
    console.log(`${C.magenta}🛠️ Memulai rangkaian aktivitas...${C.reset}`);
    await sendGetRequest(token, UNREAD_PATH, 'Cek Notifikasi');
    await delay(1500);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Awal)');
    await delay(2000);

    await sendGetRequest(token, CHECKIN_PATH, 'Daily Check-In Website');
    await delay(2000);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Tengah)');
    await delay(2000);

    await sendGetRequest(token, MINING_PATH, 'Memicu Start Mining 🚀');
    await delay(3000);

    await sendGetRequest(token, SOCIAL_SHARE_PATH, 'Social Share (Akhir)');
    await delay(2000);

    // 3. Cek ulang saldo akhir setelah mining/checkin dipicu
    console.log(`\n${C.yellow}🔄 Memperbarui info saldo...${C.reset}`);
    await checkBalance(token);
    
    console.log(`${C.cyan}=======================================================${C.reset}`);
    console.log(`${C.green}${C.bright}🎉 Selesai! Bot Standby. Akan mengulang dalam 24 Jam...${C.reset}`);
    console.log(`${C.cyan}=======================================================${C.reset}\n`);
  } else {
    console.error(`${C.red}🛑 Bot dihentikan karena token gagal didapatkan.${C.reset}`);
  }
}

async function main() {
  console.clear();
  printBanner();
  
  await runBot();

  setInterval(async () => {
    await runBot();
  }, TWENTY_FOUR_HOURS);
}

main();
