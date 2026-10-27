// Premier League Season ID Mapping (2010-2025)
// Format: "YYYY-YY" -> { id: "mackolik_season_id", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }

export interface SeasonInfo {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
}

export const PREMIER_LEAGUE_SEASONS: { [key: string]: SeasonInfo } = {
  // 2025-26 Season (Future)
  "2025-26": {
    id: "70421",
    startDate: "2025-08-15",
    endDate: "2026-05-24", 
    name: "Premier League 2025-26"
  },
  
  // 2024-25 Season (Current)
  "2024-25": {
    id: "67180",
    startDate: "2024-08-16",
    endDate: "2025-05-25", 
    name: "Premier League 2024-25"
  },
  
  // 2023-24 Season
  "2023-24": {
    id: "63837",
    startDate: "2023-08-12",
    endDate: "2024-05-19",
    name: "Premier League 2023-24"
  },
  
  // 2022-23 Season
  "2022-23": {
    id: "61588",
    startDate: "2022-08-06",
    endDate: "2023-05-28",
    name: "Premier League 2022-23"
  },
  
  // 2021-22 Season
  "2021-22": {
    id: "57134",
    startDate: "2021-08-13",
    endDate: "2022-05-22",
    name: "Premier League 2021-22"
  },
  
  // 2020-21 Season (COVID affected)
  "2020-21": {
    id: "53735",
    startDate: "2020-09-12",
    endDate: "2021-05-23",
    name: "Premier League 2020-21"
  },
  
  // 2019-20 Season (COVID affected)
  "2019-20": {
    id: "54669",
    startDate: "2019-08-09",
    endDate: "2020-07-26",
    name: "Premier League 2019-20"
  },
  
  // 2018-19 Season
  "2018-19": {
    id: "51549",
    startDate: "2018-08-11",
    endDate: "2019-05-12",
    name: "Premier League 2018-19"
  },
  
  // 2017-18 Season
  "2017-18": {
    id: "46989",
    startDate: "2017-08-12",
    endDate: "2018-05-13",
    name: "Premier League 2017-18"
  },
  
  // 2016-17 Season
  "2016-17": {
    id: "41763",
    startDate: "2016-08-13",
    endDate: "2017-05-21",
    name: "Premier League 2016-17"
  },
  
  // 2015-16 Season
  "2015-16": {
    id: "34827",
    startDate: "2015-08-08",
    endDate: "2016-05-15",
    name: "Premier League 2015-16"
  },
  
  // 2014-15 Season
  "2014-15": {
    id: "34063",
    startDate: "2014-08-16",
    endDate: "2015-05-24",
    name: "Premier League 2014-15"
  },
  
  // 2013-14 Season
  "2013-14": {
    id: "30859",
    startDate: "2013-08-17",
    endDate: "2014-05-11",
    name: "Premier League 2013-14"
  },
  
  // 2012-13 Season
  "2012-13": {
    id: "27679",
    startDate: "2012-08-18",
    endDate: "2013-05-19",
    name: "Premier League 2012-13"
  },
  
  // 2011-12 Season
  "2011-12": {
    id: "24523",
    startDate: "2011-08-13",
    endDate: "2012-05-13",
    name: "Premier League 2011-12"
  },
  
  // 2010-11 Season
  "2010-11": {
    id: "21391",
    startDate: "2010-08-14",
    endDate: "2011-05-22",
    name: "Premier League 2010-11"
  }
};

/**
 * Match tarihinden season bilgisini döndürür
 * @param matchDate - Maç tarihi (YYYY-MM-DD formatında)
 * @returns Season bilgisi veya null
 */
export function getSeasonFromDate(matchDate: string): SeasonInfo | null {
  const date = new Date(matchDate);
  
  for (const seasonInfo of Object.values(PREMIER_LEAGUE_SEASONS)) {
    const startDate = new Date(seasonInfo.startDate);
    const endDate = new Date(seasonInfo.endDate);
    
    if (date >= startDate && date <= endDate) {
      return seasonInfo;
    }
  }
  
  return null;
}

/**
 * Season adından season bilgisini döndürür
 * @param seasonName - Season adı (örn: "2023-24")
 * @returns Season bilgisi veya null
 */
export function getSeasonByName(seasonName: string): SeasonInfo | null {
  return PREMIER_LEAGUE_SEASONS[seasonName] || null;
}

/**
 * Tüm mevcut sezonların listesini döndürür
 * @returns Season adları dizisi
 */
export function getAllSeasons(): string[] {
  return Object.keys(PREMIER_LEAGUE_SEASONS).sort().reverse(); // En yeni ilk
}

/**
 * Mackolik season ID'sinden season bilgisini döndürür
 * @param seasonId - Mackolik season ID'si
 * @returns Season bilgisi veya null
 */
export function getSeasonById(seasonId: string): SeasonInfo | null {
  for (const seasonInfo of Object.values(PREMIER_LEAGUE_SEASONS)) {
    if (seasonInfo.id === seasonId) {
      return seasonInfo;
    }
  }
  return null;
}