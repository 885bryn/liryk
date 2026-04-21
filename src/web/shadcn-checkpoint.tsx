import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export function ShadcnCheckpoint() {
  return (
    <section aria-label="Shadcn checkpoint" className="space-y-4">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Checkpoint Card</CardTitle>
          <CardDescription>Required primitives are rendered before shell composition work.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button>Primary action</Button>
          <Switch aria-label="Enable dark mode" checked={false} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Open menu</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem>Theme preferences</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </section>
  );
}
