# 🏗️ Comic Lingua Kids - Kiến Trúc Dự Án

## 📁 Cấu Trúc Thư Mục

```
comic-lingua-kids/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── admin/             # Admin dashboard
│   │   ├── videos/            # Video pages
│   │   ├── stories/           # Story pages
│   │   ├── progress/          # User progress
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── error.tsx          # Error boundary
│   │   └── global-error.tsx   # Global error handler
│   │
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   └── video/            # Video-specific components
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useToast.ts       # Toast notifications
│   │
│   ├── lib/                  # Core utilities
│   │   ├── constants.ts     # App constants
│   │   ├── env.ts           # Environment validation
│   │   ├── utils.ts         # Helper functions
│   │   ├── rate-limit.ts    # Rate limiting
│   │   └── vtt-parser.ts    # Subtitle parser
│   │
│   ├── services/            # Business logic
│   │   ├── auth.ts         # Authentication
│   │   ├── bunny.ts        # Bunny.net API
│   │   ├── video.ts        # Video operations
│   │   ├── dictionary.ts   # Dictionary API
│   │   └── supabase.ts     # Database client
│   │
│   ├── store/              # State management
│   │   └── useAppStore.ts # Global store (Zustand)
│   │
│   ├── types/              # TypeScript types
│   │   └── index.ts       # Type definitions
│   │
│   └── middleware.ts       # Next.js middleware
│
├── supabase/
│   └── migrations/         # Database migrations
│
└── public/                 # Static assets
```

## 🔧 Các Tầng Kiến Trúc

### 1. **Presentation Layer** (Components)
- React components cho UI
- Client-side rendering với Next.js App Router
- Sử dụng hooks để quản lý state local

**Ví dụ:**
```tsx
import { useToast } from '@/hooks/useToast';
import { VIDEO_CONSTRAINTS } from '@/lib/constants';

export default function VideoUploader() {
  const toast = useToast();
  
  const handleUpload = async () => {
    try {
      // Upload logic
      toast.success('Video uploaded successfully!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };
}
```

### 2. **Business Logic Layer** (Services)
- Xử lý logic nghiệp vụ
- Tương tác với external APIs
- Không phụ thuộc vào UI

**Ví dụ:**
```tsx
// src/services/bunny.ts
export async function uploadToBunny(videoId: string, file: File) {
  // Business logic here
}
```

### 3. **Data Layer** (Database & APIs)
- Supabase PostgreSQL database
- Bunny.net Video Streaming API
- RESTful API routes

## 🎯 Các Pattern Quan Trọng

### 1. **Custom Hooks Pattern**

```tsx

// useToast - Show notifications
const toast = useToast();
toast.success('Success!');
toast.error('Error!');

```

### 2. **API Client Pattern**

```tsx
// Type-safe API calls

try {
  const videos = await apiClient.get<Video[]>('/api/videos');
  const newVideo = await apiClient.post('/api/videos', { title: 'Test' });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message);
  }
}
```

### 3. **Constants Pattern**

```tsx
import { VIDEO_CONSTRAINTS, LEVELS, ROUTES } from '@/lib/constants';

// Validate file
if (file.size > VIDEO_CONSTRAINTS.maxSizeBytes) {
  throw new Error('File too large');
}

// Use constants instead of hardcoded strings
const level = LEVELS.BEGINNER;
navigate(ROUTES.ADMIN_VIDEOS);
```

### 4. **Environment Variables Pattern**

```tsx
import { env } from '@/lib/env';

// Type-safe, validated environment variables
const apiUrl = env.bunnyApiUrl;
const isProduction = env.isProduction;
```

### 5. **Error Handling Pattern**

```tsx
// Error boundaries catch rendering errors
// error.tsx và global-error.tsx

// API errors
try {
  await uploadVideo();
} catch (error) {
  const message = getErrorMessage(error);
  toast.error(message);
}
```

### 6. **Utility Functions Pattern**

```tsx
import { formatFileSize, formatDuration, cn, retry } from '@/lib/utils';

// Format utilities
const size = formatFileSize(1024 * 1024); // "1 MB"
const duration = formatDuration(125); // "2:05"

// Tailwind class merging
const className = cn('base-class', condition && 'conditional-class');

// Retry with backoff
const result = await retry(fetchData, { maxAttempts: 3 });
```

## 🔐 Security Best Practices

### 1. **Rate Limiting**
```tsx
// middleware.ts
// Tự động rate limit cho API routes
// 100 requests/15min cho general
// 10 requests/15min cho upload
```

### 2. **Admin Protection**
```tsx
// middleware.ts
// Tự động redirect nếu không có admin_token
// Protect tất cả /admin/* routes
```

### 3. **Environment Validation**
```tsx
// lib/env.ts
// Validate tất cả required env vars khi app start
// Throw error nếu thiếu config
```

## 📊 Data Flow

```
User Action
    ↓
Component (Presentation)
    ↓
Custom Hook (State Management)
    ↓
API Client / Service (Business Logic)
    ↓
API Route / External API
    ↓
Database / External Service
    ↓
Response back through layers
    ↓
Update UI + Show Toast
```

## 🎨 Styling Guidelines

### Tailwind CSS
- Sử dụng `cn()` utility để merge classes
- Responsive design: `sm:`, `md:`, `lg:`, `xl:`
- Dark mode ready: `dark:` prefix

```tsx
import { cn } from '@/lib/utils';

<button className={cn(
  'px-4 py-2 rounded',
  'hover:bg-blue-600',
  'disabled:opacity-50',
  isActive && 'bg-blue-500'
)}>
  Click me
</button>
```

## 🧪 Testing Strategy

### Unit Tests
- Test utilities trong `lib/utils.ts`
- Test custom hooks
- Test service functions

### Integration Tests
- Test API routes
- Test database operations
- Test Bunny.net integration

### E2E Tests
- Test complete user flows
- Test video upload process
- Test admin dashboard

## 📝 Code Style Guidelines

### TypeScript
```tsx
// ✅ Good - Type-safe
interface Props {
  title: string;
  onSubmit: (data: FormData) => Promise<void>;
}

// ❌ Bad - Using any
function handleSubmit(data: any) {
  // ...
}
```

### Naming Conventions
```tsx
// Components: PascalCase
export default function VideoUploader() {}

// Hooks: camelCase with 'use' prefix
export function useToast() {}

// Constants: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 1024;

// Functions: camelCase
export function formatFileSize() {}

// Types/Interfaces: PascalCase
export interface Video {}
export type VideoStatus = 'ready' | 'processing';
```

### File Organization
```tsx
// Order of imports
import React from 'react';           // 1. External libs
import { useRouter } from 'next/navigation'; // 2. Next.js
import { Button } from '@/components/ui/button'; // 4. Components
import { VIDEO_CONSTRAINTS } from '@/lib/constants'; // 5. Constants
import type { Video } from '@/types'; // 6. Types

// Order in component
export default function Component() {
  // 1. Hooks
  const router = useRouter();
  const toast = useToast();
  
  // 2. State
  const [state, setState] = useState();
  
  // 3. Effects
  useEffect(() => {}, []);
  
  // 4. Handlers
  const handleClick = () => {};
  
  // 5. Render
  return <div />;
}
```

## 🚀 Performance Tips

### 1. Code Splitting
```tsx
// Lazy load heavy components
const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), {
  loading: () => <LoadingSpinner />,
});
```

### 2. Memoization
```tsx
// Memo expensive calculations
const sortedVideos = useMemo(() => 
  videos.sort((a, b) => a.title.localeCompare(b.title)),
  [videos]
);

// Memo callbacks
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### 3. Image Optimization
```tsx
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/thumbnail.jpg"
  width={300}
  height={200}
  alt="Video thumbnail"
/>
```

## 📦 Package Management

### Core Dependencies
- **next**: Framework
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Styling
- **@supabase/supabase-js**: Database
- **zustand**: State management

### Development Tools
- **eslint**: Linting
- **prettier**: Code formatting
- **typescript**: Type checking

## 🔄 State Management

### Local State
```tsx
// Component state
const [value, setValue] = useState();
```

### Global State
```tsx
// Zustand store
import { useAppStore } from '@/store/useAppStore';

const { user, setUser } = useAppStore();
```

### Server State
```tsx
// React Query (if needed)
const { data, isLoading } = useQuery('videos', fetchVideos);
```

### Persistent State
```tsx
// localStorage
```

## 🎓 Học Cách Dùng

### 1. Tạo Component Mới
```bash
# Tạo file
touch src/components/MyComponent.tsx
```

```tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

export default function MyComponent() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const handleAction = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/endpoint', { data });
      toast.success('Success!');
    } catch (error) {
      toast.error('Failed!');
    } finally {
      setLoading(false);
    }
  };
  
  return <button onClick={handleAction}>Action</button>;
}
```

### 2. Tạo API Route Mới
```tsx
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    );
  }
}
```

### 3. Thêm Constant Mới
```tsx
// lib/constants.ts
export const MY_CONFIG = {
  MAX_ITEMS: 100,
  TIMEOUT_MS: 5000,
} as const;
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Bunny.net Stream API](https://docs.bunny.net/reference/video-streaming-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
