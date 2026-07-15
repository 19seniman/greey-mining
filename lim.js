require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const MINING_PATH = process.env.MINEGREY_MINING_PATH || '/api/mining';
const MINING_METHOD = (process.env.MINEGREY_MINING_METHOD || 'POST').toUpperCase();

const CHECKIN_PATH = process.env.MINEGREY_CHECKIN_PATH || '/api/tasks/checkin';
const CHECKIN_METHOD = (process.env.MINEGREY_CHECKIN_METHOD || 'POST').toUpperCase();
const ENABLE_CHECKIN = String(process.env.MINEGREY_ENABLE_CHECKIN).toLowerCase() === 'true';

const INTERVAL_HOURS = Number(process.env.MINEGREY_INTERVAL_HOURS || 24);
const TOKEN_FILE = path.join(__dirname, 'token.json');

const COMMON_HEADERS = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.7',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

function getToken() {
  if (process.env.MINEGREY_TOKEN) {
    return process.env.MINEGREY_TOKEN.trim();
  }

  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      if (saved.token) return saved.token;
    } catch (_) {
      // abaikan, lanjut ke error di bawah
    }
  }

  throw new Error(
    'Token tidak ditemukan. Isi MINEGREY_TOKEN di .env, atau jalankan `npm start` (login.js) dulu.'
  );
}

async function callEndpoint(pathName, method, referer) {
  const token = getToken();
  const url = `${BASE_URL}${pathName}`;

  const isPost = method.toUpperCase() === 'POST';

  const response = await axios({
    url,
    method,
    headers: {
      ...COMMON_HEADERS,
      authorization: `Bearer ${token}`,
      referer,
      ...(isPost ? { 'content-type': 'application/json' } : {}),
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
    data: isPost ? {} : undefined,
    timeout: 20000,
    validateStatus: () => true, 
  });

  return response;
}

async function runMiningCycle() {
  logger.section('Siklus Mining Dimulai');

  try {
    const res = await callEndpoint(
      MINING_PATH,
      MINING_METHOD,
      `${BASE_URL}/dashboard`
    );

    if (res.status === 403 || res.status === 503) {
      logger.error(
        `Kemungkinan diblokir Cloudflare (status ${res.status}). Token mungkin masih valid, tapi request non-browser ditahan.`
      );
    } else if (res.status >= 200 && res.status < 300) {
      logger.success('Mining berhasil dipicu!');
      const balance = res.data?.balance ?? res.data?.data?.balance;
      const rate = res.data?.totalRate ?? res.data?.data?.totalRate;
      const active = res.data?.miningActive ?? res.data?.data?.miningActive;
      if (balance !== undefined) logger.data('Balance', `${balance} $GREY`);
      if (rate !== undefined) logger.data('Rate', `${rate} GREY/jam`);
      if (active !== undefined) logger.data('Status', active ? 'AKTIF 🚀' : 'TIDAK AKTIF');
      if (balance === undefined && rate === undefined && active === undefined) {
        logger.data('Response', JSON.stringify(res.data));
      }
    } else if (res.status === 401) {
      logger.error('Token tidak valid/kadaluarsa (401). Ambil token baru dari browser.');
    } else {
      logger.warn(`Status tak terduga (${res.status}): ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    logger.error(`Gagal memanggil endpoint mining: ${err.message}`);
  }

  if (ENABLE_CHECKIN) {
    try {
      const res = await callEndpoint(
        CHECKIN_PATH,
        CHECKIN_METHOD,
        `${BASE_URL}/dashboard`
      );
      if (res.status >= 200 && res.status < 300) {
        logger.success(`Check-in berhasil (status ${res.status})`);
      } else {
        logger.warn(`Check-in status ${res.status}: ${JSON.stringify(res.data)}`);
      }
    } catch (err) {
      logger.error(`Gagal check-in: ${err.message}`);
    }
  }
}

logger.printBanner();
logger.info(`Interval otomatis: setiap ${INTERVAL_HOURS} jam`);
logger.info(`Endpoint mining: ${MINING_METHOD} ${BASE_URL}${MINING_PATH}`);
if (ENABLE_CHECKIN) logger.info(`Check-in harian: AKTIF (${CHECKIN_METHOD} ${BASE_URL}${CHECKIN_PATH})`);

runMiningCycle();

const intervalMs = INTERVAL_HOURS * 60 * 60 * 1000;
setInterval(runMiningCycle, intervalMs);

logger.info('Auto-mining aktif. Tekan Ctrl+C untuk berhenti.\n');
