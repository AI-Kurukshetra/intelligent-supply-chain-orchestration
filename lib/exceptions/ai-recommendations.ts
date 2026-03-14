import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export type ExceptionForAi = {
  exception_type: string;
  context_json: unknown;
};

export async function getRecommendation(exception: ExceptionForAi): Promise<string> {
  const result = await streamText({
    model: openai("gpt-4o"),
    messages: [
      {
        role: "system",
        content:
          "You are a supply chain planning assistant. Given a supply chain exception, provide a concise 2-3 sentence actionable recommendation."
      },
      {
        role: "user",
        content: `Exception type: ${exception.exception_type}. Context: ${JSON.stringify(exception.context_json)}. What should the supply chain planner do?`
      }
    ]
  });

  return (await result.text).trim();
}
