import * as SQLite from 'expo-sqlite';
import { type HealthcareFacility } from './HealthcareDiscovery';

export class HealthcareCacheService {
  private db: SQLite.SQLiteDatabase | null = null;
  private memoryCache: HealthcareFacility[] = [];

  public async loadCache(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('healthcare.db');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS facilities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          address TEXT NOT NULL,
          phone TEXT,
          isOpen INTEGER,
          rating REAL,
          cachedAt INTEGER,
          lastVerifiedAt INTEGER,
          expiresAt INTEGER
        );
      `);

      const result = await this.db.getAllAsync<any>('SELECT * FROM facilities');

      this.memoryCache = result.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        location: { lat: row.lat, lon: row.lon },
        address: row.address,
        phone: row.phone,
        isOpen: row.isOpen === 1,
        rating: row.rating,
        cachedAt: row.cachedAt,
        lastVerifiedAt: row.lastVerifiedAt,
        expiresAt: row.expiresAt,
      }));

      console.log(`[HealthcareCache] Loaded ${this.memoryCache.length} facilities from SQLite.`);
    } catch (e) {
      console.error('[HealthcareCache] Failed to load cache from SQLite:', e);
      this.memoryCache = [];
    }
  }

  public async saveFacilities(facilities: HealthcareFacility[]): Promise<void> {
    try {
      if (!this.db) {
        this.db = await SQLite.openDatabaseAsync('healthcare.db');
      }

      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      // Update memory cache
      const newMap = new Map<string, HealthcareFacility>();
      this.memoryCache.forEach((f) => newMap.set(f.id, f));

      facilities.forEach((f) => {
        const enriched: HealthcareFacility = {
          ...f,
          cachedAt: now,
          lastVerifiedAt: now,
          expiresAt: now + SEVEN_DAYS_MS,
        };
        newMap.set(f.id, enriched);
      });

      this.memoryCache = Array.from(newMap.values());

      // Update SQLite DB
      const statement = await this.db.prepareAsync(`
        INSERT OR REPLACE INTO facilities 
        (id, name, type, lat, lon, address, phone, isOpen, rating, cachedAt, lastVerifiedAt, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const f of facilities) {
        await statement.executeAsync([
          f.id,
          f.name,
          f.type,
          f.location.lat,
          f.location.lon,
          f.address,
          f.phone || null,
          f.isOpen ? 1 : 0,
          f.rating || null,
          now,
          now,
          now + SEVEN_DAYS_MS,
        ]);
      }

      await statement.finalizeAsync();

      console.log(`[HealthcareCache] Saved ${facilities.length} facilities to SQLite.`);
    } catch (e) {
      console.error('[HealthcareCache] Failed to save facilities to SQLite:', e);
    }
  }

  public getNearestOffline(
    lat: number,
    lon: number,
    radiusMeters: number = 10000,
  ): HealthcareFacility[] {
    const toRad = (value: number) => (value * Math.PI) / 180;

    return this.memoryCache
      .map((f) => {
        const R = 6371e3; // Earth radius in meters
        const dLat = toRad(f.location.lat - lat);
        const dLon = toRad(f.location.lon - lon);
        const lat1 = toRad(lat);
        const lat2 = toRad(f.location.lat);

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...f, distanceMeter: distance };
      })
      .filter((f) => f.distanceMeter !== undefined && f.distanceMeter <= radiusMeters)
      .sort((a, b) => (a.distanceMeter || 0) - (b.distanceMeter || 0));
  }
}

export const HealthcareCache = new HealthcareCacheService();
