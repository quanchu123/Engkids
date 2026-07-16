import { NextRequest, NextResponse } from 'next/server';
import { Story } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';
import { deleteStoryById, getStory, redactPremiumStoryContent, updateStoryById } from '@/services/story';
import { canAccessPremiumStories } from '@/lib/server/story-access';
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
    premium_only: typeof story.premium_only === 'boolean' ? story.premium_only : false,
    panels: story.panels || [],
    vocabulary: story.vocabulary || [],
    games: story.games || { match: [], fill_blank: [] },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const includeDraft = request.nextUrl.searchParams.get('admin') === 'true';
    if (includeDraft) {
      const isAuthed = await checkAdminAuth(request);
      if (!isAuthed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const story = await getStory(id, includeDraft);
    if (!story) {
      return NextResponse.json(
        { story: null },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      );
    }

    if (story.premium_only && !includeDraft) {
      const allowed = await canAccessPremiumStories(request);
      if (!allowed) {
        return NextResponse.json(
          {
            story: redactPremiumStoryContent(story),
            locked: true,
            error: 'premium_required',
          },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
      }
    }

    return NextResponse.json(
      { story: story as Story, locked: false },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { story?: unknown };
    const storyPayload = normalizeStory(body.story);
    if (!storyPayload) {
      return NextResponse.json({ error: 'Invalid story payload' }, { status: 400 });
    }

    const story = await updateStoryById(id, storyPayload);
    revalidatePath('/');
    revalidatePath('/stories');
    revalidatePath(`/stories/${id}`);
    return NextResponse.json(
      { story },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteStoryById(id);
    revalidatePath('/');
    revalidatePath('/stories');
    revalidatePath(`/stories/${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}
