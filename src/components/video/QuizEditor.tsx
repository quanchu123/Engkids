'use client';

import { useState } from 'react';
import { VideoQuizQuestion } from '@/types';
import { videoApi } from '@/services/api';

interface QuizEditorProps {
  videoId: string;
  initialQuiz?: VideoQuizQuestion[];
  onSave?: (quiz: VideoQuizQuestion[]) => void;
}

function createEmptyQuestion(): VideoQuizQuestion {
  return {
    id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question: '',
    questionVi: '',
    options: ['', ''],
    correctIndex: 0,
    explanation: '',
  };
}

export default function QuizEditor({ videoId, initialQuiz = [], onSave }: QuizEditorProps) {
  const [questions, setQuestions] = useState<VideoQuizQuestion[]>(initialQuiz);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const updateQuestion = (index: number, updates: Partial<VideoQuizQuestion>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const options = [...next[qIndex].options];
      options[oIndex] = value;
      next[qIndex] = { ...next[qIndex], options };
      return next;
    });
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[qIndex].options.length >= 4) return prev;
      next[qIndex] = { ...next[qIndex], options: [...next[qIndex].options, ''] };
      return next;
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[qIndex].options.length <= 2) return prev;
      const options = next[qIndex].options.filter((_, i) => i !== oIndex);
      let correctIndex = next[qIndex].correctIndex;
      if (correctIndex >= options.length) correctIndex = options.length - 1;
      else if (oIndex < correctIndex) correctIndex -= 1;
      next[qIndex] = { ...next[qIndex], options, correctIndex };
      return next;
    });
  };

  const addQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);

  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const validate = (): string | null => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Câu ${i + 1}: chưa nhập nội dung câu hỏi`;
      if (q.options.length < 2) return `Câu ${i + 1}: cần ít nhất 2 đáp án`;
      if (q.options.some((o) => !o.trim())) return `Câu ${i + 1}: có đáp án còn trống`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await videoApi.saveQuiz(
        videoId,
        questions.map((q) => ({
          ...q,
          question: q.question.trim(),
          questionVi: q.questionVi?.trim() || undefined,
          options: q.options.map((o) => o.trim()),
          explanation: q.explanation?.trim() || undefined,
        })),
      );
      setMessage('Đã lưu câu hỏi thành công!');
      onSave?.(questions);
    } catch (err) {
      console.error('Save quiz error:', err);
      setMessage('Lưu câu hỏi thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Câu hỏi trắc nghiệm</h2>
          <p className="text-sm text-gray-500">
            Hiển thị bên cạnh video. Trả lời đúng sẽ có pháo hoa cho bé.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={addQuestion}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            + Thêm câu hỏi
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 font-semibold"
          >
            {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.includes('thành công') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">Chưa có câu hỏi nào</p>
          <p className="text-sm">Bấm “Thêm câu hỏi” để tạo câu hỏi đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-gray-600">Câu #{qIndex + 1}</span>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                  title="Xoá câu hỏi"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Câu hỏi (English)</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                    placeholder="What color is the cat?"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Câu hỏi (Tiếng Việt - tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={q.questionVi || ''}
                    onChange={(e) => updateQuestion(qIndex, { questionVi: e.target.value })}
                    placeholder="Con mèo màu gì?"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Đáp án (chọn nút tròn cho đáp án đúng)
                  </label>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctIndex === oIndex}
                          onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                          className="h-5 w-5 text-green-600"
                          title="Đánh dấu đáp án đúng"
                        />
                        <span className="w-6 text-center font-bold text-gray-500">
                          {String.fromCharCode(65 + oIndex)}
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Đáp án ${String.fromCharCode(65 + oIndex)}`}
                          className={`flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            q.correctIndex === oIndex
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-300'
                          }`}
                        />
                        {q.options.length > 2 && (
                          <button
                            onClick={() => removeOption(qIndex, oIndex)}
                            className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                            title="Xoá đáp án"
                          >
                            −
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.options.length < 4 && (
                    <button
                      onClick={() => addOption(qIndex)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Thêm đáp án
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Giải thích (tuỳ chọn - hiện sau khi trả lời)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    placeholder="The cat is orange because..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
          Tổng: <span className="font-semibold">{questions.length}</span> câu hỏi
        </div>
      )}
    </div>
  );
}
