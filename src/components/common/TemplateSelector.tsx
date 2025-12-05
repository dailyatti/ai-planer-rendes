import React from 'react';
import { X, Plus } from 'lucide-react';
import { taskTemplates, TaskTemplate } from '../../data/taskTemplates';

interface TemplateSelectorProps {
  onClose: () => void;
  onSelectTemplate: (template: TaskTemplate) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onClose, onSelectTemplate }) => {
  const categories = ['all', 'work', 'personal', 'health', 'creative', 'learning'] as const;
  const [selectedCategory, setSelectedCategory] = React.useState<typeof categories[number]>('all');

  const filteredTemplates = selectedCategory === 'all'
    ? taskTemplates
    : taskTemplates.filter(t => t.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'work': return 'bg-blue-500';
      case 'personal': return 'bg-purple-500';
      case 'health': return 'bg-green-500';
      case 'creative': return 'bg-pink-500';
      case 'learning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Templates</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose a template to quickly create tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {template.description}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{template.tasks.length} tasks</span>
                    <button className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium">
                      <Plus size={16} />
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;

