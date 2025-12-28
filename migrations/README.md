# Database Migrations

File migrasi SQL untuk setup database Supabase.

## Cara Menjalankan Migration

### Menggunakan Supabase Dashboard

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Masuk ke **SQL Editor**
4. Copy isi file `001_initial_schema.sql`
5. Paste ke SQL Editor
6. Klik **Run** untuk menjalankan migration

### Menggunakan Supabase CLI

```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref izyxtguioeraikefrkdu

# Jalankan migration
supabase db push
```

## Struktur Database

### Tabel: `projects`
Menyimpan proyek kalender dengan konfigurasi dan halaman bulan.

### Tabel: `assets`
Menyimpan asset gambar dengan metadata.

### Tabel: `groups`
Menyimpan grup/koleksi gambar.

### Tabel: `asset_groups`
Tabel junction untuk relasi many-to-many antara assets dan groups.

## Catatan

- Semua tabel menggunakan UUID sebagai primary key
- RLS (Row Level Security) diaktifkan dengan policy untuk akses public
- Trigger otomatis untuk update `updated_at` pada tabel `projects`
- Index dibuat untuk performa query yang lebih baik

