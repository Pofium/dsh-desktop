/** `skill` namespace dictionaries for the dedicated tool row. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'skill'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'row.title': 'Skill',
  'row.running': '正在加载 skill',
  'row.failed': 'skill 加载失败',
  'row.stopped': 'skill 加载已中止',
  'row.instructions': '说明',
  'row.inspect': '查看',
  'menu.userOnly': '仅用户',
} satisfies Record<string, string>

/** The skill namespace key union. */
export type SkillKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'row.title': 'Skill',
  'row.running': 'Loading skill',
  'row.failed': 'Skill load failed',
  'row.stopped': 'Skill load stopped',
  'row.instructions': 'Instructions',
  'row.inspect': 'Inspect',
  'menu.userOnly': 'user-only',
} satisfies Record<SkillKey, string>

/** Russian dictionary, checked complete against the zh key set. */
export const ru = {
  'row.title': 'Навык',
  'row.running': 'Загрузка навыка…',
  'row.failed': 'Не удалось загрузить навык',
  'row.stopped': 'Загрузка навыка остановлена',
  'row.instructions': 'Инструкции',
  'row.inspect': 'Просмотр',
  'menu.userOnly': 'только для пользователя',
} satisfies Record<SkillKey, string>
