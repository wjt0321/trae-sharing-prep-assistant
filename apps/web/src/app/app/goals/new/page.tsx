"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ScenarioTypeEnum,
  SCENARIO_TYPE_LABELS,
  GoalPriorityEnum,
  GOAL_PRIORITY_LABELS,
  GoalTypeEnum,
  GOAL_TYPE_LABELS,
} from "@ai-task-manager/shared";

type Step = 1 | 2 | 3 | 4;

interface DetectionResult {
  topic: string;
  detections: Array<{
    scenarioType: ScenarioTypeEnum;
    confidence: number;
    reason: string;
    suggestedFields: string[];
  }>;
  primaryScenario: ScenarioTypeEnum;
  suggestedTitle: string;
  followUpQuestions: string[];
  suggestedSuccessCriteria: string[];
}

interface GoalForm {
  topic: string;
  title: string;
  scenarioType: ScenarioTypeEnum;
  audience: string;
  duration: string;
  shareDate: string;
  goalType: GoalTypeEnum | "";
  preparedness: string;
  timeConstraint: string;
  resourceConstraint: string;
  priority: GoalPriorityEnum | "";
  successCriteria: string;
  isCollaborative: boolean;
}

interface TemplateHints {
  planHints?: string[];
  riskHints?: string[];
  checklist?: string[];
  templateName?: string;
}

const SCENARIO_OPTIONS = Object.values(ScenarioTypeEnum).filter(
  (s) => s !== ScenarioTypeEnum.UNKNOWN
) as ScenarioTypeEnum[];

const PRIORITY_OPTIONS = Object.values(GoalPriorityEnum);
const GOAL_TYPE_OPTIONS = Object.values(GoalTypeEnum);

const EMPTY_FORM: GoalForm = {
  topic: "",
  title: "",
  scenarioType: ScenarioTypeEnum.UNKNOWN,
  audience: "",
  duration: "",
  shareDate: "",
  goalType: "",
  preparedness: "",
  timeConstraint: "",
  resourceConstraint: "",
  priority: "",
  successCriteria: "",
  isCollaborative: false,
};

export default function NewGoalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useWorkspace();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateHints, setTemplateHints] = useState<TemplateHints | null>(null);
  const [fromTemplate, setFromTemplate] = useState(false);

  // 从模板预填表单
  useEffect(() => {
    if (searchParams.get("from") !== "template") return;
    try {
      const prefilledRaw = sessionStorage.getItem("prefillGoalFromTemplate");
      const hintsRaw = sessionStorage.getItem("templateHints");
      if (!prefilledRaw) return;
      const prefilled = JSON.parse(prefilledRaw) as Record<string, unknown>;
      const newForm: GoalForm = { ...EMPTY_FORM };
      if (typeof prefilled.topic === "string") newForm.topic = prefilled.topic;
      if (typeof prefilled.title === "string") newForm.title = prefilled.title;
      if (typeof prefilled.scenarioType === "string") {
        newForm.scenarioType = prefilled.scenarioType as ScenarioTypeEnum;
      }
      if (typeof prefilled.audience === "string") newForm.audience = prefilled.audience;
      if (typeof prefilled.duration === "number") newForm.duration = String(prefilled.duration);
      if (typeof prefilled.shareDate === "string") newForm.shareDate = prefilled.shareDate;
      if (typeof prefilled.timeConstraint === "string") newForm.timeConstraint = prefilled.timeConstraint;
      if (typeof prefilled.resourceConstraint === "string") newForm.resourceConstraint = prefilled.resourceConstraint;
      if (typeof prefilled.priority === "string") {
        newForm.priority = prefilled.priority as GoalPriorityEnum;
      }
      if (typeof prefilled.successCriteria === "string") newForm.successCriteria = prefilled.successCriteria;
      if (typeof prefilled.isCollaborative === "boolean") newForm.isCollaborative = prefilled.isCollaborative;
      setForm(newForm);
      if (hintsRaw) setTemplateHints(JSON.parse(hintsRaw) as TemplateHints);
      setFromTemplate(true);
      // 清理 sessionStorage
      sessionStorage.removeItem("prefillGoalFromTemplate");
      sessionStorage.removeItem("templateHints");
    } catch {
      // ignore parse error
    }
  }, [searchParams]);

  const update = <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Step 1 → 2: 调用场景识别
  const handleDetect = async () => {
    if (!form.topic.trim()) {
      setError("请先描述你的目标");
      return;
    }
    setDetecting(true);
    setError(null);
    try {
      const result = await api.post<DetectionResult>("/goals/detect-scenario", {
        topic: form.topic,
      });
      setDetection(result);
      setForm((f) => ({
        ...f,
        scenarioType: result.primaryScenario,
        title: f.title || result.suggestedTitle,
        successCriteria: f.successCriteria || result.suggestedSuccessCriteria[0] || "",
      }));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "场景识别失败，请重试");
    } finally {
      setDetecting(false);
    }
  };

  // Step 4: 创建目标
  const handleCreate = async () => {
    if (!currentWorkspace) {
      setError("请先选择工作区");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        workspaceId: currentWorkspace.id,
        topic: form.topic,
        title: form.title || undefined,
        scenarioType: form.scenarioType,
        audience: form.audience || undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        shareDate: form.shareDate || undefined,
        goalType: form.goalType || undefined,
        preparedness: form.preparedness || undefined,
        timeConstraint: form.timeConstraint || undefined,
        resourceConstraint: form.resourceConstraint || undefined,
        priority: form.priority || undefined,
        successCriteria: form.successCriteria || undefined,
        isCollaborative: form.isCollaborative,
      };
      const goal = await api.post<{ id: string }>("/goals", payload);
      router.push(`/app/goals/${goal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {/* 模板来源提示 */}
      {fromTemplate && templateHints?.templateName && step === 1 && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent animate-rise">
          已从模板「{templateHints.templateName}」预填表单，可直接创建或继续调整
        </div>
      )}

      {/* 步骤指示器 */}
      <StepIndicator step={step} />

      <div className="mt-8">
        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1Input
            topic={form.topic}
            onChange={(v) => update("topic", v)}
            onDetect={handleDetect}
            detecting={detecting}
            templateHints={templateHints}
          />
        )}

        {step === 2 && detection && (
          <Step2Detection
            detection={detection}
            selectedScenario={form.scenarioType}
            onSelectScenario={(s) => update("scenarioType", s)}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3Fields form={form} update={update} onBack={() => setStep(2)} onNext={() => setStep(4)} />
        )}

        {step === 4 && (
          <Step4Confirm
            form={form}
            onBack={() => setStep(3)}
            onCreate={handleCreate}
            creating={creating}
          />
        )}
      </div>
    </main>
  );
}

// ============================================================
// 步骤指示器
// ============================================================
function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "描述目标" },
    { n: 2, label: "场景识别" },
    { n: 3, label: "补全约束" },
    { n: 4, label: "确认创建" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              step >= s.n
                ? "bg-accent text-white"
                : "bg-muted text-tertiary"
            }`}
          >
            {s.n}
          </div>
          <span
            className={`text-xs ${
              step >= s.n ? "text-ink" : "text-tertiary"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`mx-1 h-px w-8 ${
                step > s.n ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Step 1: 自由输入
// ============================================================
function Step1Input({
  topic,
  onChange,
  onDetect,
  detecting,
  templateHints,
}: {
  topic: string;
  onChange: (v: string) => void;
  onDetect: () => void;
  detecting: boolean;
  templateHints?: TemplateHints | null;
}) {
  const examples = [
    "下周三给团队做一次技术分享",
    "参加 TRAE AI 创造力大赛",
    "写一系列前端工程化文章",
    "做一个副业小项目并上线",
    "三个月学会 Rust",
  ];
  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink">
        你想做什么？
      </h1>
      <p className="mt-2 text-sm text-secondary">
        用一句话描述你的目标，系统会帮你识别场景并补全结构化信息
      </p>

      <div className="mt-6">
        <textarea
          value={topic}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例如：下周三给团队做一次 React Server Components 的技术分享"
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onDetect();
            }
          }}
        />
        <p className="mt-2 text-xs text-tertiary">
          按 Ctrl/⌘ + Enter 快速识别
        </p>
      </div>

      {/* 模板提示 */}
      {templateHints && (templateHints.planHints?.length || templateHints.checklist?.length) && (
        <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs font-medium text-accent">
            来自模板的参考要点
          </p>
          {templateHints.planHints && templateHints.planHints.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] text-tertiary">规划阶段</p>
              <ul className="mt-1 space-y-1">
                {templateHints.planHints.map((h, i) => (
                  <li key={i} className="flex gap-2 text-xs text-secondary">
                    <span className="text-accent">·</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {templateHints.checklist && templateHints.checklist.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-tertiary">执行检查清单</p>
              <ul className="mt-1 space-y-1">
                {templateHints.checklist.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-secondary">
                    <span className="text-success">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-medium text-tertiary">需要灵感？试试这些</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => onChange(ex)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onDetect} disabled={detecting || !topic.trim()}>
          {detecting ? "识别中..." : "识别场景"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 2: 场景识别结果
// ============================================================
function Step2Detection({
  detection,
  selectedScenario,
  onSelectScenario,
  onBack,
  onNext,
}: {
  detection: DetectionResult;
  selectedScenario: ScenarioTypeEnum;
  onSelectScenario: (s: ScenarioTypeEnum) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink">场景识别结果</h1>
      <p className="mt-2 text-sm text-secondary">
        系统识别了可能的场景，选择最符合的一个继续
      </p>

      {/* 原始输入回显 */}
      <div className="mt-6 rounded-lg border border-border bg-muted/50 px-4 py-3">
        <p className="text-xs text-tertiary">你的目标</p>
        <p className="mt-1 text-sm text-ink">{detection.topic}</p>
      </div>

      {/* 场景选项 */}
      <div className="mt-6 space-y-3">
        {detection.detections.map((d) => {
          const isSelected = selectedScenario === d.scenarioType;
          return (
            <button
              key={d.scenarioType}
              onClick={() => onSelectScenario(d.scenarioType)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                  : "border-border bg-surface hover:border-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-ink">
                    {SCENARIO_TYPE_LABELS[d.scenarioType]}
                  </span>
                  <span className="ml-2 text-xs text-tertiary">
                    置信度 {Math.round(d.confidence * 100)}%
                  </span>
                </div>
                {isSelected && (
                  <span className="text-xs text-accent">已选择</span>
                )}
              </div>
              <p className="mt-1 text-xs text-secondary">{d.reason}</p>
            </button>
          );
        })}
      </div>

      {/* 追问问题 */}
      {detection.followUpQuestions.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-tertiary">建议思考的问题</p>
          <ul className="mt-2 space-y-1.5">
            {detection.followUpQuestions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-secondary">
                <span className="text-accent">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 成功标准建议 */}
      {detection.suggestedSuccessCriteria.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-tertiary">成功标准参考</p>
          <ul className="mt-2 space-y-1.5">
            {detection.suggestedSuccessCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-secondary">
                <span className="text-success">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          返回修改
        </Button>
        <Button onClick={onNext}>补全约束</Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: 补全约束字段
// ============================================================
function Step3Fields({
  form,
  update,
  onBack,
  onNext,
}: {
  form: GoalForm;
  update: <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isSharing = form.scenarioType === ScenarioTypeEnum.SHARING_PREP;
  const isProject =
    form.scenarioType === ScenarioTypeEnum.COMPETITION ||
    form.scenarioType === ScenarioTypeEnum.SMALL_PROJECT;

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink">补全关键约束</h1>
      <p className="mt-2 text-sm text-secondary">
        填写你确定的信息，不确定的可以跳过，后续还能修改
      </p>

      <div className="mt-6 space-y-5">
        <Input
          label="目标标题"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="给这个目标起个名字"
        />

        <Input
          label="受众 / 对象"
          value={form.audience}
          onChange={(e) => update("audience", e.target.value)}
          placeholder="例如：团队同事、初学者、评委"
        />

        {isSharing && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="分享时长（分钟）"
              type="number"
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
              placeholder="30"
            />
            <Input
              label="分享日期"
              type="date"
              value={form.shareDate}
              onChange={(e) => update("shareDate", e.target.value)}
            />
          </div>
        )}

        <Input
          label="时间约束"
          value={form.timeConstraint}
          onChange={(e) => update("timeConstraint", e.target.value)}
          placeholder="例如：两周内、下个月底前"
        />

        <Input
          label="资源约束"
          value={form.resourceConstraint}
          onChange={(e) => update("resourceConstraint", e.target.value)}
          placeholder="例如：独立完成、有 2 位协作"
        />

        {isSharing && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              分享目标
            </label>
            <select
              value={form.goalType}
              onChange={(e) => update("goalType", e.target.value as GoalTypeEnum | "")}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">请选择</option>
              {GOAL_TYPE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GOAL_TYPE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            优先级
          </label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => update("priority", p)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  form.priority === p
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border bg-surface text-secondary hover:border-accent/50"
                }`}
              >
                {GOAL_PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            成功标准
          </label>
          <textarea
            value={form.successCriteria}
            onChange={(e) => update("successCriteria", e.target.value)}
            placeholder="做到什么程度算成功？"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            rows={2}
          />
        </div>

        {isProject && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCollaborative}
              onChange={(e) => update("isCollaborative", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            <span className="text-sm text-ink">多人协作</span>
          </label>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          返回
        </Button>
        <Button onClick={onNext}>下一步</Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 4: 确认
// ============================================================
function Step4Confirm({
  form,
  onBack,
  onCreate,
  creating,
}: {
  form: GoalForm;
  onBack: () => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "目标", value: form.topic },
    { label: "标题", value: form.title || "—" },
    { label: "场景", value: SCENARIO_TYPE_LABELS[form.scenarioType] },
    { label: "受众", value: form.audience || "—" },
    ...(form.duration ? [{ label: "时长", value: `${form.duration} 分钟` }] : []),
    ...(form.shareDate ? [{ label: "日期", value: form.shareDate }] : []),
    ...(form.goalType ? [{ label: "分享目标", value: GOAL_TYPE_LABELS[form.goalType as GoalTypeEnum] }] : []),
    { label: "时间约束", value: form.timeConstraint || "—" },
    { label: "资源约束", value: form.resourceConstraint || "—" },
    ...(form.priority ? [{ label: "优先级", value: GOAL_PRIORITY_LABELS[form.priority as GoalPriorityEnum] }] : []),
    { label: "成功标准", value: form.successCriteria || "—" },
    { label: "协作", value: form.isCollaborative ? "是" : "否" },
  ];

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink">确认目标</h1>
      <p className="mt-2 text-sm text-secondary">
        检查以下信息，确认后将生成目标卡，可随时编辑
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {form.title || form.topic}
            </h2>
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
              {SCENARIO_TYPE_LABELS[form.scenarioType]}
            </span>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-border">
          {fields.map((f) => (
            <div key={f.label} className="flex py-2.5">
              <dt className="w-24 shrink-0 text-xs text-tertiary">{f.label}</dt>
              <dd className="text-sm text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={creating}>
          返回修改
        </Button>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? "创建中..." : "创建目标"}
        </Button>
      </div>
    </div>
  );
}
