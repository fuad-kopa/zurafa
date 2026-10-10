import { describe, it, expect } from 'vitest';
import { ARTICLES, CHRONICLE } from '../src/library/articles';
import { TEXTS as UZ } from '../src/library/texts/uz';
import { TEXTS as TR } from '../src/library/texts/tr';
import { TEXTS as ZH } from '../src/library/texts/zh';
import { TEXTS as HI } from '../src/library/texts/hi';

describe('the encyclopedia speaks six languages', () => {
  const extra = { uz: UZ, tr: TR, zh: ZH, hi: HI };

  it('every article has a text in every language, with the same shape', () => {
    for (const a of ARTICLES) {
      for (const [lang, texts] of Object.entries(extra)) {
        const x = texts[a.id];
        expect(x, `${a.id} in ${lang}`).toBeDefined();
        expect(x.title.length, `${a.id} ${lang} title`).toBeGreaterThan(1);
        expect(x.lead.length, `${a.id} ${lang} lead`).toBeGreaterThan(10);
        // the same number of paragraphs and the same subheadings in the same places
        expect(x.body.length, `${a.id} ${lang} paragraphs`).toBe(a.text.en.body.length);
        x.body.forEach((p, i) => expect(p.startsWith('## '), `${a.id} ${lang} paragraph ${i}`).toBe(a.text.en.body[i].startsWith('## ')));
      }
      expect(a.text.ru.body.length).toBe(a.text.en.body.length);
    }
  });

  it('has no stray texts for articles that do not exist', () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    for (const texts of Object.values(extra)) for (const id of Object.keys(texts)) expect(ids.has(id), id).toBe(true);
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
  });

  it('the chronicle is complete in every language', () => {
    for (const r of CHRONICLE) for (const l of ['ru', 'en', 'uz', 'tr', 'zh', 'hi'] as const) expect(r[l].length, `${r.year} ${l}`).toBeGreaterThan(3);
  });
});
