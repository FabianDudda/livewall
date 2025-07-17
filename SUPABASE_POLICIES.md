# Required Supabase Policies

## Database Policies

### Events Table
```sql
-- Allow authenticated users to create events
CREATE POLICY "Users can create events" ON "public"."events"
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own events
CREATE POLICY "Users can read own events" ON "public"."events"
FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to update their own events
CREATE POLICY "Users can update own events" ON "public"."events"
FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own events
CREATE POLICY "Users can delete own events" ON "public"."events"
FOR DELETE USING (auth.uid() = user_id);
```

### Uploads Table
```sql
-- Allow authenticated users to read uploads for their events
CREATE POLICY "Users can read uploads for their events" ON "public"."uploads"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = uploads.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Allow anonymous users to insert uploads
CREATE POLICY "Anyone can insert uploads" ON "public"."uploads"
FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update uploads for their events
CREATE POLICY "Users can update uploads for their events" ON "public"."uploads"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = uploads.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete uploads for their events
CREATE POLICY "Users can delete uploads for their events" ON "public"."uploads"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = uploads.event_id 
    AND events.user_id = auth.uid()
  )
);
```

### Challenges Table
```sql
-- Allow authenticated users to create challenges for their events
CREATE POLICY "Users can create challenges for their events" ON "public"."challenges"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = challenges.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Allow authenticated users to read challenges for their events
CREATE POLICY "Users can read challenges for their events" ON "public"."challenges"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = challenges.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Allow authenticated users to update challenges for their events
CREATE POLICY "Users can update challenges for their events" ON "public"."challenges"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = challenges.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete challenges for their events
CREATE POLICY "Users can delete challenges for their events" ON "public"."challenges"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = challenges.event_id 
    AND events.user_id = auth.uid()
  )
);
```

## Storage Policies

### Event-Media Bucket Policies
```sql
-- Allow anonymous uploads to gallery folders
CREATE POLICY "Allow anonymous uploads to gallery"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-media' AND
  (storage.foldername(name))[2] = 'gallery'
);

-- Allow authenticated users to upload cover images (ADDED)
CREATE POLICY "Allow authenticated cover image upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] ~ '^[A-Z0-9]{5}$' AND
  array_length(storage.foldername(name), 1) = 1 AND
  storage.filename(name) ~ '^cover\.'
);

-- Allow authenticated users to update cover images 
CREATE POLICY "Allow authenticated cover image update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] ~ '^[A-Z0-9]{5}$' AND
  array_length(storage.foldername(name), 1) = 1 AND
  storage.filename(name) ~ '^cover\.'
);

-- Allow signed URL generation for all files (ADDED)
CREATE POLICY "Allow signed URL generation"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-media');
```

## How to Apply These Policies

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run each policy creation statement**
4. **Make sure Row Level Security is enabled on all tables**:
   ```sql
   ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "public"."uploads" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;
   ```

## Testing the Policies

After applying the policies, test:
- ✅ Event creation by authenticated users
- ✅ Cover image upload by authenticated users
- ✅ Anonymous guest uploads to gallery folders
- ✅ Signed URL generation for all files
- ❌ Unauthorized access to events from other users
- ❌ Unauthorized uploads outside gallery folders

## Troubleshooting

If you get "new row violates row-level security policy" errors:
1. Check that RLS is enabled on the table
2. Verify the policy conditions match your use case
3. Ensure the user is authenticated when required
4. Check that the policy covers the specific operation (INSERT, SELECT, UPDATE, DELETE)