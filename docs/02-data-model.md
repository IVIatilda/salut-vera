# Модель данных MVP

Дата: 15 октября 2026

## Основные сущности

### User

- `id`
- `locale`
- `timezone`
- `week_starts_on`
- `morning_ritual_time`
- `evening_ritual_time`
- `weekly_review_day`
- `weekly_review_time`
- `created_at`, `updated_at`

### LifeArea

- `id`, `user_id`
- `name`
- `description`
- `identity_statement` — кем пользователь хочет быть в этой сфере
- `color`
- `desired_attention_minutes_per_week` — необязательно
- `neglect_threshold_days`
- `is_active`

### Skill

- `id`, `user_id`
- `name`
- `description`
- `life_area_id` — необязательно
- `level_formula_version`
- `is_active`

### Goal

- `id`, `user_id`
- `title`, `description`
- `origin`: `self_chosen | obligation | external_expectation | unclear`
- `status`: `active | paused | achieved | abandoned`
- `target_date`
- `life_area_id`, `skill_id` — необязательно

### Project

- `id`, `user_id`
- `title`, `description`
- `status`: `active | paused | completed | archived`
- `goal_id`, `life_area_id`, `skill_id` — необязательно
- `target_date`

### Task

- `id`, `user_id`
- `parent_task_id` — необязательно
- `project_id`, `goal_id` — необязательно
- `life_area_id`, `skill_id` — необязательно; значения наследуются от проекта, пока
  пользователь явно не переопределит их у задачи
- `title`, `description`
- `status`: `inbox | planned | in_progress | completed | cancelled | delegated`
- `importance`: `unset | low | normal | high`
- `is_urgent`
- `origin`: `self_chosen | obligation | external_expectation | unclear`
- `due_at`, `scheduled_start_at`, `scheduled_end_at`
- `estimated_minutes`
- `completed_at`
- `recurrence_rule` — необязательно
- `created_at`, `updated_at`

Фактическое время задачи рассчитывается из связанных записей времени, а не хранится
как вручную изменяемый итог.

### TimeEntry

- `id`, `user_id`, `task_id`
- `skill_id` — снимок связи на момент записи
- `started_at`, `ended_at`, `duration_seconds`
- `source`: `focus | manual`
- `practice_type`: `ordinary | deliberate`
- `practice_goal`, `practice_feedback` — для целенаправленной практики
- `focus_rating`: 1–5 — необязательно
- `note`

### FocusSession

- `id`, `user_id`, `task_id`
- `time_entry_id` — появляется после завершения
- `planned_focus_minutes`, `planned_break_minutes`
- `started_at`, `paused_seconds`, `ended_at`
- `status`: `running | paused | completed | cancelled`
- `interruption_note`

### Habit

- `id`, `user_id`
- `name`, `description`
- `direction`: `build | reduce`
- `identity_statement`
- `cue_when`, `cue_where`, `cue_after`
- `two_minute_version`
- `environment_change`
- `immediate_reward`
- `tracking_type`: `check | count | duration`
- `target_value`, `target_unit`
- `schedule_rule`
- `life_area_id`, `skill_id` — необязательно
- `is_active`

### HabitLog

- `id`, `habit_id`, `user_id`
- `occurred_on`
- `status`: `done | partial | skipped | episode`
- `value`
- `trigger_note`, `recovery_note`, `note`
- `created_at`

Для ослабляемой привычки `episode` означает наблюдаемый эпизод, а не «провал».

### Milestone

- `id`, `user_id`, `skill_id`
- `title`, `description`
- `status`: `planned | achieved | abandoned`
- `target_date`, `achieved_at`
- `evidence_note`

### JournalEntry

- `id`, `user_id`
- `entry_date`
- `entry_type`: `freeform | morning | evening | weekly_review`
- `body`
- `created_at`, `updated_at`

### EmotionLog

- `id`, `user_id`, `journal_entry_id`
- `emotion_key`
- `intensity`: 1–5
- `note`

Одна дневниковая запись может содержать несколько эмоций.

### GratitudeEntry

- `id`, `user_id`, `journal_entry_id`
- `text`

### SmallWin

- `id`, `user_id`
- `text`, `occurred_on`
- `source_type`: `manual | task | habit | milestone | ritual`
- `source_id` — необязательно
- `life_area_id`, `skill_id`, `project_id` — необязательно

### RitualSession

- `id`, `user_id`
- `type`: `morning | evening`
- `session_date`
- `status`: `started | completed | skipped`
- `current_step`
- `energy_rating`, `mood_rating` — необязательно
- `started_at`, `completed_at`

### DailyPriority

- `id`, `user_id`, `task_id`
- `priority_date`
- `sort_order`: 1–3

### WeeklyReview

- `id`, `user_id`
- `week_start`, `week_end`
- `status`: `started | completed | skipped`
- `current_step`
- `summary_note`
- `next_week_intention`
- `environment_change`
- `started_at`, `completed_at`

### AreaCheckIn

- `id`, `user_id`, `weekly_review_id`, `life_area_id`
- `satisfaction_rating`: 1–10
- `note`

## Производные показатели

Производные показатели не являются самостоятельными источниками истины:

- внимание к сфере = длительность записей времени + количество связанных выполненных
  задач и привычек за период;
- заброшенная сфера = число дней после последнего значимого действия превышает
  пользовательский порог;
- загрузка дня = сумма плановой длительности задач и календарных блоков;
- регулярность привычки = выполненные плановые появления / все плановые появления за
  выбранный период;
- активность навыка = время, регулярность и достигнутые вехи, показанные отдельно;
- игровой уровень навыка не должен называться уровнем мастерства.

## Ключевые ограничения целостности

- Все пользовательские сущности изолируются по `user_id`.
- `ended_at` не может быть раньше `started_at`.
- Завершенная фокус-сессия создает ровно одну запись `TimeEntry`.
- У даты может быть не более трех активных `DailyPriority`.
- У пользователя не может быть двух ритуалов одного типа на одну дату.
- У пользователя не может быть двух еженедельных обзоров на одну неделю.
- Удаление сферы или навыка выполняется через архивирование, если существуют
  связанные записи.

