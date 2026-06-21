'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface WordData {
  word: string;
  pronunciation?: string;
  meaning_vi: string;
  meaning_en?: string;
  part_of_speech?: string;
  example?: string;
  example_vi?: string;
}

interface DraggablePopupProps {
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
  onClose: () => void;
  title: string;
  headerGradient: string;
}

// Draggable Popup Wrapper
function DraggablePopup({ children, initialPosition, onClose, title, headerGradient }: DraggablePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Adjust initial position to stay within viewport
    const adjustedX = Math.min(Math.max(initialPosition.x - 180, 10), window.innerWidth - 380);
    const adjustedY = Math.min(Math.max(initialPosition.y + 10, 10), window.innerHeight - 450);
    setPosition({ x: adjustedX, y: adjustedY });
  }, [initialPosition]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (popupRef.current) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.min(Math.max(e.clientX - dragOffset.x, 0), window.innerWidth - 370);
        const newY = Math.min(Math.max(e.clientY - dragOffset.y, 0), window.innerHeight - 100);
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={popupRef}
        className="absolute w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          animation: 'popIn 0.2s ease-out'
        }}
      >
        {/* Draggable Header */}
        <div 
          className={`${headerGradient} px-4 py-3 cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{title}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white text-lg transition-colors"
            >
              ×
            </button>
          </div>
          <div className="text-white/60 text-xs mt-1 flex items-center gap-1">
            <span>⋮⋮</span> Kéo để di chuyển
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
      
      <style jsx global>{`
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

// Word Lookup Popup
interface WordPopupContentProps {
  word: string;
  onSaveWord: (word: WordData) => void;
  onClose: () => void;
}

function WordPopupContent({ word, onSaveWord, onClose }: WordPopupContentProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WordData | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchWordData = async () => {
      setLoading(true);
      setError('');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: word, mode: 'word' }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const result = await res.json();
        
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Timeout - thử lại sau');
        } else {
          setError('Không thể tra từ');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWordData();
  }, [word]);

  const handleSave = () => {
    if (data) {
      onSaveWord(data);
      setSaved(true);
      setTimeout(onClose, 600);
    }
  };

  return (
    <div className="p-4 max-h-[350px] overflow-y-auto">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-300 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-slate-500 text-sm">Đang tra từ...</span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <div className="text-red-500">{error}</div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          {/* Word & Pronunciation */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-800">{data.word}</span>
            {data.pronunciation && (
              <span className="text-slate-500 text-sm">/{data.pronunciation}/</span>
            )}
            {data.part_of_speech && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {data.part_of_speech}
              </span>
            )}
          </div>

          {/* Vietnamese meaning */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
              <span>🇻🇳</span> TIẾNG VIỆT
            </div>
            <div className="text-xl font-bold text-slate-800">{data.meaning_vi}</div>
          </div>

          {/* English meaning */}
          {data.meaning_en && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
                <span>🇬🇧</span> ENGLISH
              </div>
              <div className="text-slate-700">{data.meaning_en}</div>
            </div>
          )}

          {/* Example */}
          {data.example && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
              VÍ DỤ
              </div>
              <div className="text-slate-700 italic">&quot;{data.example}&quot;</div>
              {data.example_vi && (
                <div className="text-slate-500 text-sm mt-1">{data.example_vi}</div>
              )}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              saved 
                ? 'bg-green-500 text-white scale-95' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
            }`}
          >
            {saved ? (
              <>Đã lưu!</>
            ) : (
              <>Lưu vào sổ từ vựng</>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Translation & Grammar Popup
interface TranslationResult {
  translation: string;
  notes?: string;
}

interface GrammarResult {
  structure?: string;
  tense?: string;
  explanation?: string;
  breakdown?: { part: string; role: string; meaning: string }[];
  tips?: string;
}

interface TranslationPopupContentProps {
  text: string;
}

function TranslationPopupContent({ text }: TranslationPopupContentProps) {
  const [activeTab, setActiveTab] = useState<'translate' | 'grammar'>('translate');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [grammar, setGrammar] = useState<GrammarResult | null>(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (mode: 'translate' | 'grammar') => {
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const result = await res.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        if (mode === 'translate') setTranslation(result);
        else setGrammar(result);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Timeout - thử lại sau');
      } else {
        setError('Lỗi kết nối');
      }
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    fetchData('translate');
  }, [fetchData]);

  const handleTabChange = (tab: 'translate' | 'grammar') => {
    setActiveTab(tab);
    if (tab === 'grammar' && !grammar && !loading) {
      fetchData('grammar');
    }
  };

  return (
    <>
      {/* Selected text preview */}
      <div className="px-4 py-2 bg-slate-50 border-b">
        <div className="text-xs text-slate-500 mb-1">Đoạn văn đã chọn:</div>
        <div className="text-sm text-slate-800 font-medium line-clamp-2">&quot;{text}&quot;</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => handleTabChange('translate')}
          className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'translate'
              ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Dịch nghĩa
        </button>
        <button
          onClick={() => handleTabChange('grammar')}
          className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'grammar'
              ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Ngữ pháp
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-slate-500 text-sm">
              {activeTab === 'translate' ? 'Đang dịch...' : 'Đang phân tích ngữ pháp...'}
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="text-red-500 mb-3">{error}</div>
            <button
              onClick={() => fetchData(activeTab)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Thử lại
            </button>
          </div>
        ) : activeTab === 'translate' && translation ? (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 text-green-600 text-xs font-semibold mb-2">
                <span>🇻🇳</span> BẢN DỊCH
              </div>
              <div className="text-lg text-slate-800 leading-relaxed">{translation.translation}</div>
            </div>
            {translation.notes && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
                  GHI CHÚ
                </div>
                <div className="text-slate-600 text-sm">{translation.notes}</div>
              </div>
            )}
          </div>
        ) : activeTab === 'grammar' && grammar ? (
          <div className="space-y-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {grammar.structure && (
                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {grammar.structure}
                </span>
              )}
              {grammar.tense && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {grammar.tense}
                </span>
              )}
            </div>

            {/* Explanation */}
            {grammar.explanation && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 text-purple-600 text-xs font-semibold mb-2">
                  GIẢI THÍCH
                </div>
                <div className="text-slate-700 leading-relaxed">{grammar.explanation}</div>
              </div>
            )}

            {/* Breakdown */}
            {grammar.breakdown && grammar.breakdown.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-3">
                  PHÂN TÍCH CHI TIẾT
                </div>
                <div className="space-y-2">
                  {grammar.breakdown.map((item, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm p-2 bg-white rounded-lg">
                      <span className="font-bold text-blue-600">{item.part}</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">{item.role}</span>
                      <span className="text-slate-600">({item.meaning})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {grammar.tips && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
                  MẸO GHI NHỚ
                </div>
                <div className="text-slate-600 text-sm">{grammar.tips}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            Chọn tab để xem nội dung
          </div>
        )}
      </div>
    </>
  );
}

// Export hook for easy usage
export function useSmartPopup(onSaveWord?: (word: WordData) => void) {
  const [wordPopup, setWordPopup] = useState<{ word: string; position: { x: number; y: number } } | null>(null);
  const [textPopup, setTextPopup] = useState<{ text: string; position: { x: number; y: number } } | null>(null);

  const handleWordClick = useCallback((word: string, event: React.MouseEvent | MouseEvent) => {
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').trim();
    if (cleanWord.length < 2) return;
    
    setTextPopup(null);
    setWordPopup({
      word: cleanWord,
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  // Listen for text selection
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        if (text && text.length > 3 && text.includes(' ')) {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect) {
            setWordPopup(null);
            setTextPopup({
              text,
              position: { x: rect.left + rect.width / 2, y: rect.bottom }
            });
          }
        }
      }, 50);
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const closeAll = useCallback(() => {
    setWordPopup(null);
    setTextPopup(null);
  }, []);

  const PopupComponents = (
    <>
      {wordPopup && (
        <DraggablePopup
          initialPosition={wordPopup.position}
          onClose={() => setWordPopup(null)}
          title={wordPopup.word}
          headerGradient="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <WordPopupContent
            word={wordPopup.word}
            onSaveWord={onSaveWord || (() => {})}
            onClose={() => setWordPopup(null)}
          />
        </DraggablePopup>
      )}
      {textPopup && (
        <DraggablePopup
          initialPosition={textPopup.position}
          onClose={() => setTextPopup(null)}
          title="AI Trợ giúp"
          headerGradient="bg-gradient-to-r from-blue-500 to-cyan-500"
        >
          <TranslationPopupContent text={textPopup.text} />
        </DraggablePopup>
      )}
    </>
  );

  return {
    handleWordClick,
    closeAll,
    PopupComponents,
    wordPopup,
    textPopup,
  };
}

export type { WordData };
