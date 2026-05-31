import { TOPICS } from '@/config/constants';
import { Video } from '@/types';

// Ophim69 là SPA React không có API public và bắt đăng nhập
// Giải pháp: Dùng YouTube videos cho Doraemon và Shin
// Có thể thay đổi YouTube video IDs tùy ý
const FEATURED_ANIME: Array<{
  id: string;
  title: string;
  titleVi: string;
  description: string;
  thumbnailUrl: string;
  youtubeVideoId: string;
  year: number;
  topics: string[];
}> = [
  {
    id: 'doraemon',
    title: 'Doraemon',
    titleVi: 'Đôrêmon - Chú mèo máy đến từ tương lai',
    description:
      'Doraemon là một chú mèo máy thông minh đến từ thế kỷ 22 để giúp đỡ cậu bé Nobita. Với chiếc túi thần kỳ, Doraemon luôn mang ra những bảo bối kỳ diệu để giúp đỡ mọi người.',
    thumbnailUrl: 'https://img.youtube.com/vi/5Jh8VvTjVQ8/maxresdefault.jpg',
    youtubeVideoId: '5Jh8VvTjVQ8', // Thay bằng YouTube video ID thật
    year: 1979,
    topics: ['Adventure', 'Friendship', 'Daily Life'],
  },
  {
    id: 'shinchan',
    title: 'Crayon Shin-chan',
    titleVi: 'Shin - Cậu Bé Bút Chì',
    description:
      'Shinichi Nohara (biệt danh Shin) là một cậu bé 5 tuổi vô cùng tinh nghịch và hài hước. Bộ phim kể về cuộc sống hàng ngày của Shin với gia đình và bạn bè.',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    youtubeVideoId: 'dQw4w9WgXcQ', // Thay bằng YouTube video ID thật
    year: 1992,
    topics: ['Daily Life', 'Family', 'School'],
  },
];

function inferLevel(year: number): Video['level'] {
  if (year < 2000) return 'Beginner';
  return 'Elementary';
}

function mapFeaturedToVideo(item: typeof FEATURED_ANIME[number]): Video {
  return {
    id: `youtube-${item.id}`,
    title: item.title,
    titleVi: item.titleVi,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    bannerUrl: undefined,
    bunnyVideoId: '',
    sourceType: 'youtube',
    sourceLabel: 'YouTube',
    youtubeVideoId: item.youtubeVideoId,
    externalUrl: `https://www.youtube.com/watch?v=${item.youtubeVideoId}`,
    externalLinks: [
      {
        title: 'Xem trên YouTube',
        url: `https://www.youtube.com/watch?v=${item.youtubeVideoId}`,
        site: 'YouTube',
        thumbnailUrl: item.thumbnailUrl,
      },
    ],
    duration: 24 * 60, // ~24 phút mỗi tập
    level: inferLevel(item.year),
    topics: item.topics,
    ageGroup: '6-8',
    category: 'video',
    status: 'ready',
    subtitles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function isOphimVideoId(id: string): boolean {
  return /^youtube-(doraemon|shinchan)$/.test(id);
}

export async function getOphimAnimeCatalog(limit: number = 2): Promise<Video[]> {
  return FEATURED_ANIME.slice(0, limit).map(mapFeaturedToVideo);
}

export async function getOphimAnimeById(id: string): Promise<Video | null> {
  if (!isOphimVideoId(id)) return null;

  const animeId = id.replace('youtube-', '');
  const item = FEATURED_ANIME.find((a) => a.id === animeId);
  return item ? mapFeaturedToVideo(item) : null;
}

export async function searchOphimAnime(
  query: string
): Promise<Array<{ id: string; name: string; slug: string; poster_url: string }>> {
  const q = query.toLowerCase();
  return FEATURED_ANIME.filter(
    (a) => a.title.toLowerCase().includes(q) || a.titleVi.toLowerCase().includes(q)
  ).map((a) => ({
    id: a.id,
    name: a.title,
    slug: a.id,
    poster_url: a.thumbnailUrl,
  }));
}
