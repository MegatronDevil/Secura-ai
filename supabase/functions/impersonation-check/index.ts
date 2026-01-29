import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
    console.log('Impersonation check for file:', filename);
    console.log('Claimed identity:', claimedIdentityName);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const mimeType = file.type || 'image/jpeg';

    // Use Gemini Vision to analyze the image for impersonation
    const analysisPrompt = `You are an expert forensic analyst specializing in detecting AI-generated content and potential impersonation attempts on social media platforms.

Analyze this image that a user is attempting to upload to a social media platform. The user claims this represents themselves or their content.

Look for signs of:
1. AI-generated faces (GAN/Diffusion artifacts, unnatural skin, asymmetries)
2. Face swapping or morphing (edge discontinuities, lighting mismatches)
3. Deepfake manipulation (unnatural expressions, warped backgrounds)
4. Signs this might be someone else's photo being misused
5. Inappropriate or harmful content
6. Professional vs personal photo indicators

Classify this upload into EXACTLY ONE of these categories:
- "REAL": Authentic photo that appears safe for social media posting
- "AI_SAFE": AI-generated content that is appropriate (AI avatars, art, clearly non-deceptive content)
- "FAKE": Likely deepfake, face swap, or manipulated content that could be used for impersonation or deception

Respond in this exact JSON format:
{
  "result": "REAL" | "AI_SAFE" | "FAKE",
  "confidence": 0-100,
  "reason": "Clear, user-friendly explanation of why this classification was made",
  "artifacts": ["list", "of", "detected", "issues"],
  "shouldBlock": true | false,
  "riskLevel": "low" | "medium" | "high"
}

IMPORTANT: 
- shouldBlock should be TRUE only for "FAKE" content that could harm others
- AI_SAFE content should NOT be blocked but should be labeled
- Be accurate but err on the side of caution for potentially harmful content`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI analysis');
    }

    console.log('AI Response:', content);

    // Parse the JSON response from Gemini
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to safe default (allow upload)
      analysisResult = {
        result: 'REAL',
        confidence: 50,
        reason: 'Unable to analyze the image. Allowing upload with caution.',
        artifacts: [],
        shouldBlock: false,
        riskLevel: 'low'
      };
    }

    const result = {
      result: analysisResult.result,
      confidence: analysisResult.confidence,
      reason: analysisResult.reason,
      artifacts: analysisResult.artifacts || [],
      shouldBlock: analysisResult.shouldBlock || analysisResult.result === 'FAKE',
      riskLevel: analysisResult.riskLevel,
      classification: analysisResult.result === 'REAL' 
        ? 'real' 
        : analysisResult.result === 'AI_SAFE' 
        ? 'ai_safe' 
        : 'deepfake',
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
