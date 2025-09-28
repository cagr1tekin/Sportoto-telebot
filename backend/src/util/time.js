// Zaman yardımcı fonksiyonları - Istanbul timezone varsayımı için process.env.TZ='Europe/Istanbul' kullanıyoruz
const now = () => new Date();

module.exports = { now };