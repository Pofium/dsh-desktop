# DeepSeek Harness

[English](README.md) | **Русский** | [中文](README.zh.md)

DeepSeek Harness (`dsh`) — это агентная среда (agent harness) с открытым исходным кодом, разработанная [DeepSeek AI](https://deepseek.com).

Архитектура системы построена по принципу **«всё является плагином»** на базе фреймворка [Cordis](https://github.com/cordiverse/cordis), концепция которого описана в статье [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Документация: [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## Предварительная версия для разработчиков (Developer Preview)

DeepSeek Harness находится на стадии _developer preview_ и активно развивается. **ВОЗМОЖНЫ ИЗМЕНЕНИЯ, НАРУШАЮЩИЕ ОБРАТНУЮ СОВМЕСТИМОСТЬ.**

Перед запуском проекта ознакомьтесь с [уведомлением о безопасности](SAFETY.md).

## Запуск

### Настольное приложение Windows (MSI и портативная версия)

Для Windows 10/11 доступны готовые сборки в [Releases](https://github.com/Pofium/dsh-desktop/releases):
- **Портативный ZIP (`.zip`)**: автономный архив — распакуйте и запустите `DeepSeek Harness.exe`. В архив входят оболочка Electron, собственный Node.js и сервер `dsh`, поэтому установка Node.js в систему не требуется. Веб-интерфейс поставляется с русским, английским и китайским словарями, а при первом запуске поднимает локальный сервер на `127.0.0.1:3080` в отдельном окне.
- **MSI-установщик (`.msi`)**: стандартный установщик Windows с ярлыком на рабочем столе, пунктом в меню «Пуск» и выбором между установкой «только для пользователя» (без прав администратора) и «для всех пользователей».

### Запуск через `npm`

Установите `Node.js`, затем выполните:

```sh
npx @deepseek-ai/dsh web
```

Эта команда запускает веб-интерфейс (Web UI) по умолчанию на `http://127.0.0.1:3080` и открывает его в браузере при локальном запуске. При запуске через SSH выводится только URL хоста, так как локальный порт пробрасывается SSH-клиентом или редактором. Передайте флаг `--no-open`, чтобы запустить сервер без открытия браузера. См. [руководство по Web UI](docs/user/guide/index.md).

### Запуск из исходного кода

Для запуска из клонированного репозитория:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

Команда `pnpm run build` подготавливает артефакты репозитория. `pnpm dsh web` использует эти собранные артефакты без повторной сборки.

## Сообщество и поддержка

- Отправляйте отзывы или отчеты об ошибках через [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Добавьте топик [`dsh-plugin`](https://github.com/topics/dsh-plugin) к репозиторию вашего плагина для улучшения его видимости.
- Присоединяйтесь к <a href="https://discord.gg/Ycq5dCaS4">Discord-сообществу DeepSeek Harness</a>.

## Участие в разработке (Contributing)

См. [CONTRIBUTING.md](CONTRIBUTING.md).

## Разработка

Начните с [руководства по разработке](docs/development.md) и [документации по архитектуре](docs/architecture.md).

Для ИИ-агентов следуйте [AGENTS.md](AGENTS.md).

## Лицензия

[MIT](LICENSE)

Сторонние зависимости и их лицензии описаны в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
