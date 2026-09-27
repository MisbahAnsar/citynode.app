import { HammerIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthPanel } from "@/components/auth-panel";
import { BuildPrompts } from "./-build-prompts";
import "../../styles.css";

export const Route = createFileRoute("/_public/build")({
  ssr: false,
  component: BuildPage,
});

function BuildPage() {
  return (
    <AuthPanel
      icon={<HammerIcon />}
      title="Ready to start building?"
      titleTestId="build.heading"
      description="Copy a prompt into your AI agent and build with NEAR AI Cloud and NEAR Intents."
      descriptionTestId="build.description"
    >
      <BuildPrompts />
    </AuthPanel>
  );
}
