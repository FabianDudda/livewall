# Storage Structure Documentation

## Event-Media Bucket Structure

The `event-media` bucket in Supabase Storage follows this folder structure:

```
event-media/
├── {EVENT_CODE}/
│   ├── cover.{ext}                 # Event cover image
│   └── gallery/                    # Guest uploads folder
│       ├── {timestamp}.{ext}       # Guest uploaded images/videos
│       └── {timestamp}.{ext}
```

## Key Features

### Event Code Folders
- Each event gets its own folder named after the 5-character event code (e.g., `HG72X`)
- This provides isolation between different events
- Allows for easy file organization and management

### Cover Images
- Stored directly in the event folder as `cover.{ext}`
- Uploaded by event creators/admins
- Used for event branding and display

### Gallery Subfolder
- Contains all guest uploads for the event
- Files are named with timestamps to avoid conflicts
- Supports both images and videos (up to 10MB)

## Security Considerations

### Private Bucket with Signed URLs
- The `event-media` bucket is **private** (not public)
- All file access is handled through **signed URLs** that expire after 1 year
- This provides better security control while still allowing public access to specific files

### Anonymous Upload Permissions
- The `event-media` bucket must be configured to allow anonymous uploads to the `gallery` subfolders
- This enables guests to upload without authentication
- Files are uploaded to `{EVENT_CODE}/gallery/{filename}`

### Required Bucket Policies
You need to configure the following bucket policies in Supabase:

1. **Allow anonymous uploads to gallery folders**:
   ```sql
   -- Allow INSERT for gallery uploads
   create policy "Allow anonymous uploads to gallery"
   on storage.objects for insert
   with check (
     bucket_id = 'event-media' and
     (storage.foldername(name))[2] = 'gallery'
   );
   ```

2. **Allow authenticated cover image uploads**:
   ```sql
   -- Allow authenticated users to upload cover images
   create policy "Allow authenticated cover image upload"
   on storage.objects for insert
   with check (
     bucket_id = 'event-media' and
     auth.role() = 'authenticated' and
     (storage.foldername(name))[1] ~ '^[A-Z0-9]{5}$' and
     array_length(storage.foldername(name), 1) = 1 and
     storage.filename(name) ~ '^cover\.'
   );
   ```

3. **Allow authenticated cover image updates**:
   ```sql
   -- Allow authenticated users to update cover images
   create policy "Allow authenticated cover image update"
   on storage.objects for update
   using (
     bucket_id = 'event-media' and
     auth.role() = 'authenticated' and
     (storage.foldername(name))[1] ~ '^[A-Z0-9]{5}$' and
     array_length(storage.foldername(name), 1) = 1 and
     storage.filename(name) ~ '^cover\.'
   );
   ```

4. **Allow signed URL generation**:
   ```sql
   -- Allow SELECT for signed URL generation
   create policy "Allow signed URL generation"
   on storage.objects for select
   using (bucket_id = 'event-media');
   ```

## Implementation Notes

### Event Creation
- When creating a new event, the folder structure is created automatically when files are uploaded
- Cover images are uploaded to the event folder root and signed URLs are generated
- Gallery folder is created when the first guest upload occurs

### Guest Uploads
- Use the `uploadGuestImage` function from `/src/lib/guestUpload.ts`
- Files are validated for type and size before upload
- Upload records are created in the database with signed URLs for tracking

### Signed URLs
- All file access uses **signed URLs** that expire after 1 year (31,536,000 seconds)
- Signed URLs are generated using `supabase.storage.createSignedUrl()`
- This provides secure access to private bucket files without making the bucket public

### File Naming
- Cover images: `cover.{ext}`
- Gallery uploads: `{timestamp}.{ext}`

## Migration from Old Structure

If you were previously using the `event-covers` bucket, you'll need to:

1. Update any existing code that references `event-covers`
2. Move existing cover images to the new folder structure
3. Update database records to point to the new signed URLs
4. Configure the new bucket policies
5. Replace all `getPublicUrl()` calls with `createSignedUrl()`

## Functions Using This Structure

### Core Functions
- `uploadCoverImage()` - Uploads cover images to event folder and generates signed URLs
- `uploadGuestImage()` - Handles anonymous guest uploads to gallery folder with signed URLs
- `validateEventCode()` - Validates event codes for uploads

### Utility Functions
- `generateSignedUrl()` - Creates signed URL for a single file path
- `generateMultipleSignedUrls()` - Creates signed URLs for multiple file paths
- `extractFilePathFromUrl()` - Extracts file path from signed URL for regeneration

### Usage Examples

```typescript
// Upload a guest image
const result = await uploadGuestImage({
  eventCode: 'HG72X',
  file: imageFile,
  uploaderName: 'John Doe',
  comment: 'Great party!'
});

// Generate signed URL for existing file
const urlResult = await generateSignedUrl('HG72X/gallery/1234567890.jpg');

// Generate signed URLs for multiple files
const urlsResult = await generateMultipleSignedUrls([
  'HG72X/cover.jpg',
  'HG72X/gallery/1234567890.jpg',
  'HG72X/gallery/1234567891.jpg'
]);
```

## Important Notes

- **URL Expiration**: Signed URLs expire after 1 year. Consider implementing a refresh mechanism for long-term storage
- **Security**: Private bucket with signed URLs provides better security than public buckets
- **Performance**: Signed URL generation adds a small overhead but provides better access control
- **Database Storage**: Store signed URLs in the database, but be prepared to regenerate them if needed