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

    // Use Gemini Vision to analyze the image/video
    const analysisPrompt = isVideo 
      ? `You are an expert forensic analyst specializing in detecting AI-generated and manipulated video content.

Analyze this video frame/thumbnail for signs of AI generation or manipulation. Look for:
1. Temporal inconsistencies or frame interpolation artifacts
2. Unnatural motion patterns or physics violations
3. Face manipulation indicators (lip sync issues, eye movement anomalies)
4. Lighting inconsistencies across frames
5. Edge artifacts or blending issues
6. AI generation signatures from known models

Classify this content into EXACTLY ONE of these categories:
- "real": Authentic video content with no signs of AI manipulation
- "ai_safe": AI-generated or enhanced but appropriate content (filters, style transfers, harmless edits)
- "deepfake": Malicious manipulation intended to deceive (face swaps, fake speeches, non-consensual content)

Respond in this exact JSON format:
{
  "classification": "real" | "ai_safe" | "deepfake",
  "confidence": 0-100,
  "explanation": "Clear explanation of why this classification was made",
  "artifacts": ["list", "of", "detected", "artifacts"],
  "riskLevel": "low" | "medium" | "high"
}`
      : `You are an expert forensic analyst specializing in detecting AI-generated and manipulated images.

Analyze this image for signs of AI generation or manipulation. Look for:
1. Unnatural skin textures or smoothness patterns
2. Inconsistent lighting and shadows
3. Anatomical anomalies (fingers, ears, teeth, eyes)
4. Background inconsistencies or warping
5. Edge artifacts around faces or objects
6. GAN/Diffusion model signatures (repeating patterns, texture drift)
7. Metadata inconsistencies
8. Signs of face swapping or morphing

Classify this content into EXACTLY ONE of these categories:
- "real": Authentic photograph with no signs of AI manipulation
- "ai_safe": AI-generated or enhanced but appropriate content (AI portraits, art, filters, enhancements)
- "deepfake": Malicious manipulation intended to deceive or harm (face swaps on inappropriate content, fake evidence)

Respond in this exact JSON format:
{
  "classification": "real" | "ai_safe" | "deepfake",
  "confidence": 0-100,
  "explanation": "Clear explanation of why this classification was made, suitable for showing to users",
  "artifacts": ["list", "of", "detected", "artifacts"],
  "riskLevel": "low" | "medium" | "high"
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
      // Fallback to a safe default
      analysisResult = {
        classification: 'real',
        confidence: 50,
        explanation: 'Unable to analyze the image. Please try again.',
        artifacts: [],
        riskLevel: 'low'
      };
    }

    // Map to the expected response format
    const result = {
      filename: file.name,
      isDeepfake: analysisResult.classification === 'deepfake',
      isAISafe: analysisResult.classification === 'ai_safe',
      classification: analysisResult.classification,
      message: analysisResult.classification === 'real'
        ? 'This content appears to be authentic.'
        : analysisResult.classification === 'ai_safe'
        ? 'This content is AI-generated but appears safe for sharing.'
        : 'This content shows signs of malicious manipulation.',
      confidence: analysisResult.confidence,
      label: analysisResult.classification === 'real' 
        ? 'Authentic' 
        : analysisResult.classification === 'ai_safe'
        ? 'AI Generated (Safe)'
        : 'Deepfake Detected',
      details: analysisResult.explanation,
      artifacts: analysisResult.artifacts || [],
      riskLevel: analysisResult.riskLevel,
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
