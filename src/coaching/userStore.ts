// Defensive storage layer.
// Goal: the app must NEVER crash because the AsyncStorage native module isn't
// in the current dev-client binary. We lazily require it; if it's missing or
// throws (e.g. you added it but haven't rebuilt the dev client yet), we fall
// back to an in-memory store. Persistence "just works" once you rebuild.
let NativeAsyncStorage: {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  NativeAsyncStorage = null;
}

const memoryStore: Record<string, string> = {};
let warnedOnce = false;
function warnFallback() {
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn(
      '[userStore] AsyncStorage native module unavailable — using in-memory storage. ' +
        'Progress will not persist across restarts until you rebuild the dev client (eas build).'
    );
  }
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (NativeAsyncStorage) {
      try {
        return await NativeAsyncStorage.getItem(key);
      } catch {
        warnFallback();
      }
    } else {
      warnFallback();
    }
    return key in memoryStore ? memoryStore[key] : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (NativeAsyncStorage) {
      try {
        await NativeAsyncStorage.setItem(key, value);
        return;
      } catch {
        warnFallback();
      }
    } else {
      warnFallback();
    }
    memoryStore[key] = value;
  },
  async removeItem(key: string): Promise<void> {
    if (NativeAsyncStorage) {
      try {
        await NativeAsyncStorage.removeItem(key);
        return;
      } catch {
        warnFallback();
      }
    } else {
      warnFallback();
    }
    delete memoryStore[key];
  },
};

export interface UserProfile {
  hasCompletedOnboarding: boolean;
  startingLevel: 'feet' | 'v_shape' | 'wall' | 'air' | null;
  biggestStruggle: 'fear' | 'pain' | 'banana' | 'new' | null;
  practiceEnvironment: 'home' | 'gym' | 'outdoors' | null;
  weeklyCommitment: 'casual' | 'consistent' | 'obsessed' | null;
  recommendedStepId: number;
  completedSteps: number[]; // e.g. [1, 2]
  personalRecords: Record<number, number>; // stepId -> bestHoldTimeSeconds
  theme: 'light' | 'dark';
  godMode: boolean;
}

const STORAGE_KEY = '@handstand_coach_profile_v1';

export const DEFAULT_PROFILE: UserProfile = {
  hasCompletedOnboarding: false,
  startingLevel: null,
  biggestStruggle: null,
  practiceEnvironment: null,
  weeklyCommitment: null,
  recommendedStepId: 0,
  completedSteps: [],
  personalRecords: {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
  },
  theme: 'dark',
  godMode: false,
};

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const data = await storage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Merge with default profile to handle potential schema updates
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        personalRecords: {
          ...DEFAULT_PROFILE.personalRecords,
          ...(parsed.personalRecords || {}),
        },
      };
    }
  } catch (error) {
    console.error('[userStore] Failed to load profile:', error);
  }
  return DEFAULT_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('[userStore] Failed to save profile:', error);
    return false;
  }
}

export async function completeStep(stepId: number): Promise<UserProfile> {
  const profile = await loadUserProfile();
  if (!profile.completedSteps.includes(stepId)) {
    profile.completedSteps = [...profile.completedSteps, stepId].sort((a, b) => a - b);
    await saveUserProfile(profile);
  }
  return profile;
}

export async function updatePR(stepId: number, timeInSeconds: number): Promise<{ profile: UserProfile; isNewPR: boolean }> {
  const profile = await loadUserProfile();
  const currentPR = profile.personalRecords[stepId] || 0;
  if (timeInSeconds > currentPR) {
    profile.personalRecords[stepId] = timeInSeconds;
    await saveUserProfile(profile);
    return { profile, isNewPR: true };
  }
  return { profile, isNewPR: false };
}

export async function resetStore(): Promise<UserProfile> {
  try {
    await storage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[userStore] Reset failed:', e);
  }
  return DEFAULT_PROFILE;
}
