// The library: short articles about Tamerlane chess, the people and places around it, and where our knowledge comes from.
// Written in our own words from the sources listed under each article; disputed points are marked as such.
// Russian and English for now; other languages fall back to English.

export type Shelf = 'game' | 'people' | 'places' | 'sources' | 'chronicle';

export interface Source {
  title: string;
  url?: string;
}

export interface ArticleText {
  title: string;
  lead: string;
  /** Paragraphs; a paragraph starting with '## ' is a subheading. */
  body: string[];
}

export interface Article {
  id: string;
  shelf: Shelf;
  /** Our own illustration from public/; captions say so. */
  image?: string;
  text: { ru: ArticleText; en: ArticleText };
  sources: Source[];
}

const WIKI_GREAT = { title: 'Wikipedia: Great chess (Tamerlane chess)', url: 'https://en.wikipedia.org/wiki/Great_chess' };
const MYERS = { title: 'Greg Myers, “On the Provenance of Manuscript 211” (ChessBase, 2023)', url: 'https://en.chessbase.com/portals/all/2023/01/tamerlane-chess/tamerlane-manuscript.pdf' };
const RAS_BLOG = { title: 'Royal Asiatic Society: “Risāla-i Shaṭranj or Chess Treatise” (Dr Amy Matthewson)', url: 'https://royalasiaticsociety.org/risala-i-sha%E1%B9%ADranj-or-chess-treatise-by-dr-amy-matthewson/' };
const CV = { title: 'The Chess Variants Pages: Tamerlane chess', url: 'https://www.chessvariants.com/historic.dir/tamerlane.html' };
const IRANICA_IA = { title: 'Encyclopaedia Iranica: Ebn ʿArabšāh', url: 'https://www.iranicaonline.org/articles/ebn-arabsah/' };
const IRANICA_AJ = { title: 'Encyclopaedia Iranica: ʿAjāʾeb al-maqdūr', url: 'https://www.iranicaonline.org/articles/ajaeb-al-maqdur' };
const ARTICLE_UZ = { title: 'Leonard Barden / TheArticle: “Egregious viceroys: the Uzbek impact on chess”', url: 'https://www.thearticle.com/egregious-viceroys-the-uzbek-impact-on-chess' };
const WIKI_SHAHRUKH = { title: 'Wikipedia: Shah Rukh', url: 'https://en.wikipedia.org/wiki/Shah_Rukh' };
const CB_OLDEST = { title: 'ChessBase: “The oldest chess pieces in the world”', url: 'https://en.chessbase.com/post/oldest-chess-pieces-in-the-world' };
const CHESSCOM_PIECES = { title: 'Chess.com: “The Chess Pieces — A History”', url: 'https://www.chess.com/article/the-chess-pieces---a-history' };
const FOLGER_HYDE = { title: 'Folger Shakespeare Library catalogue: Thomas Hyde, De ludis orientalibus (Oxford, 1694)', url: 'https://catalog.folger.edu/record/134615' };
const WIKI_BLAND = { title: 'Wikipedia: Nathaniel Bland', url: 'https://en.wikipedia.org/wiki/Nathaniel_Bland' };
const FORBES_SCOT = { title: 'Chess Scotland: Duncan Forbes', url: 'https://chessscotland.com/documents/history/biographies/forbes_Duncan.htm' };
const WIKI_MURRAY = { title: 'Wikipedia: A History of Chess (H. J. R. Murray, 1913)', url: 'https://en.wikipedia.org/wiki/A_History_of_Chess' };
const UNESCO = { title: 'UNESCO World Heritage: Samarkand — Crossroad of Cultures', url: 'https://whc.unesco.org/en/list/603/' };

export const ARTICLES: Article[] = [
  {
    id: 'great-chess', shelf: 'game', image: './rooms/aiwan-d-day-1600.webp',
    text: {
      ru: {
        title: 'Великие шахматы',
        lead: 'Шатрандж кабир, «большие шахматы»: игра двора Тимура на доске 11 × 10 с двумя цитаделями.',
        body: [
          'В средневековом мусульманском мире шахматы называли шатрандж. Обычную игру на доске 8 × 8 звали «малой», а варианты на больших досках — «большими шахматами», шатрандж кабир. Самый известный из них сегодня называют шахматами Тамерлана: по преданию, Тимур предпочитал именно большую доску.',
          'Доска состоит из 110 одноцветных клеток, 10 рядов по 11, и двух выступов-цитаделей: одна сбоку от второго ряда, другая сбоку от девятого. Всего 112 клеток. У каждой стороны 28 фигур: король, генерал, визирь, по паре жирафов, дозорных, коней, ладей, слонов, верблюдов и осадных башен, и одиннадцать пешек — у каждой своя фигура, в которую она превращается.',
          '## Чем она отличается от привычных шахмат',
          'Пешки ходят только на одну клетку и не бьют на проходе. Рокировки нет. Пат — это победа того, кто его поставил, а не ничья. Король один раз за партию может поменяться местами со своей фигурой, чтобы уйти от беды. Король, дошедший до цитадели соперника, спасает партию. Особые правила есть у пешки пешек и у принца — о них отдельные статьи.',
          '## Кто её придумал',
          'Изобретение часто приписывают самому Тимуру, но это предание, а не доказанный факт: такие атрибуции великим правителям в истории шахмат обычны. Надёжно известно другое — игра описана в рукописях, связанных с эпохой Тимура и его двором.',
        ],
      },
      en: {
        title: 'Great chess',
        lead: 'Shatranj kabir, “great chess”: the game of Timur’s court on an 11 × 10 board with two citadels.',
        body: [
          'In the medieval Islamic world chess was called shatranj. The ordinary game on an 8 × 8 board was the “small” one, and the variants on larger boards were “great chess”, shatranj kabir. The best known of them is now called Tamerlane chess: tradition says Timur preferred the large board.',
          'The board has 110 uncoloured squares, 10 rows of 11, plus two projecting citadels: one beside the second row, the other beside the ninth. 112 squares in all. Each side has 28 men: a king, a general, a vizier, pairs of giraffes, pickets, knights, rooks, elephants, camels and war engines, and eleven pawns, each of which promotes to its own piece.',
          '## How it differs from modern chess',
          'Pawns move one square only and there is no en passant. There is no castling. Stalemate is a win for the side that gives it, not a draw. Once per game the king may swap places with one of its own men to escape. A king that reaches the opponent’s citadel saves the game. The pawn of pawns and the prince have special rules of their own, described in separate articles.',
          '## Who invented it',
          'The invention is often credited to Timur himself, but that is tradition rather than proven fact; such attributions to great rulers are common in chess history. What is reliable is that the game is described in manuscripts linked to Timur’s era and court.',
        ],
      },
    },
    sources: [WIKI_GREAT, CV, MYERS],
  },
  {
    id: 'names', shelf: 'game', image: './img/p-giraffe.jpg',
    text: {
      ru: {
        title: 'Имена фигур и почему «Зурафа»',
        lead: 'Шах, ферзь, вазир, зурафа, тали’а, фарас, рух, пил, джамал, дабаба: что значат старые названия.',
        body: [
          'Фигуры великих шахмат дошли до нас под арабскими и персидскими именами. Шах — король. Ферзь (ферс) — советник; у нас он генерал и ходит на одну клетку по диагонали. Вазир — визирь, на одну клетку по прямой. Фарас — конь. Рух — ладья. Пил (фил) — слон.',
          'Новые для европейца фигуры: зурафа — жираф, джамал или шутур — верблюд, тали’а — «передовой, разведчик», у нас дозорный, и дабаба — «осадная машина», у нас осадная башня. Каждой фигуре соответствует своя пешка: пешка жирафа становится жирафом, пешка верблюда — верблюдом.',
          '## Почему игра называется «Зурафа»',
          'Зурафа — арабское слово «жираф». Жираф — самая необычная фигура великих шахмат и та, которой нет ни в одних других шахматах. Поэтому мы назвали игру её именем, а в наш знак поставили жирафа под аркой айвана.',
          'Названия в рукописях записаны по-разному, и исследователи иногда читают их неодинаково. Мы держимся прочтений, принятых в современных справочниках по историческим вариантам шахмат.',
        ],
      },
      en: {
        title: 'The names of the pieces, and why “Zurafa”',
        lead: 'Shah, ferz, vazir, zurafa, tali’a, faras, rukh, pil, jamal, dabbaba: what the old names mean.',
        body: [
          'The pieces of great chess have come down to us under Arabic and Persian names. Shah is the king. Ferz is the counsellor; in our game he is the general and steps one square diagonally. Vazir is the vizier, one square orthogonally. Faras is the horse, rukh the rook, pil (fil) the elephant.',
          'The pieces new to a European eye are zurafa, the giraffe; jamal or shutur, the camel; tali’a, “the one in front, the scout”, our picket; and dabbaba, “the siege machine”, our war engine. Every piece has its own pawn: the giraffe’s pawn becomes a giraffe, the camel’s pawn a camel.',
          '## Why the game is called Zurafa',
          'Zurafa is Arabic for giraffe. The giraffe is the most unusual piece of great chess and one found in no other chess. So we named the game after it and put a giraffe under the arch of an iwan in our mark.',
          'The manuscripts spell the names in different ways and scholars sometimes read them differently. We follow the readings used in modern reference works on historical chess variants.',
        ],
      },
    },
    sources: [WIKI_GREAT, CV],
  },
  {
    id: 'citadels', shelf: 'game', image: './img/h-citadel.jpg',
    text: {
      ru: {
        title: 'Цитадели',
        lead: 'Две выступающие клетки, которые меняют конец партии: король, дошедший до чужой цитадели, спасает игру.',
        body: [
          'У доски великих шахмат два выступа — цитадели, по одной у каждого игрока, на противоположных краях. Идея старше великих шахмат: в средневековых рукописях описана «игра с крепостями», шатрандж аль-хусун, где на доске четыре угловые цитадели.',
          'В великих шахматах цитадель — последняя надежда короля. Если король загнанной стороны доходит до цитадели соперника, партия заканчивается ничьей. Поэтому голый король ещё не проиграл: пока у него есть путь к чужой цитадели, игра продолжается.',
          'В собственную цитадель может войти только «случайный король» — фигура, которая получается из пешки пешек после третьего превращения. Там он неуязвим и не даёт сопернику спастись ничьей.',
          'Правила о цитаделях в разных источниках изложены по-разному, и современные реконструкции расходятся в деталях. В нашей игре они собраны в разделе «Правила».',
        ],
      },
      en: {
        title: 'The citadels',
        lead: 'Two projecting squares that change how a game ends: a king that reaches the enemy citadel saves the game.',
        body: [
          'The great chess board has two projections, the citadels, one for each player on opposite edges. The idea is older than great chess: medieval manuscripts describe “citadel chess”, shatranj al-husun, with four corner citadels.',
          'In great chess the citadel is the king’s last hope. If the hunted side’s king reaches the opponent’s citadel, the game is drawn. So a bare king has not yet lost: as long as it has a road to the enemy citadel, play goes on.',
          'Only the “adventitious king”, the piece the pawn of pawns becomes after its third promotion, may enter its own citadel. There it cannot be touched, and it denies the opponent the drawing escape.',
          'Sources state the citadel rules differently and modern reconstructions differ in detail. Our version is set out in Rules.',
        ],
      },
    },
    sources: [WIKI_GREAT, CV],
  },
  {
    id: 'pawn-of-pawns', shelf: 'game', image: './img/p-pawnPawn.jpg',
    text: {
      ru: {
        title: 'Пешка пешек, принц и случайный король',
        lead: 'Самые хитрые правила великих шахмат: пешка, которая превращается трижды, и короли, которых может стать несколько.',
        body: [
          'Одиннадцать пешек великих шахмат — не одинаковые: каждая превращается в свою фигуру. Особняком стоит пешка пешек. Дойдя до последнего ряда, она не превращается сразу, а остаётся там, и взять её нельзя.',
          'Дальше начинается почти головоломка. Когда сопернику нечем избежать потери фигуры от неё или она может напасть сразу на две фигуры, пешка переносится на эту клетку. Второе её превращение отправляет её на исходную клетку пешки короля, а третье делает её случайным королём.',
          '## Принц и случайный король',
          'Пешка короля, дойдя до конца, становится принцем — шахзаде. Он ходит как король и тоже королевская фигура. Пока на доске несколько королевских фигур, сначала нужно взять лишние: мат объявляется последнему оставшемуся. Случайный король ходит так же и, в отличие от остальных, может войти в собственную цитадель.',
          'Эти правила известны по одной рукописи, и их прочтение спорно. В нашей игре они реализованы так, как описано в «Правилах», а спорные места мы отметили для будущих обсуждений.',
        ],
      },
      en: {
        title: 'The pawn of pawns, the prince and the adventitious king',
        lead: 'The trickiest rules of great chess: a pawn that promotes three times, and kings that can multiply.',
        body: [
          'The eleven pawns of great chess are not alike: each promotes to its own piece. The pawn of pawns stands apart. On reaching the last rank it does not promote at once; it stays there and cannot be captured.',
          'What follows is almost a puzzle. When the opponent cannot avoid losing a piece to it, or it can fork two pieces, the pawn is moved to that square. Its second promotion sends it to the starting square of the king’s pawn, and its third turns it into an adventitious king.',
          '## The prince and the adventitious king',
          'The king’s pawn becomes a prince, shahzada, on reaching the end. He moves like a king and is royal too. While several royal pieces stand on the board, the extra ones must be captured first; mate is given to the last one left. The adventitious king moves the same way and, unlike the others, may enter its own citadel.',
          'These rules are known from a single manuscript and their reading is disputed. Our game implements them as set out in Rules, and we have noted the open questions for future discussion.',
        ],
      },
    },
    sources: [WIKI_GREAT, CV],
  },
  {
    id: 'family', shelf: 'game', image: './img/hist-armies.jpg',
    text: {
      ru: {
        title: 'Родня великих шахмат',
        lead: 'Малые шахматы, «полные шахматы», шахматы с крепостями и турецкие великие шахматы 13 × 13.',
        body: [
          'Шатрандж на доске 8 × 8 пришёл в Персию из Индии и стал основой всех шахмат исламского мира. Рядом с ним жили большие варианты. «Полные шахматы», шатрандж ат-тамма, шли на доске 10 × 10 и добавляли две фигуры — осадную машину дабабу и верблюда. «Шахматы с крепостями» добавляли угловые цитадели.',
          'Шахматы Тамерлана соединили эти идеи на доске 11 × 10 и стали самым сложным известным вариантом своего времени.',
          'Ещё позже, в начале XIX века, в Стамбуле была описана турецкая великая игра на доске 13 × 13 с носорогом (ход ладьи и коня) и великим визирем (ход ферзя и коня). Это показывает, что большие шахматы продолжали жить и после Тимура.',
        ],
      },
      en: {
        title: 'The family of great chess',
        lead: 'Small chess, “complete chess”, citadel chess, and Turkish great chess on 13 × 13.',
        body: [
          'Shatranj on 8 × 8 came to Persia from India and became the basis of all chess in the Islamic world. Larger variants lived beside it. “Complete chess”, shatranj al-tamma, was played on 10 × 10 and added two pieces, the siege machine dabbaba and the camel. “Citadel chess” added corner citadels.',
          'Tamerlane chess combined these ideas on an 11 × 10 board and became the most complex known variant of its time.',
          'Later still, in the early nineteenth century, an Istanbul encyclopedia described a Turkish great chess on 13 × 13 with a rhinoceros (rook plus knight) and a grand vizier (queen plus knight), which shows that large chess lived on long after Timur.',
        ],
      },
    },
    sources: [WIKI_GREAT, { title: 'G. Markov, S. Härtel, “Turkish Great Chess and Chinese Whispers”, Board Game Studies Journal 14 (2020)' }],
  },
  {
    id: 'timur', shelf: 'people', image: './img/hist-court.jpg',
    text: {
      ru: {
        title: 'Тимур и шахматы',
        lead: 'Правитель, при дворе которого играли в большие шахматы, и сын, названный, по преданию, в честь шахматного хода.',
        body: [
          'Тимур (1336–1405) правил из Самарканда огромной державой от Малой Азии до Индии. Его называли Тимур Ленг, «Тимур Хромой» — отсюда европейское Тамерлан. При всей жестокости его походов он ценил учёных и любил беседы и игры с ними.',
          'Источники связывают Тимура с большими шахматами: говорится, что он предпочитал их малой доске и приглашал ко двору лучших игроков. Утверждение, что он сам изобрёл игру, остаётся преданием.',
          '## Шахрух',
          'Самая известная история передаётся со слов историка Ибн Арабшаха: когда Тимуру сообщили о рождении сына (1377), он играл в шахматы и только что сделал ход «шах-рух» — нападение на короля и ладью одновременно. Так мальчика и назвали: Шахрух. Позже он сам стал правителем державы Тимуридов, а его сын Улугбек построил в Самарканде медресе и обсерваторию.',
          'К этой истории стоит относиться как к красивому преданию: точной позиции партии никто не записал, а «шах» и «рух» по-персидски просто значат «король» и «ладья».',
        ],
      },
      en: {
        title: 'Timur and chess',
        lead: 'The ruler at whose court great chess was played, and a son named, by tradition, after a chess move.',
        body: [
          'Timur (1336–1405) ruled a vast empire from Asia Minor to India from Samarkand. He was called Timur Lang, “Timur the Lame”, hence the European Tamerlane. For all the cruelty of his campaigns he valued scholars and liked to talk and play with them.',
          'Sources link Timur with great chess: he is said to have preferred it to the small board and to have invited the best players to his court. The claim that he invented the game himself remains tradition.',
          '## Shah Rukh',
          'The best-known story comes from the historian Ibn Arabshah: when Timur was told of his son’s birth (1377) he was playing chess and had just made the move “shah-rukh”, an attack on king and rook at once. So the boy was named Shah Rukh. He later ruled the Timurid state himself, and his son Ulugh Beg built the madrasa and the observatory in Samarkand.',
          'Treat the story as a fine tradition: nobody recorded the position, and in Persian “shah” and “rukh” simply mean king and rook.',
        ],
      },
    },
    sources: [WIKI_GREAT, WIKI_SHAHRUKH, ARTICLE_UZ],
  },
  {
    id: 'ali', shelf: 'people', image: './img/h-blindfold.jpg',
    text: {
      ru: {
        title: 'Али аш-Шатранджи',
        lead: '«Али Шахматист» из Тебриза — сильнейший игрок двора Тимура и, возможно, автор трактата, по которому мы знаем правила.',
        body: [
          'По сведениям «Оксфордского справочника по шахматам», при дворе Тимура служил юрист и историк Алааддин ат-Табризи, прозванный за силу в игре Али аш-Шатранджи — «Али Шахматист». Ему приписывают слова Тимура: «Как у меня нет соперника в правлении, так у Али нет соперника в шахматах».',
          'Говорят, что он годами сопровождал Тимура в походах, хвастал, что играл вслепую сразу с несколькими противниками, и называл себя изобретателем многих позиций.',
          '## Автор трактата?',
          'Английский историк шахмат Дункан Форбс в XIX веке предположил, что именно Али написал персидский «Трактат о шахматах», хранящийся сегодня в Королевском азиатском обществе в Лондоне. Основание — хвастливый тон автора и его знакомство с двором Тимура. Это гипотеза: официально автор рукописи неизвестен, а сам Форбс известен вольным обращением с источниками.',
          'Отдельно ходит красивое, но ничем не подтверждённое предание, будто из имени Алааддин вырос сказочный Аладдин.',
        ],
      },
      en: {
        title: 'Ali ash-Shatranji',
        lead: '“Ali the Chess Player” from Tabriz: the strongest player at Timur’s court, and possibly the author of the treatise that preserves the rules.',
        body: [
          'According to the Oxford Companion to Chess, Timur’s court included the lawyer and historian Ala’addin at-Tabrizi, known for his skill as Ali ash-Shatranji, “Ali the Chess Player”. Timur is credited with saying that he had no rival as a ruler, and Ali none as a chess player.',
          'He is said to have followed Timur on campaign for years, to have boasted of playing several opponents blindfold, and to have claimed many positions as his own invention.',
          '## The author of the treatise?',
          'In the nineteenth century the British chess historian Duncan Forbes proposed that Ali wrote the Persian “Treatise on Chess” now held by the Royal Asiatic Society in London, judging by the author’s boastful tone and familiarity with Timur’s court. It is a hypothesis: the manuscript’s author is officially unknown, and Forbes is known for free handling of sources.',
          'A charming but unsupported tradition also holds that the name Ala’addin gave rise to the Aladdin of the tales.',
        ],
      },
    },
    sources: [ARTICLE_UZ, MYERS, FORBES_SCOT],
  },
  {
    id: 'ibn-arabshah', shelf: 'people', image: './img/h-messengers.jpg',
    text: {
      ru: {
        title: 'Ибн Арабшах',
        lead: 'Мальчик из Дамаска, увезённый в Самарканд, который вырос в самого злого биографа Тимура и сохранил названия шахматных фигур.',
        body: [
          'Ахмад ибн Арабшах родился в Дамаске около 1389 года. Когда войска Тимура взяли Дамаск (1400–1401), его с матерью и сестрой увезли в Самарканд. Там он провёл годы, выучил персидский и монгольский и учился у видных учёных.',
          'Потом он служил секретарём у османского султана, вернулся в Сирию и умер в Каире в 1450 году. В 1435 году он закончил на арабском рифмованной прозой книгу «Чудеса предопределения в делах Тимура». Это нескрываемо враждебная биография, но ценная: автор сам видел учёный мир Самарканда.',
          'Именно у Ибн Арабшаха игра названа «большими шахматами», и его рассказ сохранил названия фигур. Он же передаёт историю об имени Шахруха.',
        ],
      },
      en: {
        title: 'Ibn Arabshah',
        lead: 'A boy from Damascus taken to Samarkand, who grew into Timur’s most hostile biographer and preserved the names of the chessmen.',
        body: [
          'Ahmad ibn Arabshah was born in Damascus around 1389. When Timur’s army took Damascus (1400–1401) he was carried off to Samarkand with his mother and sister. He spent years there, learnt Persian and Mongolian and studied with prominent scholars.',
          'He later served as a secretary to the Ottoman sultan, returned to Syria and died in Cairo in 1450. In 1435 he finished, in Arabic rhymed prose, “The Wonders of Destiny concerning Timur”. It is an openly hostile biography, yet valuable, because the author saw the learned world of Samarkand himself.',
          'Ibn Arabshah calls the game “great chess”, and his account preserves the names of the pieces. He is also the source of the story of Shah Rukh’s name.',
        ],
      },
    },
    sources: [IRANICA_IA, IRANICA_AJ, ARTICLE_UZ],
  },
  {
    id: 'scholars', shelf: 'people', image: './rooms/library-d-day-1600.webp',
    text: {
      ru: {
        title: 'Как Европа узнала о великих шахматах',
        lead: 'Хайд, Бленд, Форбс, Мюррей: четыре учёных, которые за двести лет вытащили игру из рукописей.',
        body: [
          'Томас Хайд, оксфордский востоковед, в 1694 году выпустил «О восточных играх» — первую научную историю шахмат. В ней есть и большая доска с жирафом. Сегодня Хайда считают основателем научной истории шахмат.',
          'Натаниэль Бленд в 1847 году прочитал в Королевском азиатском обществе доклад «О персидской игре в шахматы» и подробно разобрал лондонскую рукопись. Он же оставил горькое описание её состояния: листы перепутаны, часть утрачена.',
          'Дункан Форбс в «Истории шахмат» (1860) предложил ходы для загадочных фигур и назвал автором рукописи Али аш-Шатранджи. Позже выяснилось, что Форбс приписывал источникам то, чего в них нет, поэтому его выводы проверяют заново.',
          'Гарольд Мюррей в монументальной «Истории шахмат» (1913) свёл всё известное о больших вариантах. Его прочтения схем тоже местами оспаривают современные исследователи, читающие рукописи в оригинале.',
        ],
      },
      en: {
        title: 'How Europe learnt about great chess',
        lead: 'Hyde, Bland, Forbes, Murray: four scholars who drew the game out of the manuscripts over two centuries.',
        body: [
          'Thomas Hyde, an Oxford orientalist, published “On Oriental Games” in 1694, the first scholarly history of chess. It includes the large board with the giraffe. Hyde is now regarded as the founder of scientific chess history.',
          'Nathaniel Bland read “On the Persian Game of Chess” to the Royal Asiatic Society in 1847 and examined the London manuscript closely. He also left a sad description of its state: leaves out of order, parts lost.',
          'Duncan Forbes, in his History of Chess (1860), proposed moves for the mysterious pieces and named Ali ash-Shatranji as the manuscript’s author. It later emerged that Forbes attributed to sources things they do not contain, so his conclusions are now re-examined.',
          'Harold Murray’s monumental A History of Chess (1913) gathered everything known about the large variants. Some of his readings of the diagrams are also disputed by modern scholars who read the manuscripts in the original.',
        ],
      },
    },
    sources: [FOLGER_HYDE, WIKI_BLAND, FORBES_SCOT, WIKI_MURRAY, MYERS],
  },
  {
    id: 'ms211', shelf: 'sources', image: './img/hist-manuscript.jpg',
    text: {
      ru: {
        title: 'Лондонская рукопись MS 211',
        lead: 'Единственный текст, по которому мы знаем правила великих шахмат, и его путь через Индию в Лондон.',
        body: [
          'В библиотеке Королевского азиатского общества в Лондоне хранится персидская рукопись «Рисала-йи шатрандж» — «Трактат о шахматах», шифр MS 211. Каталог датирует её «вероятно, XV веком». 64 листа, текст почерком насх по 15 строк на странице и много миниатюр: двое учёных за шахматами. Листы перепутаны, часть подпорчена водой.',
          'Кроме правил, в трактате есть рассуждение о «десяти пользах шахмат» и легенды, будто большие шахматы были первыми, а малые придумали позже для юного индийского царевича.',
          '## Как она попала в Лондон',
          'На обороте обложки написано по-английски «дар» и имена «H. Ross» и Роберт Холфорд (последнее — персидским письмом). Историк шахмат Грег Майерс проследил путь книги. Капитан Ост-Индской компании Хью Росс собирал персидские рукописи и погиб в 1790 году в войне с Типу Султаном. По завещанию собрание досталось его другу Дэвиду Прайсу. После смерти Прайса его вдова в марте 1836 года передала Обществу 70 рукописей, среди них и трактат.',
          'В 1854 году рукопись получила номер 260, в 1892-м — нынешний 211. В 1929 году её переплели в красную кожу и подреставрировали.',
        ],
      },
      en: {
        title: 'The London manuscript, MS 211',
        lead: 'The only text from which we know the rules of great chess, and its road through India to London.',
        body: [
          'The library of the Royal Asiatic Society in London holds a Persian manuscript, Risala-i Shatranj, “A Treatise on Chess”, shelfmark MS 211. The catalogue dates it “probably 15th century”. 64 folios, naskh script at 15 lines a page, and many paintings of two scholars at chess. The leaves are out of order and some are water-damaged.',
          'Besides the rules, the treatise discusses the “ten advantages of chess” and tells legends that great chess came first and the small game was devised later for a young Indian prince.',
          '## How it reached London',
          'Inside the cover are the words “the gift of” and the names “H. Ross” and Robert Holford, the latter in Persian script. The chess historian Greg Myers traced the book’s road. Captain Hugh Ross of the East India Company collected Persian manuscripts and was killed in 1790 in the war against Tipu Sultan, leaving them by will to his friend David Price. After Price died, his widow gave 70 manuscripts, the treatise among them, to the Society in March 1836.',
          'In 1854 the manuscript became No. 260, in 1892 today’s No. 211. In 1929 it was rebound in red leather and repaired.',
        ],
      },
    },
    sources: [MYERS, RAS_BLOG, WIKI_BLAND],
  },
  {
    id: 'nafais', shelf: 'sources', image: './rooms/madrasa-d-day-1600.webp',
    text: {
      ru: {
        title: '«Нафаис аль-фунун»',
        lead: 'Персидская энциклопедия XIV века, где описана доска великих шахмат.',
        body: [
          'Мухаммад ибн Махмуд аль-Амули около 1340-х годов составил на персидском языке энциклопедию «Нафаис аль-фунун» — «Сокровища наук». В ней среди прочих знаний есть и шахматы.',
          'Аль-Амули описывает «шахматы с крепостями» и доску великих шахмат: 110 клеток в рамке 10 × 11 и выступающие цитадели. Это одно из самых ранних свидетельств о большой доске, на несколько десятилетий раньше Тимура.',
          'Правил полностью аль-Амули не излагает, поэтому основным источником по самой игре остаётся лондонская рукопись MS 211.',
        ],
      },
      en: {
        title: 'Nafa’is al-funun',
        lead: 'A fourteenth-century Persian encyclopedia that describes the great chess board.',
        body: [
          'Muhammad ibn Mahmud al-Amuli compiled the Persian encyclopedia Nafa’is al-funun, “Treasures of the Sciences”, around the 1340s. Chess is among the subjects it covers.',
          'Al-Amuli describes citadel chess and the great chess board: 110 squares in a 10 × 11 frame with projecting citadels. It is one of the earliest witnesses to the large board, decades before Timur.',
          'He does not give the full rules, so the London manuscript MS 211 remains the main source for the game itself.',
        ],
      },
    },
    sources: [WIKI_GREAT, MYERS],
  },
  {
    id: 'samarkand', shelf: 'places', image: './img/h-registan.jpg',
    text: {
      ru: {
        title: 'Самарканд Тимура и Улугбека',
        lead: 'Столица, ради которой Тимур свозил мастеров со всей своей державы.',
        body: [
          'Тимур сделал Самарканд столицей и украшал его постройками, на которые сгонял мастеров из покорённых городов. При нём возведены соборная мечеть Биби-Ханым (1399–1404) и мавзолей Гур-Эмир (начат в 1403 году), где он и похоронен.',
          'Внук Тимура Улугбек, правитель-астроном, построил на площади Регистан медресе (1417–1420) и обсерваторию с огромным секстантом. Его звёздные таблицы были точнейшими своего времени.',
          'В 2001 году Самарканд вошёл в список Всемирного наследия ЮНЕСКО как «Самарканд — перекрёсток культур». Наши комнаты — портал, айван, медресе, обсерватория — навеяны этим городом, но это художественные реконструкции, а не изображения конкретных зданий.',
        ],
      },
      en: {
        title: 'Samarkand of Timur and Ulugh Beg',
        lead: 'The capital for which Timur brought craftsmen from every corner of his empire.',
        body: [
          'Timur made Samarkand his capital and adorned it with buildings, bringing craftsmen from conquered cities. In his time the Bibi-Khanym congregational mosque (1399–1404) and the Gur-e Amir mausoleum (begun 1403), where he lies, were built.',
          'Timur’s grandson Ulugh Beg, a ruler and astronomer, built a madrasa on the Registan (1417–1420) and an observatory with a giant sextant. His star tables were the most accurate of their age.',
          'In 2001 Samarkand was inscribed on UNESCO’s World Heritage List as “Samarkand — Crossroad of Cultures”. Our rooms, the gate, the iwan, the madrasa, the observatory, are inspired by the city, but they are artistic reconstructions, not pictures of particular buildings.',
        ],
      },
    },
    sources: [UNESCO],
  },
  {
    id: 'afrasiab', shelf: 'places', image: './img/h-macro.jpg',
    text: {
      ru: {
        title: 'Афрасиаб: одни из древнейших шахмат',
        lead: 'Семь костяных фигур из древнего Самарканда — свидетельство, что шахматы играли здесь задолго до Тимура.',
        body: [
          'Афрасиаб — городище древнего Самарканда, оставленное после монгольского нашествия. В 1977 году археолог Юрий Буряков нашёл там семь маленьких фигур из слоновой кости.',
          'Набор считают одним из древнейших известных: датировки разнятся от середины VII до середины VIII века, а найденная рядом монета датирована 761 годом. Среди фигур называют короля, визиря, колесницу, слона, всадников и пехотинца — то есть уже узнаваемый шахматный строй.',
          'Фигуры хранятся в Самарканде. Находка показывает, что за семьсот лет до великих шахмат Тимура в этом городе уже играли в шахматы.',
        ],
      },
      en: {
        title: 'Afrasiab: among the oldest chessmen',
        lead: 'Seven ivory pieces from ancient Samarkand, evidence that chess was played here long before Timur.',
        body: [
          'Afrasiab is the site of ancient Samarkand, abandoned after the Mongol conquest. In 1977 the archaeologist Yuri Buryakov found seven small ivory pieces there.',
          'The set is counted among the oldest known: datings range from the mid-seventh to the mid-eighth century, and a coin found with it is dated 761. The pieces are described as a king, a vizier, a chariot, an elephant, horsemen and a foot soldier, already a recognisable chess army.',
          'The pieces are kept in Samarkand. The find shows that chess was played in this city some seven centuries before Timur’s great chess.',
        ],
      },
    },
    sources: [CB_OLDEST, CHESSCOM_PIECES],
  },
];

export interface ChronicleRow { year: string; ru: string; en: string }

export const CHRONICLE: ChronicleRow[] = [
  { year: 'VI в.', ru: 'Шатрандж приходит из Индии в Персию.', en: 'Shatranj reaches Persia from India.' },
  { year: '~760', ru: 'Шахматные фигуры Афрасиаба, древний Самарканд.', en: 'The Afrasiab chessmen, ancient Samarkand.' },
  { year: '1340-е', ru: 'Аль-Амули описывает доску великих шахмат в «Нафаис аль-фунун».', en: 'Al-Amuli describes the great chess board in Nafa’is al-funun.' },
  { year: '1370–1405', ru: 'Правление Тимура; большие шахматы при его дворе.', en: 'Timur’s reign; great chess at his court.' },
  { year: '1377', ru: 'Рождение Шахруха — по преданию, во время партии.', en: 'Birth of Shah Rukh, by tradition during a game.' },
  { year: 'XV в.', ru: 'Персидский «Трактат о шахматах» (сегодня MS 211 в Лондоне).', en: 'The Persian “Treatise on Chess” (now MS 211 in London).' },
  { year: '1417–1420', ru: 'Медресе Улугбека на Регистане.', en: 'Ulugh Beg’s madrasa on the Registan.' },
  { year: '1435', ru: 'Ибн Арабшах заканчивает биографию Тимура.', en: 'Ibn Arabshah completes his life of Timur.' },
  { year: '1694', ru: 'Томас Хайд, «О восточных играх», Оксфорд.', en: 'Thomas Hyde, On Oriental Games, Oxford.' },
  { year: '1836', ru: 'Трактат поступает в Королевское азиатское общество.', en: 'The treatise enters the Royal Asiatic Society.' },
  { year: '1847', ru: 'Доклад Натаниэля Бленда о персидских шахматах.', en: 'Nathaniel Bland’s paper on Persian chess.' },
  { year: '1860', ru: '«История шахмат» Дункана Форбса.', en: 'Duncan Forbes, The History of Chess.' },
  { year: '1913', ru: '«История шахмат» Гарольда Мюррея.', en: 'Harold Murray, A History of Chess.' },
  { year: '1977', ru: 'Находка фигур на Афрасиабе.', en: 'The Afrasiab chessmen are found.' },
  { year: '2001', ru: 'Самарканд — объект Всемирного наследия ЮНЕСКО.', en: 'Samarkand becomes a UNESCO World Heritage site.' },
];
