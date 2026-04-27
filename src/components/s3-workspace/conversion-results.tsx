"use client";

import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

export interface ConversionResult {
  fileKey: string;
  success: boolean;
  toolId?: string;
  name?: string;
  error?: string;
}

interface ConversionResultsProps {
  results: ConversionResult[];
}

export function ConversionResults({ results }: ConversionResultsProps) {
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  return (
    <div className="space-y-6">
      {successes.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-semibold">
              {successes.length} tool{successes.length !== 1 ? "s" : ""} created
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {successes.map((result) => (
              <li
                key={result.fileKey}
                className="flex items-center justify-between text-sm text-green-700 dark:text-green-300"
              >
                <span className="font-medium">{result.name || result.fileKey}</span>
                {result.toolId && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    ID: {result.toolId}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
            >
              View tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {failures.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">
              {failures.length} file{failures.length !== 1 ? "s" : ""} failed
            </h3>
          </div>
          <ul className="mt-3 space-y-3">
            {failures.map((result) => (
              <li
                key={result.fileKey}
                className="text-sm text-red-700 dark:text-red-300"
              >
                <div className="font-medium">{result.fileKey}</div>
                {result.error && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {result.error}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
