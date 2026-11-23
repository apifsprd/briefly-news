# Product Requirements Document (PRD) — Briefly

**Versi Dokumen:** 1.2  
**Nama Produk:** Briefly — Minimalist Mobile-First Web News Aggregator  
**Target Platform:** Web / PWA-Ready (ReactJS + TypeScript + Tailwind CSS + Cloudflare Pages)  

---

## 1. Visi Produk & Ringkasan Eksekutif

**Briefly** adalah aplikasi agregator berita web modern dengan pendekatan **Mobile-First** dan antarmuka minimalis monokrom (hitam-putih). Briefly menyajikan informasi berita secara cepat dan real-time dari kumpulan feed RSS resmi yang terdaftar pada file `rss.json`.

Aplikasi ini mengutamakan navigasi ramah sentuhan seluler (*thumb-friendly UI*), visual mikro-animasi via **Framer Motion**, ikonografi intuitif via **FontAwesome (Free tier)**, notifikasi elegan via **SweetAlert2**, serta styling utilitas presisi menggunakan **Tailwind CSS**. Backend disokong oleh serverless Edge (Cloudflare Pages Functions) untuk menangani fetching data dan parsing RSS secara aman dan efisien.

---

## 2. Target Pengguna & User Stories

### 2.1 Persona Pengguna
* **Mobile News Enthusiast**: Pengguna yang membaca berita dari smartphone saat mobilitas tinggi, menyukai tampilan bersih, cepat, dan navigasi yang mudah dijangkau dengan ibu jari.
* **Minimalist Reader**: Pembaca yang membenci iklan, pop-up penggangu, dan tata letak yang berantakan.
* **Topic Specialist**: Pengguna yang memantau berita terkini berdasarkan kategori spesifik atau sumber media favorit.

### 2.2 User Stories Utama
* **US-01 (Navigasi Mobile-First & Kategori)**: Pengguna dapat dengan mudah beralih antar kategori dan sumber berita menggunakan baris filter horizontal atau drawer ramah sentuhan.
* **US-02 (Pencarian Judul)**: Pengguna dapat mencari berita secara instan berdasarkan kata kunci judul melalui bilah pencarian responsif.
* **US-03 (Mode Membaca & Transisi Smooth)**: Pengguna dapat membaca ringkasan berita dalam modal *Reader Mode* teranimasi (Framer Motion) atau membuka artikel asli di tab baru.
* **US-04 (Tema Monokrom & Dark Mode)**: Pengguna dapat menikmati tampilan berbasis putih monokrom dengan opsi switch ke Dark Mode yang mulus.
* **US-05 (Notifikasi Error & Status)**: Pengguna menerima pesan peringatan yang jelas dan indah dari SweetAlert2 jika feed gagal dimuat atau koneksi terputus.

---

## 3. Spesifikasi Fitur Detail (Functional Requirements)

### F-01: Mobile-First Responsive Layout (Tailwind CSS)
* Layout didesain dari breakpoint seluler (320px–480px) hingga berskala ke tablet (768px) dan desktop (1024px+).
* Header ringkas dengan bilah pencarian *collapsible/expandable* pada perangkat seluler.
* Komponen tombol dan kartu berita memiliki target sentuh minimal 44x44 pixel (*thumb-friendly*).

### F-02: RSS Ingestion & Edge Proxy (`Cloudflare Pages Functions`)
* Endpoint Edge (`/functions/api/feed.ts`) menerima permintaan client.
* Menangani fetching RSS XML, bypass kendala CORS, dan mengonversi XML ke format JSON bersih.

### F-03: Animasi & Transisi Interaktif (`Framer Motion`)
* Transisi pembukaan & penutupan *Reader Mode Modal* yang halus.
* Animasi *hover/tap feedback* pada kartu berita dan tombol filter.
* Animasi pencarian & pergantian kategori berita (*fade in / slide up*).

### F-04: Ikonografi & Notifikasi Sistem (`FontAwesome` & `SweetAlert2`)
* FontAwesome Free Icons untuk navigasi (search, dark mode toggle, close modal, external link, category tags).
* SweetAlert2 disesuaikan dengan tema monokrom (hitam-putih) untuk menampilkan alert saat:
  - Feed RSS gagal di-fetch dari penerbit.
  - Berita yang dicari tidak ditemukan.
  - Perubahan opsi/tema berhasil dilakukan.

### F-05: Dual-Mode Reader (Reader Mode & Direct Link)
* **Reader Mode (Modal View)**: Menampilkan judul, waktu terbit, nama sumber, deskripsi ringkas berita, serta tombol aksi.
* **Direct Redirect**: Tombol navigasi cepat untuk membuka URL artikel asli pada tab browser baru.

### F-06: Minimalist UI & Dark Mode Switcher
* Tampilan bawaan berbasis putih (*white-based monochrome*) dengan kontras tinggi.
* Fitur beralih ke Dark Mode (monokrom gelap) yang tersimpan di `localStorage`.

---

## 4. Spesifikasi Skema JSON

### 4.1 Struktur `rss.json`
```json
{
  "sources": [
    {
      "id": "tech-01",
      "name": "Tech Source",
      "category": "Teknologi",
      "url": "https://example.com/rss.xml"
    }
  ]
}
```

### 4.2 Skema Output Item Berita (JSON)
```json
{
  "id": "item-unique-id",
  "title": "Judul Berita Terkini",
  "link": "https://example.com/article-1",
  "description": "Ringkasan deskripsi berita...",
  "pubDate": "2026-11-23T06:00:00Z",
  "sourceId": "tech-01",
  "sourceName": "Tech Source",
  "category": "Teknologi"
}
```

---

## 5. Panduan User Experience (UX) & Desain Mobile-First
1. **Monochrome Palette**:
   - Light Mode: Background `#FFFFFF`, Card/Surface `#F9F9F9`, Border `#E5E5E5`, Text Primary `#111111`, Text Secondary `#666666`.
   - Dark Mode: Background `#09090B`, Card/Surface `#18181B`, Border `#27272A`, Text Primary `#FAFAFA`, Text Secondary `#A1A1AA`.
2. **Typography**: Sans-serif modern (`Inter` atau System Sans-Serif) dengan penekanan ketebalan *font* (Bold/Medium) untuk hirarki berita.
3. **Touch Targets**: Semua tombol filter, ikon, dan kartu berita memiliki ukuran sentuh yang nyaman di layar HP.

---

## 6. Persyaratan Non-Fungsional (NFR)
* **Performa**: Initial Load < 1.0 detik, Frame Rate Animasi 60 FPS.
* **Aksesibilitas**: Kontras warna monokrom memenuhi standar WCAG AA.
* **Keamanan**: Bebas CORS error dan tanpa pelacakan data pribadi pengguna.
* **Arsitektur**: 100% Jamstack + Serverless Edge (tanpa server database terpisah).

---

## 7. Roadmap Dokumen Proyek Briefly
1. **BRD** — Business Requirements Document (`BRD.md`) ✅
2. **PRD** — Product Requirements Document (`PRD.md`) ✅
3. **SDD** — System Design Document (`SDD.md`) ✅
4. **TSD** — Technical Specification Document (`TSD.md`) ✅
