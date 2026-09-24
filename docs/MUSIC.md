# Музыка и звук: план и промпты для Suno

Бренд: **Zurafa** (Шахматы Тамерлана). Эстетика — Тимуридская Средняя Азия: дутар, танбур, гиджак, най, дойра. Не арабский уд с дарбукой и не «турецкий базар» — это другой регион и другой звук.

## 1. Что именно генерировать

| № | Трек | Где играет | Длина после монтажа | Характер |
|---|---|---|---|---|
| 1 | **Menu / Registan Nights** | главный экран, настройки, «История» | 90–120 с луп | спокойный, чуть торжественный, есть мелодия |
| 2 | **Game / Long Game** | во время партии | 120–180 с луп | почти эмбиент, без запоминающейся мелодии |
| 3 | **Endgame / Tension** | опционально: мало материала, мат в 1–2, цейтнот | 60–90 с луп | тот же лад, добавлен пульс дойры |
| 4 | **Learn / Curiosity** | экран «Фигуры», обучение | 60–90 с луп | лёгкий, любопытный, светлый |
| 5 | **Victory** | экран победы | 5–8 с | короткая фанфара, карнай + дойра |
| 6 | **Defeat** | экран поражения | 5–8 с | тихий нисходящий най, без драмы |
| 7 | **Waiting** | ожидание соперника по ссылке | 30–60 с луп | почти тишина, редкие ноты |

Минимум для первой версии: **1, 2, 5, 6**. Треки 3, 4, 7 — когда будет время.

Ключевое правило для трека №2: игрок слышит его 20–40 минут подряд. Всё, что «цепляет» с первого раза, к десятой минуте раздражает. Нужен дрон, редкие ноты, дыхание — а не тема.

## 2. Правила, по которым это встраивается в код

**Музыка по умолчанию выключена.** На телефоне наша музыка глушит то, что человек уже слушает (Spotify, подкаст), а iOS не умеет это мягко смешивать в вебе. Поэтому: в шапке меню — маленькая кнопка «♪», одно нажатие включает, выбор запоминается в `prefs`. Так не будет злых отзывов в сторе и не сломается привычный сценарий «играю под свою музыку».

**Отдельный переключатель.** В `Prefs` сейчас один флаг `sound`. Нужен второй — `music`, и в настройках два пункта: «Звуки хода» и «Музыка». Их часто хотят по-разному.

**Луп без щелчка.** `<audio loop>` даёт паузу в стыке почти во всех браузерах. Правильно — загрузить в `AudioBufferSourceNode`, поставить `loop = true` и задать `loopStart` / `loopEnd` ровно по тактам. Это тот же `AudioContext`, что уже есть в [sound.ts](src/ui/sound.ts).

**Переходы.** Смена экрана — кроссфейд 800 мс, а не резкое переключение. Уход со вкладки (`visibilitychange`) — фейд в ноль за 300 мс и пауза.

**Дакинг.** На шахе и на мате приглушать музыку на −6 дБ на полторы секунды, чтобы звук события был слышен.

**Вес и загрузка.** Opus 64–80 кбит/с (плюс `.m4a` AAC для старых iOS). Каждый луп — до 500 КБ. Грузить лениво, после первого нажатия, и не класть в основной бандл. В PWA кэшировать отдельно, чтобы установка приложения не тянула мегабайты.

**Громкость.** Нормализовать: меню −16 LUFS, игровой луп −20 LUFS (он должен быть тише, это фон), пик не выше −3 dBTP.

## 3. Как работать с Suno

1. Включить тумблер **Instrumental**, в поле текста написать `[Instrumental]`.
2. Модель — **v4.5+ или v5**.
3. Style of Music — текст из раздела 4 ниже. Exclude Styles — оттуда же.
4. Сгенерировать 4–6 вариантов на каждый трек, выбрать по критерию «выдержу ли я это сорок минут», а не «красиво ли на первых пяти секундах».
5. Скачать WAV. Найти в редакторе (Audacity, Reaper) чистое место в стыке фразы, вырезать кусок ровно по тактам, склеить кроссфейдом 50–100 мс — получится бесшовный луп.
6. Если нужны слои для трека №3 — в Suno есть разделение на стемы: можно взять дойру отдельно и подмешивать её в коде.

---

## 4. Промпты

Формат: **Title** — заголовок, **Style** — в поле Style of Music, **Exclude** — в поле Exclude Styles. Лирика везде `[Instrumental]`.

### Трек 1 — Меню

**Title:** `Registan Nights`

**Style:**
```
Central Asian instrumental ambient, Timurid Samarkand court music. Solo dutar and tanbur with long sustained ney flute, distant bowed ghijak, soft frame drum doira played with brushes, gentle santur shimmer. Slow 60 BPM, minor maqam, spacious reverb like a tiled dome. Calm, noble, meditative, cinematic, loopable, no vocals.
```

**Exclude:**
```
vocals, singing, arabic oud, darbuka, bollywood, EDM, synth bass, drum kit, orchestral swells, guitar, piano, sound effects
```

### Трек 2 — Партия (главный, самый важный)

**Title:** `The Long Game`

**Style:**
```
Minimal ambient drone for deep concentration, Central Asian colour. A single quiet tanbur drone, very sparse plucked dutar notes with long silences between them, faint breathy ney, subtle tampura-like hum, distant room tone. Extremely slow, no percussion, no melody, no build-up, no chord progression. Static, hypnotic, background-only, barely there. Loopable, no vocals.
```

**Exclude:**
```
melody, hook, vocals, percussion, drums, doira, crescendo, build up, climax, orchestral, cinematic trailer, EDM, arpeggio, piano
```

Если получится слишком «пусто» — добавьте в Style: `occasional single santur note every 8 bars`.

### Трек 3 — Эндшпиль и цейтнот

**Title:** `Checkmate Approaching`

**Style:**
```
Tense minimal Central Asian instrumental. Low tanbur drone with a slow steady doira frame-drum pulse like a heartbeat, muted plucked dutar ostinato repeating, a single high ney note held long. 72 BPM, minor maqam, restrained, growing quiet pressure but never exploding. Loopable, no vocals.
```

**Exclude:**
```
vocals, orchestral hits, brass, EDM, trailer drums, cymbals, big climax, guitar
```

### Трек 4 — Обучение

**Title:** `Learning the Giraffe`

**Style:**
```
Light playful Central Asian instrumental. Plucked dutar and santur in a bright major-leaning maqam, soft hand percussion doira, small bells, curious and warm. Medium slow 80 BPM, gentle, encouraging, like a teacher in a courtyard. Loopable, no vocals.
```

**Exclude:**
```
vocals, dark, tense, EDM, synth, orchestral, guitar, drum kit
```

### Трек 5 — Победа

**Title:** `Victory Fanfare`

**Style:**
```
Short triumphant Central Asian fanfare, 8 seconds. Long karnay horns and surnay, answered by a loud doira frame drum roll and a bright santur flourish. Majestic, royal, celebratory, ends on a clean sustained chord. No vocals.
```

**Exclude:**
```
vocals, EDM, orchestral strings, electric guitar, western trumpet fanfare, applause
```

### Трек 6 — Поражение

**Title:** `The Fallen King`

**Style:**
```
Short sombre Central Asian ending, 8 seconds. A solo ney flute plays a slow descending phrase, a single low tanbur note fades under it, distant reverb. Quiet, dignified, melancholic, not dramatic. No vocals, no percussion.
```

**Exclude:**
```
vocals, percussion, drums, orchestral, strings, horror, dramatic, EDM
```

### Трек 7 — Ожидание соперника

**Title:** `Waiting at the Gate`

**Style:**
```
Almost silent ambient loop, Central Asian. Faint tanbur drone, a single dutar note every few seconds, soft wind and distant courtyard room tone. No rhythm, no melody, extremely quiet and patient. Loopable, no vocals.
```

**Exclude:**
```
vocals, percussion, melody, build up, EDM, orchestral
```

---

## 5. Куда класть файлы

```
public/audio/menu.opus      menu.m4a
public/audio/game.opus      game.m4a
public/audio/tension.opus   tension.m4a
public/audio/learn.opus     learn.m4a
public/audio/win.opus       win.m4a
public/audio/lose.opus      lose.m4a
public/audio/wait.opus      wait.m4a
```

Когда пришлёте WAV — я конвертирую, выровняю громкость, нарежу лупы и подключу к коду: новый `music.ts`, флаг `music` в `prefs`, кнопка в меню, кроссфейды и дакинг.
