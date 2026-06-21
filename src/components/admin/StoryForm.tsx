'use client';

/* eslint-disable @next/next/no-img-element */
import { useStoryForm } from '@/hooks/useStoryForm';

interface StoryFormProps {
  form: ReturnType<typeof useStoryForm>;
  showAIExtract?: boolean;
}

export default function StoryForm({ form, showAIExtract = false }: StoryFormProps) {
  const {
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
    activeTab, setActiveTab,
    isExtractingVocab,
    fileInputRef,
    panelFileInputRefs,
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
  } = form;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/50">
        <div className="flex gap-1 px-4 pt-2">
          {[
            { key: 'info' as const, label: 'Thông tin' },
            { key: 'panels' as const, label: 'Panels' },
            { key: 'vocab' as const, label: 'Từ vựng' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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

      <div className="p-6">
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
                    data-testid="story-title-en"
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
                    data-testid="story-title-vi"
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
                    <option value="Beginner">Beginner (Mới bắt đầu)</option>
                    <option value="Elementary">Elementary (Cơ bản)</option>
                    <option value="Intermediate">Intermediate (Trung cấp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Chủ đề
                  </label>
                  <div className="space-y-2">
                    {selectedTopics.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2">
                        {selectedTopics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"
                          >
                            {topic}
                            <button
                              onClick={() => toggleTopic(topic)}
                              className="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
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
                        {availableTopics.filter((topic) => !selectedTopics.includes(topic)).map((topic) => (
                          <option key={topic} value={topic}>{topic}</option>
                        ))}
                      </select>
                    </div>
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

              <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Hiển thị công khai</span>
                  <span className="block text-xs text-slate-500">
                    Tắt mục này thì truyện chỉ nằm trong admin, không hiện ở trang chủ và tab Truyện.
                  </span>
                </span>
              </label>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-4">Ảnh bìa *</h2>

              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                  {coverPreview ? (
                    coverPreview.startsWith('http') || coverPreview.startsWith('data:') ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{coverPreview}</span>
                    )
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">No image</span>
                  )}
                </div>

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
                      Chọn từ máy
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

        {activeTab === 'panels' && (
          <div className="space-y-4">
            {panels.map((panel, index) => (
              <div key={panel.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                      {panel.imagePreview ? (
                        panel.imagePreview.startsWith('http') || panel.imagePreview.startsWith('data:') ? (
                          <img src={panel.imagePreview} alt={`Panel ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{panel.imagePreview}</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">No image</span>
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
                        Upload
                      </button>
                      <input
                        type="text"
                        placeholder="URL ảnh"
                        onChange={(e) => handlePanelImageUrl(panel.id, e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-600 mb-1">
                        English
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
                        Tiếng Việt
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

                  {panels.length > 1 && (
                    <button
                      onClick={() => removePanel(panel.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addPanel}
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-colors font-medium"
            >
              Thêm panel mới
            </button>
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="space-y-4">
            {showAIExtract && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-green-800">AI tìm từ vựng</h3>
                    <p className="text-xs text-green-600 mt-1">Tự động phát hiện từ quan trọng từ các panels</p>
                  </div>
                  <button
                    onClick={handleAIExtractVocab}
                    disabled={isExtractingVocab}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isExtractingVocab ? 'Đang phân tích...' : 'Trích xuất từ vựng'}
                  </button>
                </div>
              </div>
            )}

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
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addVocabItem}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                Thêm từ vựng
              </button>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm text-amber-700">
                <strong>Tip:</strong> Từ vựng bạn thêm ở đây sẽ được tự động highlight trong câu tiếng Anh,
                giúp bé có thể click vào để xem nghĩa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
