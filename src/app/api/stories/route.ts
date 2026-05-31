import { NextRequest, NextResponse } from 'next/server';
import { Story } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';
import { createStory, listStories } from '@/services/story';

function isStory(value: unknown): value is Story {
  if (!value || typeof value !== 'object') return false;
  const story = value as Partial<Story>;
  return typeof story.id === 'string'
    && typeof story.title_en === 'string'
    && typeof story.title_vi === 'string'
    && Array.isArray(story.panels)
    && Array.isArray(story.vocabulary)
    && Array.isArray(story.topics);
}

export async function GET() {
  try {
    const stories = await listStories();
    return NextResponse.json({ stories });
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
    if (!isStory(body.story)) {
      return NextResponse.json({ error: 'Invalid story payload' }, { status: 400 });
    }

    const story = await createStory(body.story);
    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
