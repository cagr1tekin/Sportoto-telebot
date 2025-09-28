// Logger yardımcı sınıfı - console çıktıları için prefix ekler
const prefix = '[sportoto-telebot]';

module.exports = {
  info: (...a) => console.log(prefix, ...a),
  warn: (...a) => console.warn(prefix, ...a),
  error: (...a) => console.error(prefix, ...a),
  debug: (...a) => console.log(prefix, '🐛', ...a),
};