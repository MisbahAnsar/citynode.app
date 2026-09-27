import { ArrowsLeftRightIcon, CheckIcon, CopyIcon, SparkleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

export const PRIVATE_INFERENCE_PROMPT = `Install the NEAR AI Cloud skill from https://github.com/near/agent-skills (npx skills add near/agent-skills --skill near-ai-cloud), then let's build an application that leverages verifiable private inference.

Before writing any code, grill me about what I want to build — interview me one question at a time until you understand the application I have in mind. Facts are your job; decisions are mine.

If this is an existing application, swap out the gateway URL and model with a supported confidential model: point your OpenAI-compatible client at https://cloud-api.near.ai/v1 and choose a confidential model from the skill's references.

If this is a new application, build and leverage TanStack AI for the integration where appropriate.

Then build it one slice at a time, test-first.`;

export const NEAR_INTENTS_PROMPT = `Install the near-intents skill from https://github.com/near/agent-skills (npx skills add near/agent-skills --skill near-intents), then let's build an application that leverages NEAR Intents with confidential AI.

Before writing any code, learn what the near-intents skill offers — the 1Click REST API for cross-chain swaps across EVM, Solana, NEAR, TON, Stellar and Tron — then grill me about what I want to build: interview me one question at a time until you understand the application I have in mind. Facts are your job; decisions are mine.

If this is an existing application, integrate NEAR Intents and route any AI-powered steps through confidential AI (NEAR AI Cloud, OpenAI-compatible at https://cloud-api.near.ai/v1).

If this is a new application, design it around the 1Click API — TanStack AI is not appropriate for intents.

Then build it one slice at a time, test-first.`;

type BuildPrompt = {
  id: string;
  testId: string;
  title: string;
  description: string;
  icon: typeof SparkleIcon;
  prompt: string;
};

const BUILD_PROMPTS: BuildPrompt[] = [
  {
    id: "private-inference",
    testId: "onboard.prompt-private-inference",
    title: "Integrate NEAR AI Private Inference",
    description:
      "Copy a prompt that teaches your agent to build with verifiable private inference on NEAR AI Cloud.",
    icon: SparkleIcon,
    prompt: PRIVATE_INFERENCE_PROMPT,
  },
  {
    id: "near-intents",
    testId: "onboard.prompt-near-intents",
    title: "Integrate NEAR Intents",
    description:
      "Copy a prompt that teaches your agent to build cross-chain swaps with NEAR Intents and confidential AI.",
    icon: ArrowsLeftRightIcon,
    prompt: NEAR_INTENTS_PROMPT,
  },
];

export function BuildPrompts() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (entry: BuildPrompt) => {
    try {
      await navigator.clipboard.writeText(entry.prompt);
      setCopiedId(entry.id);
      toast.success("Prompt copied — paste it into your AI agent");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy the prompt");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3" data-testid="onboard.build-prompts">
      {BUILD_PROMPTS.map((entry) => {
        const Icon = entry.icon;
        const copied = copiedId === entry.id;
        return (
          <Item
            key={entry.id}
            variant="outline"
            data-testid={entry.testId}
            render={<button type="button" onClick={() => void copy(entry)} />}
          >
            <ItemMedia variant="icon">
              {copied ? (
                <CheckIcon className="text-foreground" />
              ) : (
                <Icon className="text-muted-foreground" />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{entry.title}</ItemTitle>
              <ItemDescription>
                {copied ? "Copied — paste it into your AI agent." : entry.description}
              </ItemDescription>
            </ItemContent>
            <ItemMedia variant="icon">
              {copied ? <CheckIcon /> : <CopyIcon className="text-muted-foreground" />}
            </ItemMedia>
          </Item>
        );
      })}
    </div>
  );
}
