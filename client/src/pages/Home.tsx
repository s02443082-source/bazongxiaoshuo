import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Orbit, Sparkles, WandSparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { getNovelList } from "@/api/novel";
import type { NovelListResponse } from "@/api/novel/shared";
import { queryKeys } from "@/api/queryKeys";
import { listTasks } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canContinueDirector,
  canContinueFront10AutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  getTaskCenterLink,
  getWorkflowBadge,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  isWorkflowActionRequired,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { toast } from "@/components/ui/toast";

const HOME_NOVEL_FETCH_LIMIT = 100;
const HOME_RECENT_LIMIT = 6;
const DIRECTOR_CREATE_LINK = "/novels/create?mode=director";
const MANUAL_CREATE_LINK = "/novels/create";

type HomeNovelItem = NovelListResponse["items"][number];

function formatDate(value: string | undefined): string {
  if (!value) {
    return "暂无";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }
  return date.toLocaleString();
}

function getNovelPriorityScore(novel: HomeNovelItem): number {
  const task = novel.latestAutoDirectorTask ?? null;
  if (canContinueFront10AutoExecution(task)) {
    return 0;
  }
  if (requiresCandidateSelection(task)) {
    return 1;
  }
  if (canContinueDirector(task)) {
    return 2;
  }
  if (task?.status === "running" || task?.status === "queued") {
    return 3;
  }
  if (canEnterChapterExecution(task)) {
    return 4;
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return 5;
  }
  return 6;
}

function getNovelLeadSummary(novel: HomeNovelItem): string {
  const workflowDescription = getWorkflowDescription(novel.latestAutoDirectorTask ?? null);
  if (workflowDescription) {
    return workflowDescription;
  }
  if (novel.description?.trim()) {
    return novel.description.trim();
  }
  if (novel.world?.name) {
    return `当前项目已绑定世界观「${novel.world.name}」，可以直接继续创作。`;
  }
  return "当前项目暂无简介，可以直接进入编辑页继续推进。";
}

function MetricCard(props: {
  title: string;
  value: string | number;
  hint: string;
  pending?: boolean;
}) {
  const { title, value, hint, pending = false } = props;
  return (
    <Card className="border-amber-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,249,242,0.9))] shadow-sm">
      <CardHeader className="pb-3">
        <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
          {title}
        </CardDescription>
        <CardTitle className="text-3xl tracking-tight">{pending ? "--" : value}</CardTitle>
        <div className="text-xs leading-5 text-muted-foreground">{hint}</div>
      </CardHeader>
    </Card>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.list("home"),
    queryFn: () => listTasks({ limit: 80 }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => item.status === "queued" || item.status === "running") ? 4000 : false;
    },
  });

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.list(1, HOME_NOVEL_FETCH_LIMIT),
    queryFn: () => getNovelList({ page: 1, limit: HOME_NOVEL_FETCH_LIMIT }),
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: async (input: {
      taskId: string;
      mode?: "auto_execute_front10";
    }) => continueNovelWorkflow(input.taskId, input.mode ? { continuationMode: input.mode } : undefined),
    onSuccess: async (_response, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      toast.success(input.mode === "auto_execute_front10" ? "已继续自动执行前 2 章。" : "自动导演已继续推进。");
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_front10"
            ? "继续自动执行前 2 章失败。"
            : "继续自动导演失败。",
      );
    },
  });

  const tasks = taskQuery.data?.data?.items ?? [];
  const allNovels = novelQuery.data?.data?.items ?? [];
  const hasNovels = allNovels.length > 0;

  const liveWorkflowCount = useMemo(
    () => allNovels.filter((novel) => isWorkflowRunningInBackground(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const actionRequiredCount = useMemo(
    () => allNovels.filter((novel) => isWorkflowActionRequired(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const readyForExecutionCount = useMemo(
    () => allNovels.filter((novel) => canEnterChapterExecution(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const failedTaskCount = useMemo(
    () => tasks.filter((item) => item.status === "failed").length,
    [tasks],
  );
  const primaryNovel = useMemo(() => {
    if (allNovels.length === 0) {
      return null;
    }
    return allNovels.reduce<HomeNovelItem | null>((selected, current) => {
      if (!selected) {
        return current;
      }
      const selectedPriority = getNovelPriorityScore(selected);
      const currentPriority = getNovelPriorityScore(current);
      return currentPriority < selectedPriority ? current : selected;
    }, null);
  }, [allNovels]);
  const recentNovels = useMemo(
    () => allNovels.slice(0, HOME_RECENT_LIMIT),
    [allNovels],
  );

  const stopCardClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const openNovelEditor = (novelId: string) => {
    navigate(`/novels/${novelId}/edit`);
  };

  const renderNovelPrimaryAction = (
    novel: HomeNovelItem,
    options?: {
      size?: "default" | "sm" | "lg";
      stopPropagation?: boolean;
    },
  ) => {
    const { size = "sm", stopPropagation = false } = options ?? {};
    const task = novel.latestAutoDirectorTask ?? null;
    const isWorkflowPending = continueWorkflowMutation.isPending
      && continueWorkflowMutation.variables?.taskId === task?.id;

    const handleActionClick = (event: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        stopCardClick(event);
      }
    };

    if (canContinueFront10AutoExecution(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
              mode: "auto_execute_front10",
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "继续执行中..." : (task?.resumeAction ?? "继续自动执行前 2 章")}
        </Button>
      );
    }

    if (canContinueDirector(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "继续中..." : (task?.resumeAction ?? "继续导演")}
        </Button>
      );
    }

    if (requiresCandidateSelection(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={getCandidateSelectionLink(task!.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            {task!.resumeAction ?? "继续确认书级方向"}
          </Link>
        </Button>
      );
    }

    if (canEnterChapterExecution(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={`/novels/${novel.id}/edit`}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            进入章节执行
          </Link>
        </Button>
      );
    }

    if (task) {
      return (
        <Button asChild size={size}>
          <Link
            to={getTaskCenterLink(task.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            查看任务
          </Link>
        </Button>
      );
    }

    return (
      <Button asChild size={size}>
        <Link
          to={`/novels/${novel.id}/edit`}
          onClick={stopPropagation ? stopCardClick : undefined}
        >
          编辑小说
        </Link>
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-amber-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_34%),linear-gradient(135deg,rgba(255,247,237,0.98),rgba(255,255,255,0.98),rgba(255,251,235,0.98))] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.35fr,0.9fr] md:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-slate-900 text-white hover:bg-slate-900">小说导演台</Badge>
              <Badge variant="outline" className="border-amber-200 bg-white/80 text-amber-800">创作控制台</Badge>
              <Badge variant="outline" className="border-amber-200 bg-white/80 text-amber-800">从灵感到章节</Badge>
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                用导演式工作流，把一本小说从模糊想法推进到可持续写作。
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-[15px]">
                不只是生成一段正文，而是把开书定盘、角色世界观、资产沉淀和章节执行串成同一条创作主线。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="shadow-[0_14px_28px_rgba(15,23,42,0.16)]">
                <Link to={DIRECTOR_CREATE_LINK}>
                  开始自动导演
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-amber-200 bg-white/80">
                <Link to={MANUAL_CREATE_LINK}>手动创建项目</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-[1.25rem] border border-white/80 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-amber-500" />
                开书方向
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">先收束题材、标题和承诺，再推进后续规划，避免开局散掉。</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/80 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Orbit className="h-4 w-4 text-amber-500" />
                资产联动
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">角色、世界观、知识库和写法规则都会持续回灌到创作链路里。</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/80 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <WandSparkles className="h-4 w-4 text-amber-500" />
                章节执行
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">逐章写作、审计和修复都在一条工作流里，不只是一次性生成正文。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="自动推进中"
          value={liveWorkflowCount}
          hint="当前仍在后台推进中的自动导演或自动执行项目。"
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="待你处理"
          value={actionRequiredCount}
          hint="等待审核、失败或已取消后需要你决定下一步的项目。"
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="可进入章节执行"
          value={readyForExecutionCount}
          hint="已经准备到可开写阶段，可以直接进入章节写作。"
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="后台失败任务"
          value={failedTaskCount}
          hint="来自任务中心的失败任务总数，可后续集中处理。"
          pending={taskQuery.isPending}
        />
      </div>

      <Card className="border-amber-200 bg-[linear-gradient(135deg,rgba(255,237,213,0.9),rgba(255,255,255,0.98)_42%,rgba(255,249,242,0.96))] shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-slate-900 text-white hover:bg-slate-900">新手推荐</Badge>
            <Badge variant="outline" className="border-amber-200 bg-white/75">低门槛开书</Badge>
          </div>
          <CardTitle>
            {hasNovels ? "想快速开启下一本书？先交给 AI 自动导演。" : "第一次使用？先让 AI 自动导演带你开一本书。"}
          </CardTitle>
          <CardDescription>
            你只需要提供一个模糊想法，AI 会先帮你生成方向方案、标题包和开书准备，并在关键阶段停下来等你确认，不需要你一开始就把结构全部想清楚。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>适合还没想清楚题材、卖点和前 30 章承诺时使用</span>
            <span>也适合先快速搭起一本可继续推进的新项目</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="lg">
              <Link to={DIRECTOR_CREATE_LINK}>AI 自动导演开书</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-amber-200 bg-white/80">
              <Link to={MANUAL_CREATE_LINK}>手动创建小说</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle>继续最近项目</CardTitle>
          <CardDescription>首页应该直接把你送回当前最值得继续的一本书。</CardDescription>
        </CardHeader>
        <CardContent>
          {novelQuery.isPending ? (
            <div className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-36 animate-pulse rounded bg-muted" />
                <div className="h-10 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : novelQuery.isError ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                当前无法读取项目列表，首页没法为你推荐下一步入口。
              </div>
              <Button onClick={() => void novelQuery.refetch()}>重新加载项目</Button>
            </div>
          ) : primaryNovel ? (
            <div className="space-y-4 rounded-[1.25rem] border border-amber-100 bg-[linear-gradient(180deg,rgba(255,250,244,0.92),rgba(255,255,255,0.96))] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight text-slate-950">{primaryNovel.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {primaryNovel.latestAutoDirectorTask ? (
                        <>
                          {(() => {
                            const workflowBadge = getWorkflowBadge(primaryNovel.latestAutoDirectorTask);
                            return workflowBadge ? (
                              <Badge variant={workflowBadge.variant}>
                                {workflowBadge.label}
                              </Badge>
                            ) : null;
                          })()}
                          <Badge variant="outline">
                            进度 {Math.round((primaryNovel.latestAutoDirectorTask.progress ?? 0) * 100)}%
                          </Badge>
                        </>
                      ) : null}
                      <Badge variant={primaryNovel.status === "published" ? "default" : "secondary"}>
                        {primaryNovel.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                      <Badge variant="outline">
                        {primaryNovel.writingMode === "continuation" ? "续写" : "原创"}
                      </Badge>
                    </div>
                  </div>
                  <div className="max-w-3xl text-sm text-muted-foreground">
                    {getNovelLeadSummary(primaryNovel)}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>更新时间：{formatDate(primaryNovel.updatedAt)}</span>
                    <span>章节数：{primaryNovel._count.chapters}</span>
                    <span>角色数：{primaryNovel._count.characters}</span>
                    {primaryNovel.latestAutoDirectorTask?.currentStage ? (
                      <span>当前阶段：{primaryNovel.latestAutoDirectorTask.currentStage}</span>
                    ) : null}
                    {primaryNovel.latestAutoDirectorTask?.lastHealthyStage ? (
                      <span>最近健康阶段：{primaryNovel.latestAutoDirectorTask.lastHealthyStage}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {renderNovelPrimaryAction(primaryNovel, { size: "lg" })}
                  {primaryNovel.latestAutoDirectorTask ? (
                    <Button asChild size="lg" variant="outline" className="border-amber-200 bg-white/80">
                      <Link to={getTaskCenterLink(primaryNovel.latestAutoDirectorTask.id)}>任务中心</Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="outline" className="border-amber-200 bg-white/80">
                      <Link to={`/novels/${primaryNovel.id}/edit`}>打开项目</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                你还没有开始小说项目。第一次使用时，推荐直接走 AI 自动导演，它会先帮你搭好方向和开写准备。
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to={DIRECTOR_CREATE_LINK}>AI 自动导演开书</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={MANUAL_CREATE_LINK}>手动创建小说</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>把常用入口和新手最容易上手的开书方式放在一起。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>AI 自动导演开书</Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-200 bg-white/80">
            <Link to={MANUAL_CREATE_LINK}>手动创建小说</Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-200 bg-white/80">
            <Link to="/book-analysis">新建拆书</Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-200 bg-white/80">
            <Link to="/tasks">打开任务中心</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle>最近项目</CardTitle>
          <CardDescription>这里不只显示标题，也直接显示当前所处阶段和恢复入口。</CardDescription>
        </CardHeader>
        <CardContent>
          {novelQuery.isPending ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`home-loading-${index}`} className="space-y-3 rounded-xl border p-4">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : novelQuery.isError ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                当前无法加载最近项目，稍后可以重试。
              </div>
              <Button variant="outline" onClick={() => void novelQuery.refetch()}>重新加载</Button>
            </div>
          ) : recentNovels.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              暂无小说项目，先从“新建小说”开始。
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentNovels.map((novel) => {
                const workflowTask = novel.latestAutoDirectorTask ?? null;
                const workflowBadge = getWorkflowBadge(workflowTask);

                return (
                  <Card
                    key={novel.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer border-amber-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,243,0.93))] transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => openNovelEditor(novel.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openNovelEditor(novel.id);
                      }
                    }}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="line-clamp-1 text-lg">{novel.title}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            {workflowBadge ? (
                              <Badge variant={workflowBadge.variant}>{workflowBadge.label}</Badge>
                            ) : (
                              <Badge variant="outline">无自动导演任务</Badge>
                            )}
                            {workflowTask ? (
                              <Badge variant="outline">进度 {Math.round(workflowTask.progress * 100)}%</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant={novel.status === "published" ? "default" : "secondary"}>
                            {novel.status === "published" ? "已发布" : "草稿"}
                          </Badge>
                          <Badge variant="outline">
                            {novel.writingMode === "continuation" ? "续写" : "原创"}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {getNovelLeadSummary(novel)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>更新时间：{formatDate(novel.updatedAt)}</span>
                        <span>章节数：{novel._count.chapters}</span>
                        <span>角色数：{novel._count.characters}</span>
                        {workflowTask?.currentStage ? (
                          <span>阶段：{workflowTask.currentStage}</span>
                        ) : null}
                        {workflowTask?.lastHealthyStage ? (
                          <span>最近健康阶段：{workflowTask.lastHealthyStage}</span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {renderNovelPrimaryAction(novel, { stopPropagation: true })}
                        {workflowTask ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>任务中心</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/novels/${novel.id}/edit`} onClick={stopCardClick}>打开项目</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
