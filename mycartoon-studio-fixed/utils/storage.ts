
import { supabase } from './supabase';
import { Script } from '../types';

// --- USER IDENTIFICATION (ANONYMOUS) ---
// Since we don't have full Auth UI yet, we'll store a random UUID in localStorage
// to simulate a persistent user session.
export const getUserId = (): string => {
    let uid = localStorage.getItem('tooncraft_user_id');
    if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem('tooncraft_user_id', uid);
    }
    return uid;
};

// --- PROFILE MANAGEMENT ---

export interface UserProfile {
    user_id: string;
    wallet: number;
    is_pro: boolean;
    veo_trials: number;
    owned_themes: string[];
    owned_voices: string[];
}

const DEFAULT_PROFILE: UserProfile = {
    user_id: getUserId(),
    wallet: 0,
    is_pro: false,
    veo_trials: 3,
    owned_themes: ['default'],
    owned_voices: ['Kore']
};

export const getUserProfile = async (): Promise<UserProfile> => {
    const userId = getUserId();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching profile:', error);
        return DEFAULT_PROFILE;
    }

    if (!data) {
        // Create new profile if not exists
        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([DEFAULT_PROFILE])
            .select()
            .single();
        
        if (createError) {
            console.error('Error creating profile:', createError);
            return DEFAULT_PROFILE;
        }
        return newProfile;
    }

    return data as UserProfile;
};

export const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const userId = getUserId();
    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
    
    if (error) console.error('Error updating profile:', error);
};

// --- PROJECT MANAGEMENT ---

export const saveProjectToDB = async (project: { id: string, title: string, date: string, script: Script }) => {
    // Ensure the user profile exists before saving (avoids foreign key errors)
    await getUserProfile();
    const userId = getUserId();
    
    // Prepare object for Supabase (exclude 'date' as we use created_at, keep ID if valid UUID or generate new)
    // Note: The app uses timestamp strings for IDs currently, Supabase expects UUIDs.
    // We'll generate a UUID for the DB row but store the original app ID inside the JSON or metadata if needed.
    
    const dbPayload = {
        user_id: userId,
        title: project.title,
        script: project.script,
        // map 'date' to created_at if possible, otherwise rely on DB default
    };

    const { error } = await supabase
        .from('projects')
        .insert([dbPayload]);

    if (error) {
        console.error('Error saving project:', error);
        throw error;
    }
};

export const getProjectsFromDB = async (): Promise<any[]> => {
    const userId = getUserId();
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return [];
    }

    // Map back to app format
    return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString(),
        script: p.script
    }));
};

export const deleteProjectFromDB = async (id: string) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) console.error('Error deleting project:', error);
};
