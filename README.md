# Digital Nauryz

Базовый каркас Telegram Web App / PWA для проекта «Цифровой Наурыз».

## Что уже подготовлено

- Next.js App Router структура
- Главная страница, профиль, лидерборд и страницы событий 14-20 марта
- Доменные типы и карта активностей
- SSR-подключение Supabase для browser/server/middleware
- Заготовки под Telegram Web App и Supabase
- SQL-миграция для core-таблиц, очков, лидерборда и механики дня 14
- PWA manifest

## Supabase

- Серверный клиент: `lib/supabase/server.ts`
- Браузерный клиент: `lib/supabase/browser.ts`
- Service role клиент: `lib/supabase/admin.ts`
- Middleware sync cookies: `middleware.ts`
- Базовые запросы: `lib/supabase/queries.ts`
- Стартовая схема: `supabase/migrations/202603090001_initial_core.sql`

## Docker

- `Dockerfile` содержит `dev` и `runner` stage для Next.js
- `docker-compose.yml` поднимает только frontend
- проект ожидает внешний Supabase Cloud project
- `NEXT_PUBLIC_SUPABASE_URL` используется браузером и server-side по умолчанию
- `SUPABASE_INTERNAL_URL` не нужен для Supabase Cloud и обычно остается пустым

Запуск через Docker:

1. Скопировать `.env.docker.example` в `.env.docker`
2. Подставить URL, `anon key`, `service role key` и Telegram env из вашего Supabase проекта
4. Запустить `docker compose --env-file .env.docker up --build`

## Следующие шаги

1. Установить зависимости: `npm install`
2. Заполнить `.env.local` на основе `.env.example`
3. Добавить `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` и при необходимости `TELEGRAM_AUTH_SECRET`
4. Применить SQL из `supabase/migrations/202603090001_initial_core.sql` в вашем Supabase проекте
5. Открывать приложение внутри Telegram Web App для автоматического логина
6. Начать поочерёдную реализацию игровых дней

## Приоритет первой итерации

1. День встреч (14 марта)
2. Общий профиль и лидерборд
3. День доброты (15 марта)
