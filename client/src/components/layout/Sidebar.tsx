import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe2,
  House,
  LayoutDashboard,
  ListTodo,
  Route,
  ScanSearch,
  Settings2,
  SquarePen,
  Tags,
  UsersRound,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { listKnowledgeDocuments } from "@/api/knowledge";
import { queryKeys } from "@/api/queryKeys";
import { listTasks } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "创作",
    items: [
      { to: "/", label: "首页", icon: House },
      { to: "/novels", label: "小说列表", icon: BookOpenText },
      { to: "/creative-hub", label: "创作中枢", icon: LayoutDashboard },
      { to: "/book-analysis", label: "拆书", icon: ScanSearch },
      { to: "/tasks", label: "任务中心", icon: ListTodo },
    ],
  },
  {
    title: "资产",
    items: [
      { to: "/genres", label: "题材基底库", icon: Tags },
      { to: "/story-modes", label: "推进模式库", icon: Workflow },
      { to: "/titles", label: "标题工坊", icon: SquarePen },
      { to: "/knowledge", label: "知识库", icon: Database },
      { to: "/worlds", label: "世界观", icon: Globe2 },
      { to: "/style-engine", label: "写法引擎", icon: WandSparkles },
      { to: "/base-characters", label: "基础角色库", icon: UsersRound },
    ],
  },
  {
    title: "系统",
    items: [
      { to: "/settings/model-routes", label: "模型路由", icon: Route },
      { to: "/settings", label: "系统设置", icon: Settings2 },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.list("sidebar"),
    queryFn: () => listTasks({ limit: 80 }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => item.status === "queued" || item.status === "running") ? 4000 : false;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.knowledge.documents("sidebar"),
    queryFn: () => listKnowledgeDocuments(),
    staleTime: 30_000,
  });

  const tasks = taskQuery.data?.data?.items ?? [];
  const runningTaskCount = tasks.filter((item) => item.status === "running").length;
  const failedTaskCount = tasks.filter((item) => item.status === "failed").length;
  const knowledgeDocuments = knowledgeQuery.data?.data ?? [];
  const failedIndexCount = knowledgeDocuments.filter((item) => item.latestIndexStatus === "failed").length;

  const renderBadge = (to: string) => {
    if (to === "/tasks") {
      if (runningTaskCount <= 0 && failedTaskCount <= 0) {
        return null;
      }
      return (
        <div className={cn("flex items-center gap-1", collapsed ? "absolute right-1 top-1" : "ml-auto")}>
          {runningTaskCount > 0 ? (
            <Badge
              variant="secondary"
              className={cn("h-5 px-1.5 text-[10px]", collapsed && "h-4 min-w-4 px-1 text-[9px]")}
            >
              {collapsed ? runningTaskCount : `R${runningTaskCount}`}
            </Badge>
          ) : null}
          {failedTaskCount > 0 ? (
            <Badge
              variant="destructive"
              className={cn("h-5 px-1.5 text-[10px]", collapsed && "h-4 min-w-4 px-1 text-[9px]")}
            >
              {collapsed ? failedTaskCount : `F${failedTaskCount}`}
            </Badge>
          ) : null}
        </div>
      );
    }

    if (to === "/knowledge" && failedIndexCount > 0) {
      return (
        <Badge
          variant="destructive"
          className={cn(
            "h-5 px-1.5 text-[10px]",
            collapsed ? "absolute right-1 top-1 h-4 min-w-4 px-1 text-[9px]" : "ml-auto",
          )}
        >
          {collapsed ? failedIndexCount : `F${failedIndexCount}`}
        </Badge>
      );
    }

    return null;
  };

  return (
    <aside
      className={cn(
        "h-full shrink-0 overflow-y-auto border-r bg-[linear-gradient(180deg,rgba(255,251,247,0.92),rgba(255,255,255,0.86))] p-3 transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("mb-4 flex items-center", collapsed ? "justify-center" : "justify-end")}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onToggle}
          aria-label={collapsed ? "展开导航栏" : "收起导航栏"}
          title={collapsed ? "展开导航栏" : "收起导航栏"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed ? (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-[linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.92))] p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/80">Director Flow</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">把一本书从灵感推进到章节执行</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">首页、项目、资产和任务被收在同一条创作主线里。</div>
        </div>
      ) : null}

      <nav className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {group.title}
              </div>
            ) : (
              <div className="mx-auto h-px w-8 bg-border/70" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isNovelEntry = item.to === "/novels";

              return (
                <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}>
                  {({ isActive }) => (
                    <div
                      className={cn(
                        "relative flex items-center rounded-2xl text-sm transition-all",
                        collapsed ? "justify-center px-2 py-2.5" : "py-2.5 pl-4 pr-3",
                        isActive
                          ? "bg-[linear-gradient(135deg,rgba(255,237,213,0.92),rgba(255,255,255,0.95))] font-semibold text-slate-900 shadow-sm"
                          : "text-foreground hover:bg-white/80 hover:text-slate-900",
                        isNovelEntry && !collapsed && (isActive ? "ring-1 ring-amber-200" : "bg-primary/[0.04] hover:bg-primary/[0.06]"),
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-transparent",
                          isActive && "bg-primary",
                          collapsed && "left-0.5 h-6",
                        )}
                      />

                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          collapsed ? "mx-auto" : "mr-3",
                          isNovelEntry && "text-primary",
                        )}
                      />

                      {!collapsed ? (
                        <span className={cn("truncate", isNovelEntry && "font-semibold")}>
                          {item.label}
                        </span>
                      ) : null}

                      {renderBadge(item.to)}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
