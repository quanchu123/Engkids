import { Video } from '@/types';

export function normalizeStoredVideoStatus(input: {
  status: string;
  hlsUrl?: string | null;
  dashUrl?: string | null;
}): Video['status'] {
  if (input.status === 'ready') return 'ready';
  if (input.status === 'error' || input.status === 'failed') return 'error';
  if (input.status === 'uploading') return 'uploading';

  if (input.hlsUrl || input.dashUrl) {
    return 'ready';
  }

  return 'processing';
}

export function mapBunnyStatusCode(statusCode: number, hasContent: boolean = true): Video['status'] {
  switch (statusCode) {
    case 0:
      return hasContent ? 'processing' : 'uploading';
    case 1:
    case 2:
      return 'processing';
    case 3:
    case 4:
    case 9:
    case 10:
      return 'ready';
    case 5:
    case 8:
      return 'error';
    case 6:
      return 'uploading';
    case 7:
      return 'processing';
    default:
      return 'processing';
  }
}
