import { BookMarked, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  workspaceNavMode?: "workspace" | "project";
  onWorkspaceNavModeChange?: (mode: "workspace" | "project") => void;
}

export default function Navbar(props: NavbarProps) {
  const { workspaceNavMode, onWorkspaceNavModeChange } = props;
  const location = useLocation();
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-[rgba(255,252,248,0.82)] px-6 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1e3a8a)] text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)]">
          <BookMarked className="h-5 w-5" />
          <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-300 p-[2px] text-slate-900" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-[0.01em]">小说导演台</span>
          <span className="text-[11px] text-muted-foreground">从灵感到章节的 AI 创作控制台</span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        {!isHome && showWorkspaceToggle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-200 bg-white/75"
            onClick={() => onWorkspaceNavModeChange?.(workspaceNavMode === "workspace" ? "project" : "workspace")}
          >
            {workspaceNavMode === "workspace" ? "项目导航" : "创作导航"}
          </Button>
        ) : null}
        <LLMSelector compact showBadge={false} showHelperText={false} />
      </div>
    </header>
  );
}
