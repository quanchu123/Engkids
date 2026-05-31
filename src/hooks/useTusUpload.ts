'use client';

import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { getAnyAccessToken } from '@/lib/admin-auth-client';

export interface UseTusUploadOptions {
  onComplete?: (dbVideoId: string) => void;
  onError?: (error: string) => void;
}

export interface UploadState {
  uploading: boolean;
  progress: number;
  status: string;
}

export function useTusUpload({ onComplete, onError }: UseTusUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const uploadRef = useRef<tus.Upload | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);
  const completionNotifiedRef = useRef(false);

  const getAuthToken = useCallback(async (): Promise<string> => {
    const accessToken = await getAnyAccessToken();
    if (!accessToken) throw new Error('Not authenticated');
    return accessToken;
  }, []);

  const uploadWithTUS = useCallback((
    file: File,
    videoId: string,
    title: string,
    signatureData: { signature: string; expiration: number; videoId: string; libraryId: number }
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      uploadStartTimeRef.current = Date.now();
      let uploadCompleteDetected = false;

      const upload = new tus.Upload(file, {
        endpoint: 'https://video.bunnycdn.com/tusupload',
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          'AuthorizationSignature': signatureData.signature,
          'AuthorizationExpire': signatureData.expiration.toString(),
          'VideoId': signatureData.videoId,
          'LibraryId': signatureData.libraryId.toString(),
        },
        metadata: {
          filetype: file.type,
          title,
        },
        chunkSize: 5 * 1024 * 1024,
        removeFingerprintOnSuccess: true,
        onError: (error) => {
          if (uploadCompleteDetected) {
            resolve();
          } else {
            reject(new Error(`TUS upload failed: ${error.message}`));
          }
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          const loadedMB = bytesUploaded / (1024 * 1024);
          const totalMB = bytesTotal / (1024 * 1024);

          const elapsedSeconds = (Date.now() - uploadStartTimeRef.current) / 1000;
          const speedMBps = elapsedSeconds > 0 ? loadedMB / elapsedSeconds : 0;

          const remainingMB = totalMB - loadedMB;
          const etaSeconds = speedMBps > 0 ? remainingMB / speedMBps : 0;
          const etaMinutes = Math.floor(etaSeconds / 60);
          const etaSecondsRemainder = Math.floor(etaSeconds % 60);

          setProgress(percentage);

          let statusText = `Uploading... ${percentage}% (${loadedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB)`;
          if (speedMBps > 0) {
            statusText += ` • ${speedMBps.toFixed(2)} MB/s`;
            if (etaSeconds > 5) {
              statusText += ` • ETA: ${etaMinutes}m ${etaSecondsRemainder}s`;
            }
          }
          setStatus(statusText);

          if (percentage >= 100) {
            uploadCompleteDetected = true;
            setStatus('Upload complete, processing...');
          }
        },
        onChunkComplete: (_chunkSize, bytesAccepted, bytesTotal) => {
          if (bytesAccepted >= bytesTotal) {
            uploadCompleteDetected = true;
          }
        },
        onAfterResponse: (_req, res) => {
          const httpStatus = res.getStatus();
          const uploadOffset = res.getHeader('Upload-Offset');
          if (httpStatus === 204 && uploadOffset) {
            const offset = parseInt(uploadOffset, 10);
            if (offset >= file.size) {
              uploadCompleteDetected = true;
            }
          }
        },
        onSuccess: () => {
          resolve();
        },
      });

      uploadRef.current = upload;

      // Fallback timeout after 100%
      const startSuccessTimeout = () => {
        if (successTimeoutRef.current) return;
        successTimeoutRef.current = setTimeout(() => {
          if (uploadCompleteDetected) resolve();
        }, 10000);
      };

      const originalOnProgress = upload.options.onProgress;
      upload.options.onProgress = (bytesUploaded: number, bytesTotal: number) => {
        if (originalOnProgress) originalOnProgress(bytesUploaded, bytesTotal);
        if (bytesUploaded >= bytesTotal) startSuccessTimeout();
      };

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  }, []);

  const pollBunnyStatus = useCallback((
    dbVideoId: string,
    tusUploadRef: React.MutableRefObject<tus.Upload | null>
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      let pollCount = 0;
      const maxPolls = 180;
      const pollInterval = 5000;
      let uploadComplete = false;
      let lastBunnyStatus = -1;

      const statusMessages: Record<number, string> = {
        0: 'Queued - waiting for Bunny to start processing...',
        1: 'Processing video...',
        2: 'Encoding video (this may take a few minutes)...',
        3: 'Finished!',
        4: 'Ready!',
      };

      const schedulePoll = (fn: () => void, delay: number) => {
        const id = setTimeout(fn, delay);
        pollTimeoutRef.current = id;
        return id;
      };

      const checkBunny = async () => {
        if (cancelledRef.current) {
          resolve();
          return;
        }

        pollCount++;

        try {
          const response = await fetch(`/api/videos/${dbVideoId}/status`);
          const data = await response.json();

          if (cancelledRef.current) {
            resolve();
            return;
          }

          const hasBunnyStatus = typeof data.bunnyStatus === 'number';

          if (hasBunnyStatus && data.bunnyStatus !== lastBunnyStatus) {
            lastBunnyStatus = data.bunnyStatus;
          }

          if (hasBunnyStatus && data.bunnyStatus >= 0) {
            if (!uploadComplete) {
              uploadComplete = true;
              setProgress(100);
              if (tusUploadRef.current) {
                try { tusUploadRef.current.abort(); } catch {}
              }
            }
          }

          if (data.status === 'ready' || data.bunnyStatus === 3 || data.bunnyStatus === 4) {
            setStatus('Video ready!');
            setProgress(100);
            schedulePoll(() => {
              setUploading(false);
              if (!completionNotifiedRef.current) {
                completionNotifiedRef.current = true;
                onComplete?.(dbVideoId);
              }
            }, 1500);
            resolve();
            return;
          }

          if (data.status === 'error' || data.bunnyStatus === 5) {
            reject(new Error('Video processing failed'));
            return;
          }

          if (hasBunnyStatus) {
            const pctComplete = data.bunnyDetails?.pctComplete || 0;
            let statusMsg = statusMessages[data.bunnyStatus] || `Processing... (status: ${data.bunnyStatus})`;
            if (data.bunnyStatus === 2 && pctComplete > 0) {
              statusMsg = `Encoding video... ${pctComplete}%`;
            }
            const elapsedMinutes = Math.floor((pollCount * pollInterval) / 60000);
            if (elapsedMinutes >= 1) {
              statusMsg += ` (${elapsedMinutes}m elapsed)`;
            }
            setStatus(statusMsg);
          } else {
            setStatus(`Uploading to Bunny.net... (poll ${pollCount})`);
          }

          if (pollCount < maxPolls) {
            schedulePoll(checkBunny, pollInterval);
          } else {
            if (uploadComplete) {
              setUploading(false);
              if (!completionNotifiedRef.current) {
                completionNotifiedRef.current = true;
                onComplete?.(dbVideoId);
              }
              resolve();
            } else {
              reject(new Error('Upload timeout'));
            }
          }
        } catch {
          if (pollCount < maxPolls && !cancelledRef.current) {
            schedulePoll(checkBunny, pollInterval);
          }
        }
      };

      schedulePoll(checkBunny, 3000);
    });
  }, [onComplete]);

  const startUpload = useCallback(async (
    file: File,
    bunnyVideoId: string,
    dbVideoId: string,
    title: string
  ) => {
    cancelledRef.current = false;
    completionNotifiedRef.current = false;
    setUploading(true);
    setProgress(1);
    setStatus('Uploading to Bunny.net Stream...');

    try {
      const accessToken = await getAuthToken();

      const signatureRes = await fetch('/api/videos/upload/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ videoId: bunnyVideoId }),
      });

      if (!signatureRes.ok) throw new Error('Failed to get upload signature');
      const signatureData = await signatureRes.json();

      // Upload the file — wait for it to fully transfer
      await uploadWithTUS(file, bunnyVideoId, title, signatureData);

      // Upload complete — let user continue immediately (like YouTube)
      // Bunny will encode in the background; webhook/polling will update status
      setStatus('Upload complete! Video is processing in the background.');
      setProgress(100);
      setUploading(false);
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true;
        onComplete?.(dbVideoId);
      }

      // Poll in background (no await) to update DB status when encoding finishes
      pollBunnyStatus(dbVideoId, uploadRef).catch(() => {});
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      const msg = error instanceof Error ? error.message : 'Upload failed';
      onError?.(msg);
      throw error;
    }
  }, [getAuthToken, uploadWithTUS, pollBunnyStatus, onComplete, onError]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setUploading(false);
    setProgress(0);
    setStatus('');
    completionNotifiedRef.current = false;
  }, []);

  return {
    uploading,
    progress,
    status,
    startUpload,
    cancelUpload,
  };
}
