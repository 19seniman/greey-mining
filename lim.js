require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

// Endpoints
const PROFILE_PATH = '/api/users/profile';
const UNREAD_PATH = '/api/notifications/unread-count';
const SOCIAL_SHARE_PATH = '/api/tasks/social-share';
const CHECKIN_PATH = '/api/tasks/checkin';
const MINING_PATH = '/api/mining';

const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const TOKENS_DIR = path.join(__dirname, 'tokens'); // Folder khusus penyimpan token multi-account
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Membuat folder 'tokens' otomatis jika belum ada
if (!fs.existsSync(TOKENS_DIR)) {
  fs.mkdirSync(TOKENS_DIR);
}

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
  console.log(`${C.cyan}${C.bright}             MINEGREY MULTI-ACCOUNT AUTOMATION BOT v3.0${C.reset}\n`);
}

function getBaseHeaders(cfClearance) {
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
  if (cfClearance) headers['Cookie'] = `cf_clearance=${cfClearance}`;
  return headers;
}

async function login(account) {
  const url = `${BASE_URL}${LOGIN_PATH}`;
  const headers = { ...getBaseHeaders(account.cf_clearance), 'content-type': 'application/json', 'referer': `${BASE_URL}/login` };

  try {
    console.log(`${C.yellow}🔑 Mencoba login untuk [${account.identifier}]...${C.reset}`);
    const response = await axios.post(url, { identifier: account.identifier, password: account.password }, { headers, timeout: 15000 });
    const token = response.data?.token || response.data?.accessToken || response.data?.data?.token;

    if (!token) {
      console.log(`${C.red}❌ Login berhasil, tetapi token gagal diekstrak.${C.reset}`);
      return null;
    }

    // Simpan token unik berdasarkan nama file email akun
    const safeFilename = account.identifier.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    fs.writeFileSync(path.join(TOKENS_DIR, safeFilename), JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2));
    console.log(`${C.green}✨ Login Sukses! Token disimpan.${C.reset}`);
    return token;
  } catch (err) {
    console.error(`${C.red}❌ Login gagal untuk [${account.identifier}]:${C.reset}`, err.response?.data || err.message);
    return null;
  }
}

function displayMiningStats(responseData) {
  const totalBalance = responseData?.balance ?? 0;
  const sessionBalance = responseData?.sessionBalance ?? 0;
  const isMining = responseData?.miningActive ? "AKTIF 🚀" : "MATI 🛑";
  const speed = responseData?.totalRate ?? 0;
  const expiry = responseData?.session_expiry ? new Date(responseData.session_expiry).toLocaleString() : "-";

  console.log(`\n${C.bgGray}${C.bright}  [ 📊 STATISTIK MINING GREY ]  ${C.reset}`);
  console.log(`${C.cyan}💰 Total Balance   :${C.bright} ${totalBalance} $GREY ${C.reset}`);
  console.log(`${C.yellow}⏳ Session Balance :${C.reset} ${parseFloat(sessionBalance).toFixed(6)} $GREY`);
  console.log(`${C.green}⚡ Status Mining   :${C.reset} ${isMining}`);
  console.log(`${C.green}📈 Kecepatan       :${C.reset} ${speed} GREY/jam`);
  console.log(`${C.magenta}📅 Sesi Berakhir   :${C.reset} ${expiry}\n`);
}

async function sendGetRequest(token, account, pathEndpoint, taskName) {
  const url = `${BASE_URL}${pathEndpoint}`;
  const headers = { ...getBaseHeaders(account.cf_clearance), 'authorization': `Bearer ${token}`, 'cache-control': 'no-cache', 'pragma': 'no-cache', 'referer': `${BASE_URL}/dashboard` };

  try {
    process.stdout.write(`${C.dim}⏳ [Task] ${taskName}... ${C.reset}`);
    const response = await axios.get(url, { headers, timeout: 15000 });
    
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${C.green}✔ [Sukses]${C.reset} ${taskName}`);
    
    if (pathEndpoint === MINING_PATH && response.data) {
      displayMiningStats(response.data);
    }
    
    return true;
  } catch (err) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${C.red}❌ [Gagal]${C.reset} ${taskName} ->`, err.response?.data?.message || err.message);
    return false;
  }
}

async function processSingleAccount(account, index, total) {
  console.log(`\n${C.cyan}${C.bright}[Akun ${index + 1}/${total}] 👤 ${account.identifier}${C.reset}`);
  console.log(`${C.dim}-------------------------------------------------------${C.reset}`);

  let token = null;
  const safeFilename = account.identifier.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
  const tokenPath = path.join(TOKENS_DIR, safeFilename);

  if (fs.existsSync(tokenPath)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      token = tokenData.token;
    } catch (e) {
      console.log(`${C.yellow}⚠️ Gagal membaca token lokal, mencoba login ulang...${C.reset}`);
    }
  }

  if (!token) {
    token = await login(account);
  }

  if (token) {
    console.log(`${C.magenta}🛠️ Memulai rangkaian aktivitas...${C.reset}`);
    
    await sendGetRequest(token, account, PROFILE_PATH, 'Cek Profil Akun');
    await delay(1500);

    await sendGetRequest(token, account, UNREAD_PATH, 'Cek Notifikasi');
    await delay(1500);

    await sendGetRequest(token, account, SOCIAL_SHARE_PATH, 'Social Share (Awal)');
    await delay(2000);

    await sendGetRequest(token, account, CHECKIN_PATH, 'Daily Check-In Website');
    await delay(2000);

    await sendGetRequest(token, account, SOCIAL_SHARE_PATH, 'Social Share (Tengah)');
    await delay(2000);

    await sendGetRequest(token, account, MINING_PATH, 'Memicu Start Mining & Fetch Balance 🚀');
    await delay(2000);

    await sendGetRequest(token, account, SOCIAL_SHARE_PATH, 'Social Share (Akhir)');
    
    console.log(`${C.green}✔ Semua task selesai untuk ${account.identifier}${C.reset}`);
  } else {
    console.error(`${C.red}🛑 Lewati akun karena masalah autentikasi token.${C.reset}`);
  }
}

async function runBot() {
  console.log(`${C.yellow}=======================================================${C.reset}`);
  console.log(`${C.bright}⏰ Siklus Dimulai: ${new Date().toLocaleString()}${C.reset}`);
  console.log(`${C.yellow}=======================================================${C.reset}`);
  
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`${C.red}🛑 File accounts.json tidak ditemukan! Silakan buat terlebih dahulu.${C.reset}`);
    return;
  }

  let accounts = [];
  try {
    accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch (e) {
    console.error(`${C.red}🛑 Gagal membaca/parse file accounts.json. Pastikan format JSON benar!${C.reset}`);
    return;
  }

  if (accounts.length === 0) {
    console.log(`${C.yellow}⚠️ Tidak ada akun yang terdaftar di accounts.json.${C.reset}`);
    return;
  }

  // Melakukan perulangan antrean untuk setiap akun
  for (let i = 0; i < accounts.length; i++) {
    await processSingleAccount(accounts[i], i, accounts.length);
    if (i < accounts.length - 1) {
      console.log(`\n${C.yellow}⏳ Memberi jeda 5 detik sebelum beralih ke akun berikutnya...${C.reset}`);
      await delay(5000); // Jeda aman antar akun agar tidak terindikasi spam IP
    }
  }

  console.log(`\n${C.cyan}=======================================================${C.reset}`);
  console.log(`${C.green}${C.bright}🎉 Selesai untuk semua akun! Standby... Mengulang 24 Jam lagi.${C.reset}`);
  console.log(`${C.cyan}=======================================================${C.reset}\n`);
}

async function main() {
  console.clear();
  printBanner();
  
  await runBot();

  // Pengulangan siklus global setiap 24 jam sekali
  setInterval(async () => {
    await runBot();
  }, TWENTY_FOUR_HOURS);
}

main();
