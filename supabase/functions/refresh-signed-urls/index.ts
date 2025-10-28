import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting signed URL refresh process...');

    // Get all submissions with screenshot URLs
    const { data: submissions, error: fetchError } = await supabase
      .from('submissions')
      .select('id, screenshot_url')
      .not('screenshot_url', 'is', null);

    if (fetchError) {
      console.error('Error fetching submissions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${submissions?.length || 0} submissions with screenshots`);

    let refreshedCount = 0;
    let errorCount = 0;

    // Process each submission
    for (const submission of submissions || []) {
      try {
        // Extract the file path from the existing URL
        // Format: https://xxx.supabase.co/storage/v1/object/public/screenshots/path/to/file.jpg
        const urlParts = submission.screenshot_url.split('/screenshots/');
        if (urlParts.length < 2) {
          console.log(`Skipping ${submission.id}: URL format not recognized`);
          continue;
        }

        const filePath = urlParts[1];

        // Generate new signed URL (valid for 1 year)
        const { data: signedUrlData, error: signError } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(filePath, 31536000); // 365 days

        if (signError) {
          console.error(`Error creating signed URL for ${submission.id}:`, signError);
          errorCount++;
          continue;
        }

        if (!signedUrlData?.signedUrl) {
          console.error(`No signed URL returned for ${submission.id}`);
          errorCount++;
          continue;
        }

        // Update the submission with the new URL
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ screenshot_url: signedUrlData.signedUrl })
          .eq('id', submission.id);

        if (updateError) {
          console.error(`Error updating submission ${submission.id}:`, updateError);
          errorCount++;
        } else {
          refreshedCount++;
          console.log(`✓ Refreshed URL for submission ${submission.id}`);
        }

      } catch (err) {
        console.error(`Error processing submission ${submission.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Refresh complete. Success: ${refreshedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refreshed ${refreshedCount} URLs`,
        refreshed: refreshedCount,
        errors: errorCount,
        total: submissions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
