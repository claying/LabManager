import { useNavigate } from "react-router-dom";
import { FlaskConical, Lightbulb, MessageSquare, Plus, Scale, Video } from "lucide-react";
import { Button } from "@pi-os/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pi-os/ui/components/dropdown-menu";
import { useQuickActions } from "../../lib/quick-actions-context";

export function QuickCreateMenu() {
  const navigate = useNavigate();
  const { openIdeaCapture, openNewDecision } = useQuickActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate("/projects?new=project")}>
          <FlaskConical className="h-4 w-4" /> Project
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openIdeaCapture}>
          <Lightbulb className="h-4 w-4" /> Idea
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openNewDecision}>
          <Scale className="h-4 w-4" /> Decision
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/projects")}>
          <MessageSquare className="h-4 w-4" /> Update
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/meetings?new=meeting")}>
          <Video className="h-4 w-4" /> Meeting
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
