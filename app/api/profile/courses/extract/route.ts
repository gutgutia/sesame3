import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai/providers";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";
import { TRANSCRIPT_EXTRACTION_PROMPT } from "@/lib/prompts";

// Schema for extracted courses
const ExtractedCourseSchema = z.object({
  name: z.string().describe("The course name exactly as shown on transcript"),
  subject: z.enum(["Math", "Science", "English", "History", "Language", "Arts", "Computer Science", "Other"])
    .describe("The academic subject area"),
  level: z.enum(["regular", "honors", "ap", "ib", "college"])
    .describe("The course level/rigor. Use 'ap' for AP courses, 'ib' for IB, 'honors' for honors, 'college' for dual enrollment, 'regular' otherwise"),
  gradeLevel: z.enum(["9th", "10th", "11th", "12th"])
    .describe("The grade/year when the student took this course"),
  grade: z.string().optional()
    .describe("The letter grade received (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F, P, or empty if not shown)"),
  credits: z.number().optional()
    .describe("The number of credits (usually 1.0 for full year, 0.5 for semester). Default to 1.0 if not shown"),
});

const TranscriptExtractionSchema = z.object({
  courses: z.array(ExtractedCourseSchema),
  studentName: z.string().optional().describe("Student's name if visible"),
  schoolName: z.string().optional().describe("School name if visible"),
  gpaUnweighted: z.number().optional().describe("Unweighted GPA if shown"),
  gpaWeighted: z.number().optional().describe("Weighted GPA if shown"),
});

/**
 * POST /api/profile/courses/extract
 * Extract courses from a transcript image/PDF using Gemini Vision
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const isPDF = file.type === "application/pdf";
    
    if (!validImageTypes.includes(file.type) && !isPDF) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a PDF, PNG, JPEG, or WebP file." 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    
    // Build file content - PDFs use 'file' type, images use 'image' type
    const fileContent = isPDF
      ? { type: "file" as const, data: Buffer.from(bytes), mediaType: "application/pdf" as const }
      : { type: "image" as const, image: `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}` };

    // Get existing courses for deduplication
    const existingCourses = await prisma.course.findMany({
      where: { studentProfileId: profileId },
      select: { id: true, name: true, gradeLevel: true },
    });

    // Call Gemini to extract courses
    const { object: extractedData } = await generateObject({
      model: models.google.gemini3Flash,
      schema: TranscriptExtractionSchema,
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: TRANSCRIPT_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Process courses with deduplication check
    const processedCourses = extractedData.courses.map((course) => {
      // Check for exact match
      const exactMatch = existingCourses.find(
        (c) => 
          c.name.toLowerCase().trim() === course.name.toLowerCase().trim() &&
          c.gradeLevel === course.gradeLevel
      );

      if (exactMatch) {
        return {
          ...course,
          isDuplicate: true,
          isPotentialDuplicate: false,
          matchType: "exact" as const,
          existingId: exactMatch.id,
        };
      }

      // Check for fuzzy match (similar names)
      const fuzzyMatch = existingCourses.find((c) => {
        const similarity = calculateSimilarity(
          c.name.toLowerCase().trim(),
          course.name.toLowerCase().trim()
        );
        return similarity > 0.8 && c.gradeLevel === course.gradeLevel;
      });

      if (fuzzyMatch) {
        return {
          ...course,
          isDuplicate: false,
          isPotentialDuplicate: true,
          matchType: "similar" as const,
          existingId: fuzzyMatch.id,
          existingName: fuzzyMatch.name,
        };
      }

      return {
        ...course,
        isDuplicate: false,
        isPotentialDuplicate: false,
        matchType: "new" as const,
      };
    });

    return NextResponse.json({
      courses: processedCourses,
      studentName: extractedData.studentName,
      schoolName: extractedData.schoolName,
      gpaUnweighted: extractedData.gpaUnweighted,
      gpaWeighted: extractedData.gpaWeighted,
      totalExtracted: extractedData.courses.length,
      duplicates: processedCourses.filter((c) => c.isDuplicate).length,
      potentialDuplicates: processedCourses.filter((c) => c.isPotentialDuplicate).length,
    });

  } catch (error) {
    console.error("Error extracting transcript:", error);
    return NextResponse.json(
      { error: "Failed to extract courses from transcript" },
      { status: 500 }
    );
  }
}

/**
 * Calculate Levenshtein similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

