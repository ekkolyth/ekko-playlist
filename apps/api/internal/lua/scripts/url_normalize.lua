-- YouTube URL Normalization Script
-- Ported from TypeScript extension logic
-- Supports various YouTube URL formats and normalizes them to: https://www.youtube.com/watch?v=VIDEO_ID

local function extract_video_id(url)
    -- Pattern 1: youtube.com/watch?v=VIDEO_ID or youtube.com/watch?vi=VIDEO_ID
    local watch_match = url:match("[?&]v=([a-zA-Z0-9_-]+)")
    if watch_match and #watch_match == 11 then
        return watch_match
    end
    local watch_i_match = url:match("[?&]vi=([a-zA-Z0-9_-]+)")
    if watch_i_match and #watch_i_match == 11 then
        return watch_i_match
    end

    -- Pattern 2: youtu.be/VIDEO_ID
    local short_match = url:match("youtu%.be/([a-zA-Z0-9_-]+)")
    if short_match and #short_match == 11 then
        return short_match
    end

    -- Pattern 3: youtube.com/v/VIDEO_ID
    local v_match = url:match("/v/([a-zA-Z0-9_-]+)")
    if v_match and #v_match == 11 then
        return v_match
    end

    -- Pattern 4: youtube.com/embed/VIDEO_ID
    local embed_match = url:match("/embed/([a-zA-Z0-9_-]+)")
    if embed_match and #embed_match == 11 then
        return embed_match
    end

    -- Pattern 5: youtube.com/VIDEO_ID (less common, must be followed by ? or & or end)
    local direct_match = url:match("youtube%.com/([a-zA-Z0-9_-]+)")
    if direct_match and #direct_match == 11 then
        -- Check if it's not a known path like "watch", "embed", etc.
        if direct_match ~= "watch" and direct_match ~= "embed" and direct_match ~= "v" then
            return direct_match
        end
    end

    return nil
end

local function normalize_youtube_url(url)
    -- Validate input
    if not url or type(url) ~= "string" or url == "" then
        return {
            isValid = false,
            videoId = nil,
            normalizedUrl = nil,
            error = "Invalid URL: URL must be a non-empty string"
        }
    end

    -- Trim whitespace
    local trimmed_url = url:match("^%s*(.-)%s*$")

    -- Check if it's a YouTube domain (case insensitive check)
    local lower_url = trimmed_url:lower()
    local is_youtube = lower_url:match("youtube%.com") or lower_url:match("youtu%.be")
    if not is_youtube then
        return {
            isValid = false,
            videoId = nil,
            normalizedUrl = nil,
            error = "Invalid URL: Not a YouTube URL"
        }
    end

    -- Extract video ID
    local video_id = extract_video_id(trimmed_url)

    if not video_id then
        return {
            isValid = false,
            videoId = nil,
            normalizedUrl = nil,
            error = "Invalid URL: Could not extract video ID from YouTube URL"
        }
    end

    -- Validate video ID format (YouTube video IDs are 11 characters)
    if #video_id ~= 11 then
        return {
            isValid = false,
            videoId = nil,
            normalizedUrl = nil,
            error = "Invalid URL: Video ID must be 11 characters"
        }
    end

    -- Normalize URL to standard format
    local normalized_url = "https://www.youtube.com/watch?v=" .. video_id

    return {
        isValid = true,
        videoId = video_id,
        normalizedUrl = normalized_url
    }
end

-- Main function called by Go
function normalize_url(url)
    return normalize_youtube_url(url)
end

