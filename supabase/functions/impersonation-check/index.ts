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
    const claimedIdentityId = formData.get('claimedIdentityId') as string;
    const claimedIdentityName = formData.get('claimedIdentityName') as string;
    const referenceImage = formData.get('referenceImage') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt for impersonation detection
    const systemPrompt = `You are Secura.AI, an AI system that prevents identity impersonation and deepfake misuse on social media platforms.

Your task is to analyze an uploaded image and determine if it represents an impersonation or deepfake attempt.

Analysis Requirements:
1. Detect AI-generated artifacts in the image (unnatural textures, lighting inconsistencies, warping, blur patterns, edge artifacts)
2. Look for signs of face manipulation or generation (asymmetry, unusual skin texture, unnatural eyes, hair irregularities)
3. Analyze if the image appears to be a real photograph or AI-generated content
4. Consider if this could be used to impersonate someone else on social media

Decision Rules:
- If significant AI/deepfake artifacts are detected → FAKE
- If the image shows clear signs of face manipulation or generation → FAKE
- If the image appears to be authentic with no manipulation signs → REAL

You must respond ONLY with valid JSON in this exact format:
{
  "result": "REAL" or "FAKE",
  "confidence": number between 0 and 100,
  "reason": "short explanation of findings"
}

Be conservative - if there are clear signs of AI generation or manipulation, mark as FAKE.
Focus on pixel-level analysis: textures, lighting, artifacts, and facial features.`;

    const userPrompt = `Analyze this image for potential deepfake or impersonation attempt.

Claimed Identity: ${claimedIdentityName}

The user is attempting to post this content under the identity "${claimedIdentityName}" on a social media platform.

Analyze the image thoroughly for:
1. AI-generated artifacts (unnatural textures, lighting, warping)
2. Face manipulation signs (synthetic skin, unusual features)
3. Overall authenticity indicators

${referenceImage ? "A reference image of the verified identity is also provided for comparison." : "No reference image available - focus on detecting AI generation artifacts."}

Provide your analysis in JSON format only.`;

    // Prepare messages with image(s)
    const content: any[] = [
      { type: "text", text: userPrompt },
      {
        type: "image_url",
        image_url: {
          url: `data:${file.type || 'image/jpeg'};base64,${base64Image}`,
        },
      },
    ];

    // Add reference image if provided
    if (referenceImage) {
      content.push({
        type: "image_url",
        image_url: {
          url: referenceImage,
        },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service quota exceeded. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the JSON response from AI
    let analysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Default to a cautious response
      analysisResult = {
        result: "FAKE",
        confidence: 60,
        reason: "Unable to fully analyze image. Blocking as a precaution.",
      };
    }

    // Validate and normalize the result
    const result = {
      result: analysisResult.result === "REAL" ? "REAL" : "FAKE",
      confidence: Math.min(100, Math.max(0, Number(analysisResult.confidence) || 75)),
      reason: String(analysisResult.reason || "Analysis complete."),
    };

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
