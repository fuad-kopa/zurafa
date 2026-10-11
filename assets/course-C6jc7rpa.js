import{a as e,d as t,l as n}from"./i18n-CDtpthj9.js";import{b as r,i,l as a,r as o,s,t as c,u as l}from"./index-rAt7TC04.js";var u=c.units,d=u.flatMap(e=>e.lessons);function f(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}var p=new Set([`pawns`,`royals`,`citadel`,`terrain`,`mate`]);function m(e){return p.has(e.id)?t(`unit.${e.id}`):n(e.piece)}function h(n){return p.has(n.id)?t(`unit.${n.id}.desc`):e(n.piece,!1)}function g(){return d.find(e=>o(e.id)===0)??d[d.length-1]}function _(e){let{done:n,stars:c}=i(d.map(e=>e.id)),p=g(),_=Math.round(n/d.length*100);e.innerHTML=`
    <section class="page course">
      ${l(s,`<h1>${f(t(`course.title`))}</h1>`,{lesson:{href:`#/lesson/${p.id}`,label:n?`course.continue`:`course.start`}})}
      <p class="lead">${f(t(`course.lead`,String(d.length)))}</p>
      <div class="course-top card-soft">
        <div class="ct-progress">
          <b>${f(t(`course.progress`,String(n),String(d.length)))}</b>
          <small>★ ${c} / ${d.length*3}</small>
          <span class="bar"><i style="width:${_}%"></i></span>
        </div>
        <a class="btn primary" href="#/lesson/${p.id}">${f(t(n?`course.continue`:`course.start`))}</a>
      </div>
      <div class="units">
        ${u.map((e,n)=>{let a=i(e.lessons.map(e=>e.id));return`<article class="unit card-soft ${a.done===e.lessons.length?`complete`:``}">
            <header>
              <span class="u-icon">${r(e.piece,0,40)}</span>
              <div class="u-text"><span class="u-num">${n+1}</span><h2>${f(m(e))}</h2><p>${f(h(e))}</p></div>
              <span class="u-count">${a.done}/${e.lessons.length}</span>
            </header>
            <div class="chips">${e.lessons.map((n,r)=>{let i=o(n.id);return`<a class="chip s${i} ${n.id===p.id?`next`:``}" href="#/lesson/${n.id}" aria-label="${f(t(`lesson.of`,String(r+1),String(e.lessons.length)))}"><b>${r+1}</b><span>${i?`★`.repeat(i):``}</span></a>`}).join(``)}</div>
          </article>`}).join(``)}
      </div>
      <p class="course-foot"><a href="#/learn">${f(t(`course.sandbox`))}</a></p>
    </section>`,a(e)}export{d as ALL,u as UNITS,g as nextLesson,_ as renderCourse,m as unitTitle};