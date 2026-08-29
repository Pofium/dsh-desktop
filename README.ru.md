# DeepSeek Harness

[English](README.md) | **Русский** | [中文](README.zh.md)

**DeepSeek Harness (`dsh`)** — открытая расширяемая среда для автономных ИИ-агентов (AI Agent Harness), разработанная [DeepSeek AI](https://deepseek.com).

Вся система построена на микроядерной модульной архитектуре **«всё является плагином»** под управлением [Cordis](https://github.com/cordiverse/cordis). Дизайн архитектуры подробно описан в научной статье [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Официальная документация: [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

---

## 🌟 Возможности и улучшения

- 🌐 **Полная русская локализация**:
  - Переведён весь интерфейс (панели сессий, настройки, дерево инструментов, статистика токенов, чат, модальные окна, ошибки).
  - Динамическое переключение языков: **Русский**, **English**, **中文** прямо в настройках (`Настройки` → `Язык интерфейса`).
- 💻 **Нативное десктопное приложение для Windows (Electron)**:
  - Автономный исполняемый файл `DeepSeek Harness.exe` с кастомной иконкой.
  - Запуск в виде нативного GUI-окна Windows (GUI Subsystem 2 — без мелькающих черных окон терминала).
  - Полноценное контекстное меню по правому клику мыши (Отменить, Повторить, Вырезать, Копировать, Вставить, Выделить всё).
  - Встроенная проверка орфографии (Spellchecker) для русского и английского языков с вариантами исправлений по правому клику.
  - Бесшумный запуск терминалов и дочерних процессов в фоне (`windowsHide: true`).
- 📦 **Полноценный инсталлятор и деинсталлятор для Windows 10/11**:
  - Однокликовый скрипт установки `install-windows.cmd` с созданием ярлыков на Рабочем столе и в меню «Пуск».
  - Корректная регистрация в разделе Windows «Установка и удаление программ» с чистым удалением (`uninstall.cmd`).
  - Готовый скрипт для сборки классического установщика Inno Setup (`dist-exe/installer/setup.iss`).
- ⚡ **Поддержка современных рантаймов**:
  - Полная совместимость с Node.js 22 и Node.js 24 (включая нативный декомпрессор `zstd`).

---

## 🚀 Быстрый запуск

### 1. Запуск десктопного приложения Windows (без установки)

Запустите скрипт в корне проекта:

```cmd
start-app.cmd
```

Или откройте напрямую: `dist-exe\DeepSeek-Harness\DeepSeek Harness.exe`.

### 2. Установка в систему Windows 10 / 11

Двойным кликом запустите:

```cmd
install-windows.cmd
```

Приложение установится в `%LOCALAPPDATA%\Programs\DeepSeek Harness`, создаст ярлыки на Рабочем столе и в меню «Пуск» и зарегистрируется в панели управления Windows.

---

### 3. Запуск веб-сервера через npm

Установите `Node.js` (рекомендуется v22+ или v24) и выполните:

```sh
npx @deepseek-ai/dsh web
```

По умолчанию откроется веб-интерфейс по адресу `http://127.0.0.1:3080`.

---

### 4. Сборка из исходников

```sh
# 1. Клонировать репозиторий
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness

# 2. Установить зависимости
pnpm install

# 3. Собрать библиотеки и фронтенд
pnpm run build

# 4. Запустить агент
pnpm dsh web
```

---

## ⚙️ Настройка API ключей

Создайте файл `.env` в корне проекта (по шаблону `.env.example`):

```env
# DeepSeek API Ключ
DEEPSEEK_API_KEY=ваш_api_ключ_здесь

# (Опционально) Кастомный API Base URL
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

---

## 🛠️ Сборка собственного Desktop Exe

Для пересборки десктопного приложения:

```powershell
# 1. Сборка клиентских модулей и веб-SPA
npx tsdown --env.DSH_BUILD_FACE host
npx tsdown --env.DSH_BUILD_FACE client
pnpm --filter @deepseek-ai/dsh-web-frontend run build

# 2. Упаковка Electron-приложения
node dist-exe/package-app.mjs
```

Готовый файл появится в `dist-exe/DeepSeek-Harness/DeepSeek Harness.exe`.

---

## 📄 Лицензия

Проект распространяется под лицензией [MIT](LICENSE).
Уведомления о сторонних компонентах приведены в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
