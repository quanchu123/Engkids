# Requirements Document

## Introduction

ComicLingua Kids is an interactive English learning platform for children. Today it depends on two external managed services: Bunny.net Stream (video hosting and streaming) and Supabase (managed PostgreSQL database plus object Storage). This feature migrates the platform so that it runs entirely on DigitalOcean infrastructure and removes the runtime dependency on Bunny.net and Supabase.

After this feature is delivered:

- Video files are stored in and streamed from DigitalOcean Spaces (an S3-compatible object store) fronted by the Spaces CDN, and played with the browser's native HTML5 video element using progressive MP4 delivery.
- Image files (story cover images and comic panel images) are stored in DigitalOcean Spaces instead of being embedded as base64 inside database rows.
- All application data is stored in DigitalOcean Managed PostgreSQL, accessed through a PostgreSQL client, replacing the Supabase client and Supabase Storage.
- A migration capability moves the existing database schema and data into DigitalOcean Managed PostgreSQL.
- Administrators can directly edit question content for both video quiz questions and the in-game questions inside stories (word-match and fill-in-the-blank), as well as story vocabulary, instead of relying on auto-generated game content.

This document defines the requirements for that migration and the expanded admin content-editing capability.

## Glossary

- **Platform**: The ComicLingua Kids Next.js application as a whole.
- **Spaces**: DigitalOcean Spaces object storage (S3-compatible), used to store video and image files.
- **Spaces_CDN**: The DigitalOcean Spaces content delivery network endpoint that serves stored objects to clients.
- **Managed_Postgres**: A DigitalOcean Managed PostgreSQL database instance used as the sole application database.
- **Database_Client**: The server-side module that connects to Managed_Postgres and performs queries for application data (videos, subtitles, stories, admin users, sessions, user progress).
- **Video_Storage_Service**: The server-side module responsible for storing, addressing, and deleting video objects in Spaces.
- **Image_Storage_Service**: The server-side module responsible for storing, addressing, and deleting image objects (cover images, panel images) in Spaces.
- **Upload_Service**: The server-side module that issues time-limited presigned upload URLs for direct browser-to-Spaces uploads.
- **Video_Player**: The client-side component that plays a stored video using the native HTML5 video element.
- **Admin**: An authenticated administrator user with content management rights.
- **Admin_Quiz_Editor**: The admin interface and supporting endpoints for editing multiple-choice quiz questions attached to a video.
- **Admin_Game_Question_Editor**: The admin interface and supporting endpoints for editing the in-game questions of a story (word-match items and fill-in-the-blank items).
- **Admin_Vocabulary_Editor**: The admin interface and supporting endpoints for editing a story's vocabulary list.
- **Migration_Tool**: The script or command that creates the schema in Managed_Postgres and copies existing data into it.
- **Configuration_Validator**: The server-side module that validates required environment variables at startup.
- **Deployment_Spec**: The DigitalOcean App Platform application specification file (`.do/app.yaml`).
- **Quiz_Question**: A multiple-choice question shown beside the video player, with fields id, question, optional Vietnamese question text, two to four options, a correct option index, and an optional explanation.
- **Match_Item**: A word-match game entry inside a story, consisting of an English word and its Vietnamese meaning.
- **Fill_Blank_Item**: A fill-in-the-blank game entry inside a story, consisting of a sentence with a blank, the correct answer, and the set of answer choices.
- **Presigned_Upload_URL**: A time-limited URL that authorizes a client to upload a single object directly to Spaces without exposing storage credentials.

## Requirements

### Requirement 1: Store videos in DigitalOcean Spaces

**User Story:** As an administrator, I want uploaded videos to be stored in DigitalOcean Spaces, so that the platform hosts its own video files without Bunny.net.

#### Acceptance Criteria

1. WHEN an Admin completes a video upload, THE Video_Storage_Service SHALL store the video file as an object in Spaces.
2. WHEN a video object is stored in Spaces, THE Database_Client SHALL record the object's storage key for that video.
3. WHEN a stored video is requested for playback, THE Video_Storage_Service SHALL provide a Spaces_CDN URL that resolves to the stored object.
4. WHEN an Admin deletes a video, THE Video_Storage_Service SHALL delete the corresponding object from Spaces.
5. IF deletion of a video object from Spaces fails, THEN THE Video_Storage_Service SHALL return an error identifying the affected video.
6. WHERE a video file exceeds the configured maximum upload size, THE Upload_Service SHALL reject the upload request with an error stating the maximum allowed size.

### Requirement 2: Direct browser-to-Spaces upload via presigned URLs

**User Story:** As an administrator, I want to upload video files directly to storage from my browser, so that large files upload reliably without being limited by the application server.

#### Acceptance Criteria

1. WHEN an authenticated Admin requests to upload a video, THE Upload_Service SHALL return a Presigned_Upload_URL scoped to a single new object.
2. THE Presigned_Upload_URL SHALL expire after a configured validity period.
3. IF an upload request is made by a client that is not an authenticated Admin, THEN THE Upload_Service SHALL reject the request with an unauthorized error.
4. WHEN a browser upload to a Presigned_Upload_URL completes, THE Platform SHALL record the resulting video metadata, including the object storage key, in Managed_Postgres.
5. THE Upload_Service SHALL exclude Spaces secret credentials from every response sent to a client.
6. IF the requested upload object type is not in the configured set of allowed video file types, THEN THE Upload_Service SHALL reject the request with an error listing the allowed types.

### Requirement 3: Play videos from Spaces with the HTML5 player

**User Story:** As a learner, I want to watch lesson videos in the browser, so that I can study with video content served from DigitalOcean.

#### Acceptance Criteria

1. WHEN a learner opens a video that has a stored Spaces object, THE Video_Player SHALL play the video using the native HTML5 video element with the Spaces_CDN URL as the source.
2. WHILE a video is playing, THE Video_Player SHALL display the associated subtitle cues synchronized to the playback time.
3. IF a video object cannot be loaded from the Spaces_CDN URL, THEN THE Video_Player SHALL display an error message to the learner.
4. THE Video_Player SHALL provide play, pause, and seek controls for the playing video.

### Requirement 4: Store images in DigitalOcean Spaces

**User Story:** As an administrator, I want story cover images and panel images stored in DigitalOcean Spaces, so that images are served from object storage instead of being embedded in database rows.

#### Acceptance Criteria

1. WHEN an Admin uploads a story cover image, THE Image_Storage_Service SHALL store the image as an object in Spaces.
2. WHEN an Admin uploads a comic panel image, THE Image_Storage_Service SHALL store the image as an object in Spaces.
3. WHEN an image object is stored in Spaces, THE Database_Client SHALL record the Spaces_CDN URL of that image for the related story or panel.
4. WHERE an Admin provides an external image URL instead of uploading a file, THE Image_Storage_Service SHALL store the provided URL without uploading a new object.
5. IF an uploaded image file type is not in the configured set of allowed image file types, THEN THE Image_Storage_Service SHALL reject the upload with an error listing the allowed types.

### Requirement 5: Use DigitalOcean Managed PostgreSQL as the sole database

**User Story:** As a developer, I want all application data read from and written to DigitalOcean Managed PostgreSQL, so that the platform no longer depends on Supabase.

#### Acceptance Criteria

1. THE Database_Client SHALL connect to Managed_Postgres using a connection configuration provided through environment variables.
2. WHEN the Platform reads or writes videos, subtitles, stories, admin users, admin sessions, or user progress, THE Database_Client SHALL perform that operation against Managed_Postgres.
3. THE Database_Client SHALL connect to Managed_Postgres using an encrypted connection.
4. IF a database operation fails because Managed_Postgres is unreachable, THEN THE Database_Client SHALL return an error indicating the database is unavailable.
5. THE Platform SHALL operate without any runtime call to a Supabase service.

### Requirement 6: Migrate existing schema and data to Managed PostgreSQL

**User Story:** As an operator, I want a tool to create the database schema and copy existing data into DigitalOcean Managed PostgreSQL, so that current content is preserved after migration.

#### Acceptance Criteria

1. WHEN the Migration_Tool runs against an empty Managed_Postgres instance, THE Migration_Tool SHALL create all tables required by the Platform.
2. WHEN the Migration_Tool runs with a configured source data set, THE Migration_Tool SHALL copy the existing videos, subtitles, stories, admin users, and user progress records into Managed_Postgres.
3. WHERE a target table already contains a record with the same primary key as a source record, THE Migration_Tool SHALL leave the existing target record unchanged.
4. WHEN the Migration_Tool completes, THE Migration_Tool SHALL report the count of records created per table.
5. IF the Migration_Tool cannot connect to Managed_Postgres, THEN THE Migration_Tool SHALL stop and report a connection error.

### Requirement 7: Remove Bunny.net and Supabase runtime dependencies and configuration

**User Story:** As a developer, I want Bunny.net and Supabase configuration removed from the runtime and deployment, so that the platform depends only on DigitalOcean services.

#### Acceptance Criteria

1. THE Platform SHALL start successfully without any Bunny.net environment variable being set.
2. THE Platform SHALL start successfully without any Supabase environment variable being set.
3. THE Deployment_Spec SHALL declare the environment variables required for Spaces and Managed_Postgres.
4. THE Deployment_Spec SHALL exclude Bunny.net and Supabase environment variables.
5. THE Configuration_Validator SHALL designate the Spaces secret key and the Managed_Postgres connection credentials as server-side-only values.

### Requirement 8: Validate required DigitalOcean configuration at startup

**User Story:** As an operator, I want the platform to report missing DigitalOcean configuration clearly, so that I can correct deployment problems quickly.

#### Acceptance Criteria

1. WHEN the Platform starts, THE Configuration_Validator SHALL verify that the Spaces and Managed_Postgres environment variables are present.
2. IF a required environment variable is absent at startup, THEN THE Configuration_Validator SHALL report the name of each missing variable.
3. THE Configuration_Validator SHALL identify which configuration values are required on the server only.

### Requirement 9: Administrator editing of video quiz questions

**User Story:** As an administrator, I want to edit the multiple-choice questions shown beside a video, so that I can correct and improve video quiz content.

#### Acceptance Criteria

1. WHEN an Admin opens the edit page for a video, THE Admin_Quiz_Editor SHALL display the existing Quiz_Questions for that video.
2. WHEN an Admin adds, changes, or removes a Quiz_Question and saves, THE Database_Client SHALL persist the updated Quiz_Question set for that video in Managed_Postgres.
3. IF an Admin saves a Quiz_Question with fewer than two options, THEN THE Admin_Quiz_Editor SHALL reject the save and report which question is invalid.
4. IF an Admin saves a Quiz_Question whose question text is empty, THEN THE Admin_Quiz_Editor SHALL reject the save and report which question is invalid.
5. WHEN an Admin marks an option as the correct answer, THE Admin_Quiz_Editor SHALL record the index of that option as the correct option index for the question.
6. IF a request to save Quiz_Questions is made by a client that is not an authenticated Admin, THEN THE Platform SHALL reject the request with an unauthorized error.

### Requirement 10: Administrator editing of story in-game questions

**User Story:** As an administrator, I want to edit the in-game questions inside a story, so that the word-match and fill-in-the-blank games use the content I choose instead of auto-generated content.

#### Acceptance Criteria

1. WHEN an Admin opens the edit page for a story, THE Admin_Game_Question_Editor SHALL display the existing Match_Items and Fill_Blank_Items for that story.
2. WHEN an Admin adds, changes, or removes a Match_Item and saves the story, THE Database_Client SHALL persist the updated Match_Item set for that story in Managed_Postgres.
3. WHEN an Admin adds, changes, or removes a Fill_Blank_Item and saves the story, THE Database_Client SHALL persist the updated Fill_Blank_Item set for that story in Managed_Postgres.
4. WHEN a learner plays a story's word-match game, THE Platform SHALL present the Match_Items that the Admin saved for that story.
5. WHEN a learner plays a story's fill-in-the-blank game, THE Platform SHALL present the Fill_Blank_Items that the Admin saved for that story.
6. IF an Admin saves a Match_Item with an empty English word or empty Vietnamese meaning, THEN THE Admin_Game_Question_Editor SHALL reject the save and report which item is invalid.
7. IF an Admin saves a Fill_Blank_Item whose correct answer is not present in its answer choices, THEN THE Admin_Game_Question_Editor SHALL reject the save and report which item is invalid.
8. IF a request to save story game questions is made by a client that is not an authenticated Admin, THEN THE Platform SHALL reject the request with an unauthorized error.

### Requirement 11: Administrator editing of story vocabulary

**User Story:** As an administrator, I want to edit a story's vocabulary list, so that highlighted words and vocabulary-driven content reflect my chosen words.

#### Acceptance Criteria

1. WHEN an Admin opens the edit page for a story, THE Admin_Vocabulary_Editor SHALL display the existing vocabulary entries for that story.
2. WHEN an Admin adds, changes, or removes a vocabulary entry and saves the story, THE Database_Client SHALL persist the updated vocabulary list for that story in Managed_Postgres.
3. IF an Admin saves a vocabulary entry with an empty English word or empty Vietnamese meaning, THEN THE Admin_Vocabulary_Editor SHALL exclude that entry from the saved vocabulary list.
