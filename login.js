require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const IDENTIFIER = process.env.MINEGREY_EMAIL; 
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

const TOKEN_FILE = path.join(__dirname, 'token.json');

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error(
      'MINEGREY_EMAIL dan MINEGREY_PASSWORD belum diisi di file .env'
    );
  }

  const url = `${BASE_URL}${LOGIN_PATH}`;

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
      console.error(
        `Login diblokir Cloudflare (status ${response.status}). ` +
          `Ini yang sudah diperingatkan sebelumnya — Node.js tidak bisa lolos ` +
          `JS challenge Cloudflare. Gunakan token manual dari browser (lihat ` +
          `.env.example -> MINEGREY_TOKEN) sebagai gantinya.`
      );
      return;
    }

    if (response.status < 200 || response.status >= 300) {
      console.error(
        `Login gagal (status ${response.status}):`,
        response.data
      );
      return;
    }

    const token =
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.data?.token;

    if (!token) {
      console.warn(
        'Login sepertinya berhasil, tapi token tidak ditemukan di lokasi yang diharapkan.'
      );
      console.log('Response penuh:', JSON.stringify(response.data, null, 2));
      return;
    }

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2)
    );

    console.log('Login berhasil. Token disimpan di token.json');
  } catch (err) {
    if (err.response) {
      console.error(
        `Login gagal (status ${err.response.status}):`,
        err.response.data
      );
    } else {
      console.error('Login gagal:', err.message);
    }
    process.exitCode = 1;
  }
}

login();
