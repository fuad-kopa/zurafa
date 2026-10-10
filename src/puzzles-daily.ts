// The daily-puzzle pool: engine-found mates from computer self-play (see scripts/gen-daily.ts), with plain texts.

import type { Lang } from './i18n';
import type { Puzzle } from './puzzles';
import { DAILY_DATA } from './puzzles-daily-data';

type Words = { title1: string; title2: string; task1: string; task2: string; done: string; white: string; black: string };
const WORDS: Record<Lang, Words> = {
  ru: { title1: 'Мат в один ход', title2: 'Мат в два хода', task1: '{side} начинают и ставят мат в один ход.', task2: '{side} начинают и ставят мат в два хода, как бы ни защищался соперник.', done: 'Мат!', white: 'Белые', black: 'Синие' },
  en: { title1: 'Mate in one', title2: 'Mate in two', task1: '{side} to move and mate in one.', task2: '{side} to move and mate in two, whatever the defence.', done: 'Checkmate!', white: 'White', black: 'Blue' },
  uz: { title1: 'Bir yurishda mot', title2: 'Ikki yurishda mot', task1: '{side} boshlaydi va bir yurishda mot qo‘yadi.', task2: '{side} boshlaydi va raqib qanday himoyalanmasin, ikki yurishda mot qo‘yadi.', done: 'Mot!', white: 'Oqlar', black: 'Ko‘klar' },
  tr: { title1: 'Bir hamlede mat', title2: 'İki hamlede mat', task1: '{side} oynar ve bir hamlede mat eder.', task2: '{side} oynar ve savunma ne olursa olsun iki hamlede mat eder.', done: 'Mat!', white: 'Beyazlar', black: 'Maviler' },
  zh: { title1: '一步杀', title2: '两步杀', task1: '{side}先走，一步将死。', task2: '{side}先走，无论对方如何防守，两步将死。', done: '将死！', white: '白方', black: '蓝方' },
  hi: { title1: 'एक चाल में मात', title2: 'दो चाल में मात', task1: '{side} चलता है और एक चाल में मात देता है।', task2: '{side} चलता है और विरोधी चाहे जैसे बचाए, दो चाल में मात देता है।', done: 'शह-मात!', white: 'सफ़ेद', black: 'नीला' },
};

export const DAILY: Puzzle[] = DAILY_DATA.map((d, i) => {
  const text = {} as Puzzle['text'];
  for (const lang of Object.keys(WORDS) as Lang[]) {
    const w = WORDS[lang];
    const side = d.side === 0 ? w.white : w.black;
    text[lang] = {
      title: d.goal === 'mate1' ? w.title1 : w.title2,
      task: (d.goal === 'mate1' ? w.task1 : w.task2).replace('{side}', side),
      done: w.done,
    };
  }
  return { id: `d${i + 1}`, side: d.side, men: d.men, swapUsed: d.swapUsed, goal: d.goal === 'mate1' ? { type: 'win' } : { type: 'mate2' }, text };
});
