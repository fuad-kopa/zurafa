# Публикация

## Сейчас: GitHub Pages (без домена)

Адрес: https://fuad-kopa.github.io/zurafa/

Код лежит в ветке `main` репозитория github.com/fuad-kopa/zurafa, собранный сайт — в ветке `gh-pages`.
Обновить сайт после правок:

```bash
./deploy.sh
```

(собирает `dist/`, коммитит его в `gh-pages` и пушит; через 1–2 минуты сайт обновится).

Автосборку через GitHub Actions можно включить позже: файл `docs/deploy/github-pages-workflow.yml`
переложить в `.github/workflows/pages.yml`, а токену GitHub CLI дать право `workflow`:
`gh auth refresh -h github.com -s workflow`. Тогда сайт будет собираться сам при каждом пуше в `main`.

## Потом: Cloudflare Pages (когда будет домен)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → выбрать `fuad-kopa/zurafa`.
2. Build command: `npm run build`, Build output directory: `dist`, ветка `main`.
3. После первого деплоя — Custom domains → добавить `zurafa.app` (DNS Cloudflare подставит сам).
4. `timurchess.ru` → Bulk Redirects или Page Rule: 301 на https://zurafa.app.

Обе площадки статические, серверов у игры нет: онлайн по ссылке идёт напрямую между браузерами.
