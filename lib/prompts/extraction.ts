/**
 * Data Extraction Prompts
 * 
 * Used for extracting structured data from documents like transcripts.
 */

// =============================================================================
// TRANSCRIPT EXTRACTION
// =============================================================================

/**
 * Prompt for extracting courses from a transcript image/PDF.
 * Used with Gemini vision capabilities.
 */
export const TRANSCRIPT_EXTRACTION_PROMPT = `Analyze this high school transcript and extract ALL courses listed.

For each course, identify:
- The exact course name as shown
- The subject area (Math, Science, English, History, Language, Arts, Computer Science, or Other)
- The course level (look for indicators like "AP", "Honors", "H", "IB", "Dual Enrollment", "DE", "College" in the name)
- The grade level/year when taken (9th/Freshman, 10th/Sophomore, 11th/Junior, 12th/Senior)
- The letter grade received
- Credits (if shown, otherwise assume 1.0 for full year courses)

Also extract the student name, school name, and GPAs if visible.

Be thorough - extract every course you can find, even if some information is unclear. For unclear fields, make your best guess based on context.`;

// =============================================================================
// FUTURE: Other extraction prompts can go here
// =============================================================================

// Activity extraction from resume
// Award extraction from documents
// etc.

