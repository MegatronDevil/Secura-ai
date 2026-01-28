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

    // Build the prompt for impersonation detection - STRICT mode
    const systemPrompt = `You are Secura.AI, a STRICT AI security system that prevents deepfakes and manipulated content on social media.

YOUR PRIMARY DIRECTIVE: Be EXTREMELY suspicious of ALL images. Err on the side of caution - it's better to block a real image than allow a fake one.

DETECTION CHECKLIST - Mark as FAKE if ANY of these are present:

1. BODY/FACE MANIPULATION SIGNS:
   - Unnatural body proportions or anatomy
   - Body parts that look pasted or edited onto another person
   - Mismatched skin tones between face, neck, and body
   - Unnatural muscle definition or body shape
   - Clothing edges that blur into skin unnaturally
   - Head-to-body proportion issues

2. AI GENERATION ARTIFACTS:
   - Overly smooth or plastic-looking skin
   - Unnatural lighting on face vs background
   - Blurry or distorted backgrounds near subjects
   - Fingers, hands, or ears with abnormalities
   - Hair that looks painted or has unnatural edges
   - Eyes that don't match in focus or reflection

3. EDITING/COMPOSITING SIGNS:
   - Different image quality between face and body
   - Shadows that don't match light sources
   - Edge artifacts around people (halos, blur, hard cuts)
   - Inconsistent noise/grain patterns
   - Color temperature mismatches

4. SUSPICIOUS ELEMENTS:
   - Faces that look "too perfect" or uncanny
   - Multiple people with matching artifacts
   - Signs of face-swap or body-swap editing

CRITICAL RULE: If you see a shirtless person, carefully analyze if the body belongs to the face - look for neck/shoulder misalignment, skin tone differences, and unnatural anatomy.

Decision:
- If ANY manipulation sign detected → result: "FAKE"
- Only mark as "REAL" if the image appears 100% authentic with ZERO suspicious elements

Respond ONLY in JSON:
{
  "result": "REAL" or "FAKE",
  "confidence": number between 0 and 100,
  "reason": "specific artifacts or manipulation signs detected"
}`;

    const userPrompt = `STRICTLY analyze this image for manipulation, deepfakes, or AI-generated content.

Claimed Identity: ${claimedIdentityName}

SPECIFIC CHECKS TO PERFORM:
1. Is this a face-swap or body-swap? Check if the face matches the body naturally.
2. Are there ANY editing artifacts around the face, neck, or body edges?
3. Does the skin tone match consistently across face, neck, chest, and arms?
4. Are body proportions anatomically correct?
5. Is there any sign of AI generation (overly smooth skin, unnatural features)?
6. Do shadows and lighting match across the entire image?

${referenceImage ? "Compare against the reference image of the verified identity." : "No reference available - focus heavily on detecting ANY manipulation or AI artifacts."}

BE STRICT: If there's even slight evidence of editing or manipulation, mark as FAKE.
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
