// Long-form pages. Facts follow Murray (1913), Forbes (1860), Falkener (1892), Bodlaender and Cazaux.

import type { Lang } from './index';

const RULES: Record<'ru' | 'en', string> = {
  ru: `
<h1>Правила</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>Доска 11×10 с двумя цитаделями: справа от второй горизонтали белых и слева от второй горизонтали синих</figcaption></figure>
<p class="lead">Коротко: цель — заматовать последнего короля соперника. Фигуры ходят иначе, чем в обычных шахматах, пешки превращаются только в «свою» фигуру, пат — это поражение, а король, добежавший до чужой цитадели, спасает ничью.</p>

<h2>Доска и цитадели</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>Король укрылся в цитадели — партия окончена вничью</figcaption></figure>
<p>Доска — 11 вертикалей на 10 горизонталей, 110 клеток. В рукописях она одноцветная; шахматная раскраска здесь только для удобства (её можно отключить в меню). К доске примыкают две дополнительные клетки — <b>цитадели</b> (хисн): одна справа от второй горизонтали белых, другая — справа от второй горизонтали синих, то есть у каждого по правую руку.</p>
<ul>
<li>В <b>цитадель соперника</b> может войти только король — старший из имеющихся (шах, затем принц, затем рукотворный король). Партия тут же заканчивается <b>вничью</b>. Это спасение для проигрывающего.</li>
<li>В <b>свою цитадель</b> может войти только рукотворный король. Там он неуязвим и заодно запирает цитадель от вражеского короля.</li>
<li>Никакая другая фигура в цитадель войти не может.</li>
</ul>

<h2>Фигуры</h2>
<p>У каждой стороны 28 фигур: король, генерал, визирь, по две ладьи, коня, дозорных, жирафа, слона, верблюда и осадных башни, и 11 пешек. Как ходит каждая — смотрите в разделе «Фигуры»; в партии достаточно нажать на любую фигуру.</p>
<ul>
<li><b>Дозорный</b> ходит как современный слон, но минимум на две клетки и не прыгает.</li>
<li><b>Жираф</b>: одна клетка по диагонали, затем не меньше трёх по прямой. Любая фигура на пути его останавливает. В начальной позиции оба жирафа заперты.</li>
<li><b>Слон, осадная башня и верблюд</b> прыгают через фигуры: на (2,2), (2,0) и (1,3).</li>
<li>Рокировки, двойного хода пешки и взятия на проходе нет.</li>
</ul>

<h2>Пешки</h2>
<p>Каждая пешка принадлежит своей фигуре и, дойдя до последней горизонтали, превращается <b>только в неё</b>: пешка ладьи — в ладью, пешка жирафа — в жирафа. Две пешки особенные.</p>
<ul>
<li><b>Пешка короля</b> становится <b>принцем</b> — вторым королём.</li>
<li><b>Пешка пешек</b> проходит три пути. <i>Первый раз</i> дойдя до конца, она остаётся там, и взять её нельзя. Позже владелец может отдельным ходом перенести её на любую клетку, откуда она как пешка нападает сразу на две фигуры соперника или на фигуру, которой некуда пойти; стоявшая там фигура любого цвета (кроме короля) снимается с доски. <i>Второй раз</i> дойдя до конца, она переносится на исходную клетку пешки короля. <i>В третий раз</i> она становится <b>рукотворным королём</b> (шах маснуа).</li>
</ul>

<h2>Несколько королей</h2>
<p>Пока у стороны больше одного короля, шаха и мата для неё не существует: любого из королей можно взять как обычную фигуру, и можно спокойно ходить под бой. Когда остаётся последний — его нужно матовать по всем правилам.</p>

<h2>Обмен короля</h2>
<p>Один раз за партию шах, оказавшись под шахом (а по Мюррею — и в пате), может поменяться местами с любой своей фигурой, если после обмена он не окажется под боем. В игре для этого появляется кнопка «Обмен короля».</p>

<h2>Чем заканчивается партия</h2>
<ul>
<li><b>Мат</b> последнему королю — победа.</li>
<li><b>Пат — тоже победа</b> того, кто запатовал: сторона, которой нечем ходить, проигрывает.</li>
<li><b>Король в цитадели соперника</b> — ничья.</li>
<li>Остаться с одним королём — не поражение: у него ещё есть шанс добежать до цитадели.</li>
<li>Троекратное повторение и правило 50 ходов — современное дополнение, чтобы партии заканчивались; его можно отключить.</li>
</ul>

<h2>О спорных местах</h2>
<p>Рукописи противоречат друг другу, а единственный подробный источник неполон. По умолчанию здесь принято прочтение Г. Мюррея («История шахмат», 1913) с уточнениями Ганса Бодлендера и Жана-Луи Казо. Прочтение Форбса для дозорного, условия обмена, правило «голого короля» и другие варианты включаются при создании партии. Там, где источники молчат, правило додумано и помечено: например, если исходная клетка пешки короля занята королём, пешка пешек встаёт на ближайшую свободную клетку той же горизонтали.</p>`,

  en: `
<h1>Rules</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>The 11×10 board with its two citadels: right of White's second rank, left of Blue's</figcaption></figure>
<p class="lead">In short: mate the opponent's last king. The pieces move differently from modern chess, pawns promote only to their own piece, stalemate is a loss, and a king that reaches the enemy citadel saves a draw.</p>

<h2>Board and citadels</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>A king in the citadel: the game is drawn</figcaption></figure>
<p>The board has 11 files and 10 ranks, 110 squares. In the manuscripts it is unchequered; the chequering here is only a convenience and can be switched off in the menu. Two extra squares, the <b>citadels</b> (hisn), adjoin the board: one to the right of White's second rank, the other to the right of Blue's second rank, so each lies on its owner's right hand.</p>
<ul>
<li>Only a king may enter the <b>opponent's citadel</b>, and only the senior one present (shah, then prince, then adventitious king). The game is <b>drawn</b> at once. This is the losing side's escape.</li>
<li>Only the adventitious king may enter <b>his own citadel</b>. He is immune there, and he blocks it against the enemy king.</li>
<li>No other piece may ever enter a citadel.</li>
</ul>

<h2>Pieces</h2>
<p>Each side has 28 men: a king, a general, a vizier, two each of rooks, knights, pickets, giraffes, elephants, camels and war engines, and 11 pawns. The Pieces section shows every move; during a game just tap any piece.</p>
<ul>
<li>The <b>picket</b> moves like the modern bishop, but at least two squares, and it does not jump.</li>
<li>The <b>giraffe</b> goes one square diagonally and then at least three straight on. Anything in its path stops it. Both giraffes are shut in at the start.</li>
<li>The <b>elephant, war engine and camel</b> jump: (2,2), (2,0) and (1,3).</li>
<li>No castling, no pawn double step, no en passant.</li>
</ul>

<h2>Pawns</h2>
<p>Every pawn belongs to a piece and, on reaching the last rank, becomes <b>that piece only</b>: the rook's pawn a rook, the giraffe's pawn a giraffe. Two pawns are special.</p>
<ul>
<li>The <b>king's pawn</b> becomes a <b>prince</b>, a second king.</li>
<li>The <b>pawn of pawns</b> makes three journeys. On its <i>first arrival</i> it stays where it is and cannot be captured. Later its owner may spend a move to lift it to any square from which, as a pawn, it attacks two enemy pieces at once, or one piece that has no move; whatever stood on that square, of either colour (kings excepted), is removed. On its <i>second arrival</i> it is placed on the king's pawn's original square. On its <i>third</i> it becomes the <b>adventitious king</b> (shah masnu'a).</li>
</ul>

<h2>Several kings</h2>
<p>While a side has more than one king, check and mate do not exist for it: any of its kings may be captured like an ordinary piece, and it may freely move into attack. When only one remains, he must be mated in the usual way.</p>

<h2>The king's swap</h2>
<p>Once per game a shah who is in check (and, following Murray, one who is stalemated) may change places with any of his own men, provided he is not attacked afterwards. A "King swap" button appears when this is possible.</p>

<h2>How the game ends</h2>
<ul>
<li><b>Checkmate</b> of the last king wins.</li>
<li><b>Stalemate also wins</b> for the side that delivers it: the player with no move loses.</li>
<li>A <b>king in the opponent's citadel</b> draws.</li>
<li>A bare king has not lost: he may still reach the citadel.</li>
<li>Threefold repetition and the 50-move rule are a modern addition so that games end; they can be switched off.</li>
</ul>

<h2>On disputed points</h2>
<p>The manuscripts contradict one another and the one detailed source is incomplete. The default here follows H.J.R. Murray (<i>A History of Chess</i>, 1913), with clarifications from Hans Bodlaender and Jean-Louis Cazaux. Forbes' picket, the conditions for the swap, a bare-king rule and other readings can be chosen when you set up a game. Where every source is silent a rule has been supplied and is flagged as such: for instance, if the king's pawn square is occupied by a king, the pawn of pawns lands on the nearest free square of that rank.</p>`,
};

const HISTORY: Record<'ru' | 'en', string> = {
  ru: `
<h1>История</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>Тимур играет в великие шахматы в садовом павильоне. Персидская миниатюра — современная стилизация</figcaption></figure>
<p class="lead">«Тимур был предан шахматам, ибо оттачивал ими свой ум; но дух его был слишком высок для малых шахмат, и потому он играл лишь в великие — на доске десять клеток на одиннадцать, с двумя верблюдами, двумя жирафами, двумя дозорными, двумя осадными машинами, визирем и прочим… Малые шахматы — ничто в сравнении с ними».<br><span class="cite">— Ибн Арабшах, «Чудеса предопределения в превратностях Тимура», XV век (в пересказе Г. Мюррея)</span></p>

<h2>Игра старше своего имени</h2>
<p>Тимур (1336–1405), правитель Самарканда, дал игре своё имя, но едва ли придумал её: самое раннее упоминание — в энциклопедии аль-Амули «Нафаис аль-фунун», около 1350 года, когда Тимур был ещё юношей. Арабские источники называют её <i>шатрандж аль-кабир</i> — «великие шахматы», персидская рукопись — <i>шатрандж камиль</i>, «совершенные шахматы». Её автор уверяет, что игру изобрёл мудрец Гермес, в Индию её принёс Александр Македонский, а обычные шахматы — лишь её сокращение.</p>

<h2>Шахрух</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>Два гонца приходят к доске: сын и город получают имя хода</figcaption></figure>
<p>Ибн Арабшах рассказывает: Тимур как раз объявил <i>шах-рух</i> — вилку на короля и ладью, — когда вошли два гонца. Один принёс весть о рождении сына, другой — о завершении города на Сырдарье. Обоих Тимур назвал в честь хода: сына — Шахрух, город — Шахрухия. Шахрух родился в 1377 году и унаследовал империю. Мюррей, впрочем, сомневался насчёт города, а византиец Дука пересказывает ту же историю с пленным султаном Баязидом — что невозможно по датам.</p>

<h2>Али Шатранджи</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>Игра вслепую против нескольких соперников</figcaption></figure>
<p>При дворе играл Ала ад-Дин Тебризи, законовед по прозвищу Али Шатранджи — «Али-шахматист». Он играл вслепую с несколькими противниками сразу и, по легенде, перестал проигрывать после сна, в котором получил мешок шахматных фигур. Тимур сказал ему: «В царстве шахмат у тебя нет соперника, как у меня — в делах правления». Возможно, именно он — автор единственной рукописи с подробными правилами. Автор хвалится, что изобрёл для великих шахмат «разные позиции и несколько дебютов», — но эта часть рукописи утрачена. Ни одного дебюта до нас не дошло.</p>

<h2>Какими были фигуры</h2>
<p>Настоящих комплектов не сохранилось: в рукописях на диаграммах стоят только написанные названия. Но описания есть. Даббаба — «как шестигранная чернильница с шишечкой наверху»; это колёсный осадный навес, под прикрытием которого подходили к стенам (в современном арабском слово значит «танк»). Дозорный, <i>талиа</i> — разведчик, авангард — «как слон, но с двумя лицами». Жираф, по-персидски <i>шутур-гав-паланг</i>, «верблюд-корова-леопард», — «как конь, но с двумя лицами». Верблюд — «с головой, шеей и горбом, но без ног». Каждая пешка была миниатюрой своей фигуры — так сделано и здесь.</p>

<h2>Персидская система</h2>
<p>Фигуры образуют стройную таблицу — три рода по три ступени. Прямые: визирь, осадная башня, ладья. Косые: генерал, слон, дозорный. Смешанные: конь, верблюд, жираф. Младшие шагают на клетку, средние прыгают через одну, старшие скользят далеко — и «никогда не перепрыгивают, в отличие от средних».</p>

<h2>Как правила дошли до нас</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>Переписчик за рукописью с диаграммой доски</figcaption></figure>
<p>Томас Хайд описал игру в 1694 году, Натаниэль Бланд нашёл персидскую рукопись Королевского азиатского общества в 1850-м, Дункан Форбс перевёл её в 1860-м, Эдвард Фалкенер сыграл по ней первые современные партии в 1892-м, а Гарольд Мюррей в 1913-м перечитал рукописи заново и исправил Форбса. «Нет двух одинаковых диаграмм», — жаловался Форбс; поэтому в этой игре спорные правила можно выбирать.</p>
<p>Сам Ибн Арабшах, впрочем, предупреждал: «Её правила лучше всего постигаются игрой; описание мало что даст».</p>`,

  en: `
<h1>History</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>Timur at the great chess in a garden pavilion. A modern piece in the Persian miniature manner</figcaption></figure>
<p class="lead">"Timur was devoted to the game of chess because he whetted his intellect by it, but his mind was too exalted to play at the small chess, and therefore he only played at the great chess, of which the board is 10 squares by 11, and there are 2 camels, 2 giraffes, 2 pickets, 2 war engines, a vizier, etc. The small chess is a mere nothing in comparison."<br><span class="cite">— Ibn Arabshah, 15th century, as translated by H.J.R. Murray</span></p>

<h2>Older than its name</h2>
<p>Timur (1336–1405), lord of Samarkand, lent the game his name but hardly invented it: the earliest mention is in al-Amuli's encyclopaedia <i>Nafa'is al-funun</i>, about 1350, when Timur was a boy. Arabic sources call it <i>shatranj al-kabir</i>, "the great chess"; the Persian manuscript calls it <i>shatranj kamil</i>, "perfect chess". Its author claims that the sage Hermes invented it, that Alexander carried it to India, and that ordinary chess is merely its abridgement.</p>

<h2>Shah Rukh</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>Two messengers reach the board: a son and a city are named after a move</figcaption></figure>
<p>Ibn Arabshah tells that Timur had just given <i>shah-rukh</i>, a fork of king and rook, when two messengers arrived: one announcing the birth of a son, the other the completion of a city on the Jaxartes. He named both after the move: the son Shah Rukh, the city Shahrukhiya. Shah Rukh was born in 1377 and inherited the empire. Murray doubted the part about the city, and the Byzantine historian Ducas tells the same story with the captive Sultan Bayezid in it, which the dates make impossible.</p>

<h2>Ali the chess player</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>Playing blindfold against several opponents at once</figcaption></figure>
<p>At court played Ala al-Din of Tabriz, a lawyer known as Ali Shatranji. He played blindfold against several opponents at once and, the legend says, stopped losing after a dream in which he was handed a bag of chessmen. Timur told him: "You have no rival in the kingdom of chess, just as I have none in government." He may be the author of the one manuscript that gives detailed rules. That author boasts of having invented "sundry positions, as well as several openings" for the great chess, but that part of the manuscript is lost. Not one opening has come down to us.</p>

<h2>What the pieces looked like</h2>
<p>No sets survive, and the manuscript diagrams show only written names. But there are descriptions. The dabbaba is "like a six-sided inkstand with a knob on the top"; it was a wheeled siege shed under whose cover men approached a wall (in modern Arabic the word means "tank"). The picket, <i>tali'a</i>, a scout or vanguard, is "like the elephant, but with two faces". The giraffe, in Persian <i>shutur-gaw-palang</i>, "camel-cow-leopard", is "like the horse, but with two faces". The camel has "head, neck, and hump, but no feet". Every pawn was a miniature of its piece, as it is here.</p>

<h2>The Persian system</h2>
<p>The pieces form a neat table: three kinds in three grades. Straight: vizier, war engine, rook. Oblique: general, elephant, picket. Mixed: knight, camel, giraffe. The lowest grade steps one square, the middle grade jumps to the second, the highest slides far, and "was never allowed to leap over another piece like the medials".</p>

<h2>How the rules reached us</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>A scribe copying a manuscript with a board diagram</figcaption></figure>
<p>Thomas Hyde described the game in 1694; Nathaniel Bland found the Royal Asiatic Society's Persian manuscript in 1850; Duncan Forbes translated it in 1860; Edward Falkener played the first modern games from it in 1892; and in 1913 Harold Murray read the manuscripts afresh and corrected Forbes. "No two diagrams are precisely alike," Forbes complained, which is why this game lets you choose among the disputed rules.</p>
<p>Ibn Arabshah himself gave fair warning: "Its rules are best learnt by practice; a description would not have much value."</p>`,
};


const RULES_MORE: Record<'uz' | 'tr' | 'zh' | 'hi', string> = {
  uz: `
<h1>Qoidalar</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>Ikki qal’ali 11×10 taxta: oqlarning ikkinchi qatori o‘ngida va ko‘klarning ikkinchi qatori chapida</figcaption></figure>
<p class="lead">Qisqacha: maqsad — raqibning oxirgi shohini mot qilish. Donalar oddiy shaxmatdan boshqacha yuradi, piyodalar faqat «o‘z» donasiga aylanadi, pat — mag‘lubiyat, raqib qal’asiga yetib kelgan shoh esa durangni saqlab qoladi.</p>
<h2>Taxta va qal’alar</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>Shoh qal’aga yashirindi — o‘yin durang bilan tugadi</figcaption></figure>
<p>Taxta — 11 vertikal, 10 gorizontal, 110 katak. Qo‘lyozmalarda u bir rangli; katakli bo‘yoq faqat qulaylik uchun (menyuda o‘chirish mumkin). Taxtaga ikki qo‘shimcha katak — <b>qal’alar</b> (hisn) tutashadi: biri oqlarning ikkinchi qatori o‘ngida, ikkinchisi ko‘klarning ikkinchi qatori o‘ngida — har kimning o‘ng qo‘lida.</p>
<ul><li><b>Raqib qal’asiga</b> faqat shoh kira oladi — mavjudlarning eng kattasi (shoh, keyin shahzoda, keyin sun’iy shoh). O‘yin darhol <b>durang</b> bilan tugaydi. Bu yutqazayotgan tomon uchun najot.</li>
<li><b>O‘z qal’asiga</b> faqat sun’iy shoh kira oladi. U yerda u daxlsiz va qal’ani dushman shohidan yopib qo‘yadi.</li>
<li>Boshqa hech bir dona qal’aga kira olmaydi.</li></ul>
<h2>Donalar</h2>
<p>Har tomonda 28 dona: shoh, general, vazir, ikkitadan rux, ot, qorovul, jirafa, fil, tuya va qamal minorasi hamda 11 piyoda. Har biri qanday yurishini «Donalar» bo‘limida ko‘ring; o‘yinda istalgan donaga bosish kifoya.</p>
<ul><li><b>Qorovul</b> zamonaviy fil kabi yuradi, lekin kamida ikki katak va sakramaydi.</li>
<li><b>Jirafa</b>: diagonal bo‘ylab bir katak, keyin to‘g‘ri chiziq bo‘ylab kamida uch katak. Yo‘ldagi har qanday dona uni to‘xtatadi. Boshlang‘ich holatda ikkala jirafa qamalgan.</li>
<li><b>Fil, qamal minorasi va tuya</b> donalar ustidan sakraydi: (2,2), (2,0) va (1,3).</li>
<li>Rokirovka, piyodaning qo‘sh yurishi va o‘tishda olish yo‘q.</li></ul>
<h2>Piyodalar</h2>
<p>Har bir piyoda o‘z donasiga tegishli va oxirgi qatorga yetib, <b>faqat unga</b> aylanadi: rux piyodasi — ruxga, jirafa piyodasi — jirafaga. Ikki piyoda alohida.</p>
<ul><li><b>Shoh piyodasi</b> <b>shahzoda</b> — ikkinchi shohga aylanadi.</li>
<li><b>Piyodalar piyodasi</b> uch yo‘l bosib o‘tadi. <i>Birinchi marta</i> oxiriga yetib, u yerda qoladi va uni olib bo‘lmaydi. Keyinroq egasi alohida yurish bilan uni piyoda sifatida raqibning ikki donasiga birdan yoki yuradigan joyi yo‘q donaga hujum qiladigan istalgan katakka ko‘chirishi mumkin; u yerda turgan istalgan rangdagi dona (shohdan tashqari) taxtadan olinadi. <i>Ikkinchi marta</i> oxiriga yetib, shoh piyodasining boshlang‘ich katagiga ko‘chiriladi. <i>Uchinchi marta</i> <b>sun’iy shoh</b>ga (shoh masnu‘a) aylanadi.</li></ul>
<h2>Bir necha shoh</h2>
<p>Tomonda bittadan ortiq shoh bor ekan, unga kisht va mot mavjud emas: istalgan shohni oddiy dona kabi olish mumkin, zarba ostiga bemalol yurish mumkin. Oxirgisi qolganda — uni barcha qoidalar bo‘yicha mot qilish kerak.</p>
<h2>Shoh almashinuvi</h2>
<p>O‘yinda bir marta shoh kisht ostida (Myurrey bo‘yicha — patda ham) istalgan o‘z donasi bilan o‘rin almasha oladi, agar almashinuvdan keyin zarba ostida qolmasa. O‘yinda buning uchun «Shoh almashinuvi» tugmasi paydo bo‘ladi.</p>
<h2>O‘yin qanday tugaydi</h2>
<ul><li>Oxirgi shohga <b>mot</b> — g‘alaba.</li><li><b>Pat — ham g‘alaba</b>, pat qilgan tomon uchun: yurishi yo‘q tomon yutqazadi.</li><li><b>Raqib qal’asidagi shoh</b> — durang.</li><li>Yolg‘iz shoh bilan qolish — mag‘lubiyat emas: uning qal’aga yetib borish imkoni bor.</li><li>Uch marta takrorlanish va 50 yurish qoidasi — o‘yinlar tugashi uchun zamonaviy qo‘shimcha; uni o‘chirish mumkin.</li></ul>
<h2>Bahsli joylar haqida</h2>
<p>Qo‘lyozmalar bir-biriga zid, yagona batafsil manba esa to‘liq emas. Bu yerda odatiy holda G. Myurreyning talqini («Shaxmat tarixi», 1913) Hans Bodlender va Jan-Lui Kazo aniqliklari bilan qabul qilingan. Qorovul uchun Forbs talqini, almashinuv shartlari, «yalang‘och shoh» qoidasi va boshqa variantlar o‘yin yaratishda yoqiladi. Manbalar jim turgan joylarda qoida o‘ylab topilgan va belgilangan.</p>`,
  tr: `
<h1>Kurallar</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>İki kaleli 11×10 tahta: beyazların ikinci sırasının sağında, mavilerin ikinci sırasının solunda</figcaption></figure>
<p class="lead">Kısaca: amaç rakibin son şahını mat etmek. Taşlar modern satrançtan farklı gider, piyonlar yalnız «kendi» taşına dönüşür, pat yenilgidir ve rakibin kalesine ulaşan şah berabereyi kurtarır.</p>
<h2>Tahta ve kaleler</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>Şah kaleye sığındı — oyun berabere bitti</figcaption></figure>
<p>Tahta 11 sütun, 10 sıra, 110 kare. El yazmalarında tek renklidir; kareli boyama yalnız kolaylık içindir (menüden kapatılabilir). Tahtaya iki ek kare — <b>kaleler</b> (hısn) — bitişiktir: biri beyazların ikinci sırasının sağında, diğeri mavilerin ikinci sırasının sağında; yani herkesin sağ elinde.</p>
<ul><li><b>Rakibin kalesine</b> yalnız şah girebilir — mevcutların en kıdemlisi (şah, sonra şehzade, sonra yapay şah). Oyun hemen <b>berabere</b> biter. Kaybeden tarafın kurtuluşudur.</li>
<li><b>Kendi kalesine</b> yalnız yapay şah girebilir. Orada dokunulmazdır ve kaleyi düşman şahına kapatır.</li>
<li>Başka hiçbir taş kaleye giremez.</li></ul>
<h2>Taşlar</h2>
<p>Her tarafta 28 taş: şah, general, vezir, ikişer kale, at, gözcü, zürafa, fil, deve ve kuşatma kulesi, ayrıca 11 piyon. Her birinin gidişi «Taşlar» bölümünde; oyunda bir taşa dokunmak yeter.</p>
<ul><li><b>Gözcü</b> modern fil gibi gider ama en az iki kare ve sıçramaz.</li>
<li><b>Zürafa</b>: çapraz bir kare, sonra düz en az üç kare. Yoldaki her taş onu durdurur. Başlangıçta iki zürafa da kapalıdır.</li>
<li><b>Fil, kuşatma kulesi ve deve</b> taşların üzerinden sıçrar: (2,2), (2,0) ve (1,3).</li>
<li>Rok, piyonun çift adımı ve geçerken alma yoktur.</li></ul>
<h2>Piyonlar</h2>
<p>Her piyon bir taşa aittir ve son sıraya ulaşınca <b>yalnız ona</b> dönüşür: kalenin piyonu kaleye, zürafanın piyonu zürafaya. İki piyon özeldir.</p>
<ul><li><b>Şahın piyonu</b> <b>şehzade</b> — ikinci şah — olur.</li>
<li><b>Piyonların piyonu</b> üç yolculuk yapar. <i>İlk</i> ulaşışında olduğu yerde kalır ve alınamaz. Sonra sahibi ayrı bir hamleyle onu, piyon olarak rakibin iki taşına birden ya da hamlesi olmayan bir taşa saldıracağı herhangi bir kareye taşıyabilir; oradaki taş (şah hariç, her renkten) kaldırılır. <i>İkinci</i> ulaşışında şah piyonunun başlangıç karesine taşınır. <i>Üçüncüde</i> <b>yapay şah</b> (şah-ı masnu) olur.</li></ul>
<h2>Birden fazla şah</h2>
<p>Bir tarafta birden fazla şah varken şah ve mat yoktur: herhangi bir şah sıradan taş gibi alınabilir ve tehdit altına rahatça girilebilir. Sonuncu kalınca tüm kurallarla mat edilmesi gerekir.</p>
<h2>Şah takası</h2>
<p>Oyunda bir kez, şah altındaki (Murray’e göre pattaki de) şah, takas sonrası tehdit altında kalmamak koşuluyla herhangi bir kendi taşıyla yer değiştirebilir. Oyunda bunun için «Şah takası» düğmesi belirir.</p>
<h2>Oyun nasıl biter</h2>
<ul><li>Son şaha <b>mat</b> — galibiyet.</li><li><b>Pat da galibiyettir</b>, pat edenin: hamlesi olmayan taraf kaybeder.</li><li><b>Rakibin kalesindeki şah</b> — berabere.</li><li>Tek şahla kalmak yenilgi değildir: kaleye ulaşma şansı vardır.</li><li>Üç kez tekrar ve 50 hamle kuralı oyunların bitmesi için modern eklemedir; kapatılabilir.</li></ul>
<h2>Tartışmalı noktalar</h2>
<p>El yazmaları birbiriyle çelişir, tek ayrıntılı kaynak eksiktir. Varsayılan olarak H. Murray’in okuması (<i>A History of Chess</i>, 1913) Hans Bodlaender ve Jean-Louis Cazaux’nun düzeltmeleriyle benimsendi. Gözcü için Forbes’un okuması, takas koşulları, «çıplak şah» kuralı ve diğer seçenekler oyun kurulurken açılır. Kaynakların sustuğu yerlerde kural tamamlanmış ve işaretlenmiştir.</p>`,
  zh: `
<h1>规则</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>带两座堡垒的 11×10 棋盘：白方第二横线的右侧和蓝方第二横线的左侧</figcaption></figure>
<p class="lead">简而言之：目标是将死对方最后一位国王。棋子走法与普通象棋不同，兵只能升变为“自己”的棋子，逼和算负，而跑进对方堡垒的国王可以保住和棋。</p>
<h2>棋盘与堡垒</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>国王躲进堡垒——对局以和棋结束</figcaption></figure>
<p>棋盘为 11 列 × 10 行，共 110 格。手稿中它是单色的；黑白相间只是为了方便（可在菜单关闭）。棋盘旁附有两格额外格子——<b>堡垒</b>（hisn）：一格在白方第二横线右侧，一格在蓝方第二横线右侧，即各在己方右手边。</p>
<ul><li>只有国王——现存最高级的那位（沙赫，其次王子，其次人造王）——可以进入<b>对方堡垒</b>。对局立即<b>和棋</b>。这是劣势方的救命稻草。</li>
<li>只有人造王可以进入<b>己方堡垒</b>。在那里它不可被吃，并把堡垒对敌方国王封锁。</li>
<li>其他任何棋子都不能进入堡垒。</li></ul>
<h2>棋子</h2>
<p>每方 28 枚：国王、将军、维齐尔，各两枚战车、骑士、哨兵、长颈鹿、大象、骆驼、攻城塔，以及 11 枚兵。各棋子走法见“棋子”栏目；对局中点击任意棋子即可。</p>
<ul><li><b>哨兵</b>像现代的象，但至少走两格且不能跳。</li>
<li><b>长颈鹿</b>：先斜走一格，再直走至少三格。路上任何棋子都会挡住它。开局时两只长颈鹿都被困住。</li>
<li><b>大象、攻城塔和骆驼</b>可以越子：(2,2)、(2,0) 和 (1,3)。</li>
<li>没有王车易位、兵的双步和吃过路兵。</li></ul>
<h2>兵</h2>
<p>每枚兵属于一枚棋子，到达底线后<b>只能升变为它</b>：战车兵变战车，长颈鹿兵变长颈鹿。有两枚兵是特殊的。</p>
<ul><li><b>王兵</b>升变为<b>王子</b>——第二位国王。</li>
<li><b>兵中之兵</b>要走三程。<i>第一次</i>到达底线后留在原地，不可被吃。之后其主人可用一步棋把它移到任意一格，从那里它作为兵同时攻击对方两枚棋子，或攻击一枚无路可走的棋子；原本在那格上的任何棋子（国王除外）被移出棋盘。<i>第二次</i>到达底线后，被移到王兵的起始格。<i>第三次</i>则成为<b>人造王</b>（沙赫·马斯努阿）。</li></ul>
<h2>多位国王</h2>
<p>当一方有不止一位国王时，对它不存在将军与将死：任何国王都可像普通棋子一样被吃，也可以放心走入攻击范围。只剩最后一位时，才需按全部规则将死。</p>
<h2>国王换位</h2>
<p>每局一次，被将军的国王（按默里的说法，被逼和时也可）可与己方任意棋子交换位置，前提是换位后不处于攻击之下。对局中会出现“国王换位”按钮。</p>
<h2>对局如何结束</h2>
<ul><li><b>将死</b>最后一位国王——获胜。</li><li><b>逼和也是胜利</b>，属于逼和的一方：无子可动的一方判负。</li><li><b>国王进入对方堡垒</b>——和棋。</li><li>只剩一位国王不算输：它还有机会跑到堡垒。</li><li>三次重复与 50 回合规则是为了让对局结束的现代补充，可以关闭。</li></ul>
<h2>关于争议之处</h2>
<p>各手稿互相矛盾，唯一详尽的资料也不完整。这里默认采用默里（《象棋史》，1913）的解读，并参考汉斯·博德伦德和让-路易·卡佐的补正。哨兵的福布斯解读、换位条件、“光王”规则等可在创建对局时启用。资料沉默之处的规则为补拟，并已标注。</p>`,
  hi: `
<h1>नियम</h1>
<figure class="pf"><img src="./img/r-board.jpg" alt="" loading="lazy"><figcaption>दो गढ़ों वाली 11×10 बिसात: सफ़ेद की दूसरी पंक्ति के दाएँ और नीले की दूसरी पंक्ति के बाएँ</figcaption></figure>
<p class="lead">संक्षेप में: लक्ष्य प्रतिद्वंद्वी के अंतिम राजा को मात देना है। मोहरे साधारण शतरंज से अलग चलते हैं, प्यादे केवल «अपने» मोहरे में बदलते हैं, गतिरोध हार है, और पराए गढ़ तक पहुँचा राजा ड्रॉ बचा लेता है।</p>
<h2>बिसात और गढ़</h2>
<figure class="pf"><img src="./img/h-citadel.jpg" alt="" loading="lazy"><figcaption>राजा ने गढ़ में शरण ली — खेल ड्रॉ पर समाप्त</figcaption></figure>
<p>बिसात — 11 खड़ी और 10 आड़ी पंक्तियाँ, 110 घर। पांडुलिपियों में यह एकरंगी है; चौकोर रंग केवल सुविधा के लिए हैं (मेनू में बंद किए जा सकते हैं)। बिसात से दो अतिरिक्त घर — <b>गढ़</b> (हिस्न) — जुड़े हैं: एक सफ़ेद की दूसरी पंक्ति के दाएँ, दूसरा नीले की दूसरी पंक्ति के दाएँ, यानी हर एक के दाहिने हाथ।</p>
<ul><li><b>प्रतिद्वंद्वी के गढ़</b> में केवल राजा जा सकता है — उपलब्ध में सबसे वरिष्ठ (शाह, फिर राजकुमार, फिर कृत्रिम राजा)। खेल तुरंत <b>ड्रॉ</b> हो जाता है। यह हारने वाले पक्ष का बचाव है।</li>
<li><b>अपने गढ़</b> में केवल कृत्रिम राजा जा सकता है। वहाँ वह अभेद्य है और गढ़ को शत्रु राजा से बंद कर देता है।</li>
<li>कोई अन्य मोहरा गढ़ में प्रवेश नहीं कर सकता।</li></ul>
<h2>मोहरे</h2>
<p>हर पक्ष के पास 28 मोहरे: राजा, सेनापति, वज़ीर, दो-दो रुख़, घोड़े, चौकीदार, जिराफ़, हाथी, ऊँट और घेराबंदी मीनारें, और 11 प्यादे। हर एक कैसे चलता है — «मोहरे» खंड देखें; खेल में किसी मोहरे पर टैप करना काफ़ी है।</p>
<ul><li><b>चौकीदार</b> आधुनिक बिशप की तरह चलता है, पर कम से कम दो घर और फाँदता नहीं।</li>
<li><b>जिराफ़</b>: तिरछे एक घर, फिर सीधे कम से कम तीन घर। रास्ते का कोई भी मोहरा उसे रोक देता है। प्रारंभिक स्थिति में दोनों जिराफ़ बंद हैं।</li>
<li><b>हाथी, घेराबंदी मीनार और ऊँट</b> मोहरों को फाँदते हैं: (2,2), (2,0) और (1,3)।</li>
<li>कैसलिंग, प्यादे की दोहरी चाल और एन पासां नहीं हैं।</li></ul>
<h2>प्यादे</h2>
<p>हर प्यादा अपने मोहरे का है और अंतिम पंक्ति पहुँचकर <b>केवल उसी</b> में बदलता है: रुख़ का प्यादा — रुख़ में, जिराफ़ का प्यादा — जिराफ़ में। दो प्यादे विशेष हैं।</p>
<ul><li><b>राजा का प्यादा</b> <b>राजकुमार</b> — दूसरा राजा — बनता है।</li>
<li><b>प्यादों का प्यादा</b> तीन यात्राएँ करता है। <i>पहली बार</i> अंत तक पहुँचकर वहीं रहता है और पकड़ा नहीं जा सकता। बाद में स्वामी एक अलग चाल से उसे किसी भी ऐसे घर पर रख सकता है जहाँ से वह प्यादे की तरह प्रतिद्वंद्वी के दो मोहरों पर, या ऐसे मोहरे पर जिसके पास चाल नहीं, हमला करे; उस घर का किसी भी रंग का मोहरा (राजा को छोड़कर) हटा दिया जाता है। <i>दूसरी बार</i> अंत तक पहुँचकर वह राजा के प्यादे के प्रारंभिक घर पर रखा जाता है। <i>तीसरी बार</i> वह <b>कृत्रिम राजा</b> (शाह मस्नूआ) बनता है।</li></ul>
<h2>कई राजा</h2>
<p>जब तक पक्ष के पास एक से अधिक राजा हैं, उसके लिए शह और मात नहीं है: किसी भी राजा को साधारण मोहरे की तरह पकड़ा जा सकता है और हमले के नीचे बेझिझक चला जा सकता है। जब अंतिम बचता है — उसे सभी नियमों से मात देनी होती है।</p>
<h2>राजा की अदला-बदली</h2>
<p>खेल में एक बार, शह में पड़ा राजा (मरे के अनुसार — गतिरोध में भी) अपने किसी भी मोहरे से जगह बदल सकता है, बशर्ते बदलने के बाद वह हमले में न हो। खेल में इसके लिए «राजा की अदला-बदली» बटन आता है।</p>
<h2>खेल कैसे समाप्त होता है</h2>
<ul><li>अंतिम राजा को <b>मात</b> — जीत।</li><li><b>गतिरोध भी जीत है</b>, गतिरोध करने वाले की: जिसके पास चाल नहीं, वह हारता है।</li><li><b>प्रतिद्वंद्वी के गढ़ में राजा</b> — ड्रॉ।</li><li>अकेला राजा रह जाना हार नहीं: उसके पास गढ़ तक पहुँचने का मौक़ा है।</li><li>तीन बार दोहराव और 50 चालों का नियम — खेल समाप्त करने के लिए आधुनिक जोड़; इसे बंद किया जा सकता है।</li></ul>
<h2>विवादित बातों पर</h2>
<p>पांडुलिपियाँ एक-दूसरे का खंडन करती हैं, और एकमात्र विस्तृत स्रोत अधूरा है। यहाँ डिफ़ॉल्ट रूप से एच. मरे की व्याख्या («शतरंज का इतिहास», 1913) हांस बोडलेंडर और ज़ां-लुई काज़ो के स्पष्टीकरणों के साथ अपनाई गई है। चौकीदार के लिए फ़ोर्ब्स की व्याख्या, अदला-बदली की शर्तें, «नंगा राजा» नियम और अन्य विकल्प खेल बनाते समय चालू किए जा सकते हैं। जहाँ स्रोत मौन हैं, नियम अनुमानित और चिह्नित है।</p>`,
};

const HISTORY_MORE: Record<'uz' | 'tr' | 'zh' | 'hi', string> = {
  uz: `
<h1>Tarix</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>Temur bog‘ ayvonida buyuk shaxmat o‘ynamoqda. Fors miniatyurasi — zamonaviy uslublashtirish</figcaption></figure>
<p class="lead">«Temur shaxmatga berilgan edi, chunki u bilan aqlini charxlardi; lekin uning ruhi kichik shaxmat uchun juda yuksak edi, shuning uchun u faqat buyuk shaxmat o‘ynardi — o‘n katakka o‘n bir katakli taxtada, ikki tuya, ikki jirafa, ikki qorovul, ikki qamal mashinasi, vazir va boshqalar bilan… Kichik shaxmat unga nisbatan hech narsa.»<br><span class="cite">— Ibn Arabshoh, XV asr (G. Myurrey talqinida)</span></p>
<h2>O‘yin o‘z nomidan qadimiyroq</h2>
<p>Temur (1336–1405), Samarqand hukmdori, o‘yinga o‘z nomini berdi, lekin uni o‘ylab topgani gumon: eng qadimgi eslatma — al-Omuliyning «Nafois al-funun» qomusida, taxminan 1350-yil, Temur hali yigit bo‘lganida. Arab manbalari uni <i>shatranj al-kabir</i> — «buyuk shaxmat», fors qo‘lyozmasi — <i>shatranj komil</i>, «mukammal shaxmat» deb ataydi. Uning muallifi o‘yinni donishmand Hermes o‘ylab topgan, Hindistonga Iskandar Zulqarnayn olib kelgan, oddiy shaxmat esa uning qisqartmasi deb ishontiradi.</p>
<h2>Shohruh</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>Ikki chopar taxta oldiga keladi: o‘g‘il va shahar yurish nomini oladi</figcaption></figure>
<p>Ibn Arabshoh hikoya qiladi: Temur endigina <i>shoh-rux</i> — shoh va ruxga vilka e’lon qilgan edi, ikki chopar kirib keldi. Biri o‘g‘il tug‘ilgani, ikkinchisi Sirdaryo bo‘yida shahar qurilib bitgani xabarini keltirdi. Temur ikkalasini yurish nomi bilan atadi: o‘g‘lini — Shohruh, shaharni — Shohruhiya. Shohruh 1377-yilda tug‘ilib, saltanatni meros oldi. Myurrey esa shahar haqidagi qismga shubha bilan qaragan, vizantiyalik Duka esa xuddi shu hikoyani asir sulton Boyazid bilan aytadi — bu sanalar bo‘yicha mumkin emas.</p>
<h2>Ali Shatranjiy</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>Bir necha raqibga qarshi ko‘r o‘yin</figcaption></figure>
<p>Saroyda Alouddin Tabriziy — «Ali Shatranjiy» laqabli qonunshunos o‘ynardi. U bir vaqtning o‘zida bir necha raqib bilan ko‘r o‘ynar va rivoyatga ko‘ra, tushida shaxmat donalari solingan xalta olganidan keyin yutqazmay qo‘ygan. Temur unga: «Shaxmat saltanatida senga raqib yo‘q, menga esa — davlat ishlarida», degan. Balki aynan u batafsil qoidali yagona qo‘lyozmaning muallifidir. Muallif buyuk shaxmat uchun «turli holatlar va bir nechta debyut» o‘ylab topganini maqtanadi — lekin qo‘lyozmaning bu qismi yo‘qolgan. Birorta debyut bizgacha yetib kelmagan.</p>
<h2>Donalar qanday bo‘lgan</h2>
<p>Haqiqiy to‘plamlar saqlanmagan: qo‘lyozmalardagi diagrammalarda faqat yozilgan nomlar turadi. Lekin tavsiflar bor. Dabboba — «tepasida tugmasi bor olti qirrali siyohdon kabi»; bu devorlarga yaqinlashish uchun g‘ildirakli qamal ayvoni (zamonaviy arabchada bu so‘z «tank» degani). Qorovul, <i>tali‘a</i> — razvedkachi, avangard — «fil kabi, lekin ikki yuzli». Jirafa, forscha <i>shutur-gov-palang</i>, «tuya-sigir-qoplon», — «ot kabi, lekin ikki yuzli». Tuya — «boshi, bo‘yni va o‘rkachi bor, lekin oyoqsiz». Har bir piyoda o‘z donasining miniatyurasi edi — bu yerda ham shunday qilingan.</p>
<h2>Fors tizimi</h2>
<p>Donalar puxta jadval hosil qiladi — uch tur, har biri uch pog‘ona. To‘g‘ri: vazir, qamal minorasi, rux. Qiya: general, fil, qorovul. Aralash: ot, tuya, jirafa. Kichiklar bir katak yuradi, o‘rtalar bir katak orqali sakraydi, kattalar uzoqqa siljiydi — va «o‘rtalardan farqli o‘laroq, hech qachon sakramaydi».</p>
<h2>Qoidalar bizgacha qanday yetib keldi</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>Taxta diagrammali qo‘lyozma ustidagi kotib</figcaption></figure>
<p>Tomas Xayd o‘yinni 1694-yilda tasvirladi, Nataniel Bland 1850-yilda Qirollik Osiyo jamiyatining fors qo‘lyozmasini topdi, Dunkan Forbs uni 1860-yilda tarjima qildi, Edvard Folkener 1892-yilda u bo‘yicha birinchi zamonaviy o‘yinlarni o‘ynadi, Garold Myurrey esa 1913-yilda qo‘lyozmalarni qaytadan o‘qib, Forbsni tuzatdi. «Ikkita bir xil diagramma yo‘q», deb nolagan Forbs; shuning uchun bu o‘yinda bahsli qoidalarni tanlash mumkin.</p>
<p>Ibn Arabshohning o‘zi esa ogohlantirgan: «Uning qoidalari o‘yin bilan yaxshiroq o‘rganiladi; tavsif kam foyda beradi».</p>`,
  tr: `
<h1>Tarih</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>Timur bahçe köşkünde büyük satranç oynuyor. Fars minyatürü — modern bir stilizasyon</figcaption></figure>
<p class="lead">«Timur satranca düşkündü, çünkü onunla zihnini bilerdi; ama ruhu küçük satranç için fazla yüceydi, bu yüzden yalnız büyük satranç oynardı — on kareye on bir kare tahtada, iki deve, iki zürafa, iki gözcü, iki kuşatma aracı, vezir ve diğerleriyle… Küçük satranç bunun yanında hiçtir.»<br><span class="cite">— İbn Arabşah, XV. yüzyıl (H. Murray’in çevirisiyle)</span></p>
<h2>Adından daha eski bir oyun</h2>
<p>Semerkant hükümdarı Timur (1336–1405) oyuna adını verdi ama onu icat etmedi: en eski kayıt, el-Âmulî’nin <i>Nefâisü’l-fünûn</i> ansiklopedisinde, yaklaşık 1350’de, Timur daha gençken. Arap kaynakları ona <i>şatranc-ı kebir</i> — «büyük satranç», Fars el yazması <i>şatranc-ı kâmil</i> — «kusursuz satranç» der. Yazarı, oyunu bilge Hermes’in icat ettiğini, Hindistan’a İskender’in getirdiğini ve sıradan satrancın bunun kısaltması olduğunu ileri sürer.</p>
<h2>Şahruh</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>İki haberci tahtaya gelir: oğul ve şehir bir hamlenin adını alır</figcaption></figure>
<p>İbn Arabşah anlatır: Timur tam <i>şah-ruh</i> — şaha ve kaleye çatal — ilan etmişti ki iki haberci girdi. Biri bir oğlun doğduğunu, diğeri Seyhun kıyısındaki şehrin tamamlandığını bildirdi. Timur ikisine de hamlenin adını verdi: oğluna Şahruh, şehre Şahruhiye. Şahruh 1377’de doğdu ve imparatorluğu devraldı. Murray şehir kısmından kuşkuluydu; Bizanslı Dukas ise aynı hikâyeyi tutsak Sultan Bayezid’le anlatır — tarihler buna izin vermez.</p>
<h2>Ali Şatrancî</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>Birkaç rakibe karşı körleme oyun</figcaption></figure>
<p>Sarayda «Ali Şatrancî» lakaplı hukukçu Alâeddin Tebrizî oynardı. Aynı anda birkaç rakibe karşı körleme oynar, rivayete göre rüyasında bir torba satranç taşı aldıktan sonra bir daha yenilmedi. Timur ona: «Satranç ülkesinde sana rakip yok, bana da devlet işlerinde», demişti. Ayrıntılı kuralları içeren tek el yazmasının yazarı belki de odur. Yazar büyük satranç için «çeşitli konumlar ve birkaç açılış» icat ettiğiyle övünür — ama el yazmasının o bölümü kayıptır. Tek bir açılış bile bize ulaşmadı.</p>
<h2>Taşlar nasıldı</h2>
<p>Gerçek takımlar kalmadı: el yazmalarındaki şemalarda yalnız yazılı adlar var. Ama tarifler var. Debbabe — «tepesinde topuzu olan altıgen bir hokka gibi»; surlara yaklaşmak için tekerlekli bir kuşatma sığınağıydı (modern Arapçada bu sözcük «tank» demek). Gözcü, <i>talia</i> — keşif, öncü — «fil gibi ama iki yüzlü». Zürafa, Farsça <i>şütür-gâv-peleng</i>, «deve-inek-leopar» — «at gibi ama iki yüzlü». Deve — «başı, boynu ve hörgücü var ama ayakları yok». Her piyon kendi taşının minyatürüydü — burada da öyle yapıldı.</p>
<h2>Fars sistemi</h2>
<p>Taşlar düzenli bir tablo oluşturur: üçer basamaklı üç tür. Düz: vezir, kuşatma kulesi, kale. Çapraz: general, fil, gözcü. Karışık: at, deve, zürafa. Küçükler bir kare adımlar, ortadakiler bir kare üzerinden sıçrar, büyükler uzağa kayar — ve «ortadakilerin aksine asla sıçramaz».</p>
<h2>Kurallar bize nasıl ulaştı</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>Tahta şemalı bir el yazması başında kâtip</figcaption></figure>
<p>Thomas Hyde oyunu 1694’te tarif etti, Nathaniel Bland 1850’de Kraliyet Asya Derneği’nin Fars el yazmasını buldu, Duncan Forbes 1860’ta çevirdi, Edward Falkener 1892’de ona göre ilk modern oyunları oynadı ve Harold Murray 1913’te el yazmalarını yeniden okuyup Forbes’u düzeltti. «Birbirinin aynı iki şema yok» diye yakınmıştı Forbes; bu yüzden bu oyunda tartışmalı kurallar seçilebilir.</p>
<p>İbn Arabşah’ın kendisi de uyarmıştı: «Kuralları en iyi oynayarak öğrenilir; tarif pek işe yaramaz.»</p>`,
  zh: `
<h1>历史</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>帖木儿在花园亭中下大象棋。波斯细密画风格的现代作品</figcaption></figure>
<p class="lead">“帖木儿醉心于象棋，因为它磨砺他的智慧；但他的心志太高，不屑于小象棋，因此只下大象棋——棋盘十乘十一，有两只骆驼、两只长颈鹿、两名哨兵、两台攻城器、一名维齐尔等等……小象棋与之相比不值一提。”<br><span class="cite">——伊本·阿拉伯沙，十五世纪（据默里译文）</span></p>
<h2>比它的名字更古老的游戏</h2>
<p>撒马尔罕之主帖木儿（1336–1405）把名字给了这种棋，但未必是发明者：最早的记载见于阿穆利的百科全书《技艺珍宝》，约 1350 年，那时帖木儿还是少年。阿拉伯文献称之为<i>沙特兰兹·卡比尔</i>——“大象棋”，波斯手稿称之为<i>沙特兰兹·卡米尔</i>——“完美象棋”。手稿作者声称此棋由智者赫尔墨斯发明，由亚历山大传入印度，而普通象棋只是它的简化版。</p>
<h2>沙哈鲁</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>两名信使来到棋盘前：儿子和城市都以一步棋命名</figcaption></figure>
<p>伊本·阿拉伯沙记载：帖木儿刚宣布<i>沙赫-鲁赫</i>——同时攻击国王与战车的捉双——两名信使走了进来。一人报告儿子出生，另一人报告锡尔河畔的城市竣工。帖木儿用这步棋为两者命名：儿子叫沙哈鲁，城市叫沙哈鲁基亚。沙哈鲁生于 1377 年，后来继承了帝国。不过默里对城市一说存疑，而拜占庭史家杜卡斯讲的是同一故事却把被俘的苏丹巴耶济德放了进去——从年代上说不可能。</p>
<h2>棋手阿里</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>蒙眼同时对弈数人</figcaption></figure>
<p>宫廷中有一位法学家阿拉丁·大不里士，绰号“棋手阿里”。他能蒙眼同时与数人对弈；传说他梦见有人递给他一袋棋子，此后再未输过。帖木儿对他说：“在象棋王国里你没有对手，正如我在治国上没有对手。”唯一一部记载详细规则的手稿也许正出自他手。作者自夸为大象棋发明了“各种局面和几种开局”——可惜手稿的这一部分已经佚失。没有一种开局流传下来。</p>
<h2>棋子的模样</h2>
<p>没有任何实物棋具存世：手稿图中只写着棋子的名字。但有文字描述。达巴巴“像一个顶上有钮的六角墨盒”，那是用来靠近城墙的带轮攻城棚（现代阿拉伯语中这个词意为“坦克”）。哨兵，<i>塔利阿</i>——斥候、先锋——“像象，但有两张脸”。长颈鹿，波斯语<i>舒图尔-高-帕朗</i>，“骆驼-牛-豹”——“像马，但有两张脸”。骆驼“有头、颈和驼峰，却没有腿”。每枚兵都是其主棋的缩小版——这里也如此设计。</p>
<h2>波斯体系</h2>
<p>棋子构成一张整齐的表：三类，每类三级。直线类：维齐尔、攻城塔、战车。斜线类：将军、大象、哨兵。混合类：骑士、骆驼、长颈鹿。低级走一格，中级跳过一格，高级远距离滑行——而且“与中级不同，从不跳跃”。</p>
<h2>规则如何流传至今</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>抄写员在抄录带棋盘图的手稿</figcaption></figure>
<p>托马斯·海德于 1694 年记述此棋，纳撒尼尔·布兰德于 1850 年发现皇家亚洲学会的波斯手稿，邓肯·福布斯于 1860 年将其翻译，爱德华·福肯纳于 1892 年据此下了最早的现代对局，哈罗德·默里于 1913 年重读手稿并修正了福布斯。“没有两幅图是相同的”，福布斯曾抱怨；因此本游戏允许选择争议规则。</p>
<p>伊本·阿拉伯沙本人早已提醒：“它的规则最好通过下棋来学；文字描述帮助不大。”</p>`,
  hi: `
<h1>इतिहास</h1>
<figure class="pf"><img src="./img/h-garden.jpg" alt="" loading="lazy"><figcaption>तैमूर बाग़ के मंडप में महान शतरंज खेलते हुए। फ़ारसी लघुचित्र — आधुनिक शैलीकरण</figcaption></figure>
<p class="lead">«तैमूर शतरंज का दीवाना था, क्योंकि उससे वह अपनी बुद्धि तेज़ करता था; पर उसकी आत्मा छोटे शतरंज के लिए बहुत ऊँची थी, इसलिए वह केवल महान शतरंज खेलता था — दस गुणा ग्यारह घरों की बिसात पर, दो ऊँटों, दो जिराफ़ों, दो चौकीदारों, दो घेराबंदी यंत्रों, वज़ीर और बाक़ी के साथ… छोटा शतरंज उसके आगे कुछ भी नहीं।»<br><span class="cite">— इब्न अरबशाह, पंद्रहवीं सदी (एच. मरे के अनुवाद में)</span></p>
<h2>अपने नाम से पुराना खेल</h2>
<p>समरक़ंद के शासक तैमूर (1336–1405) ने खेल को अपना नाम दिया, पर उसका आविष्कार शायद ही किया: सबसे पुराना उल्लेख अल-आमुली के विश्वकोश «नफ़ाइस अल-फ़ुनून» में है, लगभग 1350, जब तैमूर अभी किशोर था। अरबी स्रोत इसे <i>शतरंज अल-कबीर</i> — «महान शतरंज», फ़ारसी पांडुलिपि <i>शतरंज कामिल</i> — «पूर्ण शतरंज» कहती है। उसका लेखक दावा करता है कि खेल ऋषि हर्मीस ने बनाया, भारत में सिकंदर लाया, और साधारण शतरंज केवल उसका संक्षेप है।</p>
<h2>शाहरुख़</h2>
<figure class="pf"><img src="./img/h-messengers.jpg" alt="" loading="lazy"><figcaption>दो दूत बिसात के पास आते हैं: बेटे और शहर को एक चाल का नाम मिलता है</figcaption></figure>
<p>इब्न अरबशाह बताता है: तैमूर ने अभी-अभी <i>शाह-रुख़</i> — राजा और रुख़ पर दोहरा हमला — घोषित किया था कि दो दूत आए। एक ने बेटे के जन्म की, दूसरे ने सीर दरिया पर शहर पूरा होने की ख़बर दी। तैमूर ने दोनों को चाल का नाम दिया: बेटे को शाहरुख़, शहर को शाहरुख़िया। शाहरुख़ 1377 में जन्मा और साम्राज्य का वारिस बना। मरे को शहर वाली बात पर संदेह था, और बीज़ान्टिनी दूकास वही कहानी बंदी सुल्तान बायज़ीद के साथ सुनाता है — जो तारीख़ों से असंभव है।</p>
<h2>अली शतरंजी</h2>
<figure class="pf"><img src="./img/h-blindfold.jpg" alt="" loading="lazy"><figcaption>कई प्रतिद्वंद्वियों के विरुद्ध आँख बंद खेल</figcaption></figure>
<p>दरबार में अलाउद्दीन तबरीज़ी खेलता था, विधिवेत्ता जिसका उपनाम था अली शतरंजी — «अली शतरंजबाज़»। वह एक साथ कई प्रतिद्वंद्वियों से आँख बंद करके खेलता था और किंवदंती के अनुसार, सपने में शतरंज के मोहरों की थैली मिलने के बाद कभी नहीं हारा। तैमूर ने उससे कहा: «शतरंज के राज्य में तुम्हारा कोई प्रतिद्वंद्वी नहीं, जैसे शासन में मेरा।» शायद वही विस्तृत नियमों वाली एकमात्र पांडुलिपि का लेखक है। लेखक डींग हाँकता है कि उसने महान शतरंज के लिए «विभिन्न स्थितियाँ और कई ओपनिंग» बनाईं — पर पांडुलिपि का वह भाग खो गया। एक भी ओपनिंग हम तक नहीं पहुँची।</p>
<h2>मोहरे कैसे थे</h2>
<p>असली सेट नहीं बचे: पांडुलिपियों के चित्रों में केवल लिखे हुए नाम हैं। पर वर्णन हैं। दब्बाबा — «ऊपर घुंडी वाली छह कोनों की दवात जैसा»; यह दीवारों तक पहुँचने का पहियों वाला घेराबंदी छप्पर था (आधुनिक अरबी में इस शब्द का अर्थ «टैंक» है)। चौकीदार, <i>तलीआ</i> — गश्ती, अग्रदल — «हाथी जैसा, पर दो चेहरों वाला»। जिराफ़, फ़ारसी में <i>शुतुर-गाव-पलंग</i>, «ऊँट-गाय-तेंदुआ», — «घोड़े जैसा, पर दो चेहरों वाला»। ऊँट — «सिर, गर्दन और कूबड़ वाला, पर बिना पैरों के»। हर प्यादा अपने मोहरे का लघुरूप था — यहाँ भी वैसा ही किया गया है।</p>
<h2>फ़ारसी प्रणाली</h2>
<p>मोहरे एक सुव्यवस्थित तालिका बनाते हैं — तीन वर्ग, हर एक में तीन स्तर। सीधे: वज़ीर, घेराबंदी मीनार, रुख़। तिरछे: सेनापति, हाथी, चौकीदार। मिश्रित: घोड़ा, ऊँट, जिराफ़। छोटे एक घर चलते हैं, बीच वाले एक घर फाँदते हैं, बड़े दूर तक सरकते हैं — और «बीच वालों के विपरीत, कभी नहीं फाँदते»।</p>
<h2>नियम हम तक कैसे पहुँचे</h2>
<figure class="pf"><img src="./img/h-scribe.jpg" alt="" loading="lazy"><figcaption>बिसात के चित्र वाली पांडुलिपि पर लेखक</figcaption></figure>
<p>थॉमस हाइड ने 1694 में खेल का वर्णन किया, नैथेनियल ब्लैंड ने 1850 में रॉयल एशियाटिक सोसाइटी की फ़ारसी पांडुलिपि खोजी, डंकन फ़ोर्ब्स ने 1860 में उसका अनुवाद किया, एडवर्ड फ़ॉकनर ने 1892 में उसके आधार पर पहले आधुनिक खेल खेले, और हैरॉल्ड मरे ने 1913 में पांडुलिपियाँ फिर से पढ़कर फ़ोर्ब्स को सुधारा। «दो चित्र भी एक जैसे नहीं», फ़ोर्ब्स ने शिकायत की थी; इसीलिए इस खेल में विवादित नियम चुने जा सकते हैं।</p>
<p>इब्न अरबशाह ने स्वयं चेताया था: «इसके नियम खेलकर सबसे अच्छे सीखे जाते हैं; वर्णन से ज़्यादा लाभ नहीं।»</p>`,
};

export function rulesHtml(lang: Lang): string {
  return lang === 'ru' || lang === 'en' ? RULES[lang] : RULES_MORE[lang];
}
export function historyHtml(lang: Lang): string {
  return lang === 'ru' || lang === 'en' ? HISTORY[lang] : HISTORY_MORE[lang];
}
