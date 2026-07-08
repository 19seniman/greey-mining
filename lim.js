require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Field ini fleksibel: isi salah satu di .env
const IDENTIFIER = process.env.MINEGREY_IDENTIFIER || process.env.MINEGREY_EMAIL;
const PASSWORD = process.env.MINEGREY_PASSWORD;
const BASE_URL = process.env.MINEGREY_BASE_URL || 'https://app.minegrey.com';
const LOGIN_PATH = process.env.MINEGREY_LOGIN_PATH || '/api/auth/login';

// Opsional: cookie cf_clearance hasil capture manual dari browser (lihat catatan di atas)
const CF_CLEARANCE = process.env.MINEGREY_CF_CLEARANCE || '';

const TOKEN_FILE = path.join(__dirname, 'token.json');

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error(
      'MINEGREY_IDENTIFIER (atau MINEGREY_EMAIL) dan MINEGREY_PASSWORD belum diisi di file .env'
    );
  }

  const url = `${BASE_URL}${LOGIN_PATH}`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.7',
    Origin: BASE_URL,
    Referer: `${BASE_URL}/login`,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };

  if (CF_CLEARANCE) {
    headers['Cookie'] = `cf_clearance=${CF_CLEARANCE}`;
  }

  try {
    const response = await axios.post(
      url,
      {
        identifier: IDENTIFIER,
        password: PASSWORD,
      },
      {
        headers,
        timeout: 15000,
      }
    );

    // Sesuaikan lagi jika struktur response berbeda dari yang diharapkan.
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
      if (err.response.status === 403) {
        console.error(
          'Status 403 sering berarti diblok oleh Cloudflare karena cf_clearance tidak valid/tidak ada. Lihat catatan di bagian atas file ini.'
        );
      }
    } else {
      console.error('Login gagal:', err.message);
    }
    process.exitCode = 1;
  }
}

login();
