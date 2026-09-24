// A short course of one-move tasks: one per unusual piece, then the special rules.

import { Side, sqFromName } from './engine/geometry';
import * as P from './engine/pieces';
import { DEFAULT_RULES, Move, SWAP, RELOCATE } from './engine/position';
import { Game, MoveRecord } from './engine/game';
import type { Lang } from './i18n';

export type Goal =
  | { type: 'capture'; sq: string }
  | { type: 'win' }
  | { type: 'citadel' }
  | { type: 'swap' }
  | { type: 'relocate' }
  | { type: 'promote'; to: number };

interface Text {
  title: string;
  task: string;
  done: string;
}

export interface Puzzle {
  id: string;
  side: Side;
  /** "w giraffe d2" */
  men: string[];
  goal: Goal;
  /** Sides that have already spent their king swap. */
  swapUsed?: [number, number];
  text: Record<Lang, Text>;
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'general', side: 0, goal: { type: 'capture', sq: 'f5' },
    men: ['w king a1', 'b king k10', 'w general e4', 'b pawnRook f5', 'b pawnKnight e5'],
    text: {
      ru: { title: 'Генерал', task: 'Генерал ходит и бьёт только на одну клетку по диагонали. Возьмите пешку.', done: 'Пешку прямо перед собой генерал взять не может — только по диагонали.' },
      en: { title: 'The general', task: 'The general moves and captures one square diagonally. Take a pawn.', done: 'He cannot take the pawn straight ahead: diagonals only.' },
      uz: { title: 'General', task: 'General diagonal bo‘ylab faqat bir katak yuradi va oladi. Piyodani oling.', done: 'General to‘g‘ri oldindagi piyodani ololmaydi — faqat diagonal bo‘ylab.' },
      tr: { title: 'General', task: 'General yalnız çapraz bir kare gider ve alır. Piyonu alın.', done: 'Tam önündeki piyonu alamaz: yalnız çapraz.' },
      zh: { title: '将军', task: '将军只能斜走一格并斜吃。请吃掉一枚兵。', done: '它吃不到正前方的兵——只能斜吃。' },
      hi: { title: 'सेनापति', task: 'सेनापति केवल तिरछे एक घर चलता और पकड़ता है। प्यादा पकड़ें।', done: 'ठीक सामने का प्यादा वह नहीं पकड़ सकता — केवल तिरछे।' },
    },
  },
  {
    id: 'elephant', side: 0, goal: { type: 'capture', sq: 'e3' },
    men: ['w king a1', 'b king k10', 'w elephant c1', 'w vizier d2', 'b knight e3'],
    text: {
      ru: { title: 'Слон', task: 'Слон прыгает ровно через одну клетку по диагонали. Возьмите коня.', done: 'Свой визирь на пути не помешал: слон перепрыгивает фигуры.' },
      en: { title: 'The elephant', task: 'The elephant leaps exactly two squares diagonally. Take the knight.', done: 'Your own vizier in between did not matter: the elephant jumps.' },
      uz: { title: 'Fil', task: 'Fil diagonal bo‘ylab roppa-rosa bir katak orqali sakraydi. Otni oling.', done: 'Yo‘ldagi o‘z vaziringiz xalaqit bermadi: fil donalar ustidan sakraydi.' },
      tr: { title: 'Fil', task: 'Fil çaprazda tam bir kare üzerinden sıçrar. Atı alın.', done: 'Aradaki kendi vezirinizin önemi yoktu: fil sıçrar.' },
      zh: { title: '大象', task: '大象斜向恰好跳过一格。请吃掉骑士。', done: '中间的己方维齐尔不碍事：大象会跳。' },
      hi: { title: 'हाथी', task: 'हाथी तिरछे ठीक एक घर फाँदकर छलाँग लगाता है। घोड़ा पकड़ें।', done: 'रास्ते में अपना वज़ीर बाधा नहीं बना: हाथी फाँदता है।' },
    },
  },
  {
    id: 'engine', side: 0, goal: { type: 'capture', sq: 'e3' },
    men: ['w king a1', 'b king k10', 'w engine e1', 'w pawnRook e2', 'b camel e3'],
    text: {
      ru: { title: 'Осадная башня', task: 'Осадная башня прыгает ровно через одну клетку по прямой. Возьмите верблюда.', done: 'Как и слон, башня перепрыгивает фигуры — но ходит по прямой.' },
      en: { title: 'The war engine', task: 'The war engine leaps exactly two squares orthogonally. Take the camel.', done: 'Like the elephant it jumps, but in straight lines.' },
      uz: { title: 'Qamal minorasi', task: 'Qamal minorasi to‘g‘ri chiziq bo‘ylab roppa-rosa bir katak orqali sakraydi. Tuyani oling.', done: 'Fil kabi minora ham donalar ustidan sakraydi — lekin to‘g‘ri chiziq bo‘ylab.' },
      tr: { title: 'Kuşatma kulesi', task: 'Kuşatma kulesi düz çizgide tam bir kare üzerinden sıçrar. Deveyi alın.', done: 'Fil gibi sıçrar ama düz çizgide gider.' },
      zh: { title: '攻城塔', task: '攻城塔在直线上恰好跳过一格。请吃掉骆驼。', done: '和大象一样它会跳——但走直线。' },
      hi: { title: 'घेराबंदी मीनार', task: 'घेराबंदी मीनार सीधी रेखा में ठीक एक घर फाँदकर छलाँग लगाती है। ऊँट पकड़ें।', done: 'हाथी की तरह मीनार भी फाँदती है — पर सीधी रेखा में।' },
    },
  },
  {
    id: 'camel', side: 0, goal: { type: 'capture', sq: 'f2' },
    men: ['w king a1', 'b king k10', 'w camel c1', 'w pawnRook d1', 'w pawnKnight d2', 'b rook f2', 'b pawnRook e2'],
    text: {
      ru: { title: 'Верблюд', task: 'Верблюд — удлинённый конь: одна клетка в сторону и три вдоль. Возьмите ладью.', done: 'Верблюд перепрыгнул всё на пути. Он всегда остаётся на клетках одного цвета.' },
      en: { title: 'The camel', task: 'The camel is a stretched knight: one square one way, three the other. Take the rook.', done: 'It jumped everything in between. A camel never changes square colour.' },
      uz: { title: 'Tuya', task: 'Tuya — uzaytirilgan ot: bir katak yonga va uch katak bo‘ylama. Ruxni oling.', done: 'Tuya yo‘ldagi hamma narsadan sakrab o‘tdi. U doim bir rangdagi kataklarda qoladi.' },
      tr: { title: 'Deve', task: 'Deve uzatılmış bir attır: bir kare yana, üç kare öteye. Kaleyi alın.', done: 'Aradaki her şeyin üzerinden atladı. Deve kare rengini asla değiştirmez.' },
      zh: { title: '骆驼', task: '骆驼是加长版的骑士：横一格、纵三格。请吃掉战车。', done: '骆驼越过了路上的一切。它永远停留在同色格上。' },
      hi: { title: 'ऊँट', task: 'ऊँट लंबा घोड़ा है: एक घर बग़ल और तीन घर आगे। रुख़ पकड़ें।', done: 'ऊँट ने रास्ते की हर चीज़ फाँद दी। वह हमेशा एक ही रंग के घर पर रहता है।' },
    },
  },
  {
    id: 'picket', side: 0, goal: { type: 'capture', sq: 'g6' },
    men: ['w king a1', 'b king k10', 'w picket c2', 'b giraffe g6', 'b knight d1'],
    text: {
      ru: { title: 'Дозорный', task: 'Дозорный ходит как слон из обычных шахмат, но не ближе чем на две клетки. Возьмите жирафа.', done: 'Коня на соседней клетке дозорный взять не мог: шаг на одну клетку ему запрещён.' },
      en: { title: 'The picket', task: 'The picket moves like a modern bishop, but never fewer than two squares. Take the giraffe.', done: 'The knight next door was safe: the picket cannot make a one-square step.' },
      uz: { title: 'Qorovul', task: 'Qorovul oddiy shaxmatdagi fil kabi yuradi, lekin ikki katakdan yaqin emas. Jirafani oling.', done: 'Qo‘shni katakdagi otni qorovul ololmasdi: bir katakka qadam unga taqiqlangan.' },
      tr: { title: 'Gözcü', task: 'Gözcü modern fil gibi gider ama iki kareden yakın olmaz. Zürafayı alın.', done: 'Yandaki at güvendeydi: gözcü tek kare adım atamaz.' },
      zh: { title: '哨兵', task: '哨兵像现代的象，但至少走两格。请吃掉长颈鹿。', done: '旁边的骑士很安全：哨兵不能只走一格。' },
      hi: { title: 'चौकीदार', task: 'चौकीदार आधुनिक बिशप की तरह चलता है, पर दो घर से कम नहीं। जिराफ़ पकड़ें।', done: 'बग़ल का घोड़ा सुरक्षित था: चौकीदार एक घर का कदम नहीं चल सकता।' },
    },
  },
  {
    id: 'giraffe', side: 0, goal: { type: 'capture', sq: 'i1' },
    men: ['w king a3', 'b king k10', 'w giraffe d2', 'b rook i1', 'b knight d6', 'b pawnRook e4'],
    text: {
      ru: { title: 'Жираф', task: 'Жираф: одна клетка по диагонали, затем не меньше трёх по прямой. Возьмите ладью.', done: 'Путь e1–f1–g1–h1 был свободен. Коня на d6 жираф достать не мог: пешка e4 перекрыла дорогу.' },
      en: { title: 'The giraffe', task: 'The giraffe: one square diagonally, then at least three straight on. Take the rook.', done: 'The path e1–f1–g1–h1 was clear. The knight on d6 was out of reach: the pawn on e4 blocks that road.' },
      uz: { title: 'Jirafa', task: 'Jirafa: diagonal bo‘ylab bir katak, keyin to‘g‘ri chiziq bo‘ylab kamida uch katak. Ruxni oling.', done: 'e1–f1–g1–h1 yo‘li bo‘sh edi. d6 dagi otga jirafa yeta olmasdi: e4 piyodasi yo‘lni to‘sdi.' },
      tr: { title: 'Zürafa', task: 'Zürafa: çapraz bir kare, sonra düz en az üç kare. Kaleyi alın.', done: 'e1–f1–g1–h1 yolu açıktı. d6’daki ata ulaşamazdı: e4 piyonu yolu kesiyor.' },
      zh: { title: '长颈鹿', task: '长颈鹿：先斜走一格，再直走至少三格。请吃掉战车。', done: 'e1–f1–g1–h1 这条路是通的。d6 上的骑士够不着：e4 的兵挡住了路。' },
      hi: { title: 'जिराफ़', task: 'जिराफ़: तिरछे एक घर, फिर सीधे कम से कम तीन घर। रुख़ पकड़ें।', done: 'रास्ता e1–f1–g1–h1 खाली था। d6 का घोड़ा पहुँच से बाहर था: e4 का प्यादा रास्ता रोकता है।' },
    },
  },
  {
    id: 'prince', side: 0, goal: { type: 'promote', to: P.PRINCE },
    men: ['w king a1', 'b king k10', 'w pawnKing e9', 'w pawnGiraffe h9', 'b rook a5'],
    text: {
      ru: { title: 'Пешка короля', task: 'Каждая пешка превращается только в свою фигуру. Получите принца — второго короля.', done: 'Теперь у белых два короля. Пока их двое, шаха и мата для белых нет — но любого короля можно взять.' },
      en: { title: 'The king\'s pawn', task: 'Every pawn promotes to its own piece only. Make a prince, a second king.', done: 'White now has two kings. While there are two, White cannot be checked or mated, but either king can be captured.' },
      uz: { title: 'Shoh piyodasi', task: 'Har bir piyoda faqat o‘z donasiga aylanadi. Shahzoda — ikkinchi shohni oling.', done: 'Endi oqlarda ikki shoh. Ular ikkita ekan, oqlarga kisht va mot yo‘q — lekin istalgan shohni olish mumkin.' },
      tr: { title: 'Şahın piyonu', task: 'Her piyon yalnız kendi taşına dönüşür. Bir şehzade — ikinci şah — yapın.', done: 'Beyazların artık iki şahı var. İki oldukları sürece şah ve mat yok, ama ikisi de alınabilir.' },
      zh: { title: '王兵', task: '每枚兵只能升变为自己的棋子。请升变出王子——第二位国王。', done: '白方现在有两位国王。有两位时白方不会被将军或将死，但任何一位都可能被吃。' },
      hi: { title: 'राजा का प्यादा', task: 'हर प्यादा केवल अपने मोहरे में बदलता है। राजकुमार — दूसरा राजा — बनाएँ।', done: 'अब सफ़ेद के पास दो राजा हैं। जब तक दो हैं, सफ़ेद को शह-मात नहीं — पर कोई भी राजा पकड़ा जा सकता है।' },
    },
  },
  {
    id: 'royal', side: 0, goal: { type: 'capture', sq: 'e6' },
    men: ['w king a1', 'b king k10', 'b prince e6', 'w rook e1', 'b pawnRook d7'],
    text: {
      ru: { title: 'Два короля', task: 'У синих король и принц. Пока королей двое, их бьют как обычные фигуры. Возьмите принца.', done: 'Принц взят. У синих остался один король — теперь ему снова можно объявлять шах и мат.' },
      en: { title: 'Two kings', task: 'Blue has a king and a prince. While there are two, they are captured like ordinary pieces. Take the prince.', done: 'The prince is gone. Blue is down to one king, who can be checked and mated again.' },
      uz: { title: 'Ikki shoh', task: 'Ko‘klarda shoh va shahzoda bor. Shohlar ikkita ekan, ularni oddiy dona kabi olishadi. Shahzodani oling.', done: 'Shahzoda olindi. Ko‘klarda bitta shoh qoldi — endi unga yana kisht va mot berish mumkin.' },
      tr: { title: 'İki şah', task: 'Mavilerin şahı ve şehzadesi var. İki oldukları sürece sıradan taş gibi alınırlar. Şehzadeyi alın.', done: 'Şehzade gitti. Mavilerin tek şahı kaldı — artık yine şah ve mat edilebilir.' },
      zh: { title: '两位国王', task: '蓝方有国王和王子。有两位时，它们像普通棋子一样可被吃。请吃掉王子。', done: '王子被吃了。蓝方只剩一位国王——又可以被将军和将死了。' },
      hi: { title: 'दो राजा', task: 'नीले के पास राजा और राजकुमार हैं। जब तक दो हैं, उन्हें साधारण मोहरों की तरह पकड़ा जाता है। राजकुमार पकड़ें।', done: 'राजकुमार गया। नीले के पास एक राजा बचा — अब उसे फिर शह-मात दी जा सकती है।' },
    },
  },
  {
    id: 'mate', side: 0, goal: { type: 'win' },
    men: ['w king a1', 'b king k10', 'w rook a9', 'w rook b1', 'b pawnRook e5'], swapUsed: [0, 1],
    text: {
      ru: { title: 'Мат', task: 'Поставьте мат в один ход.', done: 'Шах мат! Свой единственный обмен короля синие уже истратили, так что спасения нет.' },
      en: { title: 'Checkmate', task: 'Mate in one.', done: 'Shah mat! Blue has already spent the one king swap, so there is no escape.' },
      uz: { title: 'Mot', task: 'Bir yurishda mot qiling.', done: 'Shoh mot! Ko‘klar yagona shoh almashinuvini allaqachon sarflagan, qutulish yo‘q.' },
      tr: { title: 'Mat', task: 'Tek hamlede mat edin.', done: 'Şah mat! Maviler tek şah takasını çoktan harcadı, kaçış yok.' },
      zh: { title: '将死', task: '一步将死。', done: '将死！蓝方已经用掉了唯一的国王换位，无路可逃。' },
      hi: { title: 'शह-मात', task: 'एक चाल में मात दें।', done: 'शह-मात! नीले अपनी एकमात्र राजा-अदला-बदली पहले ही खर्च कर चुके, बचाव नहीं।' },
    },
  },
  {
    id: 'stalemate', side: 0, goal: { type: 'win' },
    men: ['w king j8', 'b king k10', 'w knight f8'],
    text: {
      ru: { title: 'Пат — это победа', task: 'В великих шахматах тот, кому нечем ходить, проигрывает. Запатуйте короля.', done: 'Королю некуда идти, а шаха нет. В обычных шахматах — ничья, здесь — ваша победа.' },
      en: { title: 'Stalemate wins', task: 'In the great chess the player with no move loses. Stalemate the king.', done: 'The king has no move and is not in check. A draw in modern chess; a win here.' },
      uz: { title: 'Pat — bu g‘alaba', task: 'Buyuk shaxmatda yurishi yo‘q tomon yutqazadi. Shohni pat qiling.', done: 'Shohga yuradigan joy yo‘q, kisht ham yo‘q. Oddiy shaxmatda — durang, bu yerda — sizning g‘alabangiz.' },
      tr: { title: 'Pat kazandırır', task: 'Büyük satrançta hamlesi olmayan kaybeder. Şahı pat edin.', done: 'Şahın hamlesi yok ve şah altında değil. Modern satrançta berabere; burada sizin zaferiniz.' },
      zh: { title: '逼和即胜', task: '在大象棋中，无子可动的一方判负。请逼和对方国王。', done: '国王无路可走，又没被将军。在现代象棋里是和棋，在这里是你的胜利。' },
      hi: { title: 'गतिरोध जीत है', task: 'महान शतरंज में जिसके पास चाल नहीं, वह हारता है। राजा को गतिरोध में डालें।', done: 'राजा के पास चाल नहीं और शह भी नहीं। साधारण शतरंज में ड्रॉ, यहाँ आपकी जीत।' },
    },
  },
  {
    id: 'citadel', side: 0, goal: { type: 'citadel' },
    men: ['w king a8', 'b king g9', 'b rook e5', 'b rook h3', 'b giraffe d9', 'b knight f6'],
    text: {
      ru: { title: 'Цитадель', task: 'Вы безнадёжно проигрываете. Спасите партию: уведите короля в цитадель соперника.', done: 'Ничья! Король, вошедший в цитадель соперника, заканчивает партию миром.' },
      en: { title: 'The citadel', task: 'You are hopelessly lost. Save the game: take your king into the opponent\'s citadel.', done: 'Drawn! A king who enters the opponent\'s citadel ends the game in peace.' },
      uz: { title: 'Qal’a', task: 'Siz umidsiz yutqazyapsiz. O‘yinni saqlang: shohni raqib qal’asiga olib kiring.', done: 'Durang! Raqib qal’asiga kirgan shoh o‘yinni tinchlik bilan tugatadi.' },
      tr: { title: 'Kale', task: 'Umutsuzca kaybediyorsunuz. Oyunu kurtarın: şahınızı rakibin kalesine sokun.', done: 'Berabere! Rakibin kalesine giren şah oyunu barışla bitirir.' },
      zh: { title: '堡垒', task: '你已无望取胜。挽救对局：把国王送进对方堡垒。', done: '和棋！进入对方堡垒的国王让对局以和局收场。' },
      hi: { title: 'गढ़', task: 'आप निराशाजनक रूप से हार रहे हैं। खेल बचाएँ: राजा को प्रतिद्वंद्वी के गढ़ में ले जाएँ।', done: 'ड्रॉ! प्रतिद्वंद्वी के गढ़ में गया राजा खेल को शांति से समाप्त करता है।' },
    },
  },
  {
    id: 'swap', side: 0, goal: { type: 'swap' },
    men: ['w king f1', 'b king k10', 'b rook e10', 'b rook f10', 'b rook g10', 'w knight a5'],
    text: {
      ru: { title: 'Обмен короля', task: 'Вам шах, и отступать некуда. Один раз за партию шах может поменяться местами со своей фигурой. Нажмите «Обмен короля».', done: 'Шах поменялся местами с конём и спасся. Второй раз за партию так сделать нельзя.' },
      en: { title: 'The king\'s swap', task: 'You are in check with nowhere to go. Once per game the king may change places with one of his men. Press "King swap".', done: 'The king changed places with the knight and escaped. He cannot do it again this game.' },
      uz: { title: 'Shoh almashinuvi', task: 'Sizga kisht, chekinishga joy yo‘q. O‘yinda bir marta shoh o‘z donasi bilan o‘rin almasha oladi. «Shoh almashinuvi» ni bosing.', done: 'Shoh ot bilan o‘rin almashdi va qutuldi. O‘yinda ikkinchi marta bunday qilib bo‘lmaydi.' },
      tr: { title: 'Şah takası', task: 'Şah altındasınız, kaçacak yer yok. Oyunda bir kez şah kendi taşıyla yer değiştirebilir. «Şah takası»na basın.', done: 'Şah atla yer değiştirip kurtuldu. Bu oyunda bir daha yapamaz.' },
      zh: { title: '国王换位', task: '你被将军且无路可退。每局一次，国王可与己方棋子换位。请按“国王换位”。', done: '国王与骑士换位脱险。本局不能再用第二次。' },
      hi: { title: 'राजा की अदला-बदली', task: 'आपको शह है और पीछे हटने की जगह नहीं। खेल में एक बार राजा अपने मोहरे से जगह बदल सकता है। «राजा की अदला-बदली» दबाएँ।', done: 'राजा ने घोड़े से जगह बदली और बच गया। इस खेल में दोबारा ऐसा नहीं हो सकता।' },
    },
  },
  {
    id: 'relocate', side: 0, goal: { type: 'relocate' },
    men: ['w king a1', 'b king k10', 'w pawnPawn c10', 'b knight f7', 'b picket h7', 'b pawnRook g6'],
    text: {
      ru: { title: 'Пешка пешек', task: 'Пешка пешек дошла до конца и ждёт. Перенесите её туда, где она нападёт сразу на две фигуры: нажмите на неё и выберите отмеченную клетку.', done: 'Вилка! Пешка, стоявшая на этой клетке, снята с доски. Дойдя до конца ещё дважды, пешка пешек станет королём.' },
      en: { title: 'The pawn of pawns', task: 'The pawn of pawns has arrived and waits. Lift it to where it forks two pieces: tap it and choose a marked square.', done: 'A fork! The pawn that stood there is removed. Two more journeys and the pawn of pawns becomes a king.' },
      uz: { title: 'Piyodalar piyodasi', task: 'Piyodalar piyodasi oxiriga yetib kutmoqda. Uni ikki donaga birdan hujum qiladigan joyga ko‘chiring: unga bosing va belgilangan katakni tanlang.', done: 'Vilka! O‘sha katakda turgan piyoda taxtadan olindi. Yana ikki marta oxiriga yetsa, piyodalar piyodasi shohga aylanadi.' },
      tr: { title: 'Piyonların piyonu', task: 'Piyonların piyonu sona ulaştı ve bekliyor. Onu iki taşa çatal atacağı yere taşıyın: ona dokunun ve işaretli kareyi seçin.', done: 'Çatal! O karedeki piyon kaldırıldı. İki yolculuk daha, piyonların piyonu şah olur.' },
      zh: { title: '兵中之兵', task: '兵中之兵已到底线并在等待。把它移到能同时捉双的地方：点击它并选择标记的格子。', done: '捉双！原来在那格上的兵被移除。再走两程，兵中之兵就会成为国王。' },
      hi: { title: 'प्यादों का प्यादा', task: 'प्यादों का प्यादा अंत तक पहुँचकर प्रतीक्षा कर रहा है। उसे वहाँ रखें जहाँ से वह दो मोहरों पर हमला करे: उस पर टैप करें और चिह्नित घर चुनें।', done: 'दोहरा हमला! उस घर का प्यादा हटा दिया गया। दो यात्राएँ और, फिर प्यादों का प्यादा राजा बनेगा।' },
    },
  },
];

export function buildPuzzle(p: Puzzle): Game {
  const men: [number, number][] = p.men.map((s) => {
    const [side, id, sq] = s.split(' ');
    const type = P.TYPE_ID.indexOf(id);
    if (type <= 0) throw new Error(`Unknown piece ${id}`);
    return [sqFromName(sq), side === 'w' ? type : -type];
  });
  return Game.fromSetup(DEFAULT_RULES, men, p.side, p.swapUsed);
}

export function goalMet(p: Puzzle, game: Game, rec: MoveRecord): boolean {
  const g = p.goal;
  switch (g.type) {
    case 'capture': return rec.captured !== 0 && rec.to === sqFromName(g.sq) && rec.kind !== RELOCATE;
    case 'win': return game.result?.winner === p.side;
    case 'citadel': return game.result?.reason === 'citadel';
    case 'swap': return rec.kind === SWAP;
    case 'relocate': return rec.kind === RELOCATE;
    case 'promote': return rec.becomes === g.to && rec.piece !== g.to;
  }
}

/** Every legal move that solves the puzzle. */
export function solutions(p: Puzzle): Move[] {
  const game = buildPuzzle(p);
  const out: Move[] = [];
  for (const m of [...game.legalMoves()]) {
    const rec = game.play(m);
    if (goalMet(p, game, rec)) out.push(m);
    game.undo();
  }
  return out;
}

const SOLVED_KEY = 'tc.puzzles';
export function solvedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SOLVED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
export function markSolved(id: string): void {
  const ids = solvedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(SOLVED_KEY, JSON.stringify(ids));
  }
}
