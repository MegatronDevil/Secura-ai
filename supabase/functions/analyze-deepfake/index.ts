import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight requests
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

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filename = file.name;
    console.log('Analyzing file with Gemini Vision:', filename);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const mimeType = file.type || 'image/jpeg';
    const isVideo = mimeType.startsWith('video/');

    // Multi-stage forensic decision pipeline
    const analysisPrompt = isVideo 
      ? `You are an expert forensic analyst performing a MULTI-STAGE forensic analysis pipeline for video content.

CRITICAL: Base ALL decisions on VISUAL ANALYSIS ONLY. Do NOT use filenames, metadata, prompts, or any user-provided hints.

=== STAGE 1: VISUAL FORENSIC ANALYSIS ===
Analyze the visual content for:
- Temporal inconsistencies, frame interpolation artifacts, motion blur anomalies
- Physics violations (impossible movements, unnatural acceleration)
- Face manipulation indicators (lip sync issues, eye movement anomalies, asymmetry)
- Lighting inconsistencies across frames (mismatched shadows, incorrect reflections)
- Edge artifacts, blending seams, or compression inconsistencies
- Generative model signatures (repetitive patterns, texture drift, noise fingerprints)
- Frequency domain artifacts typical of GAN/Diffusion models

=== STAGE 2: IDENTITY & RISK ASSESSMENT ===
If AI generation is detected, evaluate:
- Does the content depict identifiable human faces or bodies?
- Could this be used for identity impersonation or misrepresentation?
- Is there sexualized, violent, or defamatory context involving real or realistic human depictions?
- Could the content mislead viewers about a person's actions, statements, or identity?

=== STAGE 3: CONSERVATIVE CLASSIFICATION ===
Apply these rules STRICTLY:

"real" - Authentic captured footage. Reserve ONLY for content with:
  - Natural motion physics and temporal consistency
  - No AI generation artifacts detectable at any analysis level
  - Standard camera noise and compression patterns
  - Consistent lighting and reflections
  - NOTE: Label as "Likely Authentic" not "Verified" - absolute certainty is not possible

"ai_safe" - AI-generated/enhanced BUT low risk:
  - Artistic stylization, filters, or obvious non-realistic content
  - AI avatars or characters that do NOT resemble real individuals
  - Creative/artistic content with no deceptive intent
  - Educational or entertainment content clearly not impersonating anyone

"deepfake" - Potentially harmful content. Classify here if:
  - Face swapping or identity manipulation detected
  - Realistic human depiction in misleading, sexualized, or defamatory context
  - Content that could deceive viewers about a person's identity or actions
  - ANY uncertainty about potential identity harm (default to this for safety)

IMPORTANT: When confidence is ambiguous (40-70%), prioritize user safety and classify as HIGHER RISK.

Respond in this exact JSON format:
{
  "classification": "real" | "ai_safe" | "deepfake",
  "confidence": 0-100,
  "explanation": "Multi-stage analysis summary: [Stage 1 findings], [Stage 2 assessment if applicable], [Classification rationale with uncertainty acknowledgment]",
  "artifacts": ["specific_forensic_indicators_found"],
  "riskLevel": "low" | "medium" | "high",
  "uncertaintyFactors": ["factors that could affect accuracy"]
}`
      : `You are an expert forensic analyst performing a MULTI-STAGE forensic analysis pipeline for image content.

CRITICAL: Base ALL decisions on VISUAL ANALYSIS ONLY. Do NOT use filenames, metadata, prompts, or any user-provided hints.

=== STAGE 1: VISUAL FORENSIC ANALYSIS ===
Examine pixel-level characteristics:
- Texture consistency: Skin pores, fabric weave, surface details (AI often over-smooths or creates uniform textures)
- Frequency artifacts: Unnatural periodicity, checkerboard patterns, high-frequency noise inconsistencies
- Edge analysis: Blending seams around faces/objects, halo effects, abrupt transitions
- Noise patterns: Inconsistent sensor noise, missing camera fingerprints, synthetic noise signatures
- Lighting physics: Shadow direction consistency, reflection accuracy, ambient occlusion
- Anatomical accuracy: Fingers, ears, teeth, eye symmetry, hair strand rendering
- Background coherence: Warping, repetition, impossible geometry
- Generative signatures: GAN artifacts (blob textures, watermark patterns), Diffusion artifacts (texture drift, oversaturation)

=== STAGE 2: IDENTITY & RISK ASSESSMENT ===
If AI generation is detected OR uncertain, evaluate:
- Does the image depict an identifiable human face or body?
- Could this be used for identity impersonation or catfishing?
- Is there sexualized, violent, or defamatory context involving realistic human depictions?
- Could viewers be misled about a real person's appearance or actions?
- Is the subject depicted in a context they likely did not consent to?

=== STAGE 3: CONSERVATIVE CLASSIFICATION ===
Apply these rules STRICTLY:

"real" - Authentic photograph. Reserve ONLY for content with:
  - Natural camera sensor noise patterns
  - Consistent lighting physics and accurate shadows
  - Anatomically correct features with natural imperfections
  - No detectable AI generation artifacts
  - NOTE: Report as "Low Manipulation Risk" not "Verified Authentic" - certainty has limits

"ai_safe" - AI-generated/enhanced BUT low risk:
  - Artistic stylization clearly not attempting photorealism
  - AI avatars or artistic portraits not resembling specific real individuals
  - Enhanced photos where enhancements are cosmetic (filters, backgrounds)
  - Creative content with no potential for identity confusion

"deepfake" - Potentially harmful content. Classify here if:
  - Face swapping, morphing, or identity manipulation detected
  - Photorealistic human depiction in misleading, sexualized, or defamatory context
  - Content that could deceive viewers about identity or actions
  - Realistic person placed in fabricated scenarios without clear artistic framing
  - ANY uncertainty about potential identity harm (err on the side of caution)

CONSERVATIVE DEFAULT: When confidence is ambiguous (40-70%), classify as HIGHER RISK to protect potential victims.

Respond in this exact JSON format:
{
  "classification": "real" | "ai_safe" | "deepfake",
  "confidence": 0-100,
  "explanation": "Multi-stage analysis: [Visual forensic findings], [Identity/risk assessment if applicable], [Classification rationale]. Include uncertainty acknowledgment where relevant.",
  "artifacts": ["specific_forensic_indicators_found"],
  "riskLevel": "low" | "medium" | "high",
  "uncertaintyFactors": ["factors that could affect accuracy"]
}`;

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
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // CONSERVATIVE FALLBACK: When analysis fails, default to higher risk
      analysisResult = {
        classification: 'ai_safe',
        confidence: 40,
        explanation: 'Analysis encountered uncertainty. Content flagged for manual review. Unable to confirm authenticity with confidence.',
        artifacts: ['analysis_incomplete'],
        riskLevel: 'medium',
        uncertaintyFactors: ['parsing_error', 'incomplete_analysis']
      };
    }

    // Risk-aware message generation (no absolute claims)
    const getMessage = (classification: string, confidence: number) => {
      if (classification === 'real') {
        if (confidence >= 85) {
          return 'Low manipulation risk detected. Visual forensics indicate likely authentic content.';
        }
        return 'Analysis suggests authentic content, though some uncertainty remains. No clear manipulation indicators found.';
      }
      if (classification === 'ai_safe') {
        return 'AI-generated or enhanced content detected. No identity misuse indicators found, but content should be labeled as synthetic.';
      }
      // deepfake
      if (confidence >= 80) {
        return 'High-risk content detected. Analysis indicates potential identity manipulation or harmful synthetic media.';
      }
      return 'Elevated risk detected. Content shows indicators of manipulation that may involve identity misuse.';
    };

    const getLabel = (classification: string, confidence: number) => {
      if (classification === 'real') {
        return confidence >= 85 ? 'Low Manipulation Risk' : 'Likely Authentic';
      }
      if (classification === 'ai_safe') {
        return 'AI-Generated Content';
      }
      return confidence >= 80 ? 'High-Risk Content Detected' : 'Elevated Risk Detected';
    };

    // Map to the expected response format
    const result = {
      filename: file.name,
      isDeepfake: analysisResult.classification === 'deepfake',
      isAISafe: analysisResult.classification === 'ai_safe',
      classification: analysisResult.classification,
      message: getMessage(analysisResult.classification, analysisResult.confidence),
      confidence: analysisResult.confidence,
      label: getLabel(analysisResult.classification, analysisResult.confidence),
      details: analysisResult.explanation,
      artifacts: analysisResult.artifacts || [],
      riskLevel: analysisResult.riskLevel,
      uncertaintyFactors: analysisResult.uncertaintyFactors || [],
      analysisType: isVideo ? 'video-forensics' : 'image-forensics',
    };

    console.log('Analysis result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in analyze-deepfake function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
