
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { LandscapingStyle, DesignCatalog, RefinementModifications, RedesignDensity } from '../types';
import { LANDSCAPING_STYLES } from '../constants';

// Per coding guidelines, the API key must be sourced from `process.env.NEXT_PUBLIC_GEMINI_API_KEY`.
// This environment variable is assumed to be pre-configured and available.
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

// Per coding guidelines, use 'gemini-2.5-flash-image' for image editing tasks.
const model = 'gemini-2.5-flash-image';

/**
 * Creates a detailed prompt for the initial Gemini model redesign.
 * @param styles - The desired landscaping styles.
 * @param allowStructuralChanges - Whether to allow structural changes.
 * @param climateZone - The geographic area or climate zone.
 * @param lockAspectRatio - Whether to maintain the original aspect ratio.
 * @param redesignDensity - The desired density of the design elements.
 * @param hasLayoutOverlay - Whether a layout overlay image is provided.
 * @returns The generated prompt string.
 */
const getPrompt = (
    styles: LandscapingStyle[],
    allowStructuralChanges: boolean,
    climateZone: string,
    lockAspectRatio: boolean,
    redesignDensity: RedesignDensity,
    hasLayoutOverlay: boolean
): string => {
  const structuralChangeInstruction = allowStructuralChanges
    ? `You are allowed to make structural changes to the LANDSCAPE. This includes adding or altering hardscapes like pergolas, decks, stone patios, retaining walls, and pathways. This permission **DOES NOT** apply to the house. You are **STRICTLY FORBIDDEN** from altering the main building's architecture, windows, doors, or roof.`
    : '**ABSOLUTELY NO** structural changes. You are forbidden from adding, removing, or altering buildings, walls, gates, fences, driveways, or other permanent structures. Your redesign must focus exclusively on softscapes (plants, flowers, grass, mulch) and easily movable elements (outdoor furniture, pots, decorative items).';
  
  const objectRemovalInstruction = allowStructuralChanges
    ? 'A critical rule is to handle objects like people, animals, or vehicles. You MUST completely remove any such objects from the property and seamlessly redesign the landscape area they were occupying. The ground underneath (grass, pavement, garden beds, etc.) must be filled in as part of the new design.'
    : 'You are **STRICTLY FORBIDDEN** from removing or altering any people, animals, or vehicles (cars, trucks, etc.). Treat all of these as permanent objects in the scene that must not be changed. Your design must work around them.';
  
  let climateInstruction = climateZone
    ? `All plants, trees, and materials MUST be suitable for the '${climateZone}' climate/region.`
    : 'Select plants and materials that are generally appropriate for the visual context of the image.';

  if (climateZone && /arid|desert/i.test(climateZone)) {
    climateInstruction += " For this arid climate, prioritize drought-tolerant plants. Excellent choices include succulents (like Agave, Aloe), cacti (like Prickly Pear), ornamental grasses (like Blue Grama), and hardy shrubs (like Sagebrush).";
  }

  const aspectRatioInstruction = lockAspectRatio
    ? `You MUST maintain the exact aspect ratio of the original input image. The output image dimensions must correspond to the input image dimensions.`
    : `Preserve the original aspect ratio if possible.`;

  const densityInstruction = ((density: RedesignDensity): string => {
    switch (density) {
      case 'minimal':
        return 'CRITICAL DENSITY INSTRUCTION: The user has selected a MINIMAL design. You MUST prioritize open space and simplicity above all else. Use a very limited number of high-impact plants and features. The final design must be clean, uncluttered, and feel spacious.';
      case 'lush':
        return 'CRITICAL DENSITY INSTRUCTION: The user has selected a LUSH design. This is a primary command. You MUST maximize planting to create a dense, layered, and abundant garden. Fill nearly all available softscape areas with a rich variety of plants, textures, and foliage. The goal is an immersive, vibrant landscape with minimal empty or open space.';
      case 'default': // Corresponds to 'Balanced'
      default:
        return 'CRITICAL DENSITY INSTRUCTION: The user has selected a BALANCED design. You MUST create a harmonious mix of planted areas and functional open space (like lawn or patio). Avoid extremes: the design should not feel empty or overly crowded. The composition should be thoughtful and well-proportioned.';
    }
  })(redesignDensity);

  const jsonSchemaString = JSON.stringify({
    plants: [{ name: "string", species: "string" }],
    features: [{ name: "string", description: "string" }],
  }, null, 2);

  const styleNames = styles.map(styleId => LANDSCAPING_STYLES.find(s => s.id === styleId)?.name || styleId);
  const styleInstruction = styleNames.length > 1
    ? `Redesign the landscape in a blended style that combines '${styleNames.join("' and '")}'. Prioritize a harmonious fusion of these aesthetics.`
    : `Redesign the landscape in a '${styleNames[0]}' style.`;

  const layoutInstruction = hasLayoutOverlay
    ? `**CRITICAL RULE: DRIVEWAY & PATHWAY MASK:** You have been provided with a second image which acts as a mask, defining specific zones for hardscapes. This is your primary instruction and overrides all other style rules.
- The overlay contains filled, colored regions. These are NOT just lines; they are complete shapes you must fill.
- **DARK GRAY ZONES (DRIVEWAYS):** You MUST fill these exact shapes with a realistic driveway material (e.g., asphalt, concrete, pavers, gravel) that fits the overall design style. The shape and location from the mask are absolute and must be replicated precisely.
- **BROWN ZONES (PATHWAYS):** You MUST fill these exact shapes with a realistic pathway material (e.g., stone pavers, gravel, wood chips, brick). The shape and location from the mask are non-negotiable.
- **Unmarked areas:** You are FORBIDDEN from placing any driveway or pathway surfaces outside of the mask's marked zones.
- **Adherence is mandatory.** The final image's hardscapes must perfectly match the provided mask. Treat it as a non-negotiable blueprint.`
    : `**CRITICAL RULE: Functional Access (No Exceptions):**
  - **Garages & Driveways:** You MUST consistently identify all garage doors. A functional driveway MUST lead directly to each garage door. This driveway must be kept completely clear of any new plants, trees, hardscaping, or other obstructions. The driveway's width MUST be maintained to be at least as wide as the full width of the garage door it serves. Do not place any design elements on the driveway surface. This is a non-negotiable rule.
  - **All Other Doors:** EVERY door (front doors, side doors, patio doors, etc.) MUST be accessible. This means each door must have a clear, direct, and unobstructed pathway leading to it. This pathway must be at least as wide as the door itself and must connect logically to a larger circulation route like the main driveway or a walkway. Do not isolate any doors.`;

  return `
You are an expert AI landscape designer. Your task is to perform an in-place edit of the user's provided image.

**CORE DIRECTIVE: MODIFY THE LANDSCAPE, PRESERVE THE PROPERTY**
This is the most important rule. You MUST use the user's uploaded image as the base for your work. Your sole purpose is to modify the *landscape* within that photo. You are **STRICTLY FORBIDDEN** from generating a completely new image, replacing the property, or altering the main house/building. The output image must clearly be the same property as the input, but with a new landscape design.

**CRITICAL RULE: THE HOUSE IS IMMUTABLE**
This is a non-negotiable, absolute command. The main building in the photo MUST NOT be changed in any way.
- **DO NOT** alter its architecture, color, materials, windows, doors, roof, or any part of its structure.
- **DO NOT** add new doors or windows where there were none.
- **DO NOT** remove existing doors or windows.
- **DO NOT** change the color of the house paint, trim, or roof.
All design work must be done *around* the existing house as if it were a permanent, uneditable backdrop. This rule takes precedence over all other instructions, including style requests.

${layoutInstruction}

**PRIMARY GOAL: IMAGE GENERATION**
Your response MUST begin with the image part. This is a non-negotiable instruction. The first part of your multipart response must be the redesigned image.

**SECONDARY GOAL: JSON DATA**
After the image, you MUST provide a valid JSON object describing the new plants and features. Do not add any introductory text like "Here is the JSON" or conversational filler. The text part should contain ONLY the JSON object, optionally wrapped in a markdown code block.

**INPUT:**
You will receive one image (and potentially a second layout image) and this set of instructions.

**IMAGE REDESIGN INSTRUCTIONS:**
- **Style:** ${styleInstruction}
- **CRITICAL STYLE APPLICATION RULE:** Applying a style means modifying ONLY the landscape elements (plants, paths, furniture, etc.) within the user's photo to match the requested style. It does NOT mean creating a new property or scene. The house and its surroundings must remain identical to the original image, with only the landscape design changing. This rule is absolute.
- **Image Quality:** This is a CRITICAL instruction. The output image MUST be of the absolute highest professional quality. It must be ultra-photorealistic, extremely detailed, with sharp focus and lighting that matches the original image. The resolution should be as high as possible. Avoid any blurry, pixelated, distorted, or digitally artifacted results. The final image must look like it was taken with a high-end DSLR camera.
- **CRITICAL AESTHETIC RULE: NO TEXTUAL LABELS.** You are absolutely forbidden from adding any text, words, signs, or labels that name the style (e.g., do not write the word 'Modern' or 'Farmhouse' anywhere in the image). The style must be conveyed purely through visual design elements, not through text.
- **Object Removal:** ${objectRemovalInstruction}
- **Structural Landscape Changes:** ${structuralChangeInstruction}
- **Climate:** ${climateInstruction}
- **Aspect Ratio:** ${aspectRatioInstruction}
- **Design Density:** ${densityInstruction}

**JSON SCHEMA (for the text part):**
The JSON object must follow this exact schema.
${jsonSchemaString}
- Ensure every single plant in the JSON catalog is suitable for the specified climate zone. This is a non-negotiable rule.
- If a category is empty, provide an empty list [].
`;
};


/**
 * Creates a prompt for refining an existing Gemini model redesign based on a list of modifications.
 * @param modifications - An object containing lists of deletions, replacements, and additions.
 * @param hasLayoutOverlay - Whether a layout overlay image is provided for refinement.
 * @returns The generated prompt string.
 */
const getRefinementPrompt = (modifications: RefinementModifications, hasLayoutOverlay: boolean = false): string => {
  const instructions: string[] = [];

  if (hasLayoutOverlay) {
      instructions.push(`**Layout Refinement Mask:** A second image is provided which is a mask for driveways and paths. This is your most important task.
- The mask contains filled, colored zones. You MUST redraw the driveways (marked in DARK GRAY) and pathways (marked in BROWN) to precisely fill the shapes and locations defined by this mask.
- The materials used for these surfaces should be consistent with the existing design's style.
- All other elements of the landscape (plants, furniture, house) MUST remain completely unchanged. Your only job is to update the driveways and paths according to the mask. Adherence to the mask's zones is non-negotiable.`);
  }

  if (modifications.deletions.length > 0) {
    instructions.push(`**Deletions:** You MUST completely remove the following elements from the image: ${modifications.deletions.join(', ')}.`);
  }

  if (modifications.replacements.length > 0) {
    const replacementText = modifications.replacements.map(r => `'${r.from}' with '${r.to}'`).join('; ');
    instructions.push(`**Replacements:** You MUST replace the following elements: ${replacementText}.`);
  }
  
  if (modifications.additions.length > 0) {
    instructions.push(`**Additions:** You MUST incorporate the following new elements into the design: ${modifications.additions.join(', ')}.`);
  }

  // Handle case where no changes are requested
  if (instructions.length === 0) {
    return 'You are an AI assistant. The user wants to refine an image but provided no specific instructions. Your task is to return the original image completely unchanged. Your response MUST contain ONLY a single image part. DO NOT output any text.';
  }

  return `
You are an AI assistant for refining an existing landscape design. Your ONLY task is to generate a new image based on the instructions below.

**CRITICAL INSTRUCTION:** You MUST preserve the overall style, lighting, and unmentioned elements of the original design image. Your changes must be localized to the specified modifications only. This is the most important rule.

**INPUT EXPLANATION:**
Your input will contain one or two images (the existing design and an optional layout overlay) followed by this text prompt.

**OUTPUT REQUIREMENTS:**
Your response MUST contain ONLY a single photorealistic image part. DO NOT output any text, JSON, or markdown.

**REFINEMENT TASKS:**
- ${instructions.join('\n- ')}
`;
};


/**
 * Extracts a JSON object from a string that may contain other text.
 * @param text - The string to search for a JSON object.
 * @returns The parsed DesignCatalog object or null if not found/invalid.
 */
const parseDesignCatalog = (text: string): DesignCatalog | null => {
    try {
        let jsonStringToParse = text;

        // The model can sometimes wrap the JSON in a markdown code block.
        // We look for a ```json ... ``` block and extract its content first.
        const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            jsonStringToParse = markdownMatch[1];
        } else {
            // As a fallback, find the first '{' and the last '}' to extract the JSON object.
            // This is less robust but handles cases where markdown is missing.
            const jsonStartIndex = text.indexOf('{');
            const jsonEndIndex = text.lastIndexOf('}');

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                jsonStringToParse = text.substring(jsonStartIndex, jsonEndIndex + 1);
            } else {
                // If no potential JSON object is found, we assume the text itself is not JSON.
                // This can happen if the model returns only an image and no text, or just plain text.
                return null;
            }
        }
        
        return JSON.parse(jsonStringToParse) as DesignCatalog;

    } catch (e) {
        console.error("Failed to parse JSON from model response:", e);
        console.error("Received text:", text); // Log original text for better debugging
        return null;
    }
};


const callGeminiForRedesign = async (parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[]) => {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        // Check for safety blocks first.
        if (response.promptFeedback?.blockReason) {
            const reason = response.promptFeedback.blockReason;
            const message = response.promptFeedback.blockReasonMessage || 'No additional details provided.';
            console.error(`Gemini API request blocked. Reason: ${reason}. Message: ${message}`);
            throw new Error(`Request blocked by AI safety filters: ${reason}. Please modify the image or request.`);
        }

        let redesignedImage: { base64ImageBytes: string; mimeType: string } | null = null;
        let accumulatedText = '';

        // Ensure there are candidates to process.
        if (!response.candidates || response.candidates.length === 0) {
            console.error("Full API Response (No Candidates):", JSON.stringify(response, null, 2));
            throw new Error('The model returned no content. This could be due to a safety policy or an unknown model error.');
        }

        const responseParts = response.candidates[0].content.parts;
        for (const part of responseParts) {
            if (part.inlineData && !redesignedImage) {
                redesignedImage = {
                    base64ImageBytes: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                };
            } else if (part.text) {
                accumulatedText += part.text;
            }
        }
        
        const designCatalog = parseDesignCatalog(accumulatedText);

        if (!redesignedImage) {
            console.error("Full API Response (No Image Part):", JSON.stringify(response, null, 2));
            throw new Error('The model did not return a redesigned image.');
        }

        return {
            base64ImageBytes: redesignedImage.base64ImageBytes,
            mimeType: redesignedImage.mimeType,
            catalog: designCatalog || { plants: [], features: [] },
        };

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        if (error instanceof Error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
        throw new Error('An unknown error occurred while communicating with the Gemini API.');
    }
};

const callGeminiForRefinement = async (parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[]) => {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                // Refinement prompt asks for IMAGE ONLY. Align config with prompt.
                responseModalities: [Modality.IMAGE],
            },
        });

        // Safety block check
        if (response.promptFeedback?.blockReason) {
            const reason = response.promptFeedback.blockReason;
            const message = response.promptFeedback.blockReasonMessage || 'No additional details provided.';
            throw new Error(`Request blocked by AI safety filters: ${reason}. Please modify the image or request.`);
        }
        
        // No candidates check
        if (!response.candidates || response.candidates.length === 0) {
             console.error("Full API Response (No Candidates for Refinement):", JSON.stringify(response, null, 2));
            throw new Error('The model returned no content for refinement.');
        }

        const responseParts = response.candidates[0].content.parts;
        const imagePart = responseParts.find(part => part.inlineData);

        if (!imagePart || !imagePart.inlineData) {
            console.error("Full API Response (No Image Part for Refinement):", JSON.stringify(response, null, 2));
            throw new Error('The model did not return a refined image.');
        }

        return {
            base64ImageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        };

    } catch (error) {
        console.error('Error calling Gemini API for refinement:', error);
        if (error instanceof Error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
        throw new Error('An unknown error occurred during image refinement.');
    }
};


/**
 * Calls the Gemini API to redesign an outdoor space image.
 * @param base64Image - The base64 encoded source image.
 * @param mimeType - The MIME type of the source image.
 * @param styles - The landscaping styles to apply.
 * @param allowStructuralChanges - Flag to allow structural modifications.
 * @param climateZone - The geographic area or climate zone.
 * @param lockAspectRatio - Flag to maintain the original aspect ratio.
 * @param redesignDensity - The desired density of design elements.
 * @param layoutOverlayImage - Optional base64 encoded layout overlay image.
 * @returns An object containing the new image and design catalog.
 */
export const redesignOutdoorSpace = async (
  base64Image: string,
  mimeType: string,
  styles: LandscapingStyle[],
  allowStructuralChanges: boolean,
  climateZone: string,
  lockAspectRatio: boolean,
  redesignDensity: RedesignDensity,
  layoutOverlayImage: string | null = null
): Promise<{ base64ImageBytes: string; mimeType: string; catalog: DesignCatalog }> => {
  const prompt = getPrompt(styles, allowStructuralChanges, climateZone, lockAspectRatio, redesignDensity, !!layoutOverlayImage);
  const imagePart = { inlineData: { data: base64Image, mimeType } };

  const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [imagePart];

  if (layoutOverlayImage) {
    const [, overlayBase64] = layoutOverlayImage.split(',');
    if (overlayBase64) {
      parts.push({ inlineData: { data: overlayBase64, mimeType: 'image/png' } });
    }
  }

  parts.push({ text: prompt });
  return callGeminiForRedesign(parts);
};


/**
 * Calls the Gemini API to get replacement suggestions for a landscape element.
 * @param elementName - The name of the element to replace (e.g., "Oak Tree").
 * @param styles - The current landscaping styles.
 * @param climateZone - The climate zone for plant suitability.
 * @returns A promise that resolves to an array of suggestion strings.
 */
export const getReplacementSuggestions = async (
    elementName: string,
    styles: LandscapingStyle[],
    climateZone: string
): Promise<string[]> => {
    try {
        const climateInstruction = climateZone ? ` The suggestions must be suitable for the '${climateZone}' climate/region.` : '';
        const styleNames = styles.map(styleId => LANDSCAPING_STYLES.find(s => s.id === styleId)?.name || styleId);
        const styleInstruction = styleNames.length > 1
            ? `in a landscape that blends these styles: "${styleNames.join('", "')}"`
            : `in a "${styleNames[0]}" style landscape`;
        const prompt = `Provide exactly 3 creative and suitable replacements for a "${elementName}" ${styleInstruction}.${climateInstruction} The suggestions should be concise, like "Japanese Maple Tree" or "Stone Bird Bath".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ['suggestions'],
                },
            },
        });

        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return parsed.suggestions.slice(0, 3);
        }
        return [];
    } catch (error) {
        console.error('Error getting replacement suggestions:', error);
        return ["Try searching online for ideas", "Consider a contrasting feature", "Consult a local nursery"];
    }
};


/**
 * Calls the Gemini API to refine an existing design using text-based instructions or a layout overlay.
 * @param base64Image - The base64 encoded image of the existing design.
 * @param mimeType - The MIME type of the base image.
 * @param modifications - An object detailing deletions, replacements, and additions.
 * @param layoutOverlayImage - Optional base64 encoded layout overlay image.
 * @returns An object containing the refined image.
 */
export const refineRedesign = async (
  base64Image: string,
  mimeType: string,
  modifications: RefinementModifications,
  layoutOverlayImage: string | null = null
): Promise<{ base64ImageBytes: string; mimeType: string }> => {
  const prompt = getRefinementPrompt(modifications, !!layoutOverlayImage);
  const imagePart = { inlineData: { data: base64Image, mimeType } };
  
  const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [imagePart];

  if (layoutOverlayImage) {
    const [, overlayBase64] = layoutOverlayImage.split(',');
    if (overlayBase64) {
      parts.push({ inlineData: { data: overlayBase64, mimeType: 'image/png' } });
    }
  }

  parts.push({ text: prompt });
  
  return callGeminiForRefinement(parts);
};

/**
 * Generates an isolated image of a single landscape element.
 * @param elementName - The name of the element to generate an image for.
 * @param description - An optional description to refine the image generation prompt.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export const getElementImage = async (elementName: string, description?: string): Promise<string> => {
  try {
    const prompt = description
      ? `Photorealistic image of a single "${elementName}" (${description}), isolated on a clean, plain white background. The subject should be centered and clear, like a product photo for a catalog. No text, watermarks, or other objects.`
      : `Photorealistic image of a single "${elementName}" isolated on a clean, plain white background. The subject should be centered and clear, like a product photo for a catalog. No text, watermarks, or other objects.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0 || !response.generatedImages[0].image.imageBytes) {
      throw new Error('Image generation failed to return an image.');
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error(`Error generating image for "${elementName}":`, error);
    throw new Error(`Failed to generate image for ${elementName}.`);
  }
};

/**
 * Gets a user-friendly description for a landscape element.
 * @param elementName - The name of the element.
 * @returns A promise that resolves to a string with the element's information.
 */
export const getElementInfo = async (elementName: string): Promise<string> => {
    try {
        const prompt = `Provide a brief, user-friendly description for a "${elementName}" for a homeowner's landscape design catalog. Include its typical size, ideal conditions (sun, water), and one interesting fact or design tip. Format the response as a single, concise paragraph.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error(`Error getting info for "${elementName}":`, error);
        throw new Error(`Failed to get information for ${elementName}.`);
    }
};
