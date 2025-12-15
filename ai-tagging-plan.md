# AI Tagging Feature Implementation Plan

## Overview
This plan implements an AI tagging system that allows users to configure custom prompts, manage their own tags, and use OpenAI to automatically tag videos. All tags are user-specific and the AI can only suggest tags from the user's existing tag list.

## Architecture

### Database Schema Changes

**New Tables:**
1. `tags` table - User-specific tags
   - `id` (bigserial, primary key)
   - `user_id` (uuid, foreign key to user)
   - `name` (text, unique per user)
   - `created_at` (timestamptz)

2. `video_tags` table - Many-to-many relationship
   - `video_id` (bigint, foreign key to videos)
   - `tag_id` (bigint, foreign key to tags)
   - Composite primary key (video_id, tag_id)

3. `user_settings` table - User preferences
   - `user_id` (uuid, primary key, foreign key to user)
   - `openai_api_key` (text, nullable, encrypted)
   - `ai_tagging_prompt` (text, nullable)
   - `updated_at` (timestamptz)

**Migration:** Create `006_tags_and_settings.sql` migration file

### Backend Implementation (Go API)

**Dependencies:**
- Add OpenAI Go SDK: `github.com/sashabaranov/go-openai`

**New Files:**
1. `internal/db/queries/tags.sql` - SQL queries for tags CRUD
2. `internal/db/queries/settings.sql` - SQL queries for user settings
3. `internal/db/tags.sql.go` - Generated sqlc code for tags
4. `internal/db/settings.sql.go` - Generated sqlc code for settings
5. `internal/api/handlers/tags.go` - Tags CRUD handlers
6. `internal/api/handlers/settings.go` - Settings handlers
7. `internal/api/handlers/ai_tagging.go` - AI tagging handler
8. `internal/api/openai/client.go` - OpenAI client wrapper

**Handler Responsibilities:**
- `tags.go`: List, Create, Update, Delete tags (user-scoped)
- `settings.go`: Get/Update user settings (OpenAI key, prompt)
- `ai_tagging.go`: Accept video URL, fetch video metadata, call OpenAI with user prompt + URL, validate suggested tags against user's tags, return suggestions

**Routes to Add:**
- `GET /api/tags` - List user's tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/videos/{id}/ai-tag` - Generate AI tag suggestions for a video

### Frontend Implementation (React/TypeScript)

**New Files:**
1. `src/routes/_authenticated/settings.tsx` - Settings page component
2. `src/lib/openai-client.ts` - Frontend OpenAI utilities (if needed)

**Components to Modify:**
1. `src/components/nav/navbar.tsx` - Add "Settings" menu item to user dropdown
2. `src/routes/_authenticated/dashboard.tsx` - Add tag badges to video cards, add AI tagging button
3. `src/lib/api-client.ts` - Add API methods for tags, settings, AI tagging

**Settings Page Features:**
- OpenAI API Key input (masked, with show/hide toggle)
- AI Tagging Prompt textarea (with placeholder/default)
- Tags management section:
  - List of existing tags
  - Add new tag input
  - Edit/Delete tag buttons
  - Tag name validation (unique per user)

**Dashboard Enhancements:**
- Display tags as badges on video cards
- "AI Tag" button on each video card
- Modal/dialog for AI tag suggestions with ability to apply selected tags

## Implementation Steps

1. **Database Schema** - Create migration for tags, video_tags, and user_settings tables
2. **Backend: Database Layer** - Add SQL queries and generate sqlc code
3. **Backend: OpenAI Integration** - Create OpenAI client wrapper
4. **Backend: Handlers** - Implement tags, settings, and AI tagging handlers
5. **Backend: Routes** - Add API routes and wire up handlers
6. **Frontend: Settings Page** - Create settings route and UI
7. **Frontend: Navigation** - Add settings link to user menu
8. **Frontend: Dashboard** - Add tag display and AI tagging functionality
9. **Frontend: API Client** - Add methods for new endpoints

## Key Considerations

- **Security**: OpenAI API keys should be encrypted at rest (consider using encryption library)
- **Validation**: AI can only suggest tags that exist in user's tag list
- **Error Handling**: Graceful handling of OpenAI API failures, invalid keys, rate limits
- **User Experience**: Loading states, error messages, success feedback
- **Data Privacy**: User settings are isolated per user_id

## Files to Create/Modify

### Backend Files

**New Files:**
- `apps/api/internal/db/migrations/006_tags_and_settings.sql`
- `apps/api/internal/db/queries/tags.sql`
- `apps/api/internal/db/queries/settings.sql`
- `apps/api/internal/api/handlers/tags.go`
- `apps/api/internal/api/handlers/settings.go`
- `apps/api/internal/api/handlers/ai_tagging.go`
- `apps/api/internal/api/openai/client.go`

**Modified Files:**
- `apps/api/internal/api/httpserver/router.go` - Add new routes
- `apps/api/go.mod` - Add OpenAI SDK dependency

### Frontend Files

**New Files:**
- `apps/web/src/routes/_authenticated/settings.tsx`

**Modified Files:**
- `apps/web/src/components/nav/navbar.tsx` - Add Settings menu item
- `apps/web/src/routes/_authenticated/dashboard.tsx` - Add tags and AI tagging UI
- `apps/web/src/lib/api-client.ts` - Add API methods

## Detailed Implementation Notes

### Database Migration

The migration should:
- Create `tags` table with user_id foreign key and unique constraint on (user_id, name)
- Create `video_tags` junction table with foreign keys and composite primary key
- Create `user_settings` table with user_id as primary key
- Add indexes for performance (tags.user_id, video_tags.video_id, video_tags.tag_id)

### OpenAI Integration

The OpenAI client should:
- Accept user's API key from settings
- Construct prompt: `{user_prompt}\n\nVideo URL: {video_url}\n\nAvailable tags: {tag_list}\n\nSuggest tags from the available list that best describe this video.`
- Use GPT-4 or GPT-3.5-turbo model
- Parse response to extract tag names
- Validate all suggested tags exist in user's tag list
- Return structured response with suggested tags

### Settings Page UI

The settings page should have three main sections:
1. **OpenAI Configuration**
   - API Key input field (password type with show/hide)
   - Save button
   - Test connection button (optional)

2. **AI Tagging Prompt**
   - Large textarea for custom prompt
   - Placeholder text with example
   - Character count (optional)
   - Save button

3. **Tags Management**
   - List of tags with edit/delete actions
   - Add new tag input with validation
   - Visual feedback for operations

### Dashboard Tag Display

- Tags should appear as small badges/chips on video cards
- Color-coded or styled for visual distinction
- Clickable to filter videos by tag (future enhancement)
- AI Tag button should:
  - Show loading state during API call
  - Display suggestions in a modal/dialog
  - Allow multi-select of suggested tags
  - Apply selected tags to video

## Testing Considerations

- Test tag creation/editing/deletion
- Test OpenAI API integration with valid/invalid keys
- Test AI tagging with various prompts
- Test validation that AI can only suggest existing tags
- Test user isolation (users can't see/modify other users' tags)
- Test error handling for API failures

## Future Enhancements

- Tag filtering on dashboard
- Bulk AI tagging for multiple videos
- Tag analytics/statistics
- Tag colors/categories
- Tag autocomplete when typing
- Export/import tags

