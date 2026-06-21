'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SubtitleCue } from '@/types';
import { parseVTT, parseSRT } from '@/lib/vtt-parser';
import { videoApi } from '@/services/api';
import { broadcastContentChange } from '@/lib/content-sync';

interface SubtitleEditorProps {
  videoId: string;
  initialSubtitles?: SubtitleCue[];
  onSave?: (subtitles: SubtitleCue[]) => void;
}

export default function SubtitleEditor({ videoId, initialSubtitles = [], onSave }: SubtitleEditorProps) {
  const router = useRouter();
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>(initialSubtitles);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format time for display (seconds to mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse uploaded subtitle file
  const parseSubtitleFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      let parsed: SubtitleCue[];

      if (file.name.toLowerCase().endsWith('.vtt')) {
        parsed = parseVTT(text);
      } else if (file.name.toLowerCase().endsWith('.srt')) {
        parsed = parseSRT(text);
      } else {
        setMessage('❌ Chỉ hỗ trợ file .srt hoặc .vtt');
        return;
      }

      if (parsed.length === 0) {
        setMessage('❌ Không tìm thấy subtitle nào trong file. Kiểm tra lại định dạng file.');
        return;
      }

      setSubtitles(parsed);
      setMessage(`✅ Đã import ${parsed.length} subtitle từ "${file.name}"`);
    } catch (error) {
      console.error('Import error:', error);
      setMessage('❌ Không thể đọc file subtitle. Kiểm tra lại định dạng.');
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseSubtitleFile(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.srt') || ext.endsWith('.vtt')) {
        parseSubtitleFile(file);
      } else {
        setMessage('❌ Chỉ hỗ trợ file .srt hoặc .vtt');
      }
    }
  }, [parseSubtitleFile]);

  // Auto-translate all English lines to Vietnamese via AI
  const handleTranslateAll = async () => {
    const lines = subtitles.map((s) => s.textEn?.trim() || '');
    if (lines.every((l) => !l)) {
      setMessage('⚠️ Chưa có nội dung tiếng Anh để dịch.');
      return;
    }
    setTranslating(true);
    setMessage('');
    try {
      const { translations } = await videoApi.translateSubtitles(videoId, lines);
      setSubtitles((prev) =>
        prev.map((cue, i) => (translations[i] ? { ...cue, textVi: translations[i] } : cue)),
      );
      const done = translations.filter(Boolean).length;
      setMessage(`✅ Đã dịch ${done}/${lines.length} dòng sang tiếng Việt. Bấm "Lưu tất cả" để hoàn tất.`);
    } catch (error) {
      console.error('Translate error:', error);
      const msg = error instanceof Error ? error.message : 'Dịch tự động thất bại';
      setMessage(`❌ ${msg}`);
    } finally {
      setTranslating(false);
    }
  };

  // Save to database
  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await videoApi.saveSubtitles(videoId, subtitles.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        textEn: s.textEn,
        textVi: s.textVi,
      })));

      setMessage('✅ Đã lưu subtitle thành công!');
      broadcastContentChange('videos');
      router.refresh();
      onSave?.(subtitles);
    } catch (error) {
      console.error('Save error:', error);
      setMessage('❌ Lưu subtitle thất bại. Thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Clear all subtitles
  const handleClearAll = () => {
    setSubtitles([]);
    setMessage('Đã xóa tất cả subtitle. Bấm "Lưu tất cả" để cập nhật.');
  };

  const hasSubtitles = subtitles.length > 0;
  const lastCueEnd = hasSubtitles ? subtitles[subtitles.length - 1]?.endTime || 0 : 0;

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📝 Phụ đề (Subtitle)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload file .srt hoặc .vtt để thêm phụ đề cho video
          </p>
        </div>

        <div className="flex gap-2">
          {hasSubtitles && (
            <>
              <button
                onClick={handleTranslateAll}
                disabled={translating}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold text-sm"
                title="Dùng AI dịch toàn bộ phụ đề tiếng Anh sang tiếng Việt"
              >
                {translating ? '⏳ Đang dịch...' : '✨ Dịch tất cả (AI)'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 font-semibold text-sm"
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu tất cả'}
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                🗑️ Xóa tất cả
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.startsWith('✅') || message.startsWith('Đã')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : message.startsWith('⚠️')
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : message.startsWith('❌')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".vtt,.srt"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-700 font-semibold">
          {isDragOver ? 'Thả file vào đây!' : 'Kéo thả file .srt / .vtt vào đây'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          hoặc click để chọn file từ máy tính
        </p>
        {hasSubtitles && (
          <p className="text-blue-500 text-xs mt-3 font-medium">
            ⚠️ Upload file mới sẽ thay thế toàn bộ subtitle hiện tại
          </p>
        )}
      </div>

      {/* Subtitle Preview Table */}
      {hasSubtitles && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-700 text-sm">
              📋 Preview: {subtitles.length} subtitle
            </span>
            <span className="text-gray-400 text-sm ml-3">
              Tổng thời lượng: {formatTime(lastCueEnd)}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-28">Thời gian</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">English</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tiếng Việt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subtitles.map((cue, index) => (
                  <tr key={cue.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                    </td>
                    <td className="px-3 py-2 text-gray-800">{cue.textEn}</td>
                    <td className="px-3 py-2 text-gray-600 italic">
                      {cue.textVi || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
