import { NextRequest, NextResponse } from "next/server";
import { getFromS3 } from "@/lib/s3";
import { db } from "@/db";
import { mockTools } from "@/db/schema";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const MAX_FILES = 10;

const ALLOWED_MODELS = [
  "google/gemini-2.0-flash",
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite-preview",
];

const mockToolSchema = z.object({
  toolId: z
    .string()
    .describe(
      "Normalized kebab-case tool ID derived from the file name or content",
    ),
  name: z.string().describe("Human-readable tool name"),
  description: z.string().describe("What the tool does"),
  inputSchema: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["string", "number", "boolean", "array", "object"]),
      description: z.string(),
      required: z.boolean(),
    }),
  ),
  mockMode: z.enum(["fixed_response", "llm_simulated"]),
  mockFixedResponse: z.any().nullable(),
  mockSimulationPrompt: z.string().nullable(),
  mockSimulationModel: z.string().nullable(),
});

interface ConversionResult {
  fileKey: string;
  success: boolean;
  toolId?: string;
  name?: string;
  error?: string;
}

interface GeneratedSuccess {
  fileKey: string;
  success: true;
  toolId: string;
  name: string;
  data: z.infer<typeof mockToolSchema>;
}

interface GeneratedFailure {
  fileKey: string;
  success: false;
  error: string;
}

type GeneratedResult = GeneratedSuccess | GeneratedFailure;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileKeys: string[] = body.fileKeys;
    const model = body.model ?? "google/gemini-2.0-flash";

    // Validation
    if (
      !Array.isArray(fileKeys) ||
      fileKeys.length === 0 ||
      fileKeys.length > MAX_FILES
    ) {
      return NextResponse.json(
        { error: `fileKeys must be an array of 1-${MAX_FILES} strings` },
        { status: 400 },
      );
    }

    if (
      !fileKeys.every(
        (k) => typeof k === "string" && k.startsWith("playground/"),
      )
    ) {
      return NextResponse.json(
        { error: "All fileKeys must start with playground/" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    // Step 1: Fetch all file contents from S3 in parallel
    const fileContents = await Promise.all(
      fileKeys.map(async (key) => {
        try {
          const content = await getFromS3(key);
          return { key, content, error: null as string | null };
        } catch (err: any) {
          return {
            key,
            content: "",
            error: err.message || "Failed to read from S3",
          };
        }
      }),
    );

    // Step 2: Generate mock tools in parallel
    const generatedResults: GeneratedResult[] = await Promise.all(
      fileContents.map(
        async ({ key, content, error }): Promise<GeneratedResult> => {
          if (error) {
            return { fileKey: key, success: false, error };
          }

          try {
            const { object } = await generateObject({
              model: google(model.replace("google/", "")),
              schema: mockToolSchema,
              system: `You are a mock tool generator. Given a file's content, produce a mock tool definition that can be stored in a database.

Rules:
- toolId: normalized kebab-case ID (e.g., "get-price", "create-order")
- name: human-readable title
- description: concise explanation of what the tool does
- inputSchema: array of parameter definitions inferred from the file (function signatures for code, headings/descriptions for markdown). Use "object" type for nested structures.
- mockMode: always "llm_simulated"
- mockFixedResponse: null
- mockSimulationPrompt: a detailed prompt that instructs an LLM how to simulate this tool. You MUST extract and include the exact output JSON structure from the file content itself. Include:
    * The tool's purpose and expected behavior
    * Input parameters and their types
    * Output structure: explicitly list the JSON schema, field names, types, and nested objects as they appear in the source file (e.g., if the code returns {"status": "...", "components": {"nested": ...}}, reproduce that exact shape in the prompt)
    * Any business logic rules, calculations, or conditional behaviors found in the code
    * Example: for a Python function returning a dict with 'ddp_status', 'ddp_components', 'ddp_price_per_unit_usd', include all these fields and their nested structure in the simulation prompt
- mockSimulationModel: "gemini-2.0-flash"`,
              prompt: `File: ${key}\n\nContent:\n${content}`,
            });

            return {
              fileKey: key,
              success: true,
              toolId: object.toolId,
              name: object.name,
              data: {
                ...object,
                mockSimulationModel: model,
              },
            };
          } catch (err: any) {
            return {
              fileKey: key,
              success: false,
              error: err.message || "LLM generation failed",
            };
          }
        },
      ),
    );

    // Step 3: Batch insert successful results with upsert
    const successful = generatedResults.filter(
      (r): r is GeneratedSuccess => r.success,
    );
    const results: ConversionResult[] = generatedResults.map((r) => ({
      fileKey: r.fileKey,
      success: r.success,
      toolId: r.success ? r.toolId : undefined,
      name: r.success ? r.name : undefined,
      error: r.success ? undefined : r.error,
    }));

    if (successful.length > 0) {
      try {
        for (const r of successful) {
          await db
            .insert(mockTools)
            .values({
              toolId: r.data.toolId,
              name: r.data.name,
              description: r.data.description,
              inputSchema: r.data.inputSchema,
              mockMode: r.data.mockMode,
              mockFixedResponse: r.data.mockFixedResponse,
              mockSimulationPrompt: r.data.mockSimulationPrompt,
              mockSimulationModel: r.data.mockSimulationModel,
            })
            .onConflictDoUpdate({
              target: mockTools.toolId,
              set: {
                name: r.data.name,
                description: r.data.description,
                inputSchema: r.data.inputSchema,
                mockMode: r.data.mockMode,
                mockFixedResponse: r.data.mockFixedResponse,
                mockSimulationPrompt: r.data.mockSimulationPrompt,
                mockSimulationModel: r.data.mockSimulationModel,
                updatedAt: new Date(),
              },
            });
        }
      } catch (err: any) {
        // Mark all as failed if DB insert fails
        return NextResponse.json(
          {
            results: successful.map((r) => ({
              fileKey: r.fileKey,
              success: false,
              error: `DB insert failed: ${err.message}`,
            })),
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("S3 workspace conversion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
