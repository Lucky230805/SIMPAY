# SIMPAY (Sistem Informasi Manajemen Pelayanan Klinik)

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

> Sistem Informasi Manajemen Pelayanan, Antrean, dan Rekam Medis Elektronik (RME) Terpadu Berbasis Web untuk Klinik Pratama dan Praktek Dokter Mandiri.

---

## 📌 Gambaran Umum

**SIMPAY** dirancang untuk mendigitalkan seluruh alur operasional klinik rawat jalan secara terintegrasi—mulai dari pendaftaran pasien, skrining tanda vital (vital signs) oleh perawat, pemeriksaan klinis dokter dengan standar SOAP dan autokomplet ICD-10, peresepan dan pengeluaran obat otomatis dengan metode FEFO (*First-Expired, First-Out*), kasir pembayaran multi-metode, hingga pembuatan surat keterangan medis dan pelaporan keuangan.

---

## 🌟 Fitur Utama

- **🩺 Skrining Tanda Vital & Triage (Perawat)**
  Pengukuran tanda vital awal (Tekanan Darah, Nadi, Suhu, Pernapasan, BB, TB) dengan klasifikasi tensi dan kalkulasi Indeks Massa Tubuh (IMT / BMI) otomatis sebelum pasien dipanggil dokter.

- **👨‍⚕️ Rekam Medis Elektronik & Workbench Dokter (SOAP)**
  Pencatatan klinis komprehensif (*Subjective, Objective, Assessment, Plan*) dengan riwayat multi-kunjungan, katalog diagnosis ICD-10 resmi, dan tanda vital yang termuat otomatis dari perawat.

- **📺 Layar Display Antrean TV & Nomor Tiket**
  Layar display publik real-time untuk TV ruang tunggu yang memisahkan antrean per poliklinik, audio pemanggil, dan privasi identitas pasien yang terjaga.

- **💊 Manajemen Farmasi & Resep FEFO (*First-Expired, First-Out*)**
  Peresepan obat terintegrasi, pemotongan stok otomatis berdasarkan tanggal kadaluarsa terdekat, peringatan stok kritis (*minimum stock*), dan kartu stok (*audit stock ledger*).

- **💳 Kasir & Pembayaran Multi-Metode**
  Perhitungan rincian biaya konsultasi, obat, dan tindakan secara otomatis. Mendukung pembayaran Tunai, QRIS, dan Transfer Bank dengan kalkulasi kembalian dan cetak kuitansi.

- **📄 Surat Keterangan Medis Terstandar**
  Pembuatan dan cetak Surat Keterangan Sakit dan Surat Keterangan Sehat resmi dengan format siap cetak (*print-optimized*).

- **📊 Laporan & Analitik Klinik**
  Ringkasan analitik harian, tren pendapatan, demografi kunjungan pasien, dan 10 besar diagnosis penyakit terbanyak.

---

## 🛠 Teknologi & Arsitektur

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React Server Components & Server Actions |
| **Bahasa** | [TypeScript](https://www.typescriptlang.org/) | Strict Type Safety |
| **Library UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) | Radix / Base UI Primitives, Lucide Icons |
| **Database** | [PostgreSQL](https://neon.tech/) | Serverless Cloud PostgreSQL via Neon |
| **ORM** | [Prisma ORM 7](https://www.prisma.io/) | Schema modelling, type generation & queries |
| **Keamanan** | HTTP-Only Cookies & HMAC-SHA256 | Role-Based Access Control (RBAC) |

---

## 🚀 Panduan Memulai (*Quick Start*)

### 1. Prasyarat Sistem
Pastikan telah menginstal:
- **Node.js** versi 18.18 atau lebih baru
- **npm** (atau pnpm / yarn)

### 2. Kloning Repositori & Instal Dependensi
```bash
git clone https://github.com/Lucky230805/SIMPAY.git
cd simpay
npm install
```

### 3. Konfigurasi Environment
Salin template environment [`.env.example`](.env.example) menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan variabel `DATABASE_URL` dengan string koneksi database PostgreSQL Anda.

### 4. Sinkronisasi Skema Database
```bash
npx prisma generate
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000).

---

## 🔐 Akun Demo Bawaan

Sistem menerapkan pembatasan hak akses berbasis peran (*Role-Based Access Control*):

| Peran (*Role*) | Email Akun | Kata Sandi | Cakupan Akses |
| :--- | :--- | :--- | :--- |
| **Dokter** | `dokter@simpay.local` | `password123` | Antrean Pemeriksaan, RME, Workbench Dokter, Laporan |
| **Perawat** | `perawat@simpay.local` | `password123` | Registrasi Pasien, Skrining TTV, Farmasi/Resep, Kasir, Surat |

---

## 🧪 Pengujian Otomatis (*Automated Testing*)

Proyek ini dilengkapi dengan rangkaian pengujian fungsional dan keamanan otorisasi peran:

```bash
# Menjalankan seluruh rangkaian tes otomatis
npm test

# Menjalankan tes otorisasi peran spesifik
npm run test:auth

# Menjalankan tes skrining TTV perawat
npm run test:screening

# Memvalidasi tipe data TypeScript
npx tsc --noEmit
```

---

## 📚 Dokumentasi Pendukung

Informasi arsitektur dan spesifikasi mendalam tersedia pada direktori dokumen berikut:
- [📄 Product Requirements Document (PRD)](PRD.md) - Rincian kebutuhan produk dan fitur.
- [🏛️ Architectural Specification](ARCHITECTURE.md) - Arsitektur sistem, skema data, dan keamanan.
- [🔄 User Flow & Role Separation Matrix](USER_FLOW.md) - Alur kerja operasional antar peran.

---

## 📄 Lisensi

Didistribusikan di bawah lisensi **MIT License**. Lihat [LICENSE](LICENSE) untuk informasi lebih lanjut.