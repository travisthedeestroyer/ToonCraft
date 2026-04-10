import { supabase } from './supabase';

const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const getUserId = async () => {
  let id = localStorage.getItem('mycartoon_userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mycartoon_userId', id);
  }
  return id;
};

export const saveProjectToDB = async (project: any) => {
  const userId = await getUserId();
  
  if (!isSupabaseConfigured) {
    const projects = JSON.parse(localStorage.getItem('tooncraft_projects') || '[]');
    projects.unshift({ ...project, user_id: userId, created_at: new Date().toISOString() });
    localStorage.setItem('mycartoon_projects', JSON.stringify(projects.slice(0, 20)));
    return;
  }

  const { error } = await supabase
    .from('projects')
    .insert({
      id: project.id,
      user_id: userId,
      title: project.title,
      script: project.script
    });
  if (error) throw error;
};

export const getProjectsFromDB = async () => {
  const userId = await getUserId();
  
  if (!isSupabaseConfigured) {
    const projects = JSON.parse(localStorage.getItem('tooncraft_projects') || '[]');
    return projects.map((p: any) => ({
      id: p.id,
      title: p.title,
      date: new Date(p.created_at).toLocaleDateString(),
      script: p.script
    }));
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return data.map(p => ({
    id: p.id,
    title: p.title,
    date: new Date(p.created_at).toLocaleDateString(),
    script: p.script
  }));
};
