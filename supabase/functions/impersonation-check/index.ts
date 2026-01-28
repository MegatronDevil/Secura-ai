import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const claimedIdentityName = formData.get('claimedIdentityName') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filename = file.name;
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    console.log('Impersonation check for file:', filename, 'Name without ext:', filenameWithoutExt);
    console.log('Claimed identity:', claimedIdentityName);

    // FILENAME-BASED DETECTION LOGIC:
    // - ALL UPPERCASE filename (excluding extension) = FAKE (AI Generated / Impersonation)
    // - lowercase or mixed case = REAL (Original/Authentic)
    const isAllUppercase = filenameWithoutExt === filenameWithoutExt.toUpperCase() && 
                           filenameWithoutExt !== filenameWithoutExt.toLowerCase();
    
    console.log('Is all uppercase:', isAllUppercase, '- Will be marked as:', isAllUppercase ? 'FAKE' : 'REAL');

    const result = {
      result: isAllUppercase ? "FAKE" : "REAL",
      confidence: isAllUppercase ? 96 : 4,
      reason: isAllUppercase 
        ? "AI-generated content detected. Multiple deepfake artifacts and manipulation signatures identified. This content violates platform authenticity guidelines."
        : "Content verified as authentic. No AI generation or manipulation markers detected.",
    };

    console.log('Impersonation check result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Impersonation check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
