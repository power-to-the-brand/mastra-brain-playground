import { eq, and } from "drizzle-orm";
import { db, runJudges, judgeResults, judgeTurnResults, judges, runs, rubrics } from "@/db";

const MASTRA_SERVER_URL =
  process.env.NEXT_PUBLIC_MASTRA_SERVER_URL ?? "http://localhost:4111";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  reasoning: string;
}

interface ParsedJudgeOutput {
  dimensionScores: DimensionScore[];
  summary: string;
}

interface RunMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
  timestamp?: string;
}

interface RunTraceItem {
  type: "subagent" | "skill" | "tool";
  name: string;
  input: unknown;
  output: unknown;
  timestamp: string;
}

// ── Message Formatting ────────────────────────────────────────────────────────

/**
 * Extracts text content from a message, handling both new (parts) and legacy (content) formats.
 */
function extractMessageText(message: RunMessage): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!)
      .join("\n");
  }
  return message.content ?? "";
}

/**
 * Formats the conversation messages into a readable transcript for the judge.
 */
function formatConversation(messages: RunMessage[]): string {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const text = extractMessageText(m);
      const label = m.role === "user" ? "User" : "Assistant";
      return `[${label}]: ${text}`;
    })
    .join("\n\n");
}

/**
 * Formats the trace data into a readable summary for the judge.
 */
function formatTrace(trace: RunTraceItem[]): string {
  if (!trace || trace.length === 0) return "No trace data available.";

  return trace
    .map((t) => {
      const inputStr =
        typeof t.input === "string" ? t.input : JSON.stringify(t.input, null, 2);
      const outputStr =
        typeof t.output === "string" ? t.output : JSON.stringify(t.output, null, 2);
      return `[${t.type.toUpperCase()} - ${t.name}]\nInput: ${inputStr}\nOutput: ${outputStr}`;
    })
    .join("\n\n");
}

/**
 * Splits a conversation into individual turns (user-assistant pairs).
 * Each turn includes the user message and the assistant response that follows.
 */
function splitIntoTurns(
  messages: RunMessage[],
): Array<{ turnIndex: number; userMessage: string; assistantMessage: string }> {
  const turns: Array<{
    turnIndex: number;
    userMessage: string;
    assistantMessage: string;
  }> = [];

  let turnIndex = 0;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      const userText = extractMessageText(messages[i]);
      let assistantText = "";
      if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
        assistantText = extractMessageText(messages[i + 1]);
        i++; // Skip the assistant message we just consumed
      }
      turns.push({ turnIndex: turnIndex++, userMessage: userText, assistantMessage: assistantText });
    }
  }

  return turns;
}

// ── Judge Output Parsing ──────────────────────────────────────────────────────

/**
 * Parses the judge agent's response into structured dimension scores.
 * Attempts to extract JSON from the response text. Falls back to a default
 * structure if parsing fails.
 */
export function parseJudgeOutput(responseJson: unknown): ParsedJudgeOutput {
  // The response may be a string (raw text) or an object with text/content fields
  let text: string;
  if (typeof responseJson === "string") {
    text = responseJson;
  } else if (responseJson && typeof responseJson === "object") {
    const obj = responseJson as Record<string, unknown>;
    // Mastra agent responses can have various shapes
    text =
      (obj.text as string) ??
      (obj.content as string) ??
      (typeof obj.result === "string" ? obj.result : JSON.stringify(obj.result ?? obj));
  } else {
    text = String(responseJson);
  }

  // Try to extract JSON from the text — it may be wrapped in markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate that it has dimensionScores
    if (parsed.dimensionScores && Array.isArray(parsed.dimensionScores)) {
      return {
        dimensionScores: parsed.dimensionScores.map((ds: Record<string, unknown>) => ({
          name: String(ds.name ?? "unknown"),
          score: Number(ds.score ?? 0),
          weight: Number(ds.weight ?? 1),
          weightedScore: Number(ds.weightedScore ?? 0),
          reasoning: String(ds.reasoning ?? ""),
        })),
        summary: String(parsed.summary ?? ""),
      };
    }

    // If it's an array of dimension objects directly
    if (Array.isArray(parsed)) {
      return {
        dimensionScores: parsed.map((ds: Record<string, unknown>) => ({
          name: String(ds.name ?? "unknown"),
          score: Number(ds.score ?? 0),
          weight: Number(ds.weight ?? 1),
          weightedScore: Number(ds.weightedScore ?? 0),
          reasoning: String(ds.reasoning ?? ""),
        })),
        summary: String(parsed.summary ?? ""),
      };
    }

    // Parsed JSON but unexpected shape — fall through to default
  } catch {
    // JSON parse failed, fall through to default
  }

  // Default fallback: return a single generic dimension
  return {
    dimensionScores: [
      {
        name: "overall",
        score: 0,
        weight: 1,
        weightedScore: 0,
        reasoning: `Failed to parse judge output. Raw response: ${text.substring(0, 500)}`,
      },
    ],
    summary: "Judge output could not be parsed into structured scores.",
  };
}

// ── Verdict Calculation ────────────────────────────────────────────────────────

/**
 * Calculates the verdict based on the overall score and rubric passing threshold.
 * - Score is on a 1-5 scale, converted to percentage: (score / 5) * 100
 * - `passed` if >= threshold
 * - `needs_review` if within 10 points below threshold
 * - `failed` otherwise
 */
function calculateVerdict(
  overallScore: number,
  passingThreshold: number | null | undefined,
): "passed" | "needs_review" | "failed" {
  const threshold = passingThreshold ?? 60;
  const percentage = (overallScore / 5) * 100;

  if (percentage >= threshold) return "passed";
  if (percentage >= threshold - 10) return "needs_review";
  return "failed";
}

// ── Mastra Agent Call ──────────────────────────────────────────────────────────

/**
 * Calls the Mastra judge agent via HTTP POST to generate an evaluation.
 */
async function callJudgeAgent(
  judgeId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<unknown> {
  const url = `${MASTRA_SERVER_URL}/api/agents/${judgeId}/generate`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Judge agent call failed (${response.status}): ${errorText}`,
    );
  }

  return response.json();
}

// ── Core Evaluation ────────────────────────────────────────────────────────────

/**
 * Evaluates a single run-judge assignment by:
 * 1. Fetching the run_judges row with judge and rubric data
 * 2. Fetching the run data (messages, trace)
 * 3. Validating the run is completed
 * 4. Transitioning run_judges.status to "running"
 * 5. Calling the Mastra judge agent
 * 6. Parsing the response into structured dimension scores
 * 7. Calculating weighted overall score and verdict
 * 8. Writing results to judge_results (and judge_turn_results for turn_level/both modes)
 * 9. Transitioning run_judges.status to "completed" (or "failed" on error)
 */
export async function evaluateRunJudge(runJudgeId: string): Promise<void> {
  // ── 1. Fetch the run_judges row with judge and rubric ──────────────────────
  const runJudge = await db.query.runJudges.findFirst({
    where: eq(runJudges.id, runJudgeId),
    with: {
      judge: {
        with: { rubric: true },
      },
    },
  });

  if (!runJudge) {
    throw new Error(`Run-judge assignment not found: ${runJudgeId}`);
  }

  const { judge } = runJudge;
  if (!judge) {
    throw new Error(`Judge not found for run-judge assignment: ${runJudgeId}`);
  }

  const rubric = judge.rubric;
  if (!rubric) {
    throw new Error(`Rubric not found for judge: ${judge.id}`);
  }

  // ── 2. Fetch the run data ─────────────────────────────────────────────────
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runJudge.runId),
  });

  if (!run) {
    throw new Error(`Run not found: ${runJudge.runId}`);
  }

  // ── 3. Validate the run is completed ──────────────────────────────────────
  if (run.status !== "completed") {
    throw new Error(
      `Cannot evaluate run that is not completed (status: ${run.status})`,
    );
  }

  const messages = (run.messages ?? []) as RunMessage[];
  const trace = (run.trace ?? []) as RunTraceItem[];

  if (messages.length === 0) {
    throw new Error(`Run has no messages to evaluate: ${run.id}`);
  }

  // ── 4. Transition status to "running" ─────────────────────────────────────
  await db
    .update(runJudges)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(runJudges.id, runJudgeId));

  try {
    // ── 5. Build the evaluation prompt and call the judge agent ────────────
    const systemPrompt = judge.systemPrompt?.trim() || "You are an expert evaluator. Review the provided conversation and score it against the defined rubric dimensions. Provide specific reasoning for each score based on the evidence in the text.";

    const dimensions = rubric.dimensions ?? [];
    const dimensionsDescription = dimensions.length > 0
      ? `\n\nEvaluation Rubric Dimensions:\n${JSON.stringify(dimensions, null, 2)}`
      : "";

    const conversationText = formatConversation(messages);
    const traceText = formatTrace(trace);

    const userMessage = `Please evaluate the following conversation.\n\n## Conversation\n${conversationText}\n\n## Agent Trace\n${traceText}${dimensionsDescription}\n\nProvide your evaluation as JSON with:\n- "dimensionScores": array of { name, score (1-5), weight, weightedScore, reasoning }\n- "summary": brief overall summary`;

    const responseJson = await callJudgeAgent(
      judge.id,
      systemPrompt + dimensionsDescription,
      userMessage,
    );

    // ── 6. Parse the response ───────────────────────────────────────────────
    const parsed = parseJudgeOutput(responseJson);

    // ── 7. Calculate weighted overall score and verdict ─────────────────────
    const totalWeight = parsed.dimensionScores.reduce((sum, ds) => sum + ds.weight, 0);
    const overallScore =
      totalWeight > 0
        ? parsed.dimensionScores.reduce(
            (sum, ds) => sum + ds.score * ds.weight,
            0,
          ) / totalWeight
        : 0;

    // Recalculate weightedScore for each dimension based on actual scores
    const dimensionScores: DimensionScore[] = parsed.dimensionScores.map((ds) => ({
      name: ds.name,
      score: ds.score,
      weight: ds.weight,
      weightedScore: ds.score * ds.weight,
      reasoning: ds.reasoning,
    }));

    const verdict = calculateVerdict(overallScore, rubric.passingThreshold as number | null | undefined);

    // ── 8. Write results to judge_results ────────────────────────────────────
    const [result] = await db
      .insert(judgeResults)
      .values({
        runJudgeId: runJudge.id,
        runId: run.id,
        judgeId: judge.id,
        mode: judge.mode,
        overallScore: overallScore.toFixed(2),
        verdict,
        dimensionScores,
        summary: parsed.summary,
        model: judge.model,
        evaluatedAt: new Date(),
      })
      .returning();

    // ── 8b. For turn_level/both modes, evaluate each turn ───────────────────
    if ((judge.mode === "turn_level" || judge.mode === "both") && result) {
      const turns = splitIntoTurns(messages);

      const turnResultValues = turns.map((turn) => {
        const turnUserMessage = `Please evaluate this specific turn of the conversation.\n\n## Turn ${turn.turnIndex + 1}\n\n**User:** ${turn.userMessage}\n\n**Assistant:** ${turn.assistantMessage}${dimensionsDescription}\n\nProvide your evaluation as JSON with:\n- "dimensionScores": array of { name, score (1-5), weight, weightedScore, reasoning }\n- "summary": brief summary of this turn`;

        // We'll evaluate turns sequentially to avoid overwhelming the agent
        return {
          judgeResultId: result.id,
          runId: run.id,
          turnIndex: turn.turnIndex,
          scores: [] as DimensionScore[], // Will be filled in below
          overallTurnScore: "0.00",
          turnVerdict: "needs_review" as string,
          summary: "",
        };
      });

      // Evaluate each turn sequentially
      for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        const turnUserMessage = `Please evaluate this specific turn of the conversation.\n\n## Turn ${turn.turnIndex + 1}\n\n**User:** ${turn.userMessage}\n\n**Assistant:** ${turn.assistantMessage}${dimensionsDescription}\n\nProvide your evaluation as JSON with:\n- "dimensionScores": array of { name, score (1-5), weight, weightedScore, reasoning }\n- "summary": brief summary of this turn`;

        try {
          const turnResponseJson = await callJudgeAgent(
            judge.id,
            systemPrompt + dimensionsDescription,
            turnUserMessage,
          );

          const turnParsed = parseJudgeOutput(turnResponseJson);
          const turnTotalWeight = turnParsed.dimensionScores.reduce(
            (sum, ds) => sum + ds.weight,
            0,
          );
          const turnOverallScore =
            turnTotalWeight > 0
              ? turnParsed.dimensionScores.reduce(
                  (sum, ds) => sum + ds.score * ds.weight,
                  0,
                ) / turnTotalWeight
              : 0;

          const turnDimensionScores: DimensionScore[] = turnParsed.dimensionScores.map(
            (ds) => ({
              name: ds.name,
              score: ds.score,
              weight: ds.weight,
              weightedScore: ds.score * ds.weight,
              reasoning: ds.reasoning,
            }),
          );

          const turnVerdict = calculateVerdict(
            turnOverallScore,
            rubric.passingThreshold as number | null | undefined,
          );

          turnResultValues[i] = {
            ...turnResultValues[i],
            scores: turnDimensionScores,
            overallTurnScore: turnOverallScore.toFixed(2),
            turnVerdict,
            summary: turnParsed.summary,
          };
        } catch (turnError) {
          console.error(
            `Failed to evaluate turn ${turn.turnIndex} for run-judge ${runJudgeId}:`,
            turnError,
          );
          turnResultValues[i] = {
            ...turnResultValues[i],
            scores: [
              {
                name: "overall",
                score: 0,
                weight: 1,
                weightedScore: 0,
                reasoning: `Turn evaluation failed: ${turnError instanceof Error ? turnError.message : String(turnError)}`,
              },
            ],
            overallTurnScore: "0.00",
            turnVerdict: "failed",
            summary: "Turn evaluation failed.",
          };
        }
      }

      await db.insert(judgeTurnResults).values(turnResultValues);
    }

    // ── 9. Transition status to "completed" ─────────────────────────────────
    await db
      .update(runJudges)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(runJudges.id, runJudgeId));
  } catch (error) {
    // ── Error: Transition status to "failed" ────────────────────────────────
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await db
      .update(runJudges)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(runJudges.id, runJudgeId));

    throw error;
  }
}

// ── Auto-Evaluation Trigger ────────────────────────────────────────────────────

/**
 * Finds all run_judges where runId = runId AND autoEvaluate = true AND status = 'pending',
 * then calls evaluateRunJudge for each.
 */
export async function triggerAutoEvaluation(runId: string): Promise<void> {
  const pendingAutoEvaluations = await db.query.runJudges.findMany({
    where: and(
      eq(runJudges.runId, runId),
      eq(runJudges.autoEvaluate, true),
      eq(runJudges.status, "pending"),
    ),
  });

  // Evaluate each assignment sequentially to avoid overwhelming the system
  for (const assignment of pendingAutoEvaluations) {
    try {
      await evaluateRunJudge(assignment.id);
    } catch (error) {
      console.error(
        `Auto-evaluation failed for run-judge ${assignment.id}:`,
        error,
      );
      // Continue with other assignments even if one fails
    }
  }
}