import React from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  label = 'Date', 
  className = '' 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    onChange(newDate);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="date"
          value={value.toISOString().split('T')[0]}
          onChange={handleChange}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

export default DatePicker;