/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
  'notice.attachmentsUnsupported': '/{command} 不接受附件，请先移除附件',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'notice.attachmentsUnsupported': '/{command} does not accept attachments; remove them first',
} satisfies Record<CommandKey, string>

/** Russian dictionary, checked complete against the zh key set. */
export const ru = {
  'search.placeholder': 'Поиск сессий…',
  'search.aria': 'Фильтр параметров',
  'status.loading': 'Обновление списка моделей…',
  'status.applying': 'Применение…',
  'status.empty': 'Нет параметров',
  'overlay.aria': 'Параметры /{command}',
  'listbox.aria': 'Совпадения /{command}',
  'notice.imagesUnsupported': '/{command} не принимает прикрепленные изображения; удалите их',
} satisfies Record<CommandKey, string>
