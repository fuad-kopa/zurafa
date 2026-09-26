// Historical battles of Timur as scenarios: an asymmetric array on a terrain map.
// Timur is always White (the bottom side); the player may take either army.

import { Game, SetupSpec } from './engine/game';
import { DEFAULT_RULES } from './engine/position';
import { Side, sqFromName } from './engine/geometry';
import * as P from './engine/pieces';
import type { Lang } from './i18n';

export interface BattleText {
  title: string;
  /** date and place, one line */
  place: string;
  story: string;
  /** what Timur's army is like in this scenario */
  timur: string;
  /** what the enemy army is like */
  enemy: string;
  /** short name of the enemy commander, used as the side name */
  enemyName: string;
  tip: string;
}

export interface Battle {
  id: string;
  year: number;
  /** ranks 1..4 for White (Timur) and 10..7 for the enemy, eleven cells each, '.' = empty */
  white: string[];
  black: string[];
  water: string[];
  hills: string[];
  text: Record<Lang, BattleText>;
}

const L: Record<string, number> = {
  E: P.ELEPHANT, C: P.CAMEL, D: P.WAR_ENGINE, R: P.ROOK, N: P.KNIGHT, T: P.PICKET, Z: P.GIRAFFE, F: P.GENERAL, K: P.KING, W: P.VIZIER,
  PP: P.PAWN_PAWN, DP: P.PAWN_ENGINE, CP: P.PAWN_CAMEL, EP: P.PAWN_ELEPHANT, FP: P.PAWN_GENERAL, KP: P.PAWN_KING, WP: P.PAWN_VIZIER,
  ZP: P.PAWN_GIRAFFE, TP: P.PAWN_PICKET, NP: P.PAWN_KNIGHT, RP: P.PAWN_ROOK,
};
const PAWNS = 'PP DP CP EP FP KP WP ZP TP NP RP';

export const BATTLES: Battle[] = [
  {
    id: 'isfahan', year: 1387,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . . . . . . . . .'],
    black: ['E . . . D . D . . . E', 'R N T . F K W . T N R', PAWNS, '. DP CP EP FP KP WP ZP TP NP RP'],
    water: ['b5', 'c5', 'd5', 'h5', 'i5', 'j5'],
    hills: ['c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'i8'],
    text: {
      ru: { title: 'Исфахан', place: 'ноябрь 1387 · Исфахан, Персия', story: 'Город сдался и заплатил дань, но ночью горожане перебили сборщиков. Тимур взял Исфахан штурмом; расправа над жителями стала одной из самых мрачных страниц его походов.', timur: 'Полное войско; переправа через Заяндеруд по трём мостам.', enemy: 'Ополчение: два ряда пешек на стенах, без жирафов и верблюдов, стены на холмах — пешкам Тимура их не пробить.', enemyName: 'Исфахан', tip: 'Стены не берутся пешками. Ведите через мосты слонов, ладьи и дозорных.' },
      en: { title: 'Isfahan', place: 'November 1387 · Isfahan, Persia', story: 'The city surrendered and paid tribute, but at night the townspeople killed the tax collectors. Timur stormed Isfahan; the reprisal on its people became one of the darkest pages of his campaigns.', timur: 'The full army; three bridges across the Zayanderud.', enemy: 'A militia: two rows of pawns on the walls, no giraffes or camels; the walls stand on hills, out of reach of Timur’s pawns.', enemyName: 'Isfahan', tip: 'Pawns cannot take the walls. Bring elephants, rooks and pickets across the bridges.' },
      uz: { title: 'Isfahon', place: '1387-yil noyabr · Isfahon, Fors', story: 'Shahar taslim bo‘lib o‘lpon to‘ladi, biroq kechasi shaharliklar soliqchilarni o‘ldirdi. Temur Isfahonni hujum bilan oldi; aholiga qilingan jazo uning yurishlaridagi eng qora sahifalardan biri bo‘ldi.', timur: 'To‘liq qo‘shin; Zoyandarud orqali uchta ko‘prik.', enemy: 'Xalq lashkari: devorlarda ikki qator piyoda, jirafa va tuyasiz; devorlar tepaliklarda — Temur piyodalari ularga yetolmaydi.', enemyName: 'Isfahon', tip: 'Devorlarni piyoda ololmaydi. Ko‘priklar orqali fil, rux va qorovullarni o‘tkazing.' },
      tr: { title: 'İsfahan', place: 'Kasım 1387 · İsfahan, İran', story: 'Şehir teslim olup haraç ödedi, ama gece halk vergi toplayıcılarını öldürdü. Timur İsfahan’ı hücumla aldı; halka uygulanan ceza seferlerinin en karanlık sayfalarından biri oldu.', timur: 'Tam ordu; Zayenderud üzerinde üç köprü.', enemy: 'Milis: surlarda iki sıra piyon, zürafa ve deve yok; surlar tepelerde, Timur’un piyonları onlara ulaşamaz.', enemyName: 'İsfahan', tip: 'Surlar piyonla alınmaz. Köprülerden fil, kale ve gözcüleri geçirin.' },
      zh: { title: '伊斯法罕', place: '1387年11月 · 波斯伊斯法罕', story: '城市投降并缴纳贡赋，但当夜市民杀死了税吏。帖木儿强攻伊斯法罕；对居民的报复成为他征战中最黑暗的一页。', timur: '全军；扎因代河上有三座桥。', enemy: '民兵：城墙上两排兵，没有长颈鹿和骆驼；城墙立于山丘之上，帖木儿的兵够不着。', enemyName: '伊斯法罕', tip: '兵攻不下城墙。让象、车和哨兵过桥。' },
      hi: { title: 'इस्फ़हान', place: 'नवंबर 1387 · इस्फ़हान, फ़ारस', story: 'शहर ने आत्मसमर्पण कर ख़िराज दिया, पर रात में नगरवासियों ने कर-वसूलने वालों को मार डाला। तैमूर ने इस्फ़हान पर धावा बोला; निवासियों पर बदला उसके अभियानों के सबसे काले पन्नों में से एक बना।', timur: 'पूरी सेना; ज़ायंदेरूद पर तीन पुल।', enemy: 'नगर-सेना: दीवारों पर प्यादों की दो कतारें, न जिराफ़ न ऊँट; दीवारें पहाड़ियों पर — तैमूर के प्यादे उन तक नहीं पहुँचते।', enemyName: 'इस्फ़हान', tip: 'दीवारें प्यादों से नहीं ली जातीं। पुलों से हाथी, रूक और चौकीदार ले जाएँ।' },
    },
  },
  {
    id: 'kondurcha', year: 1391,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . . . . . . . . .'],
    black: ['E . C . N . N . C . E', 'R N N Z F K W Z N N R', PAWNS, '. . . . . . . . . . .'],
    water: ['b5', 'c5', 'd5', 'e5', 'g6', 'h6', 'i6', 'j6'],
    hills: ['a7', 'k4'],
    text: {
      ru: { title: 'Кондурча', place: '18 июня 1391 · степь за Волгой', story: 'Тимур прошёл через степь к реке Кондурче, чтобы настичь Тохтамыша. Орда была многочисленнее и вся на конях; Тимур разделил войско на семь корпусов и сломал её фланги.', timur: 'Обычный строй: семь корпусов, крепкий центр с генералом и визирем.', enemy: 'Орда: шесть коней вместо дозорных и осадных башен — быстрая, но без дальнего боя.', enemyName: 'Тохтамыш', tip: 'Река проходима только для прыгающих фигур. Держите броды на a, f и k.' },
      en: { title: 'Kondurcha', place: '18 June 1391 · the steppe beyond the Volga', story: 'Timur crossed the steppe to the Kondurcha river to catch Tokhtamysh. The Horde was larger and all mounted; Timur split his army into seven corps and broke its flanks.', timur: 'The usual array: seven corps, a strong centre with general and vizier.', enemy: 'The Horde: six knights in place of pickets and war engines, fast but without long-range pieces.', enemyName: 'Tokhtamysh', tip: 'Only leaping pieces cross the river. Hold the fords on a, f and k.' },
      uz: { title: 'Kondurcha', place: '1391-yil 18-iyun · Volga ortidagi dasht', story: 'Temur To‘xtamishga yetish uchun dashtdan Kondurcha daryosigacha o‘tdi. O‘rda ko‘proq va butunlay otliq edi; Temur qo‘shinni yetti qismga bo‘lib, uning qanotlarini sindirdi.', timur: 'Odatiy saf: yetti qism, general va vazir bilan mustahkam markaz.', enemy: 'O‘rda: qorovul va qamal minoralari o‘rniga oltita ot — tez, lekin uzoqdan urolmaydi.', enemyName: 'To‘xtamish', tip: 'Daryodan faqat sakraydigan donalar o‘tadi. a, f va k dagi kechuvlarni ushlab turing.' },
      tr: { title: 'Kondurça', place: '18 Haziran 1391 · Volga ötesi bozkır', story: 'Timur, Toktamış’a yetişmek için bozkırı aşıp Kondurça ırmağına ulaştı. Orda daha kalabalık ve tamamen atlıydı; Timur ordusunu yedi kola bölüp kanatlarını kırdı.', timur: 'Olağan dizilim: yedi kol, general ve vezirle güçlü merkez.', enemy: 'Orda: gözcü ve kuşatma kuleleri yerine altı at — hızlı ama uzun menzilsiz.', enemyName: 'Toktamış', tip: 'Irmağı yalnızca sıçrayan taşlar geçer. a, f ve k’deki geçitleri tutun.' },
      zh: { title: '孔杜尔恰', place: '1391年6月18日 · 伏尔加河外的草原', story: '帖木儿穿越草原直抵孔杜尔恰河追击脱脱迷失。金帐军更多且全为骑兵；帖木儿把军队分成七军，击破其两翼。', timur: '常规阵形：七军，中军有将军与宰相坐镇。', enemy: '金帐：以六匹马代替哨兵和攻城塔——迅捷，却没有远程子力。', enemyName: '脱脱迷失', tip: '只有跳跃的棋子能过河。守住 a、f、k 线的渡口。' },
      hi: { title: 'कोंदुर्चा', place: '18 जून 1391 · वोल्गा पार का स्टेपी', story: 'तैमूर तोख़्तामिश को पकड़ने के लिए स्टेपी पार कर कोंदुर्चा नदी तक पहुँचा। होर्ड बड़ा और पूरा घुड़सवार था; तैमूर ने सेना को सात दलों में बाँटकर उसके पार्श्व तोड़ दिए।', timur: 'सामान्य व्यूह: सात दल, सेनापति और वज़ीर के साथ मज़बूत केंद्र।', enemy: 'होर्ड: चौकीदार और घेराबंदी मीनारों की जगह छह घोड़े — तेज़, पर दूर तक मार नहीं।', enemyName: 'तोख़्तामिश', tip: 'नदी सिर्फ़ कूदने वाले मोहरे पार करते हैं। a, f और k के घाट सँभालें।' },
    },
  },
  {
    id: 'terek', year: 1395,
    white: ['E . C . . . . . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . D . . . D . . .'],
    black: ['E . C . D . D . C . E', 'R N N Z F K W Z N N R', PAWNS, '. . N . . . . . N . .'],
    water: ['a5', 'b5', 'c5', 'd5', 'h5', 'i5', 'j5', 'k5'],
    hills: ['b4', 'j4'],
    text: {
      ru: { title: 'Терек', place: '15 апреля 1395 · берег Терека, Кавказ', story: 'Второй поход на Тохтамыша. Тимур укрепился за возами и щитами, отбил натиск Орды и сам перешёл в наступление; Золотая Орда после этого уже не оправилась.', timur: 'Осадные башни выдвинуты вперёд как вагенбург; за ними обычный строй.', enemy: 'Орда с лишними конями и двумя конными отрядами уже за рекой.', enemyName: 'Тохтамыш', tip: 'Брод только в центре, e–g. Сначала выдержите удар, потом наступайте.' },
      en: { title: 'Terek', place: '15 April 1395 · the Terek bank, Caucasus', story: 'The second campaign against Tokhtamysh. Timur fortified himself behind wagons and shields, beat off the Horde’s charge and went over to the attack; the Golden Horde never recovered.', timur: 'War engines pushed forward as a wagon fort; the usual array behind them.', enemy: 'The Horde with extra knights and two mounted detachments already across the river.', enemyName: 'Tokhtamysh', tip: 'The only ford is in the centre, e to g. Take the charge first, then advance.' },
      uz: { title: 'Terek', place: '1395-yil 15-aprel · Terek qirg‘og‘i, Kavkaz', story: 'To‘xtamishga ikkinchi yurish. Temur aravalar va qalqonlar ortida mustahkamlandi, O‘rda hujumini qaytardi va o‘zi hujumga o‘tdi; Oltin O‘rda bundan keyin o‘nglanmadi.', timur: 'Qamal minoralari arava-qo‘rg‘on sifatida oldinga surilgan; ortida odatiy saf.', enemy: 'Ortiqcha otlar bilan O‘rda va daryoning bu tomonida ikki otliq guruh.', enemyName: 'To‘xtamish', tip: 'Kechuv faqat markazda, e–g. Avval zarbaga bardosh bering, so‘ng hujum qiling.' },
      tr: { title: 'Terek', place: '15 Nisan 1395 · Terek kıyısı, Kafkasya', story: 'Toktamış’a ikinci sefer. Timur araba ve kalkanların ardında tahkim oldu, Orda’nın hücumunu püskürttü ve karşı saldırıya geçti; Altın Orda bir daha toparlanamadı.', timur: 'Kuşatma kuleleri araba kalesi gibi öne sürülmüş; arkada olağan dizilim.', enemy: 'Fazladan atlarla Orda ve ırmağı çoktan geçmiş iki atlı birlik.', enemyName: 'Toktamış', tip: 'Tek geçit merkezde, e–g. Önce darbeyi karşılayın, sonra ilerleyin.' },
      zh: { title: '捷列克河', place: '1395年4月15日 · 高加索捷列克河畔', story: '第二次征讨脱脱迷失。帖木儿以车阵和盾墙固守，击退金帐军冲锋后转入反攻；金帐汗国自此一蹶不振。', timur: '攻城塔前推为车阵；其后是常规阵形。', enemy: '金帐军多出几匹马，且有两支骑队已渡过河。', enemyName: '脱脱迷失', tip: '渡口只在中路 e–g。先顶住冲击，再前进。' },
      hi: { title: 'तेरेक', place: '15 अप्रैल 1395 · तेरेक तट, काकेशस', story: 'तोख़्तामिश पर दूसरा अभियान। तैमूर ने गाड़ियों और ढालों के पीछे मोर्चा बाँधा, होर्ड का हमला रोका और ख़ुद आक्रमण किया; गोल्डन होर्ड फिर कभी नहीं सँभला।', timur: 'घेराबंदी मीनारें गाड़ी-क़िले की तरह आगे; पीछे सामान्य व्यूह।', enemy: 'अतिरिक्त घोड़ों वाला होर्ड और दो घुड़सवार दल पहले ही नदी पार।', enemyName: 'तोख़्तामिश', tip: 'घाट सिर्फ़ बीच में, e–g। पहले वार झेलें, फिर बढ़ें।' },
    },
  },
  {
    id: 'delhi', year: 1398,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . . C . C . . . .'],
    black: ['E . E . D . D . E . E', 'R N T Z F K W Z T N R', PAWNS, '. . . . . . . . . . .'],
    water: ['a5', 'a6', 'b5', 'b6', 'b7'],
    hills: ['d4', 'e4', 'g4', 'h4'],
    text: {
      ru: { title: 'Дели', place: '17 декабря 1398 · под стенами Дели, у Джамны', story: 'Султан Махмуд вывел в поле сто двадцать боевых слонов. Тимур велел вырыть рвы и пустил навстречу верблюдов с горящей соломой; слоны повернули на своих, и Дели пал.', timur: 'Два лишних верблюда впереди — «огненные верблюды»; рвы прикрывают центр.', enemy: 'Четыре слона вместо двух: тяжёлый, медленный, но страшный удар.', enemyName: 'Султан Дели', tip: 'Слон бьёт через клетку; ставьте фигуры вплотную к нему — так он безопасен.' },
      en: { title: 'Delhi', place: '17 December 1398 · before the walls of Delhi, by the Yamuna', story: 'Sultan Mahmud brought a hundred and twenty war elephants into the field. Timur had ditches dug and sent camels loaded with burning straw against them; the elephants turned on their own side and Delhi fell.', timur: 'Two extra camels in front, the “fire camels”; ditches cover the centre.', enemy: 'Four elephants instead of two: a heavy, slow, terrifying blow.', enemyName: 'Sultan of Delhi', tip: 'The elephant strikes over one square; pieces standing right next to it are safe from it.' },
      uz: { title: 'Dehli', place: '1398-yil 17-dekabr · Dehli devorlari oldida, Jamna bo‘yida', story: 'Sulton Mahmud maydonga yuz yigirma jangovar fil olib chiqdi. Temur xandaqlar qazdirdi va ularga qarshi yonayotgan somon ortilgan tuyalarni yubordi; fillar o‘zlariga qarshi burildi va Dehli qulaði.', timur: 'Oldinda ikkita ortiqcha tuya — «olovli tuyalar»; xandaqlar markazni to‘sadi.', enemy: 'Ikkita o‘rniga to‘rtta fil: og‘ir, sekin, lekin dahshatli zarba.', enemyName: 'Dehli sultoni', tip: 'Fil bir katak orqali uradi; donalarni unga yonma-yon qo‘ying — shunda xavfsiz.' },
      tr: { title: 'Delhi', place: '17 Aralık 1398 · Delhi surları önü, Yamuna kıyısı', story: 'Sultan Mahmud yüz yirmi savaş filini meydana çıkardı. Timur hendekler kazdırdı ve üzerlerine yanan samanla yüklü develer saldı; filler kendi saflarına döndü ve Delhi düştü.', timur: 'Önde iki fazla deve — “ateş develeri”; hendekler merkezi korur.', enemy: 'İki yerine dört fil: ağır, yavaş ama korkunç bir darbe.', enemyName: 'Delhi Sultanı', tip: 'Fil bir kare atlayarak vurur; taşları ona bitişik koyarsanız güvendedir.' },
      zh: { title: '德里', place: '1398年12月17日 · 德里城下，亚穆纳河畔', story: '苏丹马哈茂德带着一百二十头战象出城迎战。帖木儿下令挖掘壕沟，并驱赶驮着燃烧干草的骆驼冲向战象；象群反冲己方，德里陷落。', timur: '前方多出两头骆驼——“火骆驼”；壕沟掩护中路。', enemy: '四头象而非两头：沉重、缓慢，却令人生畏。', enemyName: '德里苏丹', tip: '象隔一格攻击；紧贴着它的棋子反而安全。' },
      hi: { title: 'दिल्ली', place: '17 दिसंबर 1398 · दिल्ली की दीवारों के आगे, यमुना के पास', story: 'सुल्तान महमूद एक सौ बीस युद्ध-हाथी मैदान में लाया। तैमूर ने खाइयाँ खुदवाईं और जलती घास लदे ऊँट उन पर छोड़े; हाथी अपनों पर पलटे और दिल्ली गिर गई।', timur: 'आगे दो अतिरिक्त ऊँट — “आग के ऊँट”; खाइयाँ केंद्र ढकती हैं।', enemy: 'दो की जगह चार हाथी: भारी, धीमा, पर भयानक वार।', enemyName: 'दिल्ली का सुल्तान', tip: 'हाथी एक खाना छोड़कर मारता है; उससे सटे मोहरे सुरक्षित रहते हैं।' },
    },
  },
  {
    id: 'aleppo', year: 1400,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . E . . . E . . .'],
    black: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . R . . . R . . .'],
    water: ['j4', 'k4', 'j5', 'k5', 'k6'],
    hills: ['e7', 'f7', 'g7'],
    text: {
      ru: { title: 'Алеппо', place: '30 октября 1400 · у стен Алеппо, Сирия', story: 'Мамлюки вышли из города навстречу. Тимур поставил в центр слонов, вывезенных из Индии, обошёл фланги и загнал мамлюков обратно к воротам; через три дня взял и цитадель.', timur: 'Два индийских слона в центре впереди строя.', enemy: 'Мамлюки: две лишние ладьи — стены города; холмы прикрывают цитадель.', enemyName: 'Мамлюки', tip: 'Ладьи сильны на открытых линиях. Закройте их пешками и обходите холмы с флангов.' },
      en: { title: 'Aleppo', place: '30 October 1400 · before the walls of Aleppo, Syria', story: 'The Mamluks came out of the city to meet him. Timur put the elephants brought from India in the centre, turned the flanks and drove the Mamluks back to the gates; three days later he took the citadel too.', timur: 'Two Indian elephants in the centre, ahead of the array.', enemy: 'The Mamluks: two extra rooks, the city walls; hills shelter the citadel.', enemyName: 'Mamluks', tip: 'Rooks are strong on open files. Shut them in with pawns and go round the hills on the flanks.' },
      uz: { title: 'Halab', place: '1400-yil 30-oktabr · Halab devorlari oldida, Suriya', story: 'Mamluklar shahardan qarshi chiqdi. Temur Hindistondan olib kelingan fillarni markazga qo‘ydi, qanotlarni aylanib o‘tib mamluklarni darvozaga qaytardi; uch kundan so‘ng qal’ani ham oldi.', timur: 'Safning oldida, markazda ikkita hind fili.', enemy: 'Mamluklar: ikkita ortiqcha rux — shahar devorlari; tepaliklar qal’ani to‘sadi.', enemyName: 'Mamluklar', tip: 'Ruxlar ochiq chiziqlarda kuchli. Ularni piyodalar bilan yoping va tepaliklarni qanotdan aylanib o‘ting.' },
      tr: { title: 'Halep', place: '30 Ekim 1400 · Halep surları önü, Suriye', story: 'Memlükler şehirden çıkıp karşıladı. Timur Hindistan’dan getirdiği filleri merkeze koydu, kanatları dolaşıp Memlükleri kapılara geri sürdü; üç gün sonra kaleyi de aldı.', timur: 'Dizilimin önünde, merkezde iki Hint fili.', enemy: 'Memlükler: iki fazla kale — şehir surları; tepeler iç kaleyi korur.', enemyName: 'Memlükler', tip: 'Kaleler açık hatlarda güçlüdür. Onları piyonlarla kapatın ve tepeleri kanatlardan dolaşın.' },
      zh: { title: '阿勒颇', place: '1400年10月30日 · 叙利亚阿勒颇城下', story: '马穆鲁克出城迎战。帖木儿把从印度带来的战象置于中军，迂回两翼，把马穆鲁克赶回城门；三天后又攻下了城堡。', timur: '两头印度象在阵前中央。', enemy: '马穆鲁克：多出两辆车——城墙；山丘掩护城堡。', enemyName: '马穆鲁克', tip: '车在开放线上强大。用兵封住它们，从两翼绕过山丘。' },
      hi: { title: 'अलेप्पो', place: '30 अक्टूबर 1400 · अलेप्पो की दीवारों के आगे, सीरिया', story: 'मामलूक शहर से निकलकर सामने आए। तैमूर ने भारत से लाए हाथी केंद्र में रखे, पार्श्वों से घेरा और मामलूकों को फाटकों तक खदेड़ दिया; तीन दिन बाद क़िला भी ले लिया।', timur: 'व्यूह के आगे केंद्र में दो भारतीय हाथी।', enemy: 'मामलूक: दो अतिरिक्त रूक — शहर की दीवारें; पहाड़ियाँ क़िले को ढकती हैं।', enemyName: 'मामलूक', tip: 'रूक खुली पंक्तियों में ताक़तवर हैं। उन्हें प्यादों से बंद करें और पहाड़ियों को पार्श्व से घेरें।' },
    },
  },
  {
    id: 'damascus', year: 1401,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . D . . . . . D . .'],
    black: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . N . T . T . N . .'],
    water: ['a6', 'b6', 'j6', 'k6', 'a7', 'k7'],
    hills: ['d8', 'e8', 'f8', 'g8', 'h8'],
    text: {
      ru: { title: 'Дамаск', place: 'январь – март 1401 · под Дамаском, Сирия', story: 'Султан Фарадж привёл войско из Египта, но после стычек ушёл ночью, бросив город. Ибн Хальдун спускался к Тимуру со стены на верёвке для переговоров; Дамаск сдался и был разграблен.', timur: 'Осадные башни выдвинуты к стенам; за ними обычный строй.', enemy: 'Мамлюки: конница и дозорные впереди строя, город на холмах, Барада прикрывает фланги.', enemyName: 'Мамлюки', tip: 'Город на холмах не берётся пешками: подводите осадные башни и слонов.' },
      en: { title: 'Damascus', place: 'January – March 1401 · before Damascus, Syria', story: 'Sultan Faraj brought an army from Egypt, but after skirmishes withdrew by night and abandoned the city. Ibn Khaldun was lowered from the wall on a rope to negotiate; Damascus surrendered and was sacked.', timur: 'War engines pushed up to the walls; the usual array behind them.', enemy: 'The Mamluks: cavalry and pickets ahead of the array, the city on hills, the Barada covering the flanks.', enemyName: 'Mamluks', tip: 'Pawns cannot take a city on hills: bring up the war engines and elephants.' },
      uz: { title: 'Damashq', place: '1401-yil yanvar – mart · Damashq oldida, Suriya', story: 'Sulton Faraj Misrdan qo‘shin olib keldi, lekin to‘qnashuvlardan so‘ng kechasi shaharni tashlab ketdi. Ibn Xaldun muzokara uchun devordan arqon bilan tushirildi; Damashq taslim bo‘ldi va talandi.', timur: 'Qamal minoralari devorlarga yaqin surilgan; ortida odatiy saf.', enemy: 'Mamluklar: safdan oldinda otliqlar va qorovullar, shahar tepaliklarda, Barada qanotlarni to‘sadi.', enemyName: 'Mamluklar', tip: 'Tepalikdagi shaharni piyoda ololmaydi: qamal minoralari va fillarni olib keling.' },
      tr: { title: 'Şam', place: 'Ocak – Mart 1401 · Şam önü, Suriye', story: 'Sultan Ferec Mısır’dan ordu getirdi, ama çatışmalardan sonra gece çekilip şehri bıraktı. İbn Haldun görüşme için surdan iple indirildi; Şam teslim oldu ve yağmalandı.', timur: 'Kuşatma kuleleri surlara sürülmüş; arkada olağan dizilim.', enemy: 'Memlükler: dizilimin önünde süvari ve gözcüler, tepeler üstündeki şehir, kanatları Barada örtüyor.', enemyName: 'Memlükler', tip: 'Tepelerdeki şehir piyonla alınmaz: kuşatma kulelerini ve filleri getirin.' },
      zh: { title: '大马士革', place: '1401年1月至3月 · 叙利亚大马士革城下', story: '苏丹法拉吉从埃及率军而来，几番交锋后却趁夜撤走，弃城而去。伊本·赫勒敦被人用绳索从城墙放下前去谈判；大马士革投降并遭洗劫。', timur: '攻城塔推至城墙前；其后是常规阵形。', enemy: '马穆鲁克：骑兵与哨兵在阵前，城市在山丘上，巴拉达河掩护两翼。', enemyName: '马穆鲁克', tip: '山丘上的城市不能用兵攻取：推上攻城塔和象。' },
      hi: { title: 'दमिश्क', place: 'जनवरी – मार्च 1401 · दमिश्क के आगे, सीरिया', story: 'सुल्तान फ़रज मिस्र से सेना लाया, पर झड़पों के बाद रात में शहर छोड़कर लौट गया। इब्न ख़ल्दून को बातचीत के लिए रस्सी से दीवार से नीचे उतारा गया; दमिश्क ने आत्मसमर्पण किया और लूटा गया।', timur: 'घेराबंदी मीनारें दीवारों तक बढ़ी हुईं; पीछे सामान्य व्यूह।', enemy: 'मामलूक: व्यूह के आगे घुड़सवार और चौकीदार, शहर पहाड़ियों पर, बरादा नदी पार्श्व ढकती है।', enemyName: 'मामलूक', tip: 'पहाड़ियों पर बसा शहर प्यादों से नहीं लिया जाता: घेराबंदी मीनारें और हाथी आगे लाएँ।' },
    },
  },
  {
    id: 'ankara', year: 1402,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . E . . . E . . .'],
    black: ['E . C . D . D . C . E', '. N T Z F K W Z T N .', PAWNS, '. . N . . . . . N . .'],
    water: ['c6', 'd6', 'e6', 'g6', 'h6', 'i6'],
    hills: ['b8', 'j8'],
    text: {
      ru: { title: 'Анкара', place: '28 июля 1402 · равнина Чубук под Анкарой', story: 'Тимур перехватил источники воды, и войско Баязида шло в бой измученным жаждой. В разгар сражения анатолийские бейлики перешли к Тимуру; держались только янычары и сербская конница. Баязид попал в плен.', timur: 'Перевес в силах и два слона в центре; ручей Чубук на его стороне.', enemy: 'Османы без ладей — анатолийские отряды ушли; впереди два коня — сербская тяжёлая конница Стефана Лазаревича.', enemyName: 'Баязид', tip: 'За османов сил меньше: цельтесь в цитадель или в пат — здесь это спасение и победа.' },
      en: { title: 'Ankara', place: '28 July 1402 · the Çubuk plain near Ankara', story: 'Timur seized the water sources, and Bayezid’s army went into battle tormented by thirst. At the height of the fight the Anatolian beyliks went over to Timur; only the janissaries and the Serbian cavalry held. Bayezid was taken prisoner.', timur: 'Superior numbers and two elephants in the centre; the Çubuk stream on his side.', enemy: 'The Ottomans without rooks, the Anatolian contingents gone; two knights in front, Stefan Lazarević’s Serbian heavy cavalry.', enemyName: 'Bayezid', tip: 'The Ottomans are outnumbered: aim for the citadel or a stalemate, which here means safety and victory.' },
      uz: { title: 'Anqara', place: '1402-yil 28-iyul · Anqara yaqinidagi Chubuq tekisligi', story: 'Temur suv manbalarini egalladi va Boyazid qo‘shini jangga tashna holda kirdi. Jang avjida Anado‘li beyliklari Temur tomoniga o‘tdi; faqat yanicharlar va serb otliqlari turdi. Boyazid asirga tushdi.', timur: 'Kuch ustunligi va markazda ikki fil; Chubuq soyi uning tomonida.', enemy: 'Ruxsiz usmonlilar — Anado‘li guruhlari ketgan; oldinda ikki ot — Stefan Lazarevichning serb og‘ir otliqlari.', enemyName: 'Boyazid', tip: 'Usmonlilar tomonida kuch kam: qal’ani yoki patni nishonga oling — bu yerda bu najot va g‘alaba.' },
      tr: { title: 'Ankara', place: '28 Temmuz 1402 · Ankara yakınında Çubuk Ovası', story: 'Timur su kaynaklarını ele geçirdi ve Bayezid’in ordusu savaşa susuzluktan bitkin girdi. Savaşın ortasında Anadolu beylikleri Timur’a geçti; yalnız yeniçeriler ve Sırp süvarisi dayandı. Bayezid esir düştü.', timur: 'Sayı üstünlüğü ve merkezde iki fil; Çubuk çayı onun tarafında.', enemy: 'Kalesiz Osmanlı — Anadolu birlikleri gitmiş; önde iki at, Stefan Lazarević’in Sırp ağır süvarisi.', enemyName: 'Bayezid', tip: 'Osmanlı tarafı güçsüz: iç kaleyi ya da patı hedefleyin — burada bu kurtuluş ve zaferdir.' },
      zh: { title: '安卡拉', place: '1402年7月28日 · 安卡拉附近的丘布克平原', story: '帖木儿夺取了水源，巴耶济德的军队饱受干渴之苦投入战斗。激战中安纳托利亚诸侯倒向帖木儿；只有耶尼切里和塞尔维亚骑兵坚守。巴耶济德被俘。', timur: '兵力占优，中军两头象；丘布克溪在他这一边。', enemy: '奥斯曼军没有车——安纳托利亚部队已离去；前方两匹马是斯特凡·拉扎列维奇的塞尔维亚重骑兵。', enemyName: '巴耶济德', tip: '奥斯曼一方兵力较少：以进入城堡或逼和为目标——在这里那就是生路和胜利。' },
      hi: { title: 'अंकारा', place: '28 जुलाई 1402 · अंकारा के पास चुबुक का मैदान', story: 'तैमूर ने पानी के स्रोत छीन लिए और बायज़ीद की सेना प्यास से बेहाल होकर लड़ी। लड़ाई के बीच अनातोलिया के बेय तैमूर से जा मिले; केवल जैनिसरी और सर्बियाई घुड़सवार डटे रहे। बायज़ीद बंदी बना।', timur: 'संख्या में बढ़त और केंद्र में दो हाथी; चुबुक नाला उसकी ओर।', enemy: 'रूक के बिना उस्मानी — अनातोलियाई दल जा चुके; आगे दो घोड़े, स्तेफ़ान लाज़ारेविच की सर्बियाई भारी घुड़सेना।', enemyName: 'बायज़ीद', tip: 'उस्मानी पक्ष कमज़ोर है: क़िले या पैट का लक्ष्य रखें — यहाँ यही बचाव और जीत है।' },
    },
  },
  {
    id: 'smyrna', year: 1402,
    white: ['E . C . D . D . C . E', 'R N T Z F K W Z T N R', PAWNS, '. . . D . . . D . . .'],
    black: ['. . . E F K W E . . .', '. . R T . D . T R . .', '. . . ZP TP KP WP DP . . .', '. . . . . . . . . . .'],
    water: ['a10', 'b10', 'a9', 'b9', 'a8', 'j10', 'k10', 'j9', 'k9', 'k8'],
    hills: ['d9', 'e9', 'f9', 'g9', 'h9'],
    text: {
      ru: { title: 'Смирна', place: 'декабрь 1402 · Смирна, побережье Эгейского моря', story: 'После Анкары Тимур подошёл к Смирне — крепости рыцарей-госпитальеров, которую османы не могли взять двадцать лет. Он велел засыпать гавань дамбой, отрезав крепость от моря, и взял её за две недели.', timur: 'Полное войско и осадные башни впереди — дамба уже строится.', enemy: 'Гарнизон рыцарей: мало людей, но крепость на скале и море с двух сторон; цитадель — их спасение.', enemyName: 'Госпитальеры', tip: 'За рыцарей: не ищите победы — держитесь и ведите короля в цитадель. За Тимура: море не обойти, идите через центр.' },
      en: { title: 'Smyrna', place: 'December 1402 · Smyrna, the Aegean coast', story: 'After Ankara Timur came to Smyrna, the fortress of the Knights Hospitaller that the Ottomans had failed to take for twenty years. He had the harbour filled in with a mole, cutting the fortress off from the sea, and took it in two weeks.', timur: 'The full army with war engines in front; the mole is already being built.', enemy: 'A garrison of knights: few men, but a fortress on a rock with the sea on two sides; the citadel is their salvation.', enemyName: 'Hospitallers', tip: 'As the knights: do not look for victory, hold on and bring the king to the citadel. As Timur: the sea cannot be turned, go through the centre.' },
      uz: { title: 'Izmir', place: '1402-yil dekabr · Izmir, Egey dengizi sohili', story: 'Anqaradan so‘ng Temur Izmirga — usmonlilar yigirma yil ololmagan gospitalyer ritsarlar qal’asiga keldi. U bandargohni to‘g‘on bilan to‘ldirib qal’ani dengizdan uzdi va uni ikki haftada oldi.', timur: 'To‘liq qo‘shin va oldinda qamal minoralari — to‘g‘on qurilmoqda.', enemy: 'Ritsarlar garnizoni: odam kam, lekin qal’a qoyada va ikki tomonda dengiz; qal’a (sitadel) ularning najoti.', enemyName: 'Gospitalyerlar', tip: 'Ritsarlar uchun: g‘alaba izlamang — chidang va shohni qal’aga olib boring. Temur uchun: dengizni aylanib bo‘lmaydi, markazdan boring.' },
      tr: { title: 'İzmir', place: 'Aralık 1402 · İzmir, Ege kıyısı', story: 'Ankara’dan sonra Timur, Osmanlıların yirmi yıldır alamadığı Hospitalier şövalyelerinin kalesi İzmir’e geldi. Limanı bir setle doldurtup kaleyi denizden kopardı ve iki haftada aldı.', timur: 'Tam ordu ve önde kuşatma kuleleri — set yapılıyor.', enemy: 'Şövalye garnizonu: az adam, ama kaya üstünde kale ve iki yanda deniz; iç kale onların kurtuluşu.', enemyName: 'Hospitalierler', tip: 'Şövalyelerle: zafer aramayın, dayanın ve şahı iç kaleye götürün. Timur’la: deniz dolaşılmaz, merkezden gidin.' },
      zh: { title: '士麦那', place: '1402年12月 · 爱琴海岸士麦那', story: '安卡拉之后，帖木儿来到士麦那——医院骑士团的要塞，奥斯曼人二十年未能攻克。他命人筑堤填港，切断要塞与海的联系，两周便将其攻下。', timur: '全军，攻城塔在前——堤坝正在修筑。', enemy: '骑士团守军：人少，但要塞立于岩上、两面临海；城堡是他们的生路。', enemyName: '医院骑士团', tip: '扮演骑士：不求胜利，坚守并把国王送进城堡。扮演帖木儿：海绕不过去，走中路。' },
      hi: { title: 'स्मिर्ना', place: 'दिसंबर 1402 · स्मिर्ना, एजियन तट', story: 'अंकारा के बाद तैमूर स्मिर्ना पहुँचा — हॉस्पिटलर योद्धाओं का क़िला, जिसे उस्मानी बीस साल में न ले सके। उसने बंदरगाह को बाँध से भरवाकर क़िले को समुद्र से काट दिया और दो हफ़्तों में उसे ले लिया।', timur: 'पूरी सेना, आगे घेराबंदी मीनारें — बाँध बन रहा है।', enemy: 'योद्धाओं की चौकी: लोग कम, पर चट्टान पर क़िला और दो ओर समुद्र; क़िला ही उनका बचाव है।', enemyName: 'हॉस्पिटलर', tip: 'योद्धाओं की ओर से: जीत मत ढूँढें, डटे रहें और राजा को क़िले में ले जाएँ। तैमूर की ओर से: समुद्र घेरा नहीं जा सकता, बीच से बढ़ें।' },
    },
  },
];

const W = 128, H = 256;

export function battleSpec(b: Battle): SetupSpec {
  const men: [number, number][] = [];
  const files = 'abcdefghijk';
  const place = (rows: string[], ranks: number[], sign: number): void => {
    rows.forEach((row, i) => {
      row.split(' ').forEach((cell, x) => {
        if (cell === '.') return;
        const type = L[cell];
        if (!type) throw new Error(`Unknown cell ${cell}`);
        men.push([sqFromName(files[x] + ranks[i]), sign * type]);
      });
    });
  };
  place(b.white, [1, 2, 3, 4], 1);
  place(b.black, [10, 9, 8, 7], -1);
  const terrain = [...b.water.map((s) => sqFromName(s) + W), ...b.hills.map((s) => sqFromName(s) + H)];
  return { men, side: 0, terrain };
}

export function buildBattle(b: Battle): Game {
  return Game.fromSpec(DEFAULT_RULES, battleSpec(b));
}

export function findBattle(id: string | undefined): Battle | undefined {
  return id === undefined ? undefined : BATTLES.find((b) => b.id === id);
}

/** Name of an army in a battle: Timur is White. */
export function battleSideName(b: Battle, side: Side, lang: Lang): string {
  return side === 0 ? (lang === 'ru' ? 'Тимур' : lang === 'uz' ? 'Temur' : lang === 'tr' ? 'Timur' : lang === 'zh' ? '帖木儿' : lang === 'hi' ? 'तैमूर' : 'Timur') : b.text[lang].enemyName;
}
