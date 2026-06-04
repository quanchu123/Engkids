'use client';

import { useState } from 'react';
import { LEVEL_OPTIONS, TOPICS, AGE_GROUP_OPTIONS } from '@/config/constants';

// Topic colors matching VideoCard
const TOPIC_STYLES: Record<string, { bg: string; activeBg: string }> = {
  'Animals': { bg: 'bg-amber-50 hover:bg-amber-100', activeBg: 'bg-amber-200 ring-2 ring-amber-400' },
  'Food': { bg: 'bg-red-50 hover:bg-red-100', activeBg: 'bg-red-200 ring-2 ring-red-400' },
  'Nature': { bg: 'bg-green-50 hover:bg-green-100', activeBg: 'bg-green-200 ring-2 ring-green-400' },
  'Family': { bg: 'bg-pink-50 hover:bg-pink-100', activeBg: 'bg-pink-200 ring-2 ring-pink-400' },
  'School': { bg: 'bg-blue-50 hover:bg-blue-100', activeBg: 'bg-blue-200 ring-2 ring-blue-400' },
  'Adventure': { bg: 'bg-purple-50 hover:bg-purple-100', activeBg: 'bg-purple-200 ring-2 ring-purple-400' },
  'Friendship': { bg: 'bg-rose-50 hover:bg-rose-100', activeBg: 'bg-rose-200 ring-2 ring-rose-400' },
  'Science': { bg: 'bg-cyan-50 hover:bg-cyan-100', activeBg: 'bg-cyan-200 ring-2 ring-cyan-400' },
  'Daily Life': { bg: 'bg-orange-50 hover:bg-orange-100', activeBg: 'bg-orange-200 ring-2 ring-orange-400' },
  'History': { bg: 'bg-yellow-50 hover:bg-yellow-100', activeBg: 'bg-yellow-200 ring-2 ring-yellow-400' },
};

export interface VideoFiltersState {
  search: string;
  level: string | null;
  topic: string | null;
  ageGroup: string | null;
}

interface VideoFiltersProps {
  filters: VideoFiltersState;
  onFiltersChange: (filters: VideoFiltersState) => void;
  showSearch?: boolean;
  showLevel?: boolean;
  showTopics?: boolean;
  showAge?: boolean;
}

export default function VideoFilters({
  filters,
  onFiltersChange,
  showSearch = true,
  showLevel = true,
  showTopics = true,
  showAge = true,
}: VideoFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof VideoFiltersState, value: string | null) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      level: null,
      topic: null,
      ageGroup: null,
    });
  };

  const hasActiveFilters = filters.level || filters.topic || filters.ageGroup || filters.search;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-kid p-4 md:p-6 space-y-4">
      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm video yêu thích..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border-2 border-kid-purple/20 focus:border-kid-purple focus:ring-4 focus:ring-kid-purple/20 outline-none transition-all text-gray-700 placeholder-gray-400 font-medium"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Filter Toggle for Mobile */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full py-2 px-4 bg-gradient-to-r from-kid-pink to-kid-purple text-white rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <span>Bộ lọc {hasActiveFilters ? `(${[filters.level, filters.topic, filters.ageGroup].filter(Boolean).length})` : ''}</span>
        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Filters Container */}
      <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {/* Level Filter */}
        {showLevel && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
              Cấp độ
            </h4>
            <div className="flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => updateFilter('level', filters.level === level.value ? null : level.value)}
                  className={`
                    px-4 py-2 rounded-xl font-semibold transition-all duration-200
                    flex items-center gap-2
                    ${filters.level === level.value
                      ? 'bg-gradient-to-r from-kid-green to-kid-blue text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
                    }
                  `}
                >
                  <span>{level.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topics Filter */}
        {showTopics && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
              Chủ đề
            </h4>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const style = TOPIC_STYLES[topic] || { bg: 'bg-gray-50', activeBg: 'bg-gray-200' };
                const isActive = filters.topic === topic;
                return (
                  <button
                    key={topic}
                    onClick={() => updateFilter('topic', isActive ? null : topic)}
                    className={`
                      px-3 py-1.5 rounded-full font-medium transition-all duration-200
                      text-sm
                      ${isActive ? style.activeBg : style.bg}
                      ${isActive ? 'scale-105 shadow-md' : 'hover:scale-102'}
                    `}
                  >
                    <span>{topic}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Age Group Filter */}
        {showAge && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
              Độ tuổi
            </h4>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUP_OPTIONS.map((age) => (
                <button
                  key={age.value}
                  onClick={() => updateFilter('ageGroup', filters.ageGroup === age.value ? null : age.value)}
                  className={`
                    px-4 py-2 rounded-xl font-semibold transition-all duration-200
                    flex items-center gap-2
                    ${filters.ageGroup === age.value
                      ? 'bg-gradient-to-r from-kid-orange to-kid-pink text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
                    }
                  `}
                >
                  <span>{age.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}
