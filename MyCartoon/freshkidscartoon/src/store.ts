import { create } from 'zustand';
import { AppState, Script, GenerationProgress } from './types';

export interface Project {
  id: string;
  title: string;
  date: string;
  script: Script;
}

interface AppStore {
  appState: AppState;
  setAppState: (state: AppState) => void;
  
  script: Script | null;
  setScript: (script: Script | null) => void;
  
  progress: GenerationProgress;
  setProgress: (progress: GenerationProgress | ((prev: GenerationProgress) => GenerationProgress)) => void;
  
  savedProjects: Project[];
  setSavedProjects: (projects: Project[]) => void;
  
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  
  userAge: number | null;
  setUserAge: (age: number | null) => void;
  
  sceneCount: number;
  setSceneCount: (count: number) => void;
  
  isMovieMode: boolean;
  setIsMovieMode: (isMovie: boolean) => void;
  
  lastStoryContext: string | null;
  setLastStoryContext: (context: string | null) => void;
  
  isPro: boolean;
  setIsPro: (isPro: boolean) => void;
  
  veoTrials: number;
  setVeoTrials: (trials: number) => void;
  
  wallet: number;
  setWallet: (wallet: number) => void;
  
  currentThemeId: string;
  setCurrentThemeId: (id: string) => void;
  
  ownedThemes: string[];
  setOwnedThemes: (themes: string[]) => void;
  
  currentVoiceId: string;
  setCurrentVoiceId: (id: string) => void;
  
  ownedVoices: string[];
  setOwnedVoices: (voices: string[]) => void;
  
  clientSecret: string;
  setClientSecret: (secret: string) => void;

  isIntermission: boolean;
  setIsIntermission: (is: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  appState: AppState.HOME,
  setAppState: (appState) => set({ appState }),
  
  script: null,
  setScript: (script) => set({ script }),
  
  progress: { status: 'scripting', currentScene: 0, totalScenes: 0, message: '', scenesReady: 0 },
  setProgress: (progress) => set((state) => ({
    progress: typeof progress === 'function' ? progress(state.progress) : progress
  })),
  
  savedProjects: [],
  setSavedProjects: (savedProjects) => set({ savedProjects }),
  
  errorMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  
  showSubscriptionModal: false,
  setShowSubscriptionModal: (showSubscriptionModal) => set({ showSubscriptionModal }),
  
  userAge: null,
  setUserAge: (userAge) => set({ userAge }),
  
  sceneCount: 4,
  setSceneCount: (sceneCount) => set({ sceneCount }),
  
  isMovieMode: false,
  setIsMovieMode: (isMovieMode) => set({ isMovieMode }),
  
  lastStoryContext: null,
  setLastStoryContext: (lastStoryContext) => set({ lastStoryContext }),
  
  isPro: false,
  setIsPro: (isPro) => set({ isPro }),
  
  veoTrials: 3,
  setVeoTrials: (veoTrials) => set({ veoTrials }),
  
  wallet: 0,
  setWallet: (wallet) => set({ wallet }),
  
  currentThemeId: 'default',
  setCurrentThemeId: (currentThemeId) => set({ currentThemeId }),
  
  ownedThemes: ['default'],
  setOwnedThemes: (ownedThemes) => set({ ownedThemes }),
  
  currentVoiceId: 'Kore',
  setCurrentVoiceId: (currentVoiceId) => set({ currentVoiceId }),
  
  ownedVoices: ['Kore'],
  setOwnedVoices: (ownedVoices) => set({ ownedVoices }),
  
  clientSecret: '',
  setClientSecret: (clientSecret) => set({ clientSecret }),

  isIntermission: false,
  setIsIntermission: (isIntermission) => set({ isIntermission }),
}));
