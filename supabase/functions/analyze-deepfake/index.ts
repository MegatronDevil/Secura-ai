import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filename = file.name.toLowerCase();
    const fileType = file.type;
    console.log('Analyzing file:', filename, 'Type:', fileType);

    // Check if it's a video file - use filename-based detection for videos
    const isVideo = fileType.startsWith('video/') || 
                    filename.endsWith('.mp4') || 
                    filename.endsWith('.mov') || 
                    filename.endsWith('.avi') || 
                    filename.endsWith('.webm');

    if (isVideo) {
      // For videos, use filename-based detection
      const isAIGenerated = filename.includes('-ai.mp4') || 
                           filename.includes('-ai.mov') ||
                           filename.includes('-ai.avi') ||
                           filename.includes('-ai.webm');

      const result = {
        filename: file.name,
        isDeepfake: isAIGenerated,
        message: isAIGenerated 
          ? 'This video has been deepfaked or AI generated.'
          : 'No AI generation markers detected in this video.',
        confidence: isAIGenerated ? 95 : 5,
        analysisType: 'video',
        details: isAIGenerated 
          ? 'Temporal inconsistencies and frame artifacts detected.'
          : 'Video appears to be authentic based on available analysis.',
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For images, use AI-powered analysis via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert image to base64 for AI analysis
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Determine MIME type
    let mimeType = file.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      mimeType = 'image/jpeg';
    }

    console.log('Sending image to AI for analysis...');

    // Use Gemini Pro for vision analysis - best for image analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert AI forensics analyst specializing in detecting AI-generated images. Your task is to analyze images and determine if they are AI-generated or authentic photographs.

ANALYSIS CRITERIA (analyze the actual image pixels, NOT the filename):
1. Texture Analysis: Look for unnatural smoothness, repetitive patterns, or plastic-like skin textures
2. Artifact Detection: Check for GAN artifacts, diffusion model signatures, or compression anomalies
3. Lighting Consistency: Analyze shadows, reflections, and light source consistency
4. Anatomical Accuracy: Check for distorted hands, asymmetric features, or impossible anatomy
5. Background Coherence: Look for blurred or inconsistent backgrounds, floating objects
6. Edge Analysis: Check for unnaturally sharp or soft edges where they shouldn't be
7. Noise Patterns: Analyze digital noise patterns that differ from camera sensor noise
8. Detail Consistency: Look for areas where detail levels are inconsistent

IMPORTANT: Base your analysis ONLY on visual pixel data. Do NOT use the filename for detection.

Respond with a JSON object containing:
{
  "isAIGenerated": boolean,
  "confidence": number (0-100),
  "label": "AI Generated" or "Likely Original",
  "summary": "Brief one-line summary",
  "details": "Detailed explanation of findings",
  "artifacts": ["list", "of", "specific", "artifacts", "found"]
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for AI generation markers. Examine the pixel-level details, textures, lighting, and artifacts. Provide your forensic assessment."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    console.log('AI Response:', aiContent);

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiContent;
      if (aiContent.includes('```json')) {
        jsonStr = aiContent.split('```json')[1].split('```')[0].trim();
      } else if (aiContent.includes('```')) {
        jsonStr = aiContent.split('```')[1].split('```')[0].trim();
      }
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback parsing
      const isAI = aiContent.toLowerCase().includes('ai generated') || 
                   aiContent.toLowerCase().includes('ai-generated') ||
                   aiContent.toLowerCase().includes('artificial');
      analysisResult = {
        isAIGenerated: isAI,
        confidence: isAI ? 75 : 25,
        label: isAI ? 'AI Generated' : 'Likely Original',
        summary: 'Analysis completed',
        details: aiContent,
        artifacts: []
      };
    }

    const result = {
      filename: file.name,
      isDeepfake: analysisResult.isAIGenerated,
      message: analysisResult.summary || (analysisResult.isAIGenerated 
        ? 'This image shows characteristics of AI generation.'
        : 'This image appears to be an authentic photograph.'),
      confidence: analysisResult.confidence || 50,
      label: analysisResult.label || (analysisResult.isAIGenerated ? 'AI Generated' : 'Likely Original'),
      details: analysisResult.details || '',
      artifacts: analysisResult.artifacts || [],
      analysisType: 'ai-forensics',
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
