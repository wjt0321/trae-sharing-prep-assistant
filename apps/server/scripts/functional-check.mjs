const BASE_URL = process.env.FUNCTIONAL_CHECK_BASE_URL ?? 'http://localhost:4000';
const API_BASE_URL = `${BASE_URL}/api`;

const LOGIN_EMAIL = process.env.FUNCTIONAL_CHECK_EMAIL ?? 'lead@ai-task-manager.local';
const LOGIN_PASSWORD = process.env.FUNCTIONAL_CHECK_PASSWORD ?? 'password123';
const NOTIFICATION_EMAIL =
  process.env.FUNCTIONAL_CHECK_NOTIFICATION_EMAIL ?? 'product@ai-task-manager.local';
const NOTIFICATION_PASSWORD =
  process.env.FUNCTIONAL_CHECK_NOTIFICATION_PASSWORD ?? 'password123';

const FIXTURES = {
  competitionWorkspaceId: 'real-workspace-competition',
  competitionGoalId: 'real-goal-competition-release',
  competitionTaskId: 'real-task-competition-visual',
  competitionExportId: 'real-export-competition-release',
  competitionShareToken: 'share-real-competition-release',
  competitionTemplateId: 'real-template-competition-demo',
  competitionNotificationId: 'real-notification-competition-blocked',
  sharingWorkspaceId: 'real-workspace-sharing',
  sharingGoalId: 'real-goal-sharing-onboarding',
  sharingAssetId: 'real-asset-sharing-checklist',
};

async function requestJson(path, init = {}, options = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`接口 ${path} 返回了非 JSON 内容：${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    const message = json?.error?.message ?? json?.message ?? text ?? response.statusText;
    throw new Error(`接口 ${path} 返回 ${response.status}：${message}`);
  }

  if (options.skipWrappedCheck) {
    return json;
  }

  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) {
      throw new Error(`接口 ${path} 返回 success=false`);
    }
    return json.data;
  }

  return json;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createAuthHeaders(email, password) {
  const login = await requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  assert(login?.accessToken, `登录失败，账号 ${email} 未返回 accessToken`);

  return {
    Authorization: `Bearer ${login.accessToken}`,
  };
}

function pass(label, detail) {
  console.log(`PASS  ${label}${detail ? ` - ${detail}` : ''}`);
}

async function main() {
  console.log(`开始执行功能核验，目标服务：${BASE_URL}`);

  const health = await requestJson(`${BASE_URL}/health`);
  assert(health?.status === 'ok', '基础健康检查未返回 ok');
  pass('基础健康检查', `status=${health.status}`);

  const authHeaders = await createAuthHeaders(LOGIN_EMAIL, LOGIN_PASSWORD);
  pass('登录', LOGIN_EMAIL);

  const me = await requestJson('/auth/me', { headers: authHeaders });
  assert(me?.email === LOGIN_EMAIL, '当前用户邮箱与登录账号不一致');
  pass('当前用户', me.displayName);

  const workspaces = await requestJson('/workspaces', { headers: authHeaders });
  assert(Array.isArray(workspaces) && workspaces.length >= 2, '工作区列表数量异常');
  pass('工作区列表', `count=${workspaces.length}`);

  const competitionMembers = await requestJson(
    `/workspaces/${FIXTURES.competitionWorkspaceId}/members`,
    { headers: authHeaders },
  );
  assert(Array.isArray(competitionMembers) && competitionMembers.length >= 4, '比赛工作区成员数量异常');
  pass('工作区成员', `competition-count=${competitionMembers.length}`);

  const goals = await requestJson(
    `/goals?workspaceId=${FIXTURES.competitionWorkspaceId}`,
    { headers: authHeaders },
  );
  assert(Array.isArray(goals) && goals.length >= 3, '比赛工作区目标数量异常');
  pass('目标列表', `competition-count=${goals.length}`);

  const goal = await requestJson(`/goals/${FIXTURES.competitionGoalId}`, { headers: authHeaders });
  assert(goal?.title === '比赛项目收口与提交', '比赛目标标题异常');
  pass('目标详情', goal.title);

  const plans = await requestJson(`/goals/${FIXTURES.competitionGoalId}/plans`, { headers: authHeaders });
  assert(Array.isArray(plans) && plans.length >= 2, '规划版本数量异常');
  pass('规划版本列表', `count=${plans.length}`);

  const activePlan = await requestJson(`/goals/${FIXTURES.competitionGoalId}/plans/active`, {
    headers: authHeaders,
  });
  assert(Array.isArray(activePlan?.content?.phases) && activePlan.content.phases.length >= 3, '活跃规划阶段数量异常');
  pass('活跃规划', `phases=${activePlan.content.phases.length}`);

  const tasks = await requestJson(`/goals/${FIXTURES.competitionGoalId}/tasks`, {
    headers: authHeaders,
  });
  assert(Array.isArray(tasks) && tasks.length >= 5, '任务数量异常');
  pass('任务列表', `count=${tasks.length}`);

  const progress = await requestJson(`/goals/${FIXTURES.competitionGoalId}/tasks/progress`, {
    headers: authHeaders,
  });
  assert(typeof progress?.completionRate === 'number', '任务进度缺少 completionRate');
  pass('任务进度', `completionRate=${progress.completionRate}`);

  const nextSteps = await requestJson(`/goals/${FIXTURES.competitionGoalId}/tasks/next-steps`, {
    headers: authHeaders,
  });
  assert(Array.isArray(nextSteps?.todayActions), '下一步建议未返回 todayActions');
  pass('下一步建议', `today-actions=${nextSteps.todayActions.length}`);

  const taskHistory = await requestJson(`/tasks/${FIXTURES.competitionTaskId}/history`, {
    headers: authHeaders,
  });
  assert(Array.isArray(taskHistory) && taskHistory.length > 0, '任务历史为空');
  pass('任务历史', `count=${taskHistory.length}`);

  const comments = await requestJson(`/goals/${FIXTURES.competitionGoalId}/comments`, {
    headers: authHeaders,
  });
  assert(Array.isArray(comments) && comments.length > 0, '评论列表为空');
  pass('评论列表', `count=${comments.length}`);

  const activities = await requestJson(`/goals/${FIXTURES.competitionGoalId}/activities?limit=10`, {
    headers: authHeaders,
  });
  assert(Array.isArray(activities?.items) || Array.isArray(activities), '活动流返回结构异常');
  pass('活动流', '已返回活动记录');

  const exportsList = await requestJson(`/goals/${FIXTURES.competitionGoalId}/exports`, {
    headers: authHeaders,
  });
  assert(Array.isArray(exportsList) && exportsList.length > 0, '导出记录为空');
  pass('导出列表', `count=${exportsList.length}`);

  const exportDetail = await requestJson(`/exports/${FIXTURES.competitionExportId}`, {
    headers: authHeaders,
  });
  assert(exportDetail?.shareToken === FIXTURES.competitionShareToken, '导出详情 shareToken 异常');
  pass('导出详情', exportDetail.title);

  const shareDetail = await requestJson(`/shares/${FIXTURES.competitionShareToken}`);
  assert(shareDetail?.goalTitle === '比赛项目收口与提交', '公开共享页数据异常');
  pass('公开共享页', shareDetail.title);

  const templates = await requestJson(`/workspaces/${FIXTURES.competitionWorkspaceId}/templates`, {
    headers: authHeaders,
  });
  assert(Array.isArray(templates) && templates.length > 0, '模板列表为空');
  pass('模板列表', `count=${templates.length}`);

  const templatePrefill = await requestJson(`/templates/${FIXTURES.competitionTemplateId}/for-goal`, {
    headers: authHeaders,
  });
  assert(templatePrefill?.prefilledFields?.title, '模板预填字段缺少标题');
  pass('模板预填', templatePrefill.prefilledFields.title);

  const assets = await requestJson(`/workspaces/${FIXTURES.sharingWorkspaceId}/assets`, {
    headers: authHeaders,
  });
  assert(Array.isArray(assets) && assets.length > 0, '知识资产列表为空');
  pass('知识资产列表', `count=${assets.length}`);

  const assetDetail = await requestJson(`/assets/${FIXTURES.sharingAssetId}`, {
    headers: authHeaders,
  });
  assert(assetDetail?.type === 'checklist', '知识资产详情类型异常');
  pass('知识资产详情', assetDetail.title);

  const notifications = await requestJson('/notifications?limit=10', {
    headers: await createAuthHeaders(NOTIFICATION_EMAIL, NOTIFICATION_PASSWORD),
  });
  assert(Array.isArray(notifications?.items) || Array.isArray(notifications), '通知列表返回结构异常');
  pass('通知列表', '已返回通知记录');

  const notificationHeaders = await createAuthHeaders(NOTIFICATION_EMAIL, NOTIFICATION_PASSWORD);

  const unreadCount = await requestJson('/notifications/unread-count', {
    headers: notificationHeaders,
  });
  assert(typeof unreadCount?.count === 'number', '未读数量缺少 count');
  pass('未读数量', `count=${unreadCount.count}`);

  await requestJson(`/notifications/${FIXTURES.competitionNotificationId}/read`, {
    method: 'POST',
    headers: notificationHeaders,
  });
  pass('通知已读操作', FIXTURES.competitionNotificationId);

  const aiConfig = await requestJson('/ai-config', { headers: authHeaders });
  assert(aiConfig && typeof aiConfig === 'object', 'AI 配置读取失败');
  pass('AI 配置', aiConfig.provider ?? 'mock');

  const aiStats = await requestJson('/ai-config/stats?days=7', { headers: authHeaders });
  assert(aiStats && typeof aiStats === 'object', 'AI 统计读取失败');
  pass('AI 统计', '读取成功');

  const prompts = await requestJson('/prompts', { headers: authHeaders });
  assert(Array.isArray(prompts) && prompts.length >= 3, '提示词列表数量异常');
  pass('提示词列表', `count=${prompts.length}`);

  const auditStats = await requestJson('/audit/stats/summary?days=7', { headers: authHeaders });
  assert(auditStats && typeof auditStats === 'object', '审计统计读取失败');
  pass('审计统计', '读取成功');

  const auditLogs = await requestJson('/audit?page=1&pageSize=5', { headers: authHeaders });
  assert(auditLogs?.items?.length >= 1, '审计日志列表为空');
  pass('审计日志列表', `count=${auditLogs.items.length}`);

  const monitoringHealth = await requestJson('/monitoring/health', { headers: authHeaders });
  assert(monitoringHealth?.status, '扩展健康检查未返回状态');
  pass('扩展健康检查', monitoringHealth.status);

  const monitoringBusiness = await requestJson('/monitoring/business?days=7', { headers: authHeaders });
  assert(monitoringBusiness && typeof monitoringBusiness === 'object', '业务指标读取失败');
  pass('业务指标', '读取成功');

  const monitoringSystem = await requestJson('/monitoring/system?days=7', { headers: authHeaders });
  assert(monitoringSystem && typeof monitoringSystem === 'object', '系统指标读取失败');
  pass('系统指标', '读取成功');

  console.log('功能核验完成，所有检查均通过。');
}

main().catch((error) => {
  console.error(`功能核验失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
