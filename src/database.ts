import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
const pino = require('pino');

// Load environment variables
dotenv.config();

const logger = pino({
  level: 'info',
  name: 'database'
});

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  query_timeout?: number;
}

export class Database {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config?: DatabaseConfig) {
    this.config = config || this.getDefaultConfig();
    this.pool = new Pool(this.config);
    
    // Set up error handling
    this.pool.on('error', (err: any) => {
      logger.error('Unexpected error on idle client:', err);
    });
  }

  private getDefaultConfig(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;
    
    if (databaseUrl) {
      return {
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 120000, // 2 minutes 
        connectionTimeoutMillis: 60000, // 60 seconds
        query_timeout: 60000, // 60 seconds
      };
    }

    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'sportoto',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  /**
   * Get a client from the pool for a single query with retry logic
   */
  async query(text: string, params?: any[], maxRetries: number = 2): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      try {
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        logger.info(`Query executed in ${duration}ms (attempt ${attempt}/${maxRetries})`, { text: text.substring(0, 100), duration, rows: res.rowCount } as any);
        return res;
      } catch (error: any) {
        const duration = Date.now() - start;
        lastError = error;
        logger.warn(`Database query attempt ${attempt}/${maxRetries} failed after ${duration}ms:`, { text: text.substring(0, 100), params, error: error.message } as any);
        
        if (attempt < maxRetries) {
          const backoffTime = Math.min(500 * Math.pow(2, attempt - 1), 2000); // Exponential backoff, max 2s
          logger.info(`Retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    logger.error('Database query failed after all retries:', { text: text.substring(0, 100), params, error: lastError.message } as any);
    throw lastError;
  }

  /**
   * Get a client from the pool for multiple operations (transactions)
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connections closed');
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      logger.info('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error: any) {
      logger.error('Database connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get pool information
   */
  getPoolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Singleton instance
let databaseInstance: Database | null = null;

export function getDatabase(config?: DatabaseConfig): Database {
  if (!databaseInstance) {
    databaseInstance = new Database(config);
  }
  return databaseInstance;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (databaseInstance) {
    await databaseInstance.close();
    databaseInstance = null;
  }
}

// Pattern calculation utility function
export function calculateMatchPattern(htHome?: number, htAway?: number, ftHome?: number, ftAway?: number): string {
  if (htHome === undefined || htAway === undefined || ftHome === undefined || ftAway === undefined) {
    return 'IYXMSX'; // X for unknown
  }

  let iyResult: string;
  let msResult: string;

  // İlk Yarı (Half Time) result
  if (htHome > htAway) {
    iyResult = '1';
  } else if (htHome < htAway) {
    iyResult = '2';
  } else {
    iyResult = 'X';
  }

  // Maç Sonu (Full Time) result
  if (ftHome > ftAway) {
    msResult = '1';
  } else if (ftHome < ftAway) {
    msResult = '2';
  } else {
    msResult = 'X';
  }

  return `IY${iyResult}MS${msResult}`;
}

// Utility functions for common database operations
export const db = {
  // Teams operations
  async createTeam(name: string, nameCanonical: string) {
    const query = 'INSERT INTO teams (name, name_canonical) VALUES ($1, $2) RETURNING *';
    return await getDatabase().query(query, [name, nameCanonical]);
  },

  async findTeamByCanonicalName(nameCanonical: string) {
    const query = 'SELECT * FROM teams WHERE name_canonical = $1';
    const result = await getDatabase().query(query, [nameCanonical]);
    return result.rows[0] || null;
  },

  // Competitions operations
  async createCompetition(country: string, name: string) {
    const query = 'INSERT INTO competitions (country, name) VALUES ($1, $2) ON CONFLICT (country, name) DO NOTHING RETURNING *';
    return await getDatabase().query(query, [country, name]);
  },

  async findCompetition(country: string, name: string) {
    const query = 'SELECT * FROM competitions WHERE country = $1 AND name = $2';
    const result = await getDatabase().query(query, [country, name]);
    return result.rows[0] || null;
  },

  // Seasons operations
  async createSeason(competitionId: number, label: string) {
    const query = 'INSERT INTO seasons (competition_id, label) VALUES ($1, $2) ON CONFLICT (competition_id, label) DO NOTHING RETURNING *';
    return await getDatabase().query(query, [competitionId, label]);
  },

  // Matches operations
  async createMatch(matchData: {
    competitionId: number;
    seasonId: number;
    week?: number;
    matchDate: Date;
    homeTeamId: number;
    awayTeamId: number;
    htHome?: number;
    htAway?: number;
    ftHome?: number;
    ftAway?: number;
    sourceUrl?: string;
    pattern?: string; // Add pattern field
  }) {
    // Calculate pattern if not provided
    const pattern = matchData.pattern || calculateMatchPattern(
      matchData.htHome, 
      matchData.htAway, 
      matchData.ftHome, 
      matchData.ftAway
    );

    const query = `
      INSERT INTO matches 
      (competition_id, season_id, week, match_date, home_team_id, away_team_id, ht_home, ht_away, ft_home, ft_away, source_url, pattern)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (season_id, match_date, home_team_id, away_team_id) 
      DO UPDATE SET
        ht_home = EXCLUDED.ht_home,
        ht_away = EXCLUDED.ht_away,
        ft_home = EXCLUDED.ft_home,
        ft_away = EXCLUDED.ft_away,
        week = EXCLUDED.week,
        source_url = EXCLUDED.source_url,
        pattern = EXCLUDED.pattern
      RETURNING *
    `;
    return await getDatabase().query(query, [
      matchData.competitionId,
      matchData.seasonId,
      matchData.week,
      matchData.matchDate,
      matchData.homeTeamId,
      matchData.awayTeamId,
      matchData.htHome,
      matchData.htAway,
      matchData.ftHome,
      matchData.ftAway,
      matchData.sourceUrl,
      pattern
    ]);
  },

  // Odds operations
  async insertOdds(matchId: number, marketId: number, outcomeId: number, value: number) {
    const query = `
      INSERT INTO odds (match_id, market_id, outcome_id, value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_id, market_id, outcome_id, value, snapshot_at) DO NOTHING
      RETURNING *
    `;
    return await getDatabase().query(query, [matchId, marketId, outcomeId, value]);
  },

  // Scraping runs operations
  async createScrapingRun(sourceUrl?: string, notes?: string) {
    const query = 'INSERT INTO scraping_runs (source_url, notes) VALUES ($1, $2) RETURNING *';
    return await getDatabase().query(query, [sourceUrl, notes]);
  },

  async updateScrapingRun(id: number, updates: {
    status?: 'running' | 'completed' | 'failed';
    matchesScraped?: number;
    oddsScraped?: number;
    errorsCount?: number;
    errorDetails?: any;
    completedAt?: Date;
  }) {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setParts.push(`${dbKey} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return null;

    const query = `UPDATE scraping_runs SET ${setParts.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);

    return await getDatabase().query(query, values);
  }
};

export default Database;