const MAX_DAILY_PRIORITIES = 3;

export function createMorningRitual(sessionDate, now = new Date().toISOString()) {
  return {
    id: `morning:${sessionDate}`,
    type: 'morning',
    sessionDate,
    status: 'started',
    currentStep: 1,
    energyRating: null,
    moodRating: null,
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeRitualSession(session) {
  const fallback = createMorningRitual(session.sessionDate || '');
  return {
    ...fallback,
    ...session,
    type: session.type || 'morning',
    status: ['started', 'completed', 'skipped'].includes(session.status) ? session.status : 'started',
    currentStep: Math.min(3, Math.max(1, Number(session.currentStep) || 1)),
    energyRating: normalizeRating(session.energyRating),
    moodRating: normalizeRating(session.moodRating),
  };
}

export function toggleDailyPriority(taskIds, taskId, limit = MAX_DAILY_PRIORITIES) {
  if (taskIds.includes(taskId)) return taskIds.filter((id) => id !== taskId);
  if (taskIds.length >= limit) return taskIds;
  return [...taskIds, taskId];
}

export function buildDailyPriorities(priorityDate, taskIds) {
  return taskIds.slice(0, MAX_DAILY_PRIORITIES).map((taskId, index) => ({
    id: `${priorityDate}:${taskId}`,
    taskId,
    priorityDate,
    sortOrder: index + 1,
  }));
}

export function getDailyPriorityIds(items, priorityDate) {
  return items
    .filter((item) => item.priorityDate === priorityDate)
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((item) => item.taskId);
}

function normalizeRating(value) {
  const rating = Number(value);
  return rating >= 1 && rating <= 5 ? rating : null;
}

