import{A as e,a as t,o as n,t as r}from"./index-CkIIx5WY.js";var i=e=>e.replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]),a=[{id:`shatranj`,href:`#/games/shatranj`,article:`shatranj`},{id:`oblong`,href:`#/games/oblong`,article:`oblong`},{id:`tamma`,href:`#/games/tamma`,article:`tamma`},{id:`husun`,href:`#/games/husun`,article:`husun`},{id:`nard`,href:`#/games/nard`,article:`nard`},{id:`mancala`,href:`#/games/toguz`,article:`toguz`},{id:`ashyk`,href:`#/games/asyk`,article:`ashyk`}];function o(o){o.innerHTML=`
    <section class="page games">
      ${n(r,`<h1>${i(e(`games.title`))}</h1>`)}
      <p class="lead">${i(e(`games.lead`))}</p>
      <div class="games-grid">
        ${a.map(t=>{let n=e(`games.${t.id}`),r=e(`games.${t.id}.desc`),a=t.href?``:`<span class="games-soon">${i(e(`games.soon`))}</span>`,o=`<img src="./rooms/garden-card-${t.id}.webp" alt="" loading="lazy" decoding="async" width="800" height="400">`,s=`<b>${i(n)}</b>${a}<small>${i(r)}</small>`;return t.href?`<article class="games-card ready" id="game-${t.id}"><a href="${t.href}" tabindex="-1" aria-hidden="true">${o}</a><a class="games-main" href="${t.href}">${s}</a>
                <span class="games-links"><a class="btn primary small" href="${t.href}">${i(e(`games.play`))}</a>${t.article?`<a class="link" href="#/library/${t.article}">${i(e(`games.read`))}</a>`:``}</span></article>`:`<article class="games-card" id="game-${t.id}">${o}<div class="games-main">${s}</div></article>`}).join(``)}
      </div>
    </section>`,t(o)}export{o as renderGames};