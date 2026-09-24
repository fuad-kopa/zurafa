# Промпты для генерации визуала «Шахмат Тамерлана»

Для Nano Banana (Gemini Image / Google Flow), Midjourney, GPT Image, Flux, Seedream — и для видео: Veo, Kling, Sora, Seedance, Higgsfield.

Промпты написаны на английском: модели понимают его точнее. Пояснения — на русском.

---

## 0. Как пользоваться (коротко)

1. **Сначала сделайте «якорь стиля».** Сгенерируйте промпт из раздела 2 («Мир игры»), выберите лучший вариант и сохраните его. Дальше **прикладывайте его как референс** к каждому новому запросу в Nano Banana, добавляя фразу: *«Match the exact style, palette and lighting of the reference image.»* Так все картинки будут выглядеть как одна игра.
2. **Сначала фигуры, потом всё остальное.** Когда получится удачный комплект фигур (раздел 4), прикладывайте его ко всем сценам с доской.
3. **Nano Banana хорошо редактирует.** Не перегенерируйте с нуля, а пишите правки: *«Keep everything, but make the turquoise tiles slightly darker and remove the text.»*
4. **Текст на картинках** (название, кнопки) у Nano Banana и GPT Image получается хорошо, у Midjourney и Flux — плохо. Для Midjourney удаляйте из промпта кавычки с текстом и добавляйте текст позже в Figma.
5. **Пропорции:** в Midjourney — `--ar 16:9`, в остальных выбирайте формат в интерфейсе или пишите в промпте «vertical 9:16».

---

## 1. Стилевой блок (вставлять в конец любого промпта)

Это «ДНК» проекта: палитра и эстетика совпадают с кодом (`#58b9af` бирюза, `#1b2f6b` ляпис, `#e9c46a` золото, `#efe3c8` слоновая кость).

```
Style: Timurid Central Asian art, Samarkand 14th–15th century. Turquoise glazed tiles, deep lapis lazuli blue, burnished gold leaf, warm ivory. Girih geometric star patterns, pointed arches (iwan), muqarnas, Persian miniature influence. Palette strictly: turquoise #58b9af, lapis #1b2f6b, gold #e9c46a, ivory #efe3c8, dark ink #0e1a33. Refined, premium, calm, museum-quality. No modern objects, no Western medieval castles, no neon.
```

Короткая версия (для видео и Midjourney):

```
Timurid Samarkand aesthetic, turquoise tiles, lapis blue, gold leaf, ivory, girih patterns, premium, cinematic
```

**Негатив** (для Flux/SD/Kling, где есть поле negative prompt):

```
western chess pieces, staunton pieces, 8x8 board, castle towers, knights in armor, neon, plastic, cartoonish, blurry, extra squares, distorted grid, watermark, random letters, anime
```

---

## 2. Мир игры / ключевой арт (обложка, главный экран)

### 2.1 Главный ключевой арт (hero / обложка)

```
Epic key art for a strategy board game "Tamerlane's Chess". A monumental 11×10 chessboard of turquoise and ivory glazed tiles rests on a marble platform inside a vast Timurid palace hall in Samarkand at golden hour. Two small arched citadel niches protrude from the sides of the board. Ornate carved pieces stand in formation: giraffes, camels, elephants, siege towers, horsemen. Behind, the turquoise ribbed dome of the Gur-e-Amir and tall minarets glow in warm sunset haze. Light rays through pointed arches, dust particles, a deep lapis sky with the first stars. Cinematic wide shot, low angle, shallow depth of field, ultra detailed.
[+ стилевой блок]
```

### 2.2 Версия с названием (для Nano Banana / GPT Image)

```
Same scene, with an elegant title at the top in gold calligraphic-style Latin letters: "TAMERLANE'S CHESS", and a smaller subtitle beneath: "The Great Chess of Timur". Leave clean empty space at the bottom for buttons. Vertical 9:16 mobile poster.
```

Русская версия заголовка: замените на `"ШАХМАТЫ ТАМЕРЛАНА"` и `"Великие шахматы Тимура"`.

### 2.3 Фон главного экрана (без фигур, чтобы поверх него лежал интерфейс)

```
Seamless background for a mobile game menu. Deep lapis blue night sky over the silhouette of Samarkand's Registan: domes and minarets in dark ink. A faint gold girih star pattern overlays the sky at 8% opacity. Soft turquoise glow near the horizon. Lots of empty calm space in the center for UI. No text, no characters. Vertical 9:16.
[+ стилевой блок]
```

### 2.4 Бесшовный орнамент (для подложек, карточек, рамок)

```
Seamless tileable pattern, flat vector style. Timurid girih ten-pointed star pattern, thin gold lines on deep lapis blue background, small turquoise accents in the star centers. Perfectly repeating edges, symmetric, crisp, no shading, no text.
```

---

## 3. Доска

Правила важные для модели: **11 колонок × 10 рядов**, клетки не чередуются как в классике (в исторической игре они были одноцветными), **две цитадели** — отдельные клетки, выступающие за край доски: одна справа во 2-м ряду, другая слева в 9-м ряду.

> Модели путаются в количестве клеток. Если сетка «плывёт» — сгенерируйте доску без фигур, исправьте в редакторе и дальше прикладывайте как референс с фразой *«Keep the board grid exactly as in the reference.»*

### 3.1 Доска сверху (для игрового экрана)

```
Top-down orthographic view of a board game board, perfectly flat, no perspective. Exactly 11 columns and 10 rows of square tiles, alternating ivory #efe3c8 and turquoise #58b9af glazed ceramic tiles with subtle hand-painted texture. Two extra single squares stick out of the board edge: one on the right side next to the second row from the bottom, one on the left side next to the second row from the top — each shaped as a small pointed-arch niche (citadel) with a gold frame. The board frame is lapis blue wood inlaid with a thin gold girih border. Empty board, no pieces, no letters, no numbers. Clean, crisp, game asset.
```

### 3.2 Доска в перспективе (для рекламы и загрузочного экрана)

```
Three-quarter view of an ornate 11×10 chessboard made of turquoise and ivory Samarkand tiles set into a lapis-blue carved wooden table with gold inlay, two arched citadel niches protruding from opposite sides. Placed on a Persian carpet in a candle-lit Timurid chamber, brass lanterns, a cup of tea. Warm cinematic light, shallow depth of field.
[+ стилевой блок]
```

---

## 4. Фигуры

Стороны: **белые (слоновая кость с тёмно-коричневыми линиями)** и **синие (ляпис с золотом)** — как в текущем SVG. Фигуры в этой игре — не европейские: вместо ферзя генерал, есть жираф, верблюд, дозорный, осадная башня.

### 4.1 Весь набор одной картинкой (лист персонажей)

```
Game asset sheet: a complete set of carved chess pieces for Tamerlane's Chess, front view, arranged in a clean grid on a plain dark background, each piece clearly separated. Two sides: ivory pieces carved from bone with dark brown engraved lines, and lapis lazuli blue pieces with gold inlay.
Pieces, in order: King (crowned domed turban), General (ferz, with a curved sword emblem), Vizier (tall scholar's turban), Rook (chariot / fortified tower with arch), Knight (horse head), Picket (archer lookout, slender tower with a banner), Giraffe (long neck, elegant), Elephant (war elephant with small howdah), Camel (single hump, saddle), War Engine (siege tower / battering ram on wheels), Pawn (simple rounded pawn with a tiny emblem of its master piece).
Consistent style, same scale, same lighting from top-left, readable silhouettes that are distinct even at small size.
[+ стилевой блок]
```

### 4.2 Одна фигура крупно (подставлять имя)

Подставьте вместо `{PIECE}` одно из описаний ниже.

```
Single chess piece, {PIECE}, carved from lapis lazuli with gold inlay, Timurid Samarkand style, standing on a round turquoise-tiled base. Studio product shot, centered, pure dark navy background #0e1a33, soft rim light in gold, sharp details, 1:1.
```

| Фигура | `{PIECE}` |
|---|---|
| Король | `a royal king with a domed crown-turban topped by a crescent finial` |
| Принц | `a young prince, smaller crown, feather aigrette on the turban` |
| Рукотворный король | `a king forged from a pawn — a pawn-shaped body wearing an oversized golden crown, cracked and repaired with gold (kintsugi)` |
| Генерал | `a general (ferz) with a spiked helmet and a curved sabre across the chest` |
| Визирь | `a vizier with a very tall wrapped turban and a scroll` |
| Ладья | `a rook shaped as a fortified chariot-tower with a pointed arch gate` |
| Конь | `a knight: proud Akhal-Teke horse head with a tasseled bridle` |
| Дозорный | `a picket: slender watchtower with a fluttering pennant and an archer's window` |
| Жираф | `a giraffe with a very long elegant neck, spotted pattern engraved in gold` |
| Слон | `a war elephant with a small canopy howdah and raised trunk` |
| Верблюд | `a Bactrian camel with a decorated saddle blanket` |
| Осадная башня | `a war engine: wooden siege tower on four wheels with a battering ram` |
| Пешка | `a pawn: a small rounded foot soldier with a shield bearing the emblem of its master piece` |

### 4.3 Плоские иконки фигур для интерфейса (чтобы перерисовать в SVG)

```
Flat vector icon set of 11 chess pieces for Tamerlane's Chess: king, general, vizier, rook, knight, picket, giraffe, elephant, camel, siege tower, pawn. Side silhouette style, thick uniform outline, ivory fill with dark brown outline. Minimal details, instantly recognisable at 32 px. Arranged in a row on a white background, equal size, no shading, no text.
```

Дальше: `Now the same set with lapis blue fill #1b2f6b and gold details #e9c46a.`

---

## 5. Интерфейс (макеты экранов)

Лучше всего работают в Nano Banana и GPT Image. Результат — референс для вёрстки, а не готовый интерфейс.

### 5.1 Главный экран (телефон)

```
High-fidelity mobile app UI mockup, iPhone screen 390×844, for a board game "Шахматы Тамерлана". Dark lapis blue background with a subtle gold girih pattern. At the top: title in gold, a small turquoise dome illustration. Below: four large rounded cards stacked vertically with gold thin borders and icons: "Против компьютера", "С другом по ссылке", "Вдвоём на одном экране", "Познакомиться с фигурами". Each card has a one-line grey description. Bottom tab bar: Играть, Фигуры, Правила, История. Clean, modern, premium, generous spacing, readable typography, Timurid ornament used sparingly.
```

### 5.2 Экран партии

```
High-fidelity mobile game UI mockup, iPhone screen. Center: a top-down 11×10 chessboard with turquoise and ivory tiles and two small arched citadel squares sticking out of the side edges. Ivory and lapis-blue pieces in starting position. Top: opponent card with round avatar of an old Timurid warrior "Эмир", a small timer. Bottom: player card "Вы", buttons: undo, hint, resign as simple line icons. A legal-move highlight: gold dots on several tiles, the selected piece (a giraffe) glowing softly. Dark lapis background, premium, clean.
```

### 5.3 Карточка фигуры (обучение)

```
Mobile UI card, bottom sheet on a dark lapis background. Left: a large illustration of a giraffe chess piece in lapis and gold. Right: title "Жираф", short text explaining how it moves, and a small 7×7 mini-board diagram with turquoise tiles showing its move paths as gold arrows. Elegant, readable, museum-label feel.
```

### 5.4 Экран победы

```
Victory screen for a mobile board game. Center: a golden laurel-and-girih medallion with a crowned king piece inside, soft gold light burst, falling rose petals. Text "Победа!" in gold, below "Мат на 34-м ходу" in ivory. Two buttons: "Ещё партию", "На главную". Lapis blue background.
```

---

## 6. Иконка приложения

```
App icon, 1024×1024, rounded square. A single lapis blue and gold king chess piece with a domed crown-turban, standing in front of a turquoise tiled pointed arch. Simple, bold, centered, readable at 60 px, flat lighting with a gentle gold gradient, no text.
```

Альтернативы: замените короля на `a giraffe chess piece` (жираф — самая узнаваемая «необычная» фигура, выделит иконку среди обычных шахмат).

---

## 7. Аватары противников (6 уровней ИИ)

Общий шаблон — вставляйте описание персонажа:

```
Portrait avatar in Persian miniature painting style, circular composition inside a gold ornamental ring, lapis blue background. {CHARACTER}. Head and shoulders, facing slightly left, expressive, consistent style across a series of six portraits.
```

| Уровень | `{CHARACTER}` |
|---|---|
| Новобранец | `a nervous young recruit boy in a simple felt cap, oversized quilted coat, holding a wooden practice sword` |
| Лучник | `a young steppe archer with a fur-trimmed hat and a composite bow over the shoulder, focused eyes` |
| Всадник | `a confident horseman with a pointed helmet and chainmail aventail, windblown scarf` |
| Сотник | `a seasoned captain of a hundred with a scarred cheek, lamellar armour, a small gold badge` |
| Эмир | `a wise emir with a grey beard, rich brocade robe and a jewelled turban` |
| Тимур | `the great conqueror Timur: stern elderly ruler with a dark beard streaked with grey, a tall jewelled crown-turban, heavy gold-embroidered robe, sitting before a chessboard, a calm and unbeatable gaze` |

---

## 8. Маркетинг

### 8.1 Скриншоты для App Store / Google Play

```
App store screenshot, vertical 1290×2796. Top 30%: large bold headline "Шахматы, в которые играл Тимур" in ivory on lapis blue with a thin gold ornament. Below: a realistic iPhone mockup showing the game screen with the 11×10 turquoise board and ornate pieces. Premium, clean, consistent with a series.
```

Другие заголовки для серии:
- `"11×10 клеток, 2 цитадели, 1 пешка, которая станет королём"`
- `"Играйте с другом по ссылке — без регистрации"`
- `"Шесть противников — от новобранца до Тимура"`
- `"Жираф, верблюд, осадная башня: научим за 5 минут"`

### 8.2 Обложка для соцсетей / YouTube

```
YouTube thumbnail, 16:9. Left: close-up of an ornate lapis-and-gold giraffe chess piece towering over a small ordinary western chess pawn, dramatic lighting. Right: big bold ivory text "ЗАБУДЬ ОБЫЧНЫЕ ШАХМАТЫ". Turquoise tiled background with glow. High contrast, eye-catching.
```

### 8.3 Историческая иллюстрация (раздел «История»)

```
Persian miniature painting, 15th century manuscript style: Timur sitting on a carpet in a garden pavilion playing a great chess game on an 11×10 board against a court scholar, courtiers watching, cypress trees, a turquoise pool, gold sky, delicate brushwork, flat perspective, rich pigments.
```

---

## 9. Видео (Veo, Kling, Sora, Seedance, Higgsfield)

Совет: **сначала сгенерируйте кадр в Nano Banana, потом оживите его** (image-to-video) — так стиль совпадёт с остальными картинками. Длина клипа 5–8 секунд. В видеопромпте описывайте **движение камеры и что двигается**, а не внешний вид (он уже в стартовом кадре).

### 9.1 Трейлер: открывающий кадр

```
Cinematic slow dolly-in through a pointed Timurid arch into a golden-hour palace hall in Samarkand. Dust particles float in sunbeams. In the center an ornate turquoise-and-ivory 11×10 chessboard on a marble dais, pieces waiting. Camera slowly rises and tilts down to reveal the whole board. Soft ambient music feel, majestic, 24fps, anamorphic lens.
```

### 9.2 Фигуры оживают

```
Macro shot, shallow depth of field. A carved lapis-and-gold giraffe chess piece slowly turns its long neck toward the camera, gold engravings glinting. Then it leaps two squares diagonally and several squares forward across the turquoise tiles, landing softly with a small puff of golden dust. Smooth, magical, realistic materials.
```

Варианты для других фигур:
- **Верблюд:** `a camel piece jumps in a long L-shape (3+1 squares), leaving faint golden hoofprints`
- **Осадная башня:** `a siege tower piece rolls forward two squares, wooden wheels creaking, jumping over the square in between`
- **Слон:** `the war elephant piece raises its trunk and steps diagonally two squares, the board trembles slightly`

### 9.3 Пешка становится королём (сюжет для рекламы)

```
A tiny pawn chess piece marches alone across a turquoise tiled board toward the last row. As it reaches the edge, a beam of gold light surrounds it, and it transforms into a king with a golden crown-turban. Camera orbits around it in slow motion. Epic, emotional, cinematic.
```

### 9.4 Король прячется в цитадели

```
A king chess piece in check slides into a small arched niche on the side of the board — a citadel. Gold ornamental doors glow and close gently behind him. Camera pushes in on the glowing arch. Calm, clever, satisfying.
```

### 9.5 Зацикленный фон меню (loop)

```
Seamless looping background video. Night over Samarkand domes and minarets in silhouette, deep lapis sky, stars twinkling slowly, a faint gold girih pattern gently pulsing. Very slow camera drift, calm, no people, no text. Perfect loop, 10 seconds.
```

### 9.6 Промо-ролик для соцсетей (вертикальный, 3 кадра)

Сгенерируйте три клипа по 5 сек и склейте:

1. **Хук:** `Vertical 9:16. An ordinary western chessboard shatters into pieces of glass, revealing beneath it a larger turquoise 11×10 Timurid board with giraffes and camels. Fast, dramatic.`
2. **Игра:** `Vertical 9:16. Top-down view of the turquoise board, pieces move in quick succession: knight, giraffe, siege tower, gold highlights show legal moves. Satisfying, snappy.`
3. **Финал:** `Vertical 9:16. A lapis king piece in the center, gold light rays, camera slowly pulls back. Empty space at the bottom for the title and a "Play free" button.`

Титры и кнопку добавьте при монтаже — генераторы видео пишут текст с ошибками.

---

## 10. Звук и музыка (Suno, ElevenLabs и т. п.) — бонус

- **Музыка меню:** `Calm Central Asian ambient music, dutar and ney flute, soft frame drum, slow tempo, meditative, royal, loopable, no vocals.`
- **Музыка победы:** `Short triumphant fanfare, 6 seconds, karnay horn and doira drum, Central Asian, majestic.`
- **Звук хода:** `Soft click of a carved stone chess piece placed on a ceramic tile, short, clean.`
- **Взятие фигуры:** `Two carved stone pieces knocking together, then a soft slide, short.`

---

## 11. Порядок работы (рекомендуемый)

1. Раздел 2.1 → выбрать «якорь стиля».
2. Раздел 4.1 → утвердить фигуры (самое важное для узнаваемости).
3. Раздел 3.1 → чистая доска сверху.
4. Разделы 5 и 6 → макеты экранов и иконка.
5. Раздел 7 → аватары.
6. Разделы 8 и 9 → маркетинг и видео из готовых кадров.
