'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Story, Panel, Token } from '@/types';
import { getStoryById, updateStory, getAllTopics } from '@/data/stories';
import { resizeImage } from '@/services/image';

const DEFAULT_TOPICS = [
  'Animals', 'Family', 'Food', 'Nature', 'School',
  'Colors', 'Numbers', 'Weather', 'Emotions', 'Body Parts',
  'Clothes', 'Transportation', 'House', 'Sports', 'Holidays',
  'Friendship', 'Adventure', 'Fantasy', 'Daily Life', 'Seasons',
];

// Helper to generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Parse sentence into tokens
const parseTokens = (sentence: string, vocabWords: { en: string; vi: string }[]): Token[] => {
  const words = sentence.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/);
  return words
    .filter(w => w.trim())
    .map(word => {
      const cleanWord = word.replace(/[.,!?]/g, '').toLowerCase();
      const vocab = vocabWords.find(v => v.en.toLowerCase() === cleanWord);
      return {
        display: word,
        norm: cleanWord,
        vi: vocab?.vi || undefined,
      };
    });
};

interface PanelForm {
  id: string;
  image: string;
  imagePreview?: string;
  sentence_en: string;
  sentence_vi: string;
}

interface VocabItem {
  en: string;
  vi: string;
}

interface PageProps {
  params: { id: string };
}

export default function EditStoryPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [isLoaded, setIsLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Story info
  const [titleEn, setTitleEn] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Elementary' | 'Intermediate'>('Beginner');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  // Panels
  const [panels, setPanels] = useState<PanelForm[]>([]);

  // Vocabulary
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'panels' | 'vocab'>('info');

  // Load existing story
  useEffect(() => {
    const loadStory = async () => {
      // Load available topics
      const existingTopics = getAllTopics();
      const allTopics = [...new Set([...DEFAULT_TOPICS, ...existingTopics])].sort();
      setAvailableTopics(allTopics);

      const { getAllStories } = await import('@/data/stories');
      const allStories = await getAllStories();
      const story = allStories.find(s => s.id === id);
      if (!story) {
        setNotFound(true);
        setIsLoaded(true);
        return;
      }

      // Populate form
      setTitleEn(story.title_en);
      setTitleVi(story.title_vi);
      setLevel(story.level);
      setSelectedTopics(story.topics);
      setCoverImage(story.cover_image);
      setCoverPreview(story.cover_image);

      // Convert panels
      const panelForms: PanelForm[] = story.panels.map(p => ({
        id: generateId(),
        image: p.image,
        imagePreview: p.image,
        sentence_en: p.sentence_en,
        sentence_vi: p.sentence_vi,
      }));
      setPanels(panelForms.length > 0 ? panelForms : [{ id: generateId(), image: '', sentence_en: '', sentence_vi: '' }]);

      // Extract vocab from tokens
      const vocabMap = new Map<string, string>();
      story.panels.forEach(p => {
        p.tokens.forEach(t => {
          if (t.vi && t.norm) {
            vocabMap.set(t.norm.toLowerCase(), t.vi);
          }
        });
      });
      const vocabItems = Array.from(vocabMap.entries()).map(([en, vi]) => ({ en, vi }));
      setVocabList(vocabItems.length > 0 ? vocabItems : [{ en: '', vi: '' }]);

      setIsLoaded(true);
    };
    loadStory();
  }, [id]);

  // Handle cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await resizeImage(file, 600, 400, 0.85);
      setCoverImage(base64);
      setCoverPreview(base64);
    }
  };

  // Handle cover URL
  const handleCoverUrl = (url: string) => {
    setCoverImage(url);
    setCoverPreview(url);
  };

  // Handle panel image upload
  const handlePanelImageUpload = async (panelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await resizeImage(file, 800, 600, 0.85);
      setPanels(prev => prev.map(p => 
        p.id === panelId ? { ...p, image: base64, imagePreview: base64 } : p
      ));
    }
  };

  // Handle panel image URL
  const handlePanelImageUrl = (panelId: string, url: string) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, image: url, imagePreview: url } : p
    ));
  };

  // Add new panel
  const addPanel = () => {
    setPanels(prev => [...prev, { id: generateId(), image: '', sentence_en: '', sentence_vi: '' }]);
  };

  // Remove panel
  const removePanel = (panelId: string) => {
    if (panels.length > 1) {
      setPanels(prev => prev.filter(p => p.id !== panelId));
    }
  };

  // Update panel
  const updatePanel = (panelId: string, field: keyof PanelForm, value: string) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, [field]: value } : p
    ));
  };

  // Add vocab item
  const addVocabItem = () => {
    setVocabList(prev => [...prev, { en: '', vi: '' }]);
  };

  // Remove vocab item
  const removeVocabItem = (index: number) => {
    if (vocabList.length > 1) {
      setVocabList(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Update vocab item
  const updateVocabItem = (index: number, field: 'en' | 'vi', value: string) => {
    setVocabList(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Toggle topic selection
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  // Add custom topic
  const addCustomTopic = () => {
    const topic = customTopic.trim();
    if (topic && !selectedTopics.includes(topic)) {
      setSelectedTopics(prev => [...prev, topic]);
      if (!availableTopics.includes(topic)) {
        setAvailableTopics(prev => [...prev, topic].sort());
      }
      setCustomTopic('');
    }
  };

  // AI: Extract vocabulary from panels - DISABLED
  // const handleAIExtractVocab = async () => {
  //   ...
  // };

  // AI: Auto translate panels - DISABLED
  // const handleAITranslate = async () => {
  //   ...
  // };

  // Validate and save
  const handleSave = async () => {
    // Validation
    if (!titleEn.trim() || !titleVi.trim()) {
      alert('Vui lòng nhập tiêu đề tiếng Anh và tiếng Việt');
      setActiveTab('info');
      return;
    }

    if (!coverImage) {
      alert('Vui lòng thêm ảnh bìa');
      setActiveTab('info');
      return;
    }

    const validPanels = panels.filter(p => p.sentence_en.trim() && p.sentence_vi.trim());
    if (validPanels.length === 0) {
      alert('Vui lòng thêm ít nhất 1 panel với câu tiếng Anh và tiếng Việt');
      setActiveTab('panels');
      return;
    }

    setIsSaving(true);

    try {
      // Filter valid vocab
      const validVocab = vocabList.filter(v => v.en.trim() && v.vi.trim());

      // Build story object
      const storyPanels: Panel[] = validPanels.map((p, index) => ({
        panel_id: index + 1,
        image: p.image || '📖',
        sentence_en: p.sentence_en,
        sentence_vi: p.sentence_vi,
        tokens: parseTokens(p.sentence_en, validVocab),
      }));

      const story: Story = {
        id: id, // Keep original ID
        title_en: titleEn,
        title_vi: titleVi,
        level,
        topics: selectedTopics,
        cover_image: coverImage,
        estimated_minutes: Math.ceil(validPanels.length * 0.5),
        panels: storyPanels,
        vocabulary: validVocab.map(v => ({
          word: v.en,
          vi: v.vi,
          ipa: '',
        })),
        games: {
          match: validVocab.slice(0, 6).map(v => ({
            word: v.en,
            vi: v.vi,
          })),
          fill_blank: validPanels.slice(0, 3).map(p => {
            const words = p.sentence_en.split(' ').filter(w => w.length > 3);
            const answerWord = words[Math.floor(Math.random() * words.length)] || words[0];
            const cleanAnswer = answerWord?.replace(/[.,!?]/g, '') || 'word';
            return {
              sentence_en: p.sentence_en.replace(answerWord, '___'),
              answer: cleanAnswer,
              choices: [cleanAnswer, 'other', 'words'].sort(() => Math.random() - 0.5),
            };
          }),
        },
      };

      await updateStory(id, story);
      alert('✅ Cập nhật truyện thành công!');
      router.push('/admin');
    } catch (error) {
      console.error('Error saving story:', error);
      alert('Có lỗi xảy ra khi lưu truyện');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⚙️</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không tìm thấy truyện</h1>
          <Link href="/admin" className="text-blue-500 hover:underline">
            ← Quay lại Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-slate-700">
            ← Quay lại
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-xl font-bold text-slate-800">
            ✏️ Sửa truyện
            </h1>
        </div>
        <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
            {isSaving ? '⏳ Đang lưu...' : '💾 Lưu truyện'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <div className="flex gap-1 px-4 pt-2">
            {[
              { key: 'info', label: '📝 Thông tin', icon: '1' },
              { key: 'panels', label: '🖼️ Panels', icon: '2' },
              { key: 'vocab', label: '📚 Từ vựng', icon: '3' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 font-medium text-sm transition-colors rounded-t-lg border-x border-t ${
                  activeTab === tab.key
                    ? 'border-slate-200 text-blue-600 bg-white -mb-px relative z-10'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      {/* Content */}
      <div className="p-6">
        {/* Tab 1: Basic Info */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-4">Thông tin cơ bản</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tiêu đề (English) *
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="The Little Cat"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tiêu đề (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    value={titleVi}
                    onChange={(e) => setTitleVi(e.target.value)}
                    placeholder="Chú Mèo Nhỏ"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cấp độ
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as typeof level)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Beginner">🟢 Beginner (Mới bắt đầu)</option>
                    <option value="Elementary">🔵 Elementary (Cơ bản)</option>
                    <option value="Intermediate">🟣 Intermediate (Trung cấp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Chủ đề
                  </label>
                  <div className="space-y-2">
                    {/* Selected topics */}
                    {selectedTopics.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2">
                        {selectedTopics.map(topic => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"
                          >
                            {topic}
                            <button
                              onClick={() => toggleTopic(topic)}
                              className="hover:text-blue-900"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Topic dropdown */}
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            toggleTopic(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">+ Chọn chủ đề có sẵn</option>
                        {availableTopics.filter(t => !selectedTopics.includes(t)).map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                        ))}
                      </select>
                    </div>
                    {/* Custom topic */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                        placeholder="Hoặc nhập chủ đề mới..."
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addCustomTopic}
                        disabled={!customTopic.trim()}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-lg text-sm font-medium"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-4">Ảnh bìa *</h2>
              
              <div className="flex gap-4">
                {/* Preview */}
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                  {coverPreview ? (
                    coverPreview.startsWith('http') || coverPreview.startsWith('data:') ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{coverPreview}</span>
                    )
                  ) : (
                    <span className="text-4xl">🖼️</span>
                  )}
                </div>

                {/* Upload options */}
                <div className="flex-1 space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      📁 Chọn từ máy
                    </button>
                  </div>
                  <div className="text-sm text-slate-500">hoặc</div>
                  <input
                    type="text"
                    placeholder="Dán URL ảnh (https://...)"
                    value={coverImage.startsWith('data:') ? '' : coverImage}
                    onChange={(e) => handleCoverUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Panels */}
        {activeTab === 'panels' && (
          <div className="space-y-4">
            {/* AI Translate Section - DISABLED */}
            {/* <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
              ...
            </div> */}

            {panels.map((panel, index) => (
              <div key={panel.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start gap-4">
                  {/* Panel number */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                      {panel.imagePreview ? (
                        panel.imagePreview.startsWith('http') || panel.imagePreview.startsWith('data:') ? (
                          <img src={panel.imagePreview} alt={`Panel ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{panel.imagePreview}</span>
                        )
                      ) : (
                        <span className="text-2xl">🖼️</span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <input
                        ref={(el) => { panelFileInputRefs.current[panel.id] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePanelImageUpload(panel.id, e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => panelFileInputRefs.current[panel.id]?.click()}
                        className="w-full px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors"
                      >
                        📁 Upload
                      </button>
                      <input
                        type="text"
                        placeholder="URL ảnh"
                        onChange={(e) => handlePanelImageUrl(panel.id, e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Text inputs */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-600 mb-1">
                        🇬🇧 English
                      </label>
                      <textarea
                        value={panel.sentence_en}
                        onChange={(e) => updatePanel(panel.id, 'sentence_en', e.target.value)}
                        placeholder="The cat is sleeping on the bed."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-600 mb-1">
                        🇻🇳 Tiếng Việt
                      </label>
                      <textarea
                        value={panel.sentence_vi}
                        onChange={(e) => updatePanel(panel.id, 'sentence_vi', e.target.value)}
                        placeholder="Con mèo đang ngủ trên giường."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  {panels.length > 1 && (
                    <button
                      onClick={() => removePanel(panel.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add panel button */}
            <button
              onClick={addPanel}
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-colors font-medium"
            >
              ➕ Thêm panel mới
            </button>
          </div>
        )}

        {/* Tab 3: Vocabulary */}
        {activeTab === 'vocab' && (
          <div className="space-y-4">
            {/* AI Extract Button */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-800">🤖 AI Tìm từ vựng</h3>
                  <p className="text-xs text-green-600 mt-1">Tự động phát hiện từ quan trọng từ các panels</p>
                </div>
                <button
                  onClick={handleAIExtractVocab}
                  disabled={isExtractingVocab}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isExtractingVocab ? (
                    <>
                      <span className="animate-spin">⚡</span> Đang phân tích...
                    </>
                  ) : (
                    <>✨ Trích xuất từ vựng</>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-2">Từ vựng quan trọng</h2>
              <p className="text-sm text-slate-500 mb-4">
                Thêm các từ vựng quan trọng trong truyện. Những từ này sẽ được highlight khi đọc và dùng cho game.
              </p>

              <div className="space-y-3">
                {vocabList.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={item.en}
                      onChange={(e) => updateVocabItem(index, 'en', e.target.value)}
                      placeholder="English word"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-slate-400">=</span>
                    <input
                      type="text"
                      value={item.vi}
                      onChange={(e) => updateVocabItem(index, 'vi', e.target.value)}
                      placeholder="Nghĩa tiếng Việt"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {vocabList.length > 1 && (
                      <button
                        onClick={() => removeVocabItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addVocabItem}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                ➕ Thêm từ vựng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
