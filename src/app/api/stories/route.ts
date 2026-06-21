import { NextRequest, NextResponse } from 'next/server';
import { Story } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';
import { createStory, listStories, listStoriesAdmin, listStorySummaries } from '@/services/story';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeStory(value: unknown): Story | null {
  if (!value || typeof value !== 'object') return null;
  const story = value as Partial<Story>;
  const valid = typeof story.id === 'string'
    && typeof story.title_en === 'string'
    && typeof story.title_vi === 'string'
    && Array.isArray(story.panels)
    && Array.isArray(story.vocabulary)
    && Array.isArray(story.topics);

  if (!valid) return null;

  return {
    id: story.id!,
    title_en: story.title_en!,
    title_vi: story.title_vi!,
    level: story.level || 'Beginner',
    topics: story.topics || [],
    cover_image: story.cover_image || '',
    estimated_minutes: story.estimated_minutes || Math.max(1, Math.ceil((story.panels || []).length * 0.5)),
    published: typeof story.published === 'boolean' ? story.published : true,
    panels: story.panels || [],
    vocabulary: story.vocabulary || [],
    games: story.games || { match: [], fill_blank: [] },
  };
}

export async function GET(request: NextRequest) {
  try {
    const includeDrafts = request.nextUrl.searchParams.get('all') === 'true';
    const summaryOnly = request.nextUrl.searchParams.get('summary') === '1';
    if (includeDrafts) {
      const isAuthed = await checkAdminAuth(request);
      if (!isAuthed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const stories = summaryOnly && !includeDrafts
      ? await listStorySummaries()
      : includeDrafts
        ? await listStoriesAdmin()
        : await listStories();
    return NextResponse.json(
      { stories },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { story?: unknown };
    const storyPayload = normalizeStory(body.story);
    if (!storyPayload) {
      return NextResponse.json({ error: 'Invalid story payload' }, { status: 400 });
    }

    const story = await createStory(storyPayload);
    revalidatePath('/');
    revalidatePath('/stories');
    return NextResponse.json(
      { story },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
