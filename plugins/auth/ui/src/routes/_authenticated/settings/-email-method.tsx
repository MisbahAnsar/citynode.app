import { EnvelopeIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { MethodHeader } from "./-method-header";

export function EmailMethod({ email, onManage }: { email: string | null; onManage: () => void }) {
  const hasEmail = !!email;
  return (
    <section className="flex flex-col gap-4" data-testid="settings.email">
      <MethodHeader title="Email" />
      <Item variant="outline">
        <ItemMedia variant="icon">
          <EnvelopeIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Email address</ItemTitle>
          <ItemDescription className="break-all">
            {hasEmail ? email : "Add an email so you can sign in from another device."}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="w-full sm:w-auto">
          {hasEmail ? (
            <>
              <Badge variant="secondary">Linked</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onManage}
                data-testid="settings.email-change-button"
              >
                Change
              </Button>
            </>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={onManage}
              data-testid="settings.email-add-button"
            >
              Add email
            </Button>
          )}
        </ItemActions>
      </Item>
    </section>
  );
}
