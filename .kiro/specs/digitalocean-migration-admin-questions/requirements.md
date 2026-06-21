# Requirements Document

## Introduction

This feature migrates the ComicLingua Kids video layer from Bunny.net Stream to DigitalOcean Spaces (an S3-compatible object store) with the DigitalOcean Spaces CDN for playback. The goal is for the application to rely on DigitalOcean for both **storing** video files and **playing** them, removing all Bunny.net code paths. The Supabase PostgreSQL database is retained for all metadata, stories, quizzes, admin auth, and progress (no database migration).

In addition, this feature closes a content-management gap: administrators must be able to edit **all** question content from the admin panel. Today, video quiz questions (`videos.quiz`) are editable, but the in-story mini-game questions (`stories.games` — the Match game and Fill-in-the-Blank game) are not editable through the admin UI. This feature adds a story-games editor so admins can create and edit those questions.

Confirmed scope decisions (from clarification with the user):
- Keep Supabase as the database; do not migrate the database to DigitalOcean.
- Move video storage and playback to DigitalOcean Spaces + Spaces CDN.
- Remove Bunny.net entirely from the codebase.
- Migrate all existing Bunny.net videos to DigitalOcean Spaces.
- Support direct browser-to-Spaces uploads of files up to approximately 2 GB.
- Videos are public and served via the Spaces CDN.
- Videos are played as direct MP4 via the native HTML `<video>` element (no HLS encoding).

## Glossary

- **Spaces**: DigitalOcean Spaces, an S3-compatible object storage service used to store uploaded video files.
- **Spaces_CDN**: The DigitalOcean Content Delivery Network edge endpoint that serves Spaces objects publicly over HTTPS.
- **Storage_Service**: The server-side module that integrates with Spaces using the S3 protocol (generate upload credentials, build public URLs, delete objects).
- **Video_Service**: The server-side module that performs CRUD on the `videos` table in Supabase and resolves playable URLs.
- **Video_Uploader**: The admin-facing client component that uploads a selected video file directly from the browser to Spaces and then records metadata.
- **Video_Player**: The client component that plays a stored MP4 video using the native HTML `<video>` element.
- **Presigned_Upload**: A time-limited, signed S3 request (presigned URL or presigned POST) that authorizes the browser to upload one object directly to Spaces without exposing Spaces secret keys.
- **Public_URL**: The HTTPS URL on the Spaces_CDN (or Spaces origin) at which a stored video object can be fetched for playback.
- **Object_Key**: The unique path/name of a stored object within a Spaces bucket.
- **Quiz_Question**: A multiple-choice question attached to a video, stored in `videos.quiz` (fields: `question`, `questionVi?`, `options`, `correctIndex`, `explanation?`, `timeCode?`).
- **Match_Item**: One entry of the in-story Match game, stored in `stories.games.match` (fields: `word`, `vi`, `image?`).
- **Fill_Blank_Item**: One entry of the in-story Fill-in-the-Blank game, stored in `stories.games.fill_blank` (fields: `sentence_en`, `answer`, `choices`).
- **Story_Games_Editor**: The admin UI for creating and editing `Match_Item` and `Fill_Blank_Item` entries for a story.
- **Admin**: An authenticated administrator (verified via the existing JWT or Supabase admin auth in `checkAdminAuth`).
- **Migration_Tool**: A one-time script that copies existing Bunny.net video files into Spaces and updates the corresponding `videos` rows.

## Requirements

### Requirement 1: Store videos in DigitalOcean Spaces

**User Story:** As an administrator, I want uploaded videos to be stored in DigitalOcean Spaces, so that the application relies only on DigitalOcean for video storage.

#### Acceptance Criteria

1. WHEN an Admin requests to upload a video, THE Storage_Service SHALL generate a Presigned_Upload that authorizes a single direct browser-to-Spaces upload to a unique Object_Key.
2. THE Storage_Service SHALL generate each Object_Key as a unique value that does not collide with existing Object_Keys in the bucket.
3. WHEN the Storage_Service generates a Presigned_Upload, THE Storage_Service SHALL restrict the upload to the configured video content types and to a maximum object size of 2 GB.
4. IF the requested file extension is not in the allowed set (mp4, webm, mov, ogg), THEN THE Storage_Service SHALL reject the request with a validation error and SHALL NOT generate a Presigned_Upload.
5. WHERE Spaces credentials are not configured, THE Storage_Service SHALL return a configuration error identifying the missing settings.
6. THE Storage_Service SHALL keep all Spaces secret credentials server-side and SHALL NOT expose them to the client.

### Requirement 2: Play videos from the DigitalOcean Spaces CDN

**User Story:** As a learner, I want to watch videos served from DigitalOcean, so that playback works without any Bunny.net dependency.

#### Acceptance Criteria

1. WHEN the Video_Service resolves a stored video, THE Video_Service SHALL produce a Public_URL on the Spaces_CDN for that video's Object_Key.
2. WHEN the Video_Player receives a video with a Public_URL, THE Video_Player SHALL play the file using the native HTML `<video>` element with the Public_URL as its source.
3. IF a video has no resolvable Public_URL, THEN THE Video_Player SHALL display a "video not found" message instead of an empty player.
4. THE Video_Service SHALL build the Public_URL deterministically from the configured Spaces_CDN base and the stored Object_Key.

### Requirement 3: Record and manage video metadata

**User Story:** As an administrator, I want video metadata recorded after upload, so that videos appear in the catalog and can be managed.

#### Acceptance Criteria

1. WHEN a browser-to-Spaces upload completes, THE Video_Service SHALL create a `videos` row that stores the Object_Key and marks the video status as ready.
2. WHEN the Video_Service creates a video row, THE Video_Service SHALL require a non-empty English title and a non-empty Vietnamese title.
3. WHEN an Admin deletes a video, THE Video_Service SHALL remove the `videos` row and THE Storage_Service SHALL delete the corresponding Spaces object.
4. WHEN an Admin updates video metadata (title, Vietnamese title, description, level, topics, age group, category), THE Video_Service SHALL persist the updated values.
5. THE Video_Service SHALL return only videos whose status is ready to public (non-admin) catalog requests.

### Requirement 4: Remove Bunny.net from the codebase

**User Story:** As a developer, I want all Bunny.net code, configuration, and dependencies removed, so that the application uses only DigitalOcean for video.

#### Acceptance Criteria

1. THE application SHALL NOT reference Bunny.net API endpoints, the Bunny TUS upload endpoint, or Bunny CDN hostnames in any runtime code path.
2. THE application SHALL NOT require the environment variables BUNNY_API_KEY, BUNNY_LIBRARY_ID, NEXT_PUBLIC_BUNNY_LIBRARY_ID, NEXT_PUBLIC_BUNNY_CDN_HOSTNAME, BUNNY_CDN_SECURITY_KEY, or BUNNY_WEBHOOK_SECRET for video upload or playback to function.
3. WHEN the application builds and type-checks, THE build SHALL complete successfully with all Bunny.net modules removed.
4. THE environment configuration validation SHALL require the DigitalOcean Spaces settings and SHALL NOT require any Bunny.net settings.
5. THE DigitalOcean App Platform spec and environment example files SHALL describe the Spaces settings and SHALL NOT contain Bunny.net settings.

### Requirement 5: Migrate existing Bunny.net videos to Spaces

**User Story:** As an administrator, I want my existing Bunny.net videos moved to DigitalOcean Spaces, so that previously uploaded content keeps playing after the migration.

#### Acceptance Criteria

1. WHEN the Migration_Tool runs for a video that has a Bunny video reference, THE Migration_Tool SHALL download the source file and upload it to Spaces under a new Object_Key.
2. WHEN the Migration_Tool uploads a video to Spaces, THE Migration_Tool SHALL update that video's `videos` row to reference the new Object_Key and to resolve to a Spaces Public_URL.
3. IF a video's source file cannot be retrieved, THEN THE Migration_Tool SHALL record the failure for that video and SHALL continue processing the remaining videos.
4. WHEN the Migration_Tool is run again after a successful migration of a video, THE Migration_Tool SHALL skip videos already migrated to Spaces.
5. WHEN the Migration_Tool finishes, THE Migration_Tool SHALL report the count of migrated, skipped, and failed videos.

### Requirement 6: Edit video quiz questions

**User Story:** As an administrator, I want to edit the multiple-choice questions attached to a video, so that I can correct and improve quiz content.

#### Acceptance Criteria

1. WHEN an Admin saves a video's quiz, THE Video_Service SHALL replace the stored `videos.quiz` array with the submitted questions.
2. IF any submitted Quiz_Question has an empty question text, THEN THE Video_Service SHALL reject the save with a validation error identifying the question.
3. IF any submitted Quiz_Question has fewer than 2 or more than 4 options, THEN THE Video_Service SHALL reject the save with a validation error identifying the question.
4. IF any submitted Quiz_Question has an option that is empty after trimming, THEN THE Video_Service SHALL reject the save with a validation error identifying the question.
5. IF any submitted Quiz_Question has a `correctIndex` that is outside the range of its options, THEN THE Video_Service SHALL reject the save with a validation error identifying the question.
6. IF a quiz save is requested without Admin authentication, THEN THE Video_Service SHALL reject the request as unauthorized.

### Requirement 7: Edit in-story game questions

**User Story:** As an administrator, I want to edit the Match game and Fill-in-the-Blank game questions inside a story, so that I can manage all game content from the admin panel.

#### Acceptance Criteria

1. WHEN an Admin opens the Story_Games_Editor for a story, THE Story_Games_Editor SHALL display the story's existing Match_Item and Fill_Blank_Item entries for editing.
2. WHEN an Admin saves story games, THE Video_Service (story persistence) SHALL store the submitted Match_Item entries under `stories.games.match` and the submitted Fill_Blank_Item entries under `stories.games.fill_blank`.
3. IF any submitted Match_Item has an empty `word` or empty `vi` value after trimming, THEN THE story persistence SHALL reject the save with a validation error identifying the item.
4. IF any submitted Fill_Blank_Item has an empty `sentence_en` or empty `answer` after trimming, THEN THE story persistence SHALL reject the save with a validation error identifying the item.
5. IF any submitted Fill_Blank_Item has an `answer` that is not present in its `choices`, THEN THE story persistence SHALL reject the save with a validation error identifying the item.
6. WHEN a story's games are saved successfully, THE saved games SHALL be readable by the in-story game pages without loss of any submitted item.
7. IF a story games save is requested without Admin authentication, THEN THE story persistence SHALL reject the request as unauthorized.

### Requirement 8: DigitalOcean deployment configuration

**User Story:** As an operator, I want the deployment configured for DigitalOcean Spaces, so that the running app can store and serve videos in production.

#### Acceptance Criteria

1. THE DigitalOcean App Platform spec SHALL declare the Spaces configuration variables required by the Storage_Service (region/endpoint, bucket, CDN base, access key, secret key).
2. THE environment example file SHALL document each Spaces configuration variable with a sample value.
3. WHERE a Spaces secret credential is declared in the deployment spec, THE deployment spec SHALL mark it as a secret rather than a plain value.
4. THE health check endpoint SHALL continue to report healthy without requiring any Bunny.net configuration.
