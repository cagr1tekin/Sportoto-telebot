# Sportoto Telebot 🎯

Supabase PostgreSQL tabanlı sportoto bahis analizi ve otomasyonu için Telegram bot projesi.

## 🚀 Kurulum

### 1. Supabase API Anahtarlarını Ayarla

1. **Supabase Dashboard**'a git: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Settings** → **API** bölümüne git
3. Şu bilgileri kopyala:
   - **Project URL**: `https://xxxxx.supabase.co` formatında
   - **anon public**: Public anon key (başlangıç için yeterli)
   - **service_role**: Admin yetkili key (opsiyonel, daha güçlü)

4. `.env` dosyasını güncelle:
   ```bash
   SUPABASE_URL=https://wkwqpqixuoucsuqboyxc.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2. Telegram Bot Token'ı Ayarla

1. **Telegram'da @BotFather'a git** ve yeni bot oluştur:
   ```
   /newbot
   Bot ismi: Sportoto Telebot
   Bot kullanıcı adı: sportoto_your_username_bot
   ```
   
2. **Bot Token**'ını kopyala (şuna benzer):
   ```
   1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
   ```

3. **Admin Chat ID**'ni öğrenmek için:
   - Bota `/start` komutunu gönder
   - Uygulamayı çalıştır, loglardan chat ID'ni al
   - Veya şu bot'u kullan: @userinfobot

4. `.env` dosyasında şu değerleri güncelle:
   ```bash
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
   ADMIN_CHAT_ID=123456789
   ```

### 3. Bağımlılıkları Yükle
```bash
npm install
```

### 4. Veritabanı Şemasını Kur
```bash
npm run db:setup
```

### 5. Uygulamayı Çalıştır
```bash
npm run dev
```

## ✅ Beklenen Çıktılar

Uygulama başarıyla çalıştığında şu mesajları görmelisin:

```
[sportoto-telebot] 🚀 Sportoto Telebot başlatılıyor...
[sportoto-telebot] ✅ Supabase REST API erişilebilir
[sportoto-telebot] ✅ Supabase client bağlantısı aktif
[sportoto-telebot] 🤖 Telegram Bot başlatılıyor...
[sportoto-telebot] ✅ Bot aktif: @your_bot_username (Bot Name)
[sportoto-telebot] ✅ Bot başlangıç mesajı gönderildi
[sportoto-telebot] ✅ Bootstrap tamamlandı! Bot aktif ve komutları dinliyor.
```

**Telegram'da şu komutları test edebilirsin:**
- `/start` → Bot bilgisi + Chat ID öğrenme
- `/ping` → Pong yanıtı  
- `/dbtime` → Veritabanı zaman sorgusu
- `/fixtures_today` → Bugünkü Premier League maçları
- `/odds <fixture_id>` → Belirtilen maçın 1X2 bahis oranları
- `/top20` → En iyi comeback takımları (180 gün)
- `/team <takım_adı>` → Takım comeback detay analizi

## 🔧 Sorun Giderme

### API-Sports Rate Limit
- **Günlük limit**: 100 request
- **Kalan quota**: Her API isteğinde loglanır
- **Optimizasyon**: Aynı fixture için kısa sürede tekrar istek yapmayın

### ETIMEDOUT/ENOTFOUND Hatası
Eğer `connect ETIMEDOUT` veya `ENOTFOUND` hatası alırsan:

1. **Supabase Client yaklaşımını kullan** (bu yeni versiyon)
2. **SUPABASE_URL** ve **SUPABASE_ANON_KEY**'in doğru olduğunu kontrol et
3. Internet bağlantını kontrol et
4. Supabase projesinin **Active** durumda olduğunu doğrula

### Yanlış Format Örnekleri ❌
```bash
# YANLIŞ - PostgreSQL connection string (eski yöntem)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# YANLIŞ - Key eksik
SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY eksik
```

### Doğru Format ✅
```bash
SUPABASE_URL=https://wkwqpqixuoucsuqboyxc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # opsiyonel
```

## 📁 Proje Yapısı

```
sportoto-telebot/
├── backend/
│   ├── src/
│   │   ├── index.js           # Ana giriş noktası
│   │   ├── services/db.js     # Database bağlantısı
│   │   └── util/              # Yardımcı dosyalar
│   └── scripts/dbSetup.js     # DB kurulum scripti
├── db/schemas.sql             # Database şemaları
├── .env                       # Ortam değişkenleri
├── .env.example               # Ortam değişkenleri şablonu
└── package.json               # NPM konfigürasyonu
```

## 🎯 Sonraki Adımlar

Bu aşamada comeback puanı sistemi kuruldu. Planlanan özellikler:

- [x] ✅ Telegram Bot entegrasyonu
- [x] ✅ API-Sports veri çekme  
- [x] ✅ Comeback puanı hesaplama sistemi
- [x] ✅ Takım sıralaması ve analiz komutları
- [x] ✅ Günlük otomatik veri güncelleme (cron jobs)
- [ ] Settlement worker iyileştirmesi (events API optimizasyonu)
- [ ] Gerçek bahis sinyali üretimi
- [ ] Kullanıcı yönetimi ve kişisel takip
- [ ] Web dashboard (opsiyonel)

---

**Not:** Bu proje geliştirme aşamasındadır. Herhangi bir sorun yaşarsan `.env` dosyasındaki ayarları tekrar kontrol et.