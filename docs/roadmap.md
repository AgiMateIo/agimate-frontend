# Roadmap — админ-управление платформенными записями

Бэкенд добавил ADMIN-эндпоинты для управления платформенными записями (скилы, пресеты,
LLM-провайдер, квоты). Ниже — что уже сделано и что осталось на фронте.

Роль ADMIN определяется по `user.role === 'ADMIN'` из `GET /user/me` (см. `src/hooks/useIsAdmin.ts`).
Гейтинг — только для UX; бэк всё равно проверяет права и возвращает `403`.

## ✅ Сделано

### Платформенный LLM-провайдер + квоты
- `useIsAdmin()` — гейт по `user.role`.
- Создание платформенного провайдера: `POST /manage/llm-providers/platform` (`AddPlatformProviderModal`),
  кнопка на `/dashboard/llm-providers` видна только `isAdmin && !hasPlatform` (синглтон).
- Редактирование лимита квоты через `PATCH /manage/llm-providers/{pid}/quotas/{qid}` (`EditQuotaModal`),
  без окна «без квоты» (раньше был только DELETE+POST).
- Флоу free-tier: создать (выключенным) → задать квоты (`USER`/`TOTAL`) → включить тумблером.

## ⬜ Осталось

### 1. Системные скилы
Эндпоинты: `POST /manage/skills/system` (ADMIN), правка через существующий `PUT /skills/{id}`
(переименование → `400`, `version++`), retire = `PUT { isPublic: false }`, hard `DELETE` → `409`
при наличии ссылок.

- `types/skills.ts` — добавить `system: boolean` в `SkillResponse` (наследуется в `SkillDetailResponse`).
- `services/modules/skills.ts` — `createSystemSkill(data)` → `POST /skills/system`.
- `SkillCard` — бейдж «Системный» при `system`.
- Гейт правки: сейчас `user.id === skill.userId`; добавить `|| (skill.system && isAdmin)`.
- Admin-кнопка «Создать системный скилл» на списке скилов.
- **Открытый вопрос**: «name read-only у системного скилла». Форма редактирует сырой `skillMd`
  (name живёт во frontmatter внутри textarea). Варианты: (а) отдельное залоченное поле name,
  инжектим во frontmatter; (б) оставить как есть и показывать бэкендовую `400` при переименовании.

### 2. Пресеты ролей агента (новый CRUD с нуля)
Эндпоинты: `GET /manage/agent-presets/all/` (ADMIN, вкл. disabled), `POST /manage/agent-presets/`,
`PATCH /manage/agent-presets/{id}`. DELETE нет — retire = `enabled: false`.

- `types/agent-presets.ts` — в `AgentPresetResponse` добавить `skillNames: string[]`, `sortOrder: number`,
  `enabled: boolean`; `CreateAgentPresetRequest`, `UpdateAgentPresetRequest`.
- `services/modules/agentPresets.ts` — `getAllAgentPresets()`, `createAgentPreset()`, `updateAgentPreset(id)`.
- `queries/agent-presets.ts` — ключ `all()`, `useAllAgentPresetsQuery()`,
  `useCreate/UpdateAgentPresetMutation` (инвалидировать `list()` + `all()`).
- Admin-таблица `/dashboard/admin/presets` + `PresetsTable`/`PresetForm`/модалки.
  `code` immutable после создания; `skillNames` — мультиселект существующих системных скилов.

### 3. Раздел админки в навигации
- `SidebarNav` — пункт `/dashboard/admin`, гейт по `useIsAdmin()` (сейчас все пункты безусловны).
- `app/[locale]/dashboard/admin/layout.tsx` — guard: не-админа редиректим на `/dashboard`.
- i18n namespace `Admin` + ключи в `Skills`.

## Вне области
- UI назначения роли ADMIN — роль ставится в БД user-api, эндпоинта нет.
- Версионирование пресетов / draft-publish скилов — нет.
- Несколько платформенных LLM-провайдеров — только один (синглтон `name: "platform"`).
