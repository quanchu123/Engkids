import { NextRequest, NextResponse } from 'next/server';
import { Story } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';
import { deleteStoryById, getStory, updateStoryById } from '@/services/story';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isStory(value: unknown): value is Story {
  if (!value || typeof value !== 'object') return false;
  const story = value as Partial<Story>;
  return typeof story.id === 'string'
    && typeof story.title_en === 'string'
    && typeof story.title_vi === 'string'
    && typeof story.published === 'boolean'
    && Array.isArray(story.panels)
    && Array.isArray(story.vocabulary)
    && Array.isArray(story.topics);
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
    return NextResponse.json(
      { story: story as Story | null },
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
    if (!isStory(body.story)) {
      return NextResponse.json({ error: 'Invalid story payload' }, { status: 400 });
    }

    const story = await updateStoryById(id, body.story);
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
