import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: Deno.env.get('MINIO_ENDPOINT'),
  credentials: {
    accessKeyId: Deno.env.get('MINIO_ACCESS_KEY')!,
    secretAccessKey: Deno.env.get('MINIO_SECRET_KEY')!,
  },
  forcePathStyle: true,
})

const BUCKET = 'exercise-videos'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { key } = await req.json()

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate presigned URL for download (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({ url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
