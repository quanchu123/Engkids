'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SubtitleCue } from '@/types';
import { parseVTT, parseSRT, generateVTT } from '@/lib/vtt-parser';
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import subtitles from VTT/SRT file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: SubtitleCue[];

      if (file.name.endsWith('.vtt')) {
        parsed = parseVTT(text);
      } else if (file.name.endsWith('.srt')) {
        parsed = parseSRT(text);
      } else {
        setMessage('Please upload a .vtt or .srt file');
        return;
      }

      setSubtitles(parsed);
      setMessage(`Imported ${parsed.length} subtitles`);
    } catch (error) {
      console.error('Import error:', error);
      setMessage('Failed to import subtitles');
    }
  };

  // Add new subtitle
  const addSubtitle = () => {
    const lastCue = subtitles[subtitles.length - 1];
    const newStartTime = lastCue ? lastCue.endTime + 0.5 : 0;
    
    const newCue: SubtitleCue = {
      id: `cue-${Date.now()}`,
      startTime: newStartTime,
      endTime: newStartTime + 3,
      textEn: '',
      textVi: '',
    };

    setSubtitles([...subtitles, newCue]);
    setSelectedIndex(subtitles.length);
  };

  // Update subtitle
  const updateSubtitle = (index: number, updates: Partial<SubtitleCue>) => {
    const updated = [...subtitles];
    updated[index] = { ...updated[index], ...updates };
    setSubtitles(updated);
  };

  // Delete subtitle
  const deleteSubtitle = (index: number) => {
    const updated = subtitles.filter((_, i) => i !== index);
    setSubtitles(updated);
    if (selectedIndex === index) {
      setSelectedIndex(null);
    }
  };

  // Save to database
  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      // Use API service - handles auth automatically
      await videoApi.saveSubtitles(videoId, subtitles.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        textEn: s.textEn,
        textVi: s.textVi,
      })));

      setMessage('Subtitles saved successfully!');
      broadcastContentChange('videos');
      router.refresh();
      onSave?.(subtitles);
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Failed to save subtitles');
    } finally {
      setSaving(false);
    }
  };

  // Export as VTT
  const handleExport = () => {
    const vttContent = generateVTT(subtitles);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles-${videoId}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format time for display (seconds to mm:ss.ms)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Subtitle Editor</h2>
        
        {/* Actions */}
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vtt,.srt"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Import VTT/SRT
          </button>
          <button
            onClick={handleExport}
            disabled={subtitles.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-300"
          >
            Export VTT
          </button>
          <button
            onClick={addSubtitle}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            + Add Subtitle
          </button>
          <button
            onClick={handleSave}
            disabled={saving || subtitles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 font-semibold"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Subtitle List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {subtitles.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No subtitles yet</p>
            <p className="text-sm">Import a VTT/SRT file or add manually</p>
          </div>
        ) : (
          subtitles.map((cue, index) => (
            <div
              key={cue.id}
              className={`border rounded-lg p-4 transition-all ${
                selectedIndex === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="flex items-start gap-4">
                {/* Index */}
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-lg font-bold text-gray-600">#{index + 1}</div>
                </div>

                {/* Timing */}
                <div className="flex gap-2 items-center">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.startTime}
                      onChange={(e) => updateSubtitle(index, { startTime: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-400 mt-0.5">{formatTime(cue.startTime)}</div>
                  </div>
                  <div className="text-gray-400 mt-5">→</div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.endTime}
                      onChange={(e) => updateSubtitle(index, { endTime: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-400 mt-0.5">{formatTime(cue.endTime)}</div>
                  </div>
                </div>

                {/* Text Fields */}
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">English</label>
                    <input
                      type="text"
                      value={cue.textEn}
                      onChange={(e) => updateSubtitle(index, { textEn: e.target.value })}
                      placeholder="English subtitle text..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Vietnamese</label>
                    <input
                      type="text"
                      value={cue.textVi}
                      onChange={(e) => updateSubtitle(index, { textVi: e.target.value })}
                      placeholder="Vietnamese translation..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSubtitle(index);
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                  title="Delete subtitle"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {subtitles.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
          Total: <span className="font-semibold">{subtitles.length}</span> subtitles
          {subtitles.length > 0 && (
            <span className="ml-4">
              Duration: <span className="font-semibold">
                {formatTime(subtitles[subtitles.length - 1]?.endTime || 0)}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
