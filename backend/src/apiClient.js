// API-Sports API client - Fixture ve odds veri çekme servisi
require('dotenv').config();
const axios = require('axios');
const logger = require('./util/logger');

const API_BASE = process.env.API_BASE || 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  logger.error('❌ API_KEY eksik! .env içinde API_KEY ekle');
  process.exit(1);
}

// Axios instance konfigürasyonu
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'x-apisports-key': API_KEY,
    'Accept': 'application/json'
  }
});

// Güvenli GET isteği - hata yönetimi ve logging ile
async function safeGet(path, params = {}) {
  try {
    logger.info(`🌐 API isteği: ${path}`, JSON.stringify(params));
    const response = await api.get(path, { params });
    
    // API quota bilgisini logla
    const remaining = response.headers['x-ratelimit-requests-remaining'];
    if (remaining) {
      logger.info(`📊 Kalan API quota: ${remaining}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.warn(`❌ API hata ${error.response.status}:`, error.response.data);
      
      // Rate limit hatası
      if (error.response.status === 429) {
        logger.error('⚠️ Rate limit aşıldı! API kullanımını azalt.');
      }
    } else {
      logger.warn('❌ API network hatası:', error.message);
    }
    throw error;
  }
}

// Fixture'ları al (tarih, lig, sezon veya ID'lerle filtrelenebilir)
async function getFixtures({ date, league, season, ids } = {}) {
  const params = {};
  if (date) params.date = date; // YYYY-MM-DD formatında
  if (league) params.league = league; // Lig ID (örn: 39 = Premier League)
  if (season) params.season = season; // Sezon (örn: 2023)
  if (ids) params.ids = ids; // Virgülle ayrılmış fixture ID'leri
  
  const data = await safeGet('/fixtures', params);
  return data; // { get, parameters, results, response: [...] } yapısı
}

// Bahis oranlarını al
async function getOdds({ fixture, bookmaker, page } = {}) {
  const params = {};
  if (fixture) params.fixture = fixture; // Fixture ID (zorunlu)
  if (bookmaker) params.bookmaker = bookmaker; // Bookmaker ID
  if (page) params.page = page; // Sayfalama
  
  const data = await safeGet('/odds', params);
  return data;
}

// Lig puan tablosunu al
async function getStandings({ league, season } = {}) {
  const params = {};
  if (league) params.league = league; // Lig ID (zorunlu)
  if (season) params.season = season; // Sezon (zorunlu)
  
  const data = await safeGet('/standings', params);
  return data;
}

// Maç olaylarını al (goller, kartlar vs.)
async function getFixtureEvents({ fixture } = {}) {
  const params = {};
  if (fixture) params.fixture = fixture; // Fixture ID (zorunlu)
  
  const data = await safeGet('/fixtures/events', params);
  return data;
}

// Liglerı al
async function getLeagues({ country, season } = {}) {
  const params = {};
  if (country) params.country = country; // Ülke kodu
  if (season) params.season = season; // Sezon
  
  const data = await safeGet('/leagues', params);
  return data;
}

module.exports = { 
  getFixtures, 
  getOdds, 
  getStandings, 
  getFixtureEvents,
  getLeagues 
};