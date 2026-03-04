import React, { useState, useRef, useEffect } from 'react';
import { Plus, StickyNote, Edit2, Trash2, Search, Tag, Link, Mic, MicOff, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Note, PriorityLevel } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';
import { useLanguage } from '../../contexts/LanguageContext';

const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    priority: 'medium' as PriorityLevel,
    order: '' as number | '',
  });

  // Dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setDictationSupported(!!SpeechRecognition);
  }, []);

  const startDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || 'hu-HU';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript = transcript;
        }
      }
      setNewNote(prev => ({
        ...prev,
        content: prev.content.replace(/\[.*?\]$/, '') + finalTranscript + (interimTranscript ? `[${interimTranscript}]` : '')
      }));
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Clean up interim markers
      setNewNote(prev => ({
        ...prev,
        content: prev.content.replace(/\[.*?\]$/, '').trim()
      }));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleDictation = () => {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  const getPriorityOrder = (p?: PriorityLevel) => {
    switch (p || 'medium') {
      case 'high': return 0;
      case 'medium': return 1;
      case 'low': return 2;
      default: return 1;
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    const matchesPriority = filterPriority === 'all' || (note.priority || 'medium') === filterPriority;
    return matchesSearch && matchesTag && matchesPriority;
  }).sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    const pa = getPriorityOrder(a.priority);
    const pb = getPriorityOrder(b.priority);
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) stopDictation();

    if (editingId) {
      updateNote(editingId, {
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
        priority: newNote.priority,
        order: newNote.order !== '' ? Number(newNote.order) : undefined,
      });
      setEditingId(null);
    } else {
      addNote({
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
        linkedPlans: [],
        priority: newNote.priority,
        order: newNote.order !== '' ? Number(newNote.order) : undefined,
      });
    }

    setNewNote({ title: '', content: '', tags: [], priority: 'medium', order: '' });
    setShowAddForm(false);
  };

  const handleEdit = (note: Note) => {
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags,
      priority: note.priority || 'medium',
      order: note.order !== undefined ? note.order : '',
    });
    setEditingId(note.id);
    setShowAddForm(true);
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setNewNote({ ...newNote, tags });
  };

  const getPriorityIcon = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return <ArrowUp className="text-red-500" size={14} />;
      case 'medium': return <ArrowRight className="text-orange-500" size={14} />;
      case 'low': return <ArrowDown className="text-blue-400" size={14} />;
    }
  };

  const getPriorityBadgeClass = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const getPriorityLabel = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return t('priority.high');
      case 'medium': return t('priority.medium');
      case 'low': return t('priority.low');
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="all">{t('priority.all')}</option>
            <option value="high">{t('priority.high')}</option>
            <option value="medium">{t('priority.medium')}</option>
            <option value="low">{t('priority.low')}</option>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('notes.contentLabel')}
                  </label>
                  {dictationSupported && (
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${isRecording
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse border border-red-300 dark:border-red-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                      {isRecording ? t('notes.stopDictation') : t('notes.startDictation')}
                    </button>
                  )}
                </div>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 ${isRecording ? 'border-red-400 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-900/30' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  rows={8}
                  placeholder={isRecording ? t('notes.dictationActive') : t('notes.contentPlaceholder')}
                  required
                />
                {isRecording && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {t('notes.recording')}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('priority.label')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as PriorityLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setNewNote({ ...newNote, priority: level })}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${newNote.priority === level
                          ? level === 'high'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : level === 'medium'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                        }`}
                    >
                      {level === 'high' && <ArrowUp size={16} />}
                      {level === 'medium' && <ArrowRight size={16} />}
                      {level === 'low' && <ArrowDown size={16} />}
                      {level === 'high' ? t('priority.high') : level === 'medium' ? t('priority.medium') : t('priority.low')}
                    </button>
                  ))}
                </div>
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

              {/* Order / Numbering - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sorszám / Number <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <input
                  type="number"
                  value={newNote.order}
                  onChange={(e) => setNewNote({ ...newNote, order: e.target.value ? parseInt(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  placeholder="E.g., 1"
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
                    if (isRecording) stopDictation();
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewNote({ title: '', content: '', tags: [], priority: 'medium', order: '' });
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
            {searchTerm || selectedTag || filterPriority !== 'all' ? t('notes.noResults') : t('notes.noNotes')}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                      {note.order !== undefined && <span className="text-yellow-500 mr-2">#{note.order}</span>}
                      {note.title}
                    </h3>
                  </div>
                  {/* Priority Badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadgeClass(note.priority)}`}>
                    {getPriorityIcon(note.priority)}
                    {getPriorityLabel(note.priority)}
                  </span>
                </div>
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
