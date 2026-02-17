import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface Note {
  id: number;
  title: string;
}

export const NotesDemo: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*');

        if (error) throw error;
        setNotes(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  if (loading) return <div className="p-4">Loading notes...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 mt-4">
      <h2 className="text-xl font-bold mb-4 text-white">Supabase Notes</h2>
      {notes.length === 0 ? (
        <p className="text-gray-300">No notes found. Try adding some in the Supabase SQL editor!</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="text-gray-200 bg-black/20 p-2 rounded">
              {note.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
