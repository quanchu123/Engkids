'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Story, Panel, Token } from '@/types';
import { getAllTopics } from '@/data/stories';
import { resizeImage } from '@/services/image';

const DEFAULT_TOPICS = [
  'Animals', 'Family', 'Food', 'Nature', 'School',
  'Colors', 'Numbers', 'Weather', 'Emotions', 'Body Parts',
  'Clothes', 'Transportation', 'House', 'Sports', 'Holidays',
  'Friendship', 'Adventure', 'Fantasy', 'Daily Life', 'Seasons',
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const lemmatize = (word: string): string => {
  const w = word.toLowerCase();
  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

const parseTokens = (
  sentence: string,
  manualVocab: VocabItem[]
): Token[] => {
  const words = sentence.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/);
  const tokens = words.filter(w => w.trim());

  const translationMap = new Map<string, string>();
  manualVocab.forEach(v => translationMap.set(v.en.toLowerCase(), v.vi));

  return tokens.map(word => {
    const cleanWord = word.replace(/[.,!?]/g, '').toLowerCase();
    const lemma = lemmatize(cleanWord);
    const vi = translationMap.get(cleanWord) || translationMap.get(lemma);

    return {
      display: word,
      norm: cleanWord,
      lemma,
      vi,
    };
  });
};

export interface PanelForm {
  id: string;
  image: string;
  imageFile?: File;
  imagePreview?: string;
  sentence_en: string;
  sentence_vi: string;
}

export interface VocabItem {
  en: string;
  vi: string;
}

export interface StoryFormData {
  titleEn: string;
  titleVi: string;
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  selectedTopics: string[];
  coverImage: string;
  coverPreview: string;
  panels: PanelForm[];
  vocabList: VocabItem[];
}

export interface UseStoryFormOptions {
  initialData?: StoryFormData;
}

export function useStoryForm(options?: UseStoryFormOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Story info
  const [titleEn, setTitleEn] = useState(options?.initialData?.titleEn ?? '');
  const [titleVi, setTitleVi] = useState(options?.initialData?.titleVi ?? '');
  const [level, setLevel] = useState<'Beginner' | 'Elementary' | 'Intermediate'>(
    options?.initialData?.level ?? 'Beginner'
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    options?.initialData?.selectedTopics ?? []
  );
  const [customTopic, setCustomTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState(options?.initialData?.coverImage ?? '');
  const [coverPreview, setCoverPreview] = useState(options?.initialData?.coverPreview ?? '');
  const [published, setPublished] = useState(true);

  // Panels
  const [panels, setPanels] = useState<PanelForm[]>(
    options?.initialData?.panels ?? [{ id: generateId(), image: '', sentence_en: '', sentence_vi: '' }]
  );

  // Vocabulary
  const [vocabList, setVocabList] = useState<VocabItem[]>(
    options?.initialData?.vocabList ?? [{ en: '', vi: '' }]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'panels' | 'vocab'>('info');
  const [isExtractingVocab, setIsExtractingVocab] = useState(false);

  // Load available topics
  useEffect(() => {
    const existingTopics = getAllTopics();
    const allTopics = [...new Set([...DEFAULT_TOPICS, ...existingTopics])].sort();
    setAvailableTopics(allTopics);
  }, []);

  // Cover image handlers
  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await resizeImage(file, 600, 400, 0.85);
      setCoverImage(base64);
      setCoverPreview(base64);
    }
  }, []);

  const handleCoverUrl = useCallback((url: string) => {
    setCoverImage(url);
    setCoverPreview(url);
  }, []);

  // Panel handlers
  const handlePanelImageUpload = useCallback(async (panelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await resizeImage(file, 800, 600, 0.85);
      setPanels(prev => prev.map(p =>
        p.id === panelId ? { ...p, image: base64, imagePreview: base64, imageFile: file } : p
      ));
    }
  }, []);

  const handlePanelImageUrl = useCallback((panelId: string, url: string) => {
    setPanels(prev => prev.map(p =>
      p.id === panelId ? { ...p, image: url, imagePreview: url } : p
    ));
  }, []);

  const addPanel = useCallback(() => {
    setPanels(prev => [...prev, { id: generateId(), image: '', sentence_en: '', sentence_vi: '' }]);
  }, []);

  const removePanel = useCallback((panelId: string) => {
    setPanels(prev => prev.length > 1 ? prev.filter(p => p.id !== panelId) : prev);
  }, []);

  const updatePanel = useCallback((panelId: string, field: keyof PanelForm, value: string) => {
    setPanels(prev => prev.map(p =>
      p.id === panelId ? { ...p, [field]: value } : p
    ));
  }, []);

  // Vocab handlers
  const addVocabItem = useCallback(() => {
    setVocabList(prev => [...prev, { en: '', vi: '' }]);
  }, []);

  const removeVocabItem = useCallback((index: number) => {
    setVocabList(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const updateVocabItem = useCallback((index: number, field: 'en' | 'vi', value: string) => {
    setVocabList(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  // Topic handlers
  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  }, []);

  const addCustomTopic = useCallback(() => {
    const topic = customTopic.trim();
    if (topic && !selectedTopics.includes(topic)) {
      setSelectedTopics(prev => [...prev, topic]);
      if (!availableTopics.includes(topic)) {
        setAvailableTopics(prev => [...prev, topic].sort());
      }
      setCustomTopic('');
    }
  }, [customTopic, selectedTopics, availableTopics]);

  // AI Extract Vocab (simple word extraction)
  const handleAIExtractVocab = useCallback(() => {
    setIsExtractingVocab(true);

    const allWords = new Set<string>();
    const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom']);

    panels.forEach(panel => {
      const words = panel.sentence_en
        .toLowerCase()
        .replace(/[.,!?'"]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !commonWords.has(w));
      words.forEach(w => allWords.add(w));
    });

    const existingWords = new Set(vocabList.map(v => v.en.toLowerCase()));
    const newVocab = Array.from(allWords)
      .filter(w => !existingWords.has(w))
      .slice(0, 10)
      .map(en => ({ en, vi: '' }));

    if (newVocab.length > 0) {
      setVocabList(prev => [...prev.filter(v => v.en.trim()), ...newVocab]);
    }

    setTimeout(() => setIsExtractingVocab(false), 500);
  }, [panels, vocabList]);

  // Build story object from form data
  const buildStory = useCallback((storyId: string): Story => {
    const validVocab = vocabList.filter(v => v.en.trim() && v.vi.trim());
    const validPanels = panels.filter(p => p.sentence_en.trim() && p.sentence_vi.trim());

    const storyPanels: Panel[] = validPanels.map((p, index) => ({
      panel_id: index + 1,
      image: p.image || '',
      sentence_en: p.sentence_en,
      sentence_vi: p.sentence_vi,
      tokens: parseTokens(p.sentence_en, validVocab),
    }));

    return {
      id: storyId,
      title_en: titleEn,
      title_vi: titleVi,
      level,
      topics: selectedTopics,
      cover_image: coverImage,
      estimated_minutes: Math.ceil(validPanels.length * 0.5),
      published,
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
  }, [titleEn, titleVi, level, selectedTopics, coverImage, published, panels, vocabList]);

  // Validate form
  const validate = useCallback((): { valid: boolean; error?: string; tab?: 'info' | 'panels' | 'vocab' } => {
    if (!titleEn.trim() || !titleVi.trim()) {
      return { valid: false, error: 'Vui lòng nhập tiêu đề tiếng Anh và tiếng Việt', tab: 'info' };
    }
    if (!coverImage) {
      return { valid: false, error: 'Vui lòng thêm ảnh bìa', tab: 'info' };
    }
    const validPanels = panels.filter(p => p.sentence_en.trim() && p.sentence_vi.trim());
    if (validPanels.length === 0) {
      return { valid: false, error: 'Vui lòng thêm ít nhất 1 panel với câu tiếng Anh và tiếng Việt', tab: 'panels' };
    }
    return { valid: true };
  }, [titleEn, titleVi, coverImage, panels]);

  // Populate form from existing story (for edit mode)
  const populateFromStory = useCallback((story: Story) => {
    setTitleEn(story.title_en);
    setTitleVi(story.title_vi);
    setLevel(story.level);
    setSelectedTopics(story.topics);
    setCoverImage(story.cover_image);
    setCoverPreview(story.cover_image);
    setPublished(Boolean(story.published));

    const panelForms: PanelForm[] = story.panels.map(p => ({
      id: generateId(),
      image: p.image,
      imagePreview: p.image,
      sentence_en: p.sentence_en,
      sentence_vi: p.sentence_vi,
    }));
    setPanels(panelForms.length > 0 ? panelForms : [{ id: generateId(), image: '', sentence_en: '', sentence_vi: '' }]);

    const vocabMap = new Map<string, string>();
    story.vocabulary.forEach((item) => {
      if (item.word?.trim() && item.vi?.trim()) {
        vocabMap.set(item.word.trim().toLowerCase(), item.vi.trim());
      }
    });
    story.panels.forEach(p => {
      p.tokens.forEach(t => {
        if (t.vi && t.norm) {
          vocabMap.set(t.norm.toLowerCase(), t.vi);
        }
      });
    });
    const vocabItems = Array.from(vocabMap.entries()).map(([en, vi]) => ({ en, vi }));
    setVocabList(vocabItems.length > 0 ? vocabItems : [{ en: '', vi: '' }]);
  }, []);

  return {
    // State
    titleEn, setTitleEn,
    titleVi, setTitleVi,
    level, setLevel,
    selectedTopics,
    customTopic, setCustomTopic,
    availableTopics,
    coverImage, coverPreview,
    published, setPublished,
    panels,
    vocabList,
    isSaving, setIsSaving,
    activeTab, setActiveTab,
    isExtractingVocab,

    // Refs
    fileInputRef,
    panelFileInputRefs,

    // Handlers
    handleCoverUpload,
    handleCoverUrl,
    handlePanelImageUpload,
    handlePanelImageUrl,
    addPanel,
    removePanel,
    updatePanel,
    addVocabItem,
    removeVocabItem,
    updateVocabItem,
    toggleTopic,
    addCustomTopic,
    handleAIExtractVocab,

    // Utils
    buildStory,
    validate,
    populateFromStory,
    generateId,
  };
}
