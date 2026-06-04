# 📚 ComicLingua Kids - Codebase Documentation

**Project:** Interactive English Learning Platform for Children (Ages 5-10)  
**Version:** 2.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## 🎯 Project Overview

ComicLingua Kids là một nền tảng web tương tác giúp trẻ em học tiếng Anh thông qua:

### ✨ Core Features
- 📖 **Comic Stories** - Các câu chuyện dưới dạng truyện tranh với tiếng Việt
- 🎥 **Video Learning** - Video học có subtitle tương tác (như FluentU)
- 📚 **Click-to-Learn Dictionary** - Nhấp vào từ để xem định nghĩa + phát âm
- 🎮 **Mini Games** - Trò chơi nhớ từ, quiz, v.v.
- 📊 **Progress Tracking** - Theo dõi tiến độ học của học sinh
- 🎵 **Music & Gamification** - Âm nhạc và hệ thống điểm
- 👨‍💼 **Admin Panel** - Quản lý nội dung (câu chuyện, video, game)
- 🎬 **Professional Video Hosting** - Bunny.net Stream

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | Next.js 14 (App Router) + React 18 + TypeScript |
| **Styling** | Tailwind CSS + Framer Motion (animations) |
| **State Management** | Zustand |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Video Hosting** | Bunny.net Stream + TUS (resumable uploads) |
| **External APIs** | Dictionary API, MyMemory Translation API |
| **Testing** | Playwright (E2E) |

---

## 📂 Project Structure (Chi Tiết)

```
Engkids-master/
├── src/
│   ├── app/                          # Next.js App Router (routing)
│   │   ├── api/                      # API routes (backend endpoints)
│   │   │   ├── admin/               # Admin endpoints
│   │   │   ├── stories/             # Story CRUD
│   │   │   ├── videos/              # Video CRUD
│   │   │   ├── progress/            # User progress endpoints
│   │   │   └── auth/                # Authentication routes
│   │   │
│   │   ├── admin/                    # Admin Dashboard
│   │   │   ├── page.tsx             # Admin home
│   │   │   ├── stories/             # Story management
│   │   │   │   ├── page.tsx        # List stories
│   │   │   │   ├── new/            # Create story
│   │   │   │   └── [id]/           # Edit story
│   │   │   ├── videos/              # Video management
│   │   │   │   ├── page.tsx        # List videos
│   │   │   │   ├── new/            # Upload video
│   │   │   │   └── [id]/           # Edit video
│   │   │   └── users/               # User management
│   │   │
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login/              # Login page
│   │   │   └── signup/             # Sign up page
│   │   │
│   │   ├── stories/                  # Story Reader
│   │   │   ├── page.tsx             # Story list
│   │   │   └── [id]/                # Story detail page
│   │   │       ├── page.tsx         # Story reader
│   │   │       ├── vocab/           # Vocabulary for story
│   │   │       └── games/           # Games for story
│   │   │
│   │   ├── videos/                   # Video Learning
│   │   │   ├── page.tsx             # Video list
│   │   │   └── [id]/                # Video player
│   │   │       └── page.tsx         # Video detail
│   │   │
│   │   ├── progress/                 # User Progress Page
│   │   ├── music/                    # Music player
│   │   ├── games/                    # Game pages
│   │   │   ├── memory/
│   │   │   ├── quiz/
│   │   │   └── word-collector/
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── error.tsx                 # Error boundary
│   │   ├── global-error.tsx          # Global error
│   │   ├── loading.tsx               # Loading page
│   │   ├── not-found.tsx             # 404 page
│   │   ├── globals.css               # Global styles
│   │   └── middleware.ts             # Next.js middleware
│   │
│   ├── components/                   # React Components (Reusable)
│   │   ├── AdminGuard.tsx            # Admin auth guard
│   │   ├── SmartPopup.tsx            # Popup component
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── StoryForm.tsx
│   │   │   ├── VideoUploader.tsx
│   │   │   └── UserManager.tsx
│   │   ├── auth/                     # Auth components
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── common/                   # Shared components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── NavBar.tsx
│   │   │   └── Loading.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── PageLayout.tsx
│   │   │   └── Container.tsx
│   │   ├── pages/                    # Page-specific components
│   │   ├── story/                    # Story components
│   │   │   ├── StoryReader.tsx
│   │   │   ├── ComicPanel.tsx
│   │   │   └── VocabularyPanel.tsx
│   │   └── video/                    # Video components
│   │       ├── VideoPlayer.tsx
│   │       ├── Subtitles.tsx
│   │       └── WordClickHandler.tsx
│   │
│   ├── config/                       # Configuration
│   │   ├── admin.ts                  # Admin settings
│   │   ├── auth.ts                   # Auth config
│   │   ├── constants.ts              # App constants
│   │   ├── env.ts                    # Environment validation
│   │   ├── index.ts                  # Config exports
│   │   └── storage.ts                # Storage config
│   │
│   ├── data/                         # Static data
│   │   ├── game-defaults.ts          # Default game configs
│   │   └── stories.ts                # Sample stories
│   │
│   ├── hooks/                        # Custom React Hooks
│   │   ├── useStoryForm.ts           # Story form logic
│   │   └── useToast.ts               # Toast notifications
│   │
│   ├── lib/                          # Core Utilities
│   │   ├── admin-access.ts           # Admin authorization
│   │   ├── admin-auth-client.ts      # Admin auth client
│   │   ├── analytics.ts              # Analytics tracking
│   │   ├── api-auth.ts               # API authentication
│   │   ├── auth-client.ts            # Auth client
│   │   ├── cache.ts                  # Caching logic
│   │   ├── content-selectors.ts      # Content queries
│   │   ├── progress.ts               # Progress calculations
│   │   └── rate-limit.ts             # Rate limiting
│   │
│   ├── services/                     # Business Logic Services
│   │   ├── bunny.ts                  # Bunny.net Video API
│   │   ├── dictionary.ts             # Dictionary API integration
│   │   ├── supabase.ts               # Database client
│   │   └── storage.ts                # Storage operations
│   │
│   ├── store/                        # State Management (Zustand)
│   │   └── useAppStore.ts            # Global app state
│   │
│   ├── types/                        # TypeScript Type Definitions
│   │   └── index.ts                  # All type exports
│   │
│   ├── middleware.ts                 # Next.js middleware
│   └── content.json                  # Content data file
│
├── supabase/                         # Database Layer
│   ├── FULL_DATABASE_SETUP.sql       # Complete DB setup
│   ├── seed-stories.sql              # Sample data
│   └── migrations/                   # Database migrations
│       ├── 001_*.sql                 # Initial schema
│       ├── 002_*.sql                 # Schema updates
│       └── 003_*.sql                 # Recent changes
│
├── public/                           # Static Files
│   ├── games/                        # Phaser game files
│   │   ├── candy-crush/
│   │   ├── mario-word/
│   │   ├── rpg-battle/
│   │   ├── rpg-world/
│   │   ├── space-invaders/
│   │   ├── tank-word/
│   │   └── word-collector/
│   └── uploads/                      # User uploads
│
├── tests/                            # Testing
│   └── e2e/                          # Playwright E2E tests
│
├── skills/                           # Documentation & Skills
│   ├── design-md/                    # Design markdown documentation
│   ├── enhance-prompt/               # Prompt enhancement
│   ├── react-components/             # React component patterns
│   ├── remotion/                     # Remotion video library
│   ├── shadcn-ui/                    # shadcn/ui component library
│   ├── stitch-design/                # Design stitching
│   └── stitch-loop/                  # Loop stitching
│
├── .env.example                      # Environment template
├── .github/                          # GitHub workflows
├── next.config.js                    # Next.js config
├── tailwind.config.js                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── Dockerfile                        # Docker container
├── playwright.config.ts              # Playwright config
└── README.md                         # Project README
```

---

## 🏗️ Architecture Layers

### 1. **Presentation Layer** (UI/Components)
**Location:** `src/components/`, `src/app/`

Components được chia thành các loại:
- **Layout Components:** Header, Footer, Navigation
- **Common Components:** Buttons, Modals, Loading spinners
- **Feature Components:** Story reader, Video player, Game board
- **Admin Components:** Forms, Managers, Dashboards

```tsx
// Example: Story Component
import { useToast } from '@/hooks/useToast';
import { getStory } from '@/lib/content-selectors';

export default function StoryReader({ storyId }) {
  const { data: story } = getStory(storyId);
  const toast = useToast();
  
  return (
    <div className="story-container">
      {story.panels.map(panel => (
        <Panel key={panel.id} data={panel} />
      ))}
    </div>
  );
}
```

### 2. **Business Logic Layer** (Services)
**Location:** `src/services/`, `src/lib/`

Xử lý logic nghiệp vụ, không phụ thuộc vào UI:
- API integrations (Bunny.net, Dictionary, Translation)
- Data transformations
- Authentication logic
- Rate limiting

```tsx
// Example: Video Service
export async function uploadVideo(
  file: File, 
  title: string, 
  metadata: VideoMetadata
) {
  const bunnyId = await uploadToBunny(file);
  const video = await saveToDB(bunnyId, title, metadata);
  return video;
}
```

### 3. **Data Access Layer** (Database & APIs)
**Location:** `src/app/api/`, `supabase/`, `src/services/`

- **Database:** Supabase PostgreSQL
- **External APIs:** Bunny.net, Dictionary API, MyMemory
- **API Routes:** Next.js API handlers

```tsx
// Example: API Route
export async function POST(request: Request) {
  const body = await request.json();
  const video = await createVideo(body);
  return Response.json(video);
}
```

### 4. **State Management Layer** (Zustand)
**Location:** `src/store/`

Global app state:
```tsx
import { create } from 'zustand';

export const useAppStore = create((set) => ({
  user: null,
  theme: 'light',
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
}));
```

---

## 🔐 Key Features & Implementation

### 1. Story Reader System
- **Files:** `src/app/stories/[id]/page.tsx`, `src/components/story/`
- **Features:**
  - Interactive comic panels
  - Click-to-learn vocabulary
  - Bilingual text (English + Vietnamese)
  - Progress tracking

### 2. Video Learning
- **Files:** `src/app/videos/[id]/page.tsx`, `src/components/video/`
- **Features:**
  - Bunny.net video streaming
  - Interactive subtitles with timestamps
  - Click-on-word to see definition
  - Vocabulary extraction

### 3. Mini Games
- **Location:** `public/games/` (Phaser games)
- **Types:**
  - Memory Match
  - Word Quiz
  - Word Collector (platformer)
  - RPG games

### 4. Admin Panel
- **Files:** `src/app/admin/`
- **Capabilities:**
  - Story CRUD (Create, Read, Update, Delete)
  - Video upload (with TUS resumable upload)
  - User management
  - Content moderation

### 5. Authentication
- **Provider:** Supabase Auth
- **Types:** Email/Password, OAuth
- **Admin:** Special role-based access control

---

## 🗄️ Database Schema (Supabase)

### Main Tables

```sql
-- Users
users (
  id: uuid,
  email: string,
  name: string,
  role: 'user' | 'admin',
  created_at: timestamp
)

-- Stories
stories (
  id: uuid,
  title: string,
  description: text,
  content: jsonb,  -- Comic panels data
  language: string,
  created_at: timestamp
)

-- Videos
videos (
  id: uuid,
  title: string,
  description: text,
  bunny_video_id: string,  -- Bunny.net ID
  duration: integer,
  subtitles_vtt: text,  -- VTT format
  created_at: timestamp
)

-- User Progress
progress (
  id: uuid,
  user_id: uuid,
  story_id: uuid,
  video_id: uuid,
  progress: integer (0-100),
  completed_at: timestamp
)

-- Vocabulary
vocabulary (
  id: uuid,
  user_id: uuid,
  word: string,
  definition: text,
  pronunciation: text,
  example: text,
  saved_at: timestamp
)
```

---

## 🚀 Development Workflow

### Setup Environment
```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables (.env.local)
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, BUNNY_* keys

# 3. Initialize database
npx supabase db push

# 4. Start development server
npm run dev
```

### Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix linting issues |
| `npm run type-check` | TypeScript type checking |
| `npm run test:e2e` | Run Playwright E2E tests |

---

## 📝 Key Code Patterns

### 1. Custom Hooks
```tsx
// src/hooks/useToast.ts
export function useToast() {
  return {
    success: (message: string) => { /* ... */ },
    error: (message: string) => { /* ... */ },
    info: (message: string) => { /* ... */ },
  };
}

// Usage
const toast = useToast();
toast.success('Operation successful!');
```

### 2. Server-Side Rendering (SSR)
```tsx
// src/app/stories/page.tsx
export async function generateMetadata() {
  return { title: 'Stories' };
}

export default async function StoriesPage() {
  const stories = await fetchStories();
  return <StoryList stories={stories} />;
}
```

### 3. API Route Authentication
```tsx
// src/app/api/stories/route.ts
import { verifyAuth } from '@/lib/api-auth';

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth.user) return new Response('Unauthorized', { status: 401 });
  
  // Protected logic
}
```

### 4. Type Safety
```tsx
// src/types/index.ts
export type Story = {
  id: string;
  title: string;
  panels: ComicPanel[];
  vocabulary: Word[];
};

// Usage with type checking
const story: Story = await fetchStory(id);
```

---

## 🧪 Testing

### Playwright E2E Tests
**Location:** `tests/e2e/`

```bash
# Run all tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/login.spec.ts

# Debug mode
npx playwright test --debug
```

### Example Test
```tsx
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@test.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL('/');
});
```

---

## 🔑 Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxx

# Bunny.net
BUNNY_API_KEY=xxxxxxx
BUNNY_LIBRARY_ID=xxxxxx
NEXT_PUBLIC_BUNNY_CDN=https://xxxx.b-cdn.net

# External APIs
NEXT_PUBLIC_DICT_API_KEY=xxxxxxx
NEXT_PUBLIC_TRANSLATION_API_URL=https://api.mymemory.translated.net

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📊 Performance & Optimization

1. **Image Optimization:** Next.js `<Image>` component
2. **Code Splitting:** Automatic by Next.js
3. **Database Caching:** Server-side caching with Supabase
4. **Video Streaming:** Bunny.net CDN
5. **Rate Limiting:** Implemented in `src/lib/rate-limit.ts`

---

## 🐛 Debugging Tips

1. **Enable debug logs:**
   ```tsx
   // Add to .env.local
   DEBUG=*
   ```

2. **Check database state:**
   ```bash
   npx supabase db inspect
   ```

3. **Browser DevTools:**
   - Network tab: Check API calls
   - Console: Check JS errors
   - Application: Check localStorage/cookies

4. **VS Code Debugging:**
   - Install Debugger for Chrome
   - Set breakpoints
   - Run: `npm run dev`

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 🤝 Contributing Guidelines

1. Follow the existing folder structure
2. Use TypeScript for all new files
3. Add types to function parameters
4. Keep components small and focused
5. Write meaningful commit messages
6. Test changes with `npm run type-check` before committing

---

**Last Updated:** January 2026  
**Maintainer:** Development Team  
**Status:** ✅ Production Ready
