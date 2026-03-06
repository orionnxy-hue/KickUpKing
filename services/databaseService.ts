import { Friend, UserData, PlayerStats } from "../types";
import { supabase } from "./supabaseClient";

// Key for the "Global" database (Simulating a server fallback)
const DB_STORAGE_KEY = 'kickup_king_global_db_v5';

// Structure of our local simulated database
interface GlobalDatabase {
  users: Record<string, PublicProfile>; // Map userId -> Profile
  usernameMap: Record<string, string>; // Map lowercase_username -> userId
}

export interface PublicProfile {
  userId: string;
  username: string;
  pin?: string; // 4-digit PIN
  highScore: number;
  tokens: number;
  playerLevel: number; // For display
  lastActive: number; // Timestamp of last activity
  inventory?: string[]; // IDs of owned items
  friends?: Friend[]; // SYNCED FRIENDS LIST
  playerLevels?: Record<string, PlayerStats>; // Upgrades
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// Initial Data: Empty to ensure no fake bots
const SEED_DATA: GlobalDatabase = {
  users: {},
  usernameMap: {}
};

class DatabaseService {
  private localDb: GlobalDatabase;
  public lastCloudError: string | null = null; // Public error tracker

  constructor() {
    this.localDb = this.loadLocalDatabase();
  }

  private loadLocalDatabase(): GlobalDatabase {
    const json = localStorage.getItem(DB_STORAGE_KEY);
    if (!json) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    const db = JSON.parse(json);
    return db;
  }

  private saveLocalDatabase() {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.localDb));
  }

  // Helper to ensure local cache is always up to date
  private updateLocalCache(profile: PublicProfile) {
      this.localDb.users[profile.userId] = profile;
      this.localDb.usernameMap[profile.username.toLowerCase()] = profile.userId;
      this.saveLocalDatabase();
  }

  // Helper to format errors meaningfully
  private formatError(e: any): string {
      if (!e) return "Unknown Error";
      
      // Handle native JS Error objects
      if (e instanceof Error) return e.message;
      if (typeof e === 'string') return e;
      
      // Detect Row Level Security (RLS) violation
      if (e.code === '42501' || (e.message && e.message.includes('row-level security'))) {
          return "Database Locked: Run SQL to disable RLS!";
      }

      // Detect Missing Table (Common in new projects)
      if (e.code === '42P01' || (e.message && e.message.includes('relation') && e.message.includes('does not exist'))) {
          return "Missing Tables: Run SQL Script in Supabase!";
      }
      
      // Detect Missing Columns
      if (e.code === '42703' || (e.message && e.message.includes('column'))) {
          return "Schema Mismatch: Missing columns in DB";
      }

      if (e.message) return e.message;
      if (e.error_description) return e.error_description;
      if (e.details) return e.details;
      
      try {
          const json = JSON.stringify(e);
          if (json === '{}') return "Unknown Error (Check Console)";
          return json;
      } catch {
          return "Unknown Error Object";
      }
  }

  // --- PUBLIC API ---

  // 1. Register or Login a User (Supports syncing existing ID)
  public async registerUser(
      username: string, 
      pin?: string, 
      existingId?: string, 
      currentHighScore: number = 0, 
      currentTokens: number = 0, 
      currentInventory: string[] = [], 
      currentLevels: Record<string, PlayerStats> = {},
      currentFriends: Friend[] = [] 
  ): Promise<PublicProfile> {
    const cleanedName = username.trim();
    let uniqueId = existingId;
    let scoreToSave = currentHighScore;
    let tokensToSave = currentTokens;
    let inventoryToSave = currentInventory;
    let levelsToSave = currentLevels;
    let friendsToSave = currentFriends;
    const now = Date.now();

    let resultProfile: PublicProfile | null = null;
    this.lastCloudError = null;

    if (supabase) {
        // Helper to safely upsert profile (handling missing columns)
        const safeUpsert = async (payload: any) => {
            try {
                const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
                if (error) throw error;
                this.lastCloudError = null; // Success
            } catch (e: any) {
                this.lastCloudError = this.formatError(e);
                console.error("Supabase Error during upsert:", e);
                
                // If error is about missing columns, try to strip them
                const fallback = { ...payload };
                let retry = false;
                if (e.message?.includes('tokens') || e.code === '42703') { delete fallback.tokens; retry = true; }
                if (e.message?.includes('pin')) { delete fallback.pin; retry = true; }
                if (e.message?.includes('inventory')) { delete fallback.inventory; retry = true; }
                if (e.message?.includes('player_levels')) { delete fallback.player_levels; retry = true; }
                if (e.message?.includes('friends')) { delete fallback.friends; retry = true; }
                
                if (retry) {
                    try {
                        await supabase.from('profiles').upsert(fallback, { onConflict: 'user_id' });
                        this.lastCloudError = "Partial Save (DB Schema Old)";
                    } catch (retryError: any) {
                        this.lastCloudError = this.formatError(retryError);
                    }
                }
            }
        };

        try {
            // CASE 1: AUTO-LOGIN (Existing ID provided from LocalStorage)
            if (uniqueId) {
                 let existing: any = null;
                 const { data, error } = await supabase
                    .from('profiles')
                    .select('high_score, tokens, pin, inventory, player_levels, friends')
                    .eq('user_id', uniqueId)
                    .single();
                 
                 if (error && error.code !== 'PGRST116') {
                     this.lastCloudError = this.formatError(error);
                 }
                 if (!error) existing = data;

                 if (existing) {
                     scoreToSave = Math.max(existing.high_score || 0, scoreToSave);
                     tokensToSave = Math.max(existing.tokens || 0, tokensToSave);
                     
                     // Merge inventory
                     const remoteInv = existing.inventory || [];
                     inventoryToSave = Array.from(new Set([...currentInventory, ...remoteInv]));
                     
                     // Merge Levels
                     const remoteLevels = existing.player_levels || {};
                     levelsToSave = { ...currentLevels, ...remoteLevels };

                     // Merge Friends
                     const remoteFriends: Friend[] = existing.friends || [];
                     const combinedFriends = [...currentFriends];
                     remoteFriends.forEach(rf => {
                         if (!combinedFriends.some(cf => cf.id === rf.id)) {
                             combinedFriends.push(rf);
                         }
                     });
                     friendsToSave = combinedFriends;
                 }

                 if (scoreToSave > 0 && tokensToSave < scoreToSave * 10) {
                     tokensToSave = scoreToSave * 10;
                 }

                 const payload: any = {
                    user_id: uniqueId,
                    username: cleanedName,
                    high_score: scoreToSave,
                    tokens: tokensToSave,
                    inventory: inventoryToSave,
                    player_levels: levelsToSave,
                    friends: friendsToSave,
                    last_active: new Date().toISOString()
                 };
                 if (pin) payload.pin = pin;

                 await safeUpsert(payload);

                 resultProfile = {
                     userId: uniqueId,
                     username: cleanedName,
                     pin: existing?.pin || pin,
                     highScore: scoreToSave,
                     tokens: tokensToSave,
                     inventory: inventoryToSave,
                     playerLevels: levelsToSave,
                     friends: friendsToSave,
                     playerLevel: 1,
                     lastActive: now
                 };
            }
            // CASE 2: SEARCH BY USERNAME
            else {
                let existingUser: any = null;
                const { data, error } = await supabase
                    .from('profiles')
                    .select('user_id, username, high_score, tokens, pin, inventory, player_levels, friends') 
                    .ilike('username', cleanedName)
                    .order('high_score', { ascending: false }) 
                    .limit(5);
                 
                if (error) this.lastCloudError = this.formatError(error);

                if (!error && data && data.length > 0) {
                     if (pin) {
                         existingUser = data.find((u: any) => u.pin === pin);
                     }
                     if (!existingUser) {
                         existingUser = data[0];
                     }
                }

                if (existingUser) {
                    if (pin && existingUser.pin && existingUser.pin !== pin) {
                        throw new Error("INVALID_PIN");
                    }
                    uniqueId = existingUser.user_id;
                    scoreToSave = Math.max(existingUser.high_score || 0, currentHighScore);
                    tokensToSave = Math.max(existingUser.tokens || 0, currentTokens);
                    const remoteInv = existingUser.inventory || [];
                    inventoryToSave = Array.from(new Set([...currentInventory, ...remoteInv]));
                    const remoteLevels = existingUser.player_levels || {};
                    levelsToSave = { ...currentLevels, ...remoteLevels };
                    const remoteFriends: Friend[] = existingUser.friends || [];
                    const combinedFriends = [...currentFriends];
                    remoteFriends.forEach(rf => {
                        if (!combinedFriends.some(cf => cf.id === rf.id)) {
                            combinedFriends.push(rf);
                        }
                    });
                    friendsToSave = combinedFriends;

                    if (scoreToSave > 0 && tokensToSave < scoreToSave * 10) {
                         tokensToSave = scoreToSave * 10;
                    }

                    const payload: any = {
                        user_id: uniqueId,
                        username: existingUser.username, 
                        high_score: scoreToSave,
                        tokens: tokensToSave,
                        inventory: inventoryToSave,
                        player_levels: levelsToSave,
                        friends: friendsToSave,
                        last_active: new Date().toISOString()
                    };
                    if (pin && !existingUser.pin) payload.pin = pin;

                    await safeUpsert(payload);

                    resultProfile = {
                        userId: uniqueId!,
                        username: existingUser.username,
                        pin: existingUser.pin || pin,
                        highScore: scoreToSave,
                        tokens: tokensToSave,
                        inventory: inventoryToSave,
                        playerLevels: levelsToSave,
                        friends: friendsToSave,
                        playerLevel: 1,
                        lastActive: now
                    };
                } else {
                    // REGISTER NEW
                    uniqueId = `${cleanedName}#${Math.floor(1000 + Math.random() * 9000)}`;
                    const payload = {
                        user_id: uniqueId,
                        username: cleanedName,
                        pin: pin,
                        high_score: scoreToSave,
                        tokens: tokensToSave,
                        inventory: inventoryToSave,
                        player_levels: levelsToSave,
                        friends: friendsToSave,
                        player_level: 1,
                        last_active: new Date().toISOString()
                    };
                    await safeUpsert(payload);

                    resultProfile = {
                        userId: uniqueId,
                        username: cleanedName,
                        pin: pin,
                        highScore: scoreToSave,
                        tokens: tokensToSave,
                        inventory: inventoryToSave,
                        playerLevels: levelsToSave,
                        friends: friendsToSave,
                        playerLevel: 1,
                        lastActive: now
                    };
                }
            }
        } catch (e: any) {
            console.warn("Cloud register failed, falling back to local", e);
            this.lastCloudError = this.formatError(e);
            if (e.message === "INVALID_PIN") throw e;
        }
    }

    // If cloud success, update local cache
    if (resultProfile) {
        this.updateLocalCache(resultProfile);
        return resultProfile;
    }

    // --- LOCAL FALLBACK (Offline Mode) ---
    const lowerName = cleanedName.toLowerCase();
    
    if (uniqueId && this.localDb.users[uniqueId]) {
        const u = this.localDb.users[uniqueId];
        u.lastActive = now;
        u.highScore = Math.max(u.highScore, scoreToSave);
        u.tokens = Math.max(u.tokens || 0, tokensToSave);
        u.inventory = Array.from(new Set([...(u.inventory||[]), ...currentInventory]));
        u.playerLevels = { ...currentLevels, ...(u.playerLevels || {}) };
        
        this.saveLocalDatabase();
        return u;
    }

    if (this.localDb.usernameMap[lowerName]) {
        uniqueId = this.localDb.usernameMap[lowerName];
        const user = this.localDb.users[uniqueId];
        
        if (pin && user.pin && user.pin !== pin) throw new Error("INVALID_PIN");
        if (pin && !user.pin) user.pin = pin;

        user.lastActive = now;
        user.highScore = Math.max(user.highScore, scoreToSave);
        user.tokens = Math.max(user.tokens || 0, tokensToSave);
        user.inventory = Array.from(new Set([...(user.inventory||[]), ...currentInventory]));
        user.playerLevels = { ...currentLevels, ...(user.playerLevels || {}) };

        this.saveLocalDatabase();
        return user;
    }

    // Create New Local
    uniqueId = uniqueId || `${cleanedName}#${Math.floor(1000 + Math.random() * 9000)}`;
    const newProfile: PublicProfile = {
      userId: uniqueId,
      username: cleanedName,
      pin: pin,
      highScore: scoreToSave,
      tokens: tokensToSave,
      inventory: inventoryToSave,
      playerLevels: levelsToSave,
      friends: friendsToSave,
      playerLevel: 1,
      lastActive: now
    };

    this.localDb.users[uniqueId] = newProfile;
    this.localDb.usernameMap[lowerName] = uniqueId;
    this.saveLocalDatabase();

    return newProfile;
  }

  // 2. Update High Score, Tokens, Inventory
  public async updateScore(userId: string, newScore: number, currentTokens: number, localBest: number = 0, inventory: string[] = [], levels: Record<string, PlayerStats> = {}, friends: Friend[] = []) {
    // ALWAYS update local cache first for consistency
    const user = this.localDb.users[userId];
    if (user) {
        if (newScore > user.highScore) user.highScore = newScore;
        user.tokens = currentTokens;
        user.inventory = inventory;
        user.playerLevels = levels;
        user.friends = friends;
        user.lastActive = Date.now();
        this.saveLocalDatabase();
    }

    if (supabase) {
        const updateData: any = { 
            last_active: new Date().toISOString(),
            tokens: currentTokens,
            inventory: inventory,
            player_levels: levels,
            friends: friends // SYNC FRIENDS
        };

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('user_id', userId);
            
            if (error) throw error;
            this.lastCloudError = null;
        } catch (e: any) {
             this.lastCloudError = this.formatError(e);
             const stripped = { ...updateData };
             delete stripped.inventory;
             delete stripped.player_levels;
             delete stripped.friends;
             try {
                await supabase.from('profiles').update(stripped).eq('user_id', userId);
             } catch(err) {
                 console.warn("Failed to sync score to cloud");
             }
        }

        const candidateScore = Math.max(newScore, localBest);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('high_score')
                .eq('user_id', userId)
                .single();

            if (!data || candidateScore > (data.high_score || 0)) {
                 await supabase
                    .from('profiles')
                    .update({ high_score: candidateScore })
                    .eq('user_id', userId);
            }
        } catch (e) {}
    }
  }

  // 3. Search for a friend by Username
  public async searchUser(queryName: string): Promise<Friend | null> {
    const lowerName = queryName.toLowerCase().trim();

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('username', queryName)
                .order('high_score', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                const p = data[0];
                return {
                    id: p.user_id,
                    name: p.username,
                    highScore: p.high_score
                };
            }
        } catch (e) {
             console.warn("Supabase search failed");
        }
    }

    const targetId = this.localDb.usernameMap[lowerName];
    if (!targetId) return null;
    const profile = this.localDb.users[targetId];
    if (!profile) return null;

    return {
      id: profile.userId,
      name: profile.username,
      highScore: profile.highScore
    };
  }

  // 4. Get friends stats
  public async getFriendsLatestStats(friendIds: string[]): Promise<Friend[]> {
    if (friendIds.length === 0) return [];

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', friendIds);
            
            if (!error && data) {
                return data.map((p: any) => ({
                    id: p.user_id,
                    name: p.username,
                    highScore: p.high_score
                }));
            }
        } catch (e) {
            console.warn("Friend stat sync failed");
        }
    }

    return friendIds.map(id => {
      const profile = this.localDb.users[id];
      if (profile) {
        return {
          id: profile.userId,
          name: profile.username,
          highScore: profile.highScore
        };
      }
      return null;
    }).filter(f => f !== null) as Friend[];
  }

  // 5. Keep Alive / Ping / Sync
  public async ping(userId: string): Promise<PublicProfile | null> {
      if (supabase) {
          try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ last_active: new Date().toISOString() })
                .eq('user_id', userId)
                .select('high_score, tokens, inventory, player_levels, friends')
                .single();

            if (error) this.lastCloudError = this.formatError(error);

            if (!error && data) {
                this.lastCloudError = null;
                const p = {
                    userId,
                    username: '',
                    highScore: data.high_score,
                    tokens: data.tokens,
                    inventory: data.inventory,
                    playerLevels: data.player_levels,
                    friends: data.friends,
                    playerLevel: 1,
                    lastActive: Date.now()
                };
                return p;
            }
          } catch (e: any) {
              console.warn("Ping failed");
              this.lastCloudError = this.formatError(e);
          }
      }
      return null;
  }

  // 6. Get Online Users
  public async getOnlineUsers(myUserId?: string, myName?: string, myScore?: number): Promise<Friend[]> {
      const cutoffMs = Date.now() - (2 * 60 * 1000); 
      let result: Friend[] = [];

      if (supabase) {
          try {
              const isoCutoff = new Date(cutoffMs).toISOString();
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .gt('last_active', isoCutoff)
                .order('high_score', { ascending: false })
                 .order('created_at', { ascending: false })
                 .limit(100);

              if (!error && data) {
                  const unique = new Map<string, any>();
                  data.forEach((p: any) => {
                      const lower = p.username.toLowerCase();
                      if (!unique.has(lower)) unique.set(lower, p);
                  });

                  result = Array.from(unique.values()).map((p: any) => ({
                      id: p.user_id,
                      name: p.username,
                      highScore: p.high_score
                  }));
              }
          } catch(e) {
              console.warn("Online users fetch failed");
          }
      } 
      
      // If cloud failed or returned empty (and we have local users), merge/fallback
      if (result.length === 0) {
          const activeProfiles = Object.values(this.localDb.users).filter(u => u.lastActive > cutoffMs);
          result = activeProfiles.sort((a, b) => b.highScore - a.highScore).map(p => ({
              id: p.userId,
              name: p.username,
              highScore: p.highScore
          }));
      }

      if (myUserId && myName) {
          if (!result.some(f => f.id === myUserId)) {
              result.push({
                  id: myUserId,
                  name: myName,
                  highScore: myScore || 0
              });
          }
          result.sort((a, b) => b.highScore - a.highScore);
      }

      return result;
  }

  // 7. Get Global Leaderboard
  public async getGlobalLeaderboard(): Promise<Friend[]> {
      let results: Friend[] = [];
      if (supabase) {
          try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('high_score', { ascending: false })
                 .order('created_at', { ascending: false })
                 .limit(100);

            if (!error && data) {
                const unique = new Map<string, any>();
                data.forEach((p: any) => {
                    const lower = p.username.toLowerCase();
                    if (!unique.has(lower)) {
                        unique.set(lower, p);
                    }
                });
                results = Array.from(unique.values()).map((p: any) => ({
                    id: p.user_id,
                    name: p.username,
                    highScore: p.high_score
                }));
            }
          } catch (e) {
              console.warn("Global LB failed", e);
          }
      }

      // If remote failed OR remote is empty (but we have local data), use local as fallback/fill
      if (results.length === 0) {
          results = Object.values(this.localDb.users)
            .sort((a, b) => b.highScore - a.highScore)
            .slice(0, 50)
            .map(p => ({
                id: p.userId,
                name: p.username,
                highScore: p.highScore
            }));
      }

      return results;
  }

  // 8. Get User Rank
  public async getUserRank(userId: string): Promise<number | null> {
      if (supabase) {
          try {
               const { data: userData } = await supabase
                 .from('profiles')
                 .select('high_score')
                 .eq('user_id', userId)
                 .single();

               if (userData) {
                   const { count, error } = await supabase
                     .from('profiles')
                     .select('*', { count: 'exact', head: true })
                     .gt('high_score', userData.high_score);

                   // If I am the top player, count is 0. 0 + 1 = Rank 1.
                   if (!error && count !== null) {
                       return count + 1;
                   }
               }
          } catch(e) {
              console.warn("Get Rank failed", e);
          }
      }

      // Local Fallback
      const allUsers = Object.values(this.localDb.users).sort((a, b) => b.highScore - a.highScore);
      const index = allUsers.findIndex(u => u.userId === userId);
      return index !== -1 ? index + 1 : 1; // Default to 1 if I am the only one known locally
  }

  // --- FRIEND REQUESTS ---

  public async sendFriendRequest(fromId: string, fromName: string, toId: string): Promise<boolean> {
      if (supabase) {
          try {
              const { data } = await supabase.from('friend_requests')
                .select('*')
                .or(`and(from_user_id.eq.${fromId},to_user_id.eq.${toId}),and(from_user_id.eq.${toId},to_user_id.eq.${fromId})`);
              
              if (data && data.length > 0) return false;

              await supabase.from('friend_requests').insert({
                  from_user_id: fromId,
                  from_username: fromName,
                  to_user_id: toId,
                  status: 'pending'
              });
              return true;
          } catch (e) { return false; }
      }
      return false;
  }

  public async getIncomingRequests(userId: string): Promise<FriendRequest[]> {
       if (supabase) {
           try {
               const { data } = await supabase.from('friend_requests')
                 .select('*')
                 .eq('to_user_id', userId)
                 .eq('status', 'pending');
               return data || [];
           } catch (e) { return []; }
       }
       return [];
  }

   public async getAcceptedSentRequests(userId: string): Promise<FriendRequest[]> {
       if (supabase) {
           try {
               const { data } = await supabase.from('friend_requests')
                 .select('*')
                 .eq('from_user_id', userId)
                 .eq('status', 'accepted');
               return data || [];
           } catch (e) { return []; }
       }
       return [];
  }

  public async respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
      if (supabase) {
          try {
              await supabase.from('friend_requests').update({ status }).eq('id', requestId);
          } catch (e) {}
      }
  }

  public async deleteRequest(requestId: string) {
       if (supabase) {
          try {
              await supabase.from('friend_requests').delete().eq('id', requestId);
          } catch (e) {}
      }
  }

}

export const dbService = new DatabaseService();