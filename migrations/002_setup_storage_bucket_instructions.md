# Setup Supabase Storage Bucket

## Manual Steps Required

Storage buckets cannot be created via SQL migration. You need to create the bucket manually in Supabase Dashboard.

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `images`
   - **Public bucket**: ✅ Enable (check this box to allow public access)
   - **File size limit**: 10MB (or adjust as needed)
   - **Allowed MIME types**: `image/*` (or leave empty for all types)
6. Click **"Create bucket"**

### Step 2: Set Storage Policies

**IMPORTANT:** Storage policies cannot be created via SQL Editor (requires owner permissions). 
You must create them through the Dashboard UI.

1. Go to **Storage** → **Policies** tab in Supabase Dashboard
2. Select the `images` bucket from the dropdown
3. Click **"New Policy"** button
4. Create the following 4 policies:

#### Policy 1: Public Read Access
- **Policy name**: `Public read access for images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'images'`
- Click **"Review"** then **"Save policy"**

#### Policy 2: Public Insert Access
- **Policy name**: `Public insert access for images`
- **Allowed operation**: `INSERT`
- **Target roles**: `public`
- **WITH CHECK expression**: `bucket_id = 'images'`
- Click **"Review"** then **"Save policy"**

#### Policy 3: Public Update Access
- **Policy name**: `Public update access for images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'images'`
- **WITH CHECK expression**: `bucket_id = 'images'`
- Click **"Review"** then **"Save policy"**

#### Policy 4: Public Delete Access
- **Policy name**: `Public delete access for images`
- **Allowed operation**: `DELETE`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'images'`
- Click **"Review"** then **"Save policy"`

**Note:** If you want to restrict access (e.g., require authentication), you can modify the target roles or add additional conditions to the expressions.

### Step 3: Verify

After setup, images uploaded through the app will be stored in Supabase Storage and accessible via public URLs.

