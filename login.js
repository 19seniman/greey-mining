require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const IDENTIFIER = process.env.MINEGREY_EMAIL; 
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

const TOKEN_FILE = path.join(__dirname, 'token.json');

async function login() {
  logger.printBanner();

  if (!IDENTIFIER || !PASSWORD) {
    logger.error('MINEGREY_EMAIL dan MINEGREY_PASSWORD belum diisi di file .env');
    return;
  }

  const url = `${BASE_URL}${LOGIN_PATH}`;
  logger.section('Mencoba Login');
  logger.info(`Identifier: ${IDENTIFIER}`);

  try {
    const response = await axios.post(
      url,
      {
        identifier: IDENTIFIER,
        password: PASSWORD,
      },
      {
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
          origin: BASE_URL,
          referer: `${BASE_URL}/login`,
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    if (response.status === 403 || response.status === 503) {
      logger.error(
        `Login diblokir Cloudflare (status ${response.status}). Gunakan token manual dari browser (lihat .env.example -> MINEGREY_TOKEN) sebagai gantinya.`
      );
      return;
    }

    if (response.status < 200 || response.status >= 300) {
      logger.error(`Login gagal (status ${response.status}): ${JSON.stringify(response.data)}`);
      return;
    }

    const token =
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.data?.token;

    if (!token) {
      logger.warn('Login sepertinya berhasil, tapi token tidak ditemukan di lokasi yang diharapkan.');
      logger.data('Response penuh', JSON.stringify(response.data));
      return;
    }

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2)
    );

    logger.success('Login berhasil. Token disimpan di token.json');
  } catch (err) {
    if (err.response) {
      logger.error(`Login gagal (status ${err.response.status}): ${JSON.stringify(err.response.data)}`);
    } else {
      logger.error(`Login gagal: ${err.message}`);
    }
    process.exitCode = 1;
  }
}

login();
