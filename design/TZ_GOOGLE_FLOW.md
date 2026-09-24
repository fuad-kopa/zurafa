# ТЗ для Google Flow: кадры и видео «Шахмат Тамерлана»

Изображения в Flow (Nano Banana Pro) бесплатны — генерируйте x4 и отбирайте. Видео — только оживление уже утверждённых кадров (Omni Flash, 8–10 с), никогда text-to-video с нуля.

## Порядок работы — строго по блокам

```
A. Канон фигур ──► утвердить ──► B. Доска и мир
                                  C. Обложка и фоны
                                  D. Аватары (миниатюра)
                                  E. Иллюстрации истории
                                  F. Видео (из кадров B–C)
```

Блок A — фундамент. Пока набор фигур не утверждён, ничего другого не генерировать: он прикладывается образцом ко всем сценам с фигурами. Утверждённые кадры складывать в `Дизайн и фото/approved/<блок>/` с именем по номеру промпта.

## Образцы (прикладывать через «⋮ → Добавить в запрос»)

| Файл | Для чего |
|---|---|
| `design/refs/ref-pieces.png` | силуэты всех 13 фигур — к каждому промпту блока A |
| `design/refs/ref-empty.png` | точная доска 11×10 с цитаделями — к промптам доски |
| `design/refs/ref-start.png` | начальная расстановка |
| утверждённый A.1 | ко всем сценам с фигурами (блоки B, C, F) |
| утверждённый D.1 | к остальным пяти портретам (единая серия) |

## Общие правила промптов

- Формат указывать явно в интерфейсе; в промпте — тоже (`vertical 9:16`).
- Каждый промпт заканчивается двумя блоками — **стиль** и **запрет**:

**STYLE:** `Timurid Central Asia, Samarkand 14th–15th century. Materials: glazed turquoise ceramic tile, deep lapis lazuli, burnished gold leaf, warm carved ivory. Girih star patterns, pointed iwan arches, muqarnas. Palette strictly turquoise #58b9af, lapis #1b2f6b, gold #e9c46a, ivory #efe3c8, dark ink #0e1a33. Calm, premium, museum-quality. Bright, clean, well exposed.`

**NEGATIVE:** `No text, no letters, no calligraphy, no writing, no numbers, no logos anywhere. No western Staunton chess pieces, no queen, no 8x8 board, no brown-and-black board. No glowing magic, no energy particles, no neon, no outer space. No shattering or breaking pieces. No living animals — every piece is a carved figurine on a round base. No photorealistic human faces.`

- Свет описывать словами про свет (`warm sunlight floods`, `soft studio light`), не про тени.
- Доска на кадре — либо **макро** (в кадре ≤ 3×3 клеток), либо **в расфокусе**, либо с образцом `ref-empty.png` и фразой `keep the board grid exactly as in the reference`. Никогда не давать генератору считать 11×10 без образца.

---

## Блок A. Канон фигур

Цель: один комплект, который станет лицом игры. Каждая фигура — резная статуэтка на круглом основании, силуэт **совпадает с иконкой из `ref-pieces.png`**. Короли и советники — **головные уборы на точёном основании, не бюсты людей**.

### A.1 Лист набора (1:1, образец: ref-pieces.png)
```
Product photograph, game asset sheet on a plain dark ink #0e1a33 background, soft even studio light from the top-left, 1:1. Two complete sets of carved chess pieces for Tamerlane's chess arranged in two neat rows of 13, front view, same scale, evenly spaced, each on a round turned base. Top row carved from warm ivory with fine dark-brown engraved ornament; bottom row carved from deep lapis lazuli with thin gold inlay. Match the silhouettes of the reference image exactly, piece by piece, left to right: King — a domed crown-turban with a crescent finial on a turned pedestal; Prince — a smaller crown with a single feather; Adventitious King — a pawn body wearing a crown; General — a pointed spiked helmet with a neck guard; Vizier — a tall wrapped turban with a jewel; Rook — a squat fortified tower with crenellations and an arched gate; Knight — a horse head; Picket — a slender scout's tent with a pennant; Giraffe — a long-necked giraffe; Elephant — an elephant head, front view, with tusks; Camel — a camel with one hump; War Engine — a boxy siege shed on four wheels; Pawn — a small rounded soldier. Readable, distinct silhouettes, sharp detail. [STYLE] [NEGATIVE]
```
Отобрать вариант, где все 13 силуэтов узнаются. Дальше — он образец.

### A.2 Портреты фигур (1:1, по одному на фигуру, образец: A.1)
```
Use the reference set exactly — same material, same carving style, same base. Single piece: {PIECE}. Studio product shot, centered, on a plain dark ink #0e1a33 background, soft gold rim light, macro lens, sharp detail, 1:1. [STYLE] [NEGATIVE]
```
Подстановки `{PIECE}`, две версии каждой — `ivory` и `lapis with gold inlay`:
- the King: a domed crown-turban with a crescent finial on a turned pedestal
- the Prince: a smaller crown with one feather
- the Adventitious King: a pawn-shaped body wearing an oversized crown, repaired with gold seams (kintsugi)
- the General: a pointed spiked helmet with a neck guard
- the Vizier: a tall wrapped turban with a jewel at the front
- the Rook: a squat fortified tower with crenellations and an arched gate
- the Knight: a proud Akhal-Teke horse head with a braided bridle
- the Picket: a slender scout's tent with a fluttering pennant
- the Giraffe: a giraffe with a long elegant neck, spots engraved as ornament
- the Elephant: an elephant head seen from the front, ears spread, tusks, a tasselled howdah cloth
- the Camel: a one-humped camel with a decorated saddle blanket
- the War Engine: a boxy wooden siege shed on four wheels
- the Pawn: a small rounded foot soldier

Итого 26 портретов. Используются в карточках фигур, задачах, обучении.

### A.3 Пешка пешек — три стадии (1:1, образец: A.1)
```
Use the reference set. Three pawns side by side on a dark ink background: the same small rounded pawn, first plain, second with one thin gold ring around its body, third with two gold rings. Studio shot, soft light, 1:1. [STYLE] [NEGATIVE]
```

---

## Блок B. Доска и мир (образцы: A.1 + ref-empty.png)

### B.1 Доска сверху, чистая (4:3)
```
Use the reference board exactly — keep the board grid exactly as in the reference: 11 columns by 10 rows, and the two single arched citadel squares protruding from the sides. Render it as a real object photographed straight from above, orthographic, perfectly flat: hand-glazed ivory and turquoise ceramic tiles with subtle crackle, thin gold grout, the frame of lapis-blue wood inlaid with a fine gold girih border, the two citadels as small pointed-arch niches with gold frames. Empty, no pieces. Even soft light, clean, game asset. [STYLE] [NEGATIVE]
```
### B.2 Доска в перспективе, макро (16:9 и 9:16)
```
Use the reference set. Macro shot at tile level, shallow depth of field: three carved pieces — a lapis giraffe, an ivory camel and a lapis war engine — standing on turquoise and ivory glazed tiles, only a few tiles visible, the rest of the board melting into soft bokeh. Warm sunlight floods in from a pointed arch window on the left, gold inlay glinting. Bright, clean exposure. [STYLE] [NEGATIVE]
```
### B.3 Цитадель (16:9)
```
Use the reference set. Macro: an ivory king piece standing inside a small pointed-arch niche at the edge of the board — the citadel — framed in gold, turquoise tiles in front, the rest of the board out of focus. Calm, warm light. [STYLE] [NEGATIVE]
```
### B.4 Место (16:9, без фигур) — фоны для страниц
- `Interior of a Timurid madrasa iwan in Samarkand, empty, warm afternoon sunlight streaming through the arch onto turquoise and cobalt tilework, muqarnas vault above, no people. Bright, clean. [STYLE] [NEGATIVE]`
- `Courtyard of the Registan at blue hour, empty, turquoise domes, brass lanterns just lit, a reflecting pool, no people. [STYLE] [NEGATIVE]`
- `Close-up of Shah-i-Zinda mosaic faience: turquoise, cobalt and white tiles with gold, raking light, texture detail, flat, no people. [STYLE] [NEGATIVE]`

---

## Блок C. Обложка и фоны интерфейса (образцы: A.1 + B.1)

### C.1 Главная обложка (9:16, 16:9 и 4:5 — три отдельные генерации)
```
Use the reference set and the reference board. Key art: the great chessboard rests on a marble dais inside a vast Timurid palace hall at golden hour, seen from a low three-quarter angle so that the near pieces — a lapis giraffe and an ivory elephant — are large and sharp while the far side of the board and the turquoise dome beyond the arches dissolve into warm haze. Dust motes in sunbeams. Deep lapis sky with first stars through the arch. Generous empty sky at the top for a title. Cinematic, wide lens, bright and well exposed. [STYLE] [NEGATIVE]
```
### C.2 Фон меню (9:16 и 16:9)
```
Seamless calm background for a game menu: night over the silhouette of Samarkand — domes and minarets in dark ink against a deep lapis sky, a faint gold girih star lattice over the sky at 8% opacity, soft turquoise glow at the horizon. Large empty space in the centre. No people. [STYLE] [NEGATIVE]
```
### C.3 Иконка приложения (1:1, образец: A.2 жираф)
```
App icon, 1:1, filling the frame edge to edge. A single lapis-and-gold giraffe chess piece from the reference, centred, in front of a turquoise tiled pointed arch, flat gold gradient light, bold and readable at 60 px. No background clutter. [STYLE] [NEGATIVE]
```
### C.4 Медальон победы / поражения / ничьей (1:1, три штуки)
```
Round medallion emblem on a dark ink background, 1:1: a gold girih eight-point star frame; inside, {an ivory crown-turban king piece on turquoise tiles | a lapis king piece toppled on its side | two king pieces, ivory and lapis, standing side by side inside a small arched citadel}. Enamel and gold leaf look, flat lighting, crisp. [STYLE] [NEGATIVE]
```

---

## Блок D. Аватары противников — персидская миниатюра (1:1, 6 штук)

Сначала D.1, затем остальные с D.1 как образцом и фразой `Match the exact painting style, palette and framing of the reference portrait.`

```
Persian miniature painting, Herat school, 15th century manuscript style: flat perspective, fine brush outlines, rich mineral pigments, gold leaf sky. Circular portrait inside a gold ornamental ring on a lapis background, head and shoulders, facing slightly left. {CHARACTER}. 1:1. [STYLE] [NEGATIVE — except: painted human faces are allowed here]
```
- D.1 Новобранец — `a nervous young recruit in a simple felt cap and an oversized quilted coat, holding a wooden practice sword`
- D.2 Лучник — `a young steppe archer in a fur-trimmed hat, a composite bow over the shoulder, focused eyes`
- D.3 Всадник — `a confident horseman in a pointed helmet with a mail aventail, a windblown scarf`
- D.4 Сотник — `a seasoned captain of a hundred, scarred cheek, lamellar armour, a small gold badge`
- D.5 Эмир — `a wise emir with a grey beard, a brocade robe and a jewelled turban`
- D.6 Тимур — `the ruler Timur, stern and calm, dark beard streaked with grey, a tall jewelled crown-turban, a heavy gold-embroidered robe, an unbeatable gaze`

---

## Блок E. Иллюстрации для «Истории» (16:9, миниатюра, образец: D.1)

- E.1 `Persian miniature: Timur seated on a carpet in a garden pavilion playing the great chess on a large board against a court scholar, courtiers watching, cypress trees, a turquoise pool, gold sky. The board seen at an angle and partly hidden by figures.`
- E.2 `Persian miniature: two messengers arriving at a chess game in a palace, one bowing with news, the ruler's hand raised above the board — the moment Shah Rukh was named.`
- E.3 `Persian miniature: a blindfolded chess master playing several opponents at once in a madrasa courtyard.`
- E.4 `Persian miniature: a scribe copying a chess manuscript by lamplight, a board diagram on the page (do not draw real letters — abstract marks only).`

---

## Блок F. Видео (Omni Flash, оживление кадров, 8–10 с; промпт — только про движение)

Титры не вшивать — накладываются кодом. Звук — только эффекты, без музыки.

| № | Кадр | Промпт движения |
|---|---|---|
| F.1 | C.1 (16:9) | `Slow dolly-in toward the board, dust motes drifting in the sunbeams, light slowly warming. Nothing else moves. Audio: distant wind, soft room tone. No music at all.` |
| F.2 | B.2 | `Locked-off macro. The lapis giraffe piece slides smoothly one tile diagonally and then four tiles straight ahead across the turquoise tiles, as if moved by an unseen hand, stopping with a soft settle. The camera does not move. Audio: a single soft click of carved stone on ceramic tile. No music at all.` |
| F.3 | B.3 | `Slow push-in on the citadel niche as the ivory king glides into it and stops; the gold frame catches the light. Audio: soft stone click, then silence. No music at all.` |
| F.4 | A.3 (третья пешка) | `Slow 180-degree orbit around the pawn with two gold rings, rim light travelling across the gold. Audio: room tone. No music at all.` |
| F.5 | C.2 | `Perfect seamless loop: stars twinkle slowly, the gold girih lattice breathes at 8% opacity, an almost imperceptible camera drift. No music at all.` |
| F.6 | A.1 | `Camera slowly tracks left to right along the row of ivory pieces at eye level, each piece passing through a soft pool of light. Audio: room tone. No music at all.` |

Из F.1–F.6 плюс покадровая запись настоящего интерфейса собираются трейлер 25–30 с (16:9 для YouTube, 9:16 для Reels/Shorts) и обзор функций — сборка и титры делаются кодом.

## Что не генерировать вовсе
Скриншоты интерфейса и макеты экранов (это Claude Design и код), доску целиком без образца, людей фотореалистично, сцены «фигура разбивает фигуру», супергеройские тизеры.
