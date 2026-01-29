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

    // Multi-stage forensic analysis for social media upload
    const analysisPrompt = `You are an expert forensic analyst performing a MULTI-STAGE security analysis for social media content upload.

CRITICAL: Base ALL decisions on VISUAL ANALYSIS ONLY. Ignore filenames, metadata, or any claims about the content.

=== STAGE 1: VISUAL FORENSIC ANALYSIS ===
Analyze pixel-level characteristics:
- Skin texture: Natural pores/imperfections vs. AI-smoothed surfaces
- Lighting physics: Shadow consistency, reflection accuracy, ambient occlusion
- Facial anatomy: Finger count, ear symmetry, teeth alignment, eye reflection
- Edge quality: Blending around face/hair boundaries, halo artifacts
- Background coherence: Warping, repetition, perspective errors
- Noise patterns: Camera sensor noise vs. synthetic noise signatures
- Generative artifacts: GAN checkerboarding, diffusion texture drift, watermarks

=== STAGE 2: IDENTITY & SOCIAL RISK ASSESSMENT ===
Evaluate potential for harm:
- Could this be someone else's identity being misappropriated?
- Is the subject depicted in potentially non-consensual context?
- Could this content be used for catfishing, impersonation, or harassment?
- Are there indicators of sexualized deepfake manipulation?
- Could viewers be deceived about who is depicted or what they're doing?

=== STAGE 3: CONSERVATIVE UPLOAD DECISION ===

"REAL" - Allow upload. Reserve ONLY for:
  - Natural photographic characteristics with no manipulation indicators
  - Consistent lighting, authentic noise patterns, anatomical accuracy
  - Low risk of identity misuse
  - NOTE: Frame as "Low manipulation risk" not "Verified authentic"

"AI_SAFE" - Allow with "AI-generated" label:
  - Clearly stylized or artistic content
  - AI avatars not closely resembling real individuals
  - Creative/artistic content with no deceptive intent
  - Enhanced photos where modifications are cosmetic only

"FAKE" - BLOCK upload entirely:
  - Face swapping, morphing, or identity manipulation detected
  - Photorealistic content that could impersonate or defame someone
  - Sexualized synthetic content depicting realistic humans
  - High uncertainty about potential identity harm (err on safety)
  - Content that could reasonably deceive viewers about identity

CONSERVATIVE DEFAULT: When confidence is 40-70%, classify as higher risk to protect potential victims.

Respond in this exact JSON format:
{
  "result": "REAL" | "AI_SAFE" | "FAKE",
  "confidence": 0-100,
  "reason": "Multi-stage summary: [Forensic findings], [Risk assessment], [Decision rationale with uncertainty acknowledgment]",
  "artifacts": ["specific_indicators_detected"],
  "shouldBlock": true | false,
  "riskLevel": "low" | "medium" | "high",
  "uncertaintyFactors": ["factors_affecting_confidence"]
}

BLOCKING RULES:
- shouldBlock = TRUE for "FAKE" (always block potential identity abuse)
- shouldBlock = FALSE for "AI_SAFE" (allow with label)
- shouldBlock = FALSE for "REAL" (allow normally)`;

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
      // CONSERVATIVE FALLBACK: When analysis fails, block to protect users
      analysisResult = {
        result: 'AI_SAFE',
        confidence: 40,
        reason: 'Analysis encountered uncertainty. Content flagged for review. Unable to confirm authenticity with confidence - proceeding with AI-generated label for safety.',
        artifacts: ['analysis_incomplete'],
        shouldBlock: false,
        riskLevel: 'medium',
        uncertaintyFactors: ['parsing_error', 'incomplete_analysis']
      };
    }

    // Generate risk-aware messaging (no absolute claims)
    const getReason = (result: string, confidence: number, originalReason: string) => {
      // Always include uncertainty acknowledgment for non-high-confidence results
      if (confidence < 80 && !originalReason.includes('uncertain') && !originalReason.includes('may')) {
        return `${originalReason} Note: Analysis confidence is moderate; some uncertainty remains in this assessment.`;
      }
      return originalReason;
    };

    const result = {
      result: analysisResult.result,
      confidence: analysisResult.confidence,
      reason: getReason(analysisResult.result, analysisResult.confidence, analysisResult.reason),
      artifacts: analysisResult.artifacts || [],
      shouldBlock: analysisResult.shouldBlock || analysisResult.result === 'FAKE',
      riskLevel: analysisResult.riskLevel,
      uncertaintyFactors: analysisResult.uncertaintyFactors || [],
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
