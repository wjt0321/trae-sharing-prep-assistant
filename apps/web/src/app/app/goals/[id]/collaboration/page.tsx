"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  CommentTypeEnum,
  type CommentResponseDto,
  type ActivityEventDto,
} from "@ai-task-manager/shared";

// ============================================================
// 类型定义
// ============================================================
interface GoalBrief {
  id: string;
  topic: string;
  title: string | null;
  currentStage: string;
}

// ============================================================
// 主页面
// ============================================================
export default function CollaborationPage() {
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<GoalBrief | null>(null);
  const [comments, setComments] = useState<CommentResponseDto[]>([]);
  const [activities, setActivities] = useState<ActivityEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"comments" | "activities">("comments");

  const loadData = useCallback(async () => {
    try {
      const [goalData, commentsData, activitiesData] = await Promise.all([
        api.get<GoalBrief>(`/goals/${goalId}`),
        api.get<CommentResponseDto[]>(`/goals/${goalId}/comments`),
        api.get<ActivityEventDto[]>(`/goals/${goalId}/activities?limit=30`),
      ]);
      setGoal(goalData);
      setComments(commentsData);
      setActivities(activitiesData);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-danger">目标不存在或无权访问</p>
        <Link href="/app/goals">
          <Button variant="secondary" size="sm" className="mt-4">
            返回列表
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-xs text-tertiary animate-rise">
        <Link href="/app/goals" className="hover:text-accent">
          目标
        </Link>
        <span>/</span>
        <Link href={`/app/goals/${goalId}`} className="hover:text-accent">
          {goal.title || goal.topic}
        </Link>
        <span>/</span>
        <span className="text-secondary">协作</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="mt-4 flex gap-1 border-b border-border">
        <TabButton
          active={tab === "comments"}
          onClick={() => setTab("comments")}
          label="评论"
          count={comments.length}
        />
        <TabButton
          active={tab === "activities"}
          onClick={() => setTab("activities")}
          label="活动流"
          count={activities.length}
        />
      </div>

      {/* 内容区 */}
      <div className="mt-5">
        {tab === "comments" ? (
          <CommentsSection
            goalId={goalId}
            comments={comments}
            onChanged={loadData}
            onError={setError}
          />
        ) : (
          <ActivitiesSection activities={activities} />
        )}
      </div>
    </main>
  );
}

// ============================================================
// Tab 按钮
// ============================================================
function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-tertiary hover:text-secondary"
      }`}
    >
      {label}
      {count > 0 && (
        <span className="ml-1.5 text-xs text-tertiary">{count}</span>
      )}
    </button>
  );
}

// ============================================================
// 评论区
// ============================================================
function CommentsSection({
  goalId,
  comments,
  onChanged,
  onError,
}: {
  goalId: string;
  comments: CommentResponseDto[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleCreate = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    onError("");
    try {
      await api.post(`/goals/${goalId}/comments`, {
        content: content.trim(),
        type: CommentTypeEnum.COMMENT,
      });
      setContent("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    onError("");
    try {
      await api.post(`/goals/${goalId}/comments`, {
        content: replyContent.trim(),
        parentId,
        type: CommentTypeEnum.COMMENT,
      });
      setReplyTo(null);
      setReplyContent("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "回复失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.post(`/comments/${id}/resolve`);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条评论？")) return;
    try {
      await api.delete(`/comments/${id}`);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="space-y-4">
      {/* 新评论输入 */}
      <div className="rounded-xl border border-border bg-surface p-4 animate-rise">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="发表评论，围绕这个目标讨论..."
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={submitting || !content.trim()}
          >
            {submitting ? "发送中..." : "发送"}
          </Button>
        </div>
      </div>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-secondary">还没有评论</p>
          <p className="mt-1 text-xs text-tertiary">
            发表第一条评论，开始团队协作
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onResolve={() => handleResolve(comment.id)}
              onDelete={() => handleDelete(comment.id)}
              onReply={() => {
                setReplyTo(comment.id);
                setReplyContent("");
              }}
              replyTo={replyTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={() => handleReply(comment.id)}
              onCancelReply={() => setReplyTo(null)}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 评论项
// ============================================================
function CommentItem({
  comment,
  onResolve,
  onDelete,
  onReply,
  replyTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onCancelReply,
  submitting,
}: {
  comment: CommentResponseDto;
  onResolve: () => void;
  onDelete: () => void;
  onReply: () => void;
  replyTo: string | null;
  replyContent: string;
  setReplyContent: (v: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  submitting: boolean;
}) {
  const isResolved = !!comment.resolvedAt;
  const isReplyTarget = replyTo === comment.id;

  return (
    <div
      className={`rounded-xl border bg-surface p-4 animate-rise ${
        isResolved ? "border-border/60 opacity-70" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={comment.author.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">
              {comment.author.displayName}
            </span>
            <span className="text-[10px] text-tertiary">
              {new Date(comment.createdAt).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isResolved && (
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                已解决
              </span>
            )}
          </div>
          <p
            className={`mt-1 text-sm text-ink ${
              isResolved ? "line-through" : ""
            }`}
          >
            {comment.content}
          </p>

          {/* 操作按钮 */}
          {!isResolved && (
            <div className="mt-2 flex gap-3 text-[11px]">
              <button
                onClick={onReply}
                className="text-tertiary hover:text-accent"
              >
                回复
              </button>
              <button
                onClick={onResolve}
                className="text-tertiary hover:text-success"
              >
                标记解决
              </button>
              <button
                onClick={onDelete}
                className="text-tertiary hover:text-danger"
              >
                删除
              </button>
            </div>
          )}

          {/* 回复输入框 */}
          {isReplyTarget && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`回复 ${comment.author.displayName}...`}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCancelReply}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={onSubmitReply}
                  disabled={submitting || !replyContent.trim()}
                >
                  {submitting ? "发送中..." : "回复"}
                </Button>
              </div>
            </div>
          )}

          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-border/60 pl-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2">
                  <Avatar name={reply.author.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink">
                        {reply.author.displayName}
                      </span>
                      <span className="text-[10px] text-tertiary">
                        {new Date(reply.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 活动流区
// ============================================================
function ActivitiesSection({ activities }: { activities: ActivityEventDto[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <p className="text-sm text-secondary">暂无活动记录</p>
        <p className="mt-1 text-xs text-tertiary">
          任务的创建、状态变更、指派等操作会记录在这里
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
      <ul className="space-y-3">
        {activities.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <Avatar name={event.actor.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <span className="font-medium">{event.actor.displayName}</span>
                <span className="text-secondary"> {event.typeLabel}</span>
              </p>
              {event.targetTitle && (
                <p className="mt-0.5 text-xs text-secondary">
                  {event.targetTitle}
                </p>
              )}
              {event.detail && (
                <p className="text-[11px] text-tertiary">{event.detail}</p>
              )}
              <p className="mt-0.5 text-[10px] text-tertiary">
                {new Date(event.createdAt).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 头像组件
// ============================================================
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-medium ${sizeClass}`}
    >
      {initial}
    </div>
  );
}
