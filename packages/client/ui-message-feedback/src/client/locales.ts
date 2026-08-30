/** `feedback` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.like': '好的回答',
  'action.likeActive': '取消标记',
  'action.dislike': '有问题的回答',
  'action.dislikeActive': '取消标记',
  'note.open': '补充说明',
  'note.dialog': '反馈',
  'note.placeholder': '这条回答哪里好，或哪里有问题？（可选）',
  'note.save': '保存',
  'note.cancel': '取消',
  'note.aria': '反馈说明',
  'error.conflict': '这条反馈已在别处改动，已显示最新状态',
  'error.load': '反馈状态加载失败',
  'error.generic': '反馈保存失败',
} satisfies Record<string, string>

/** The feedback namespace key union. */
export type MessageFeedbackKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The per-message feedback controls' copy. */
    feedback: MessageFeedbackKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.like': 'Good response',
  'action.likeActive': 'Remove rating',
  'action.dislike': 'Bad response',
  'action.dislikeActive': 'Remove rating',
  'note.open': 'Add a note',
  'note.dialog': 'Feedback',
  'note.placeholder': 'What was good, or what went wrong? (optional)',
  'note.save': 'Save',
  'note.cancel': 'Cancel',
  'note.aria': 'Feedback note',
  'error.conflict': 'This feedback changed elsewhere; the latest state is shown',
  'error.load': 'Could not load feedback',
  'error.generic': 'Could not save feedback',
} satisfies Record<MessageFeedbackKey, string>

/** Russian dictionary, checked complete against the zh key set. */
export const ru = {
  'action.like': 'Хороший ответ',
  'action.likeActive': 'Удалить оценку',
  'action.dislike': 'Плохой ответ',
  'action.dislikeActive': 'Удалить оценку',
  'note.open': 'Добавить заметку',
  'note.dialog': 'Отзыв',
  'note.placeholder': 'Что было хорошо или что пошло не так? (необязательно)',
  'note.save': 'Сохранить',
  'note.cancel': 'Отмена',
  'note.aria': 'Заметка к отзыву',
  'error.conflict': 'Отзыв был изменён в другом месте; показано актуальное состояние',
  'error.load': 'Не удалось загрузить отзыв',
  'error.generic': 'Не удалось сохранить отзыв',
} satisfies Record<MessageFeedbackKey, string>
