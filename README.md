# 🚀 Minegrey Multi-Account Automation Bot

Bot otomatisasi berbasis Node.js untuk melakukan klaim harian, menyelesaikan tugas sosial, dan memicu fitur *Start Mining* secara otomatis di platform **Minegrey**. Mendukung multi-akun sekaligus menggunakan manajemen antrean yang aman.

## ✨ Fitur Utama
* 👥 **Multi-Account Support** – Jalankan banyak akun sekaligus menggunakan konfigurasi `accounts.json`.
* 📊 **Live Balance Tracker** – Menampilkan total saldo `$GREY` beserta status sisa waktu penambangan secara *real-time*.
* 🎨 **Terminal Interaktif & Berwarna** – Log pemrosesan yang rapi dan indikator kesuksesan yang intuitif di terminal.
* 🕒 **24/7 Loop Standby** – Bot otomatis berjalan kembali setiap 24 jam setelah semua tugas selesai tanpa perlu di-restart.

---

## 🛠️ Panduan Instalasi

Ikuti langkah-langkah di bawah ini untuk memasang dan menjalankan bot di perangkat atau VPS kamu:

### 1. Kloning Repositori
```bash
git clone https://github.com/19seniman/greey-mining.git
cd greey-mining
npm init -y 
nano accounts.json  ( save your data ctrl+y enter)
run : node lim.js

