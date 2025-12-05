import React, { useState } from 'react';
import { Plus, StickyNote, Edit2, Trash2, Search, Tag, Link } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Note } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';
import { useLanguage } from '../../contexts/LanguageContext';

const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  });

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateNote(editingId, {
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
      });
      setEditingId(null);
    } else {
      addNote({
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
        linkedPlans: [],
      });
    }

    setNewNote({ title: '', content: '', tags: [] });
    setShowAddForm(false);
  };

  const handleEdit = (note: Note) => {
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags,
    });
    setEditingId(note.id);
    setShowAddForm(true);
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setNewNote({ ...newNote, tags });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <StickyNote className="text-yellow-500" size={32} />
              {t('notes.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('notes.subtitle')}
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            {t('notes.newNote')}
          </button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('notes.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">{t('notes.allTags')}</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingId ? t('notes.editNote') : t('notes.createNote')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('notes.titleLabel')}
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  required
                  placeholder={t('notes.createNote')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('notes.contentLabel')}
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  rows={8}
                  placeholder={t('notes.contentPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('notes.tagsLabel')}
                </label>
                <input
                  type="text"
                  value={newNote.tags.join(', ')}
                  onChange={(e) => handleTagInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  placeholder={t('notes.tagsPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingId ? t('common.update') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewNote({ title: '', content: '', tags: [] });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || selectedTag ? t('notes.noResults') : t('notes.noNotes')}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            {t('notes.createFirstNote')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-200 hover:shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                  {note.title}
                </h3>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <LinkifiedText
                  text={note.content}
                  className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-4"
                />
              </div>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium"
                    >
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                <span>
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {note.linkedPlans.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Link size={12} />
                    {note.linkedPlans.length} {t('notes.linked')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesView;