/* MARK game engine. Seats 0..3 counterclockwise (0 = you, 1 = right, 2 = partner, 3 = left). Team = seat % 2. */
(function (root) {
  var NAMES = ["اسپیک", "دل", "خشت", "گشنیز"], SYM = ["♠", "♥", "♦", "♣"];
  var BIDS = []; for (var v = 85; v <= 165; v += 5) BIDS.push(v); /* 165 = D */
  function pts(c) { return c.r === 5 ? 5 : (c.r === 10 || c.r === 14) ? 10 : 0 }
  function bidLabel(v) { return v >= 165 ? "D" : v > 100 ? String(v - 100) : String(v) }
  function deck(rng) {
    var d = []; for (var s = 0; s < 4; s++) for (var r = 2; r <= 14; r++) d.push({ s: s, r: r });
    for (var i = 51; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t }
    return d;
  }
  function newHand(dealer, rng) {
    var d = deck(rng), h = [[], [], [], []];
    for (var i = 0; i < 16; i++) h[i % 4].push(d[i]);
    return { dealer: dealer, hands: h, stock: d.slice(16), bid: null, turn: (dealer + 1) % 4, used: [0, 0, 0, 0], canPass: true, nr: [0, 0, 0, 0], folds: 0, deleg: false, act: (function () { var f = (dealer + 1) % 4, a = [0, 0]; a[f % 2] = f; a[(f + 1) % 2] = (f + 1) % 4; return a })(),
      phase: "bid", decl: -1, trump: -1, disc: [], trick: [], seen: [], log: [], lead: -1, won: [0, 0], tricks: 0, last: null };
  }
  /* ---------- bidding ----------
   Only one player of each team speaks at a time (G.act[team]); his partner speaks only after a "pass to partner".
   In every turn the speaker may pass to his partner once and the partner may pass back once (G.canPass);
   after a pass back the first speaker must raise / take (ببرش) / fold. */
  function bidActions(G) {
    var a = [], hi = G.bid ? G.bid.val : 0;
    BIDS.forEach(function (v) { if (v > hi) for (var k = 0; k < 4; k++) a.push({ t: "raise", val: v, suit: k }) });
    if (G.canPass) a.push({ t: "pass" });
    if (G.bid) a.push({ t: "take" });
    if (!G.bid && !G.canPass) a.push({ t: "fold" });
    return a;
  }
  function bidAct(G, x) {
    var s = G.turn, t = s % 2;
    if (x.t === "raise") { G.bid = { val: x.val, suit: x.suit, seat: s }; G.nr[s]++; G.folds = 0; G.deleg = false; G.canPass = true; G.turn = G.act[1 - t] }
    else if (x.t === "pass") { G.deleg = !G.deleg; if (!G.deleg) G.canPass = false; G.turn = (s + 2) % 4 }
    else if (x.t === "fold") { G.folds++; G.deleg = false; G.canPass = true; if (G.folds >= 2) G.phase = "redeal"; else G.turn = G.act[1 - t] }
    else if (x.t === "take") {
      G.decl = G.bid.seat; G.trump = G.bid.suit;
      for (var r = 0; r < 2; r++) for (var p = 0; p < 4; p++) for (var k = 0; k < 4; k++) G.hands[p].push(G.stock.shift());
      G.hands[G.decl] = G.hands[G.decl].concat(G.stock.splice(0, 4));
      G.phase = "discard";
    }
  }
  /* ---------- discard & play ---------- */
  function discard(G, cards) {
    var h = G.hands[G.decl];
    cards.forEach(function (c) { var i = h.findIndex(function (x) { return x.s === c.s && x.r === c.r }); h.splice(i, 1) });
    G.disc = cards; G.phase = "play"; G.lead = G.decl; G.turn = G.decl;
  }
  function legal(G, seat) {
    var h = G.hands[seat];
    if (!G.trick.length) return h.slice();
    var ls = G.trick[0].c.s, f = h.filter(function (c) { return c.s === ls });
    return f.length ? f : h.slice();
  }
  function beats(G, a, b) { /* does card a beat card b (b currently winning, led suit ls) */
    var ls = G.trick[0].c.s;
    if (a.s === b.s) return a.r > b.r;
    if (a.s === G.trump) return true;
    return false;
  }
  function trickWinner(G) {
    var best = G.trick[0];
    for (var i = 1; i < 4; i++) { var t = G.trick[i]; if (beats(G, t.c, best.c)) best = t }
    return best.seat;
  }
  function play(G, seat, c) {
    var h = G.hands[seat], i = h.findIndex(function (x) { return x.s === c.s && x.r === c.r });
    h.splice(i, 1); G.trick.push({ seat: seat, c: c }); G.seen.push(c);
    if (G.trick.length < 4) { G.turn = (seat + 1) % 4; return }
    var w = trickWinner(G), p = 5; G.trick.forEach(function (t) { p += pts(t.c) });
    G.won[w % 2] += p; G.tricks++; G.last = { trick: G.trick, winner: w }; (G.log = G.log || []).push(G.trick);
    G.trick = []; G.lead = w; G.turn = w;
    if (G.tricks === 12) G.phase = "done";
  }
  /* bid N (85..165). The opponents need at least 170 - N points to set the contract.
     all points to the declarer (opponents 0)  -> declarer gets 330
     bid 165 and the opponents got something   -> opponents get 165
     declarer reached N                        -> the real points of both sides are recorded
     otherwise                                 -> opponents get 165, declarer 0 */
  function need(bid) { return 170 - bid }
  function settle(bid, tpD, tpO) {
    if (tpO === 0) return { resD: 330, resO: 0, ok: true, shlem: true };
    if (bid >= 165) return { resD: 0, resO: 165, ok: false, shlem: false };
    if (tpD >= bid) return { resD: tpD, resO: tpO, ok: true, shlem: false };
    return { resD: 0, resO: 165, ok: false, shlem: false };
  }
  function score(G) { /* returns points added to each team [team0, team1] and detail */
    var d = G.decl % 2, o = 1 - d, dp = 0; G.disc.forEach(function (c) { dp += pts(c) });
    var tp = [G.won[0], G.won[1]]; tp[d] += dp + 5; /* set-aside cards = 13th trick */
    var st = settle(G.bid.val, tp[d], tp[o]), res = [0, 0]; res[d] = st.resD; res[o] = st.resO;
    return { tp: tp, res: res, decl: d, ok: st.ok, shlem: st.shlem, need: need(G.bid.val) };
  }
  /* ---------- simple AI ---------- */
  function strength(h4) {
    var st = 0, cnt = [0, 0, 0, 0], sv = [0, 0, 0, 0];
    h4.forEach(function (c) { var v = c.r === 14 ? 3 : c.r === 13 ? 2 : c.r === 12 ? 1.2 : c.r === 11 ? .7 : c.r === 10 ? .9 : 0; st += v; cnt[c.s]++; sv[c.s] += v });
    var bs = 0; for (var k = 1; k < 4; k++) if (cnt[k] * 2 + sv[k] > cnt[bs] * 2 + sv[bs]) bs = k;
    st += Math.max(0, cnt[bs] - 1) * .8;
    return { st: st, suit: bs };
  }
  function aiBid(G) {
    var s = G.turn, h = G.hands[s], e = strength(h), cls = e.st >= 4.5 ? 2 : e.st >= 2.6 ? 1 : 0; /* 2 strong, 1 medium, 0 weak */
    var hi = G.bid ? G.bid.val : 0, next = BIDS.filter(function (v) { return v > hi })[0];
    var mb = Math.min(140, 75 + Math.round(e.st * 8 / 5) * 5 + (G.bid ? 5 : 0) + (G.deleg ? 5 : 0) + (Math.random() < .35 ? 5 : 0));
    var A = bidActions(G), can = function (t) { return A.some(function (x) { return x.t === t }) };
    var want = next && next <= mb && (G.bid || e.st >= 3.0 || (G.deleg && e.st >= 2.2)) && !(G.bid && G.bid.seat % 2 === s % 2);
    var raise = { t: "raise", val: next, suit: e.suit }, give = G.bid ? { t: "take" } : { t: "fold" };
    if (G.deleg) { /* my partner passed to me: answer with my own hand */
      if (want) return raise; if (can("pass")) return { t: "pass" }; return give;
    }
    if (cls === 2) { /* strong: bids twice without passing so the partner sees it, then passes every turn */
      if (want && (G.nr[s] < 2 || !can("pass"))) return raise;
      if (can("pass")) return { t: "pass" };
      return want ? raise : give;
    }
    if (can("pass")) return { t: "pass" }; /* medium and weak hands pass to the partner every turn first */
    if (want && cls >= 1) return raise;
    return give;
  }
  function aiDiscard(G) {
    var h = G.hands[G.decl], T = G.trump, bySuit = [[], [], [], []], out = [], s, i;
    h.forEach(function (c) { bySuit[c.s].push(c) });
    var best = -1, bc = 1e9; /* the cheapest side suit of at most 4 cards, without an ace, gets set aside completely */
    for (s = 0; s < 4; s++) {
      var a = bySuit[s]; if (s === T || !a.length || a.length > 4) continue;
      var cost = a.length * 2 + (a.some(function (c) { return c.r === 14 }) ? 9 : 0) + a.reduce(function (t, c) { return t + (c.r >= 12 ? 1.5 : 0) }, 0);
      if (cost < bc) { bc = cost; best = s }
    }
    if (best >= 0 && bc < 9) out = bySuit[best].slice();
    var sc = h.filter(function (c) { return out.indexOf(c) < 0 }).map(function (c) {
      var v = c.s === T ? 1000 : 0; v += c.r === 14 ? 200 : 0; v += pts(c) ? -50 : 0; return { c: c, v: v + c.r };
    }).sort(function (a, b) { return a.v - b.v });
    for (i = 0; out.length < 4; i++) out.push(sc[i].c);
    return out;
  }
  function aiPlay(G, seat, out) {
    out = out || {};
    var L = legal(G, seat), T = G.trump, D = G.decl, team = seat % 2, mate = seat !== D && seat % 2 === D % 2, mine = G.hands[seat];
    function low(a) { return a.slice().sort(function (x, y) { return ((x.s === T) - (y.s === T)) || (pts(x) - pts(y)) || (x.r - y.r) })[0] }
    function high(a) { return a.slice().sort(function (x, y) { return y.r - x.r })[0] }
    function feed(a) { return a.filter(function (c) { return pts(c) && c.r !== 14 }).sort(function (x, y) { return pts(y) - pts(x) || x.r - y.r }) }
    function known(c) { /* played, in my hand, or set aside by me */
      return G.seen.some(function (x) { return x.s === c.s && x.r === c.r }) || mine.some(function (x) { return x.s === c.s && x.r === c.r }) ||
        (seat === D && G.disc.some(function (x) { return x.s === c.s && x.r === c.r })) }
    function top(c) { for (var r = c.r + 1; r <= 14; r++) if (!known({ s: c.s, r: r })) return false; return true } /* nothing higher of this suit is still out */
    if (!G.trick.length) {
      var tr = L.filter(function (c) { return c.s === T });
      if (seat === D && G.tricks === 0 && tr.length) { out.conv = 1; return low(tr) } /* small trump first: asks the partner to show his strongest trump */
      var avoid = {}, dv = {};
      if (team !== D % 2) { /* the suits the declarer led (his strong side suits) and the ones he is void in (he would trump) */
        (G.log || []).concat([G.trick]).forEach(function (t) { if (t.length && t[0].seat === D && t[0].c.s !== T) avoid[t[0].c.s] = 1 });
        dv = voids(G)[D]; for (var kk in dv) if (+kk !== T) avoid[kk] = 1;
      }
      var tops = L.filter(function (c) { return c.s !== T && top(c) && !dv[c.s] });
      if (team === D % 2 && tr.length && Math.random() < .5) return high(tr);
      if (tops.length) return high(tops);
      var nt = L.filter(function (c) { return c.s !== T }), okn = nt.filter(function (c) { return !avoid[c.s] });
      return low(okn.length ? okn : (nt.length ? nt : L));
    }
    var w = G.trick[0], i, f = G.trick[0]; for (i = 1; i < G.trick.length; i++) if (beats(G, G.trick[i].c, w.c)) w = G.trick[i];
    var last = G.trick.length === 3, ls = G.trick[0].c.s, vo = voids(G), risk = false, q;
    for (q = 1; q <= 3 - G.trick.length; q++) { var os = (seat + q) % 4; if (os % 2 !== team && vo[os][ls] && ls !== T) risk = true } /* an opponent still to play is known to be void: he may trump */
    var lm = f.seat % 2 === team && f.seat !== seat, win = L.filter(function (c) { return beats(G, c, w.c) });
    if (mate && G.tricks === 0 && f.seat === D && f.c.s === T && f.c.r <= 10) { var tt = L.filter(function (c) { return c.s === T }); if (tt.length) { out.conv = 1; return high(tt) } }
    if (lm && w.seat === f.seat && L.every(function (c) { return c.s === f.c.s })) { /* my partner led and I follow suit */
      if (top(f.c) && !risk) { var p0 = feed(L); if (p0.length) { out.conv = 1; return p0[0] } } /* his card is the highest left: give him the 10s and 5s */
      else if (f.c.r <= 10) { out.conv = 1; return high(L) } /* he led low: show my highest card of the suit */
    }
    if (w.seat % 2 === team) { var sure = last || (w.c.s === T ? top(w.c) : (top(w.c) && !risk)); if (sure) { var p = feed(L); if (p.length) return p[0] } return low(L) }
    if (win.length) { var wt = win.filter(function (c) { return c.s !== T && top(c) }); if (!last && wt.length) { out.conv = 1; return high(wt) } return win.sort(function (x, y) { return (x.s === T) - (y.s === T) || x.r - y.r })[0] }
    return low(L);
  }
  
  /* ---------- stronger play: sample the hidden cards, play the hand out, keep the best card ---------- */
  var mcMs = 140;
  function voids(G) {
    var v = [{}, {}, {}, {}];
    function scan(tr) { if (!tr.length) return; var ls = tr[0].c.s; for (var i = 1; i < tr.length; i++) if (tr[i].c.s !== ls) v[tr[i].seat][ls] = 1 }
    (G.log || []).forEach(scan); scan(G.trick); return v;
  }
  function sampleWorld(G, seat, vo, strict) {
    var known = {}, k = function (c) { return c.s * 20 + c.r };
    G.seen.forEach(function (c) { known[k(c)] = 1 }); G.hands[seat].forEach(function (c) { known[k(c)] = 1 });
    if (G.decl === seat) G.disc.forEach(function (c) { known[k(c)] = 1 });
    var pool = [], cap = [0, 0, 0, 0], tot = 0, p, s, r;
    for (s = 0; s < 4; s++) for (r = 2; r <= 14; r++) if (!known[s * 20 + r]) pool.push({ s: s, r: r });
    for (p = 0; p < 4; p++) if (p !== seat) { cap[p] = G.hands[p].length; tot += cap[p] }
    var dsz = Math.max(0, pool.length - tot);
    for (var tr = 0; tr < 30; tr++) {
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t }
      var hands = [[], [], [], []], disc = [], cp = cap.slice(), cd = dsz, ok = true;
      for (i = 0; i < pool.length; i++) {
        var c = pool[i], el = [];
        for (p = 0; p < 4; p++) if (p !== seat && cp[p] > 0 && !(strict && vo[p][c.s])) el.push(p);
        if (cd > 0) el.push(-1);
        if (!el.length) { ok = false; break }
        var pick = el[Math.floor(Math.random() * el.length)];
        if (pick < 0) { disc.push(c); cd-- } else { hands[pick].push(c); cp[pick]-- }
      }
      if (ok) return { hands: hands, disc: disc };
      if (tr > 20) strict = false;
    }
    return null;
  }
  function rollout(G, seat, c, w) {
    var sim = { hands: [], trick: G.trick.slice(), seen: G.seen.slice(), log: (G.log || []).slice(), trump: G.trump, decl: G.decl, disc: G.decl === seat ? G.disc : w.disc,
      tricks: G.tricks, won: G.won.slice(), bid: G.bid, turn: G.turn, phase: "play", lead: G.lead, last: null };
    for (var p = 0; p < 4; p++) sim.hands[p] = (p === seat ? G.hands[p] : w.hands[p]).slice();
    play(sim, seat, c);
    while (sim.phase === "play") { var s = sim.turn; play(sim, s, aiPlay(sim, s)) }
    var r = score(sim); return (r.res[seat % 2] - r.res[1 - seat % 2]) + .03 * (r.tp[seat % 2] - r.tp[1 - seat % 2]);
  }
  function aiPlayMC(G, seat, ms) {
    var L = legal(G, seat); if (L.length === 1) return L[0];
    var out = {}, h = aiPlay(G, seat, out); if (out.conv) return h;
    if (G.trick.length) { /* an opponent already has the trick and I can not beat it: just throw away the cheapest card */
      var wn = G.trick[0]; for (var z = 1; z < G.trick.length; z++) if (beats(G, G.trick[z].c, wn.c)) wn = G.trick[z];
      if (wn.seat % 2 !== seat % 2 && !L.some(function (c) { return beats(G, c, wn.c) })) return h;
    }
    var vo = voids(G), t0 = Date.now(), lim = ms == null ? mcMs : ms, sum = L.map(function () { return 0 }), n = 0;
    while (n < 6 || (Date.now() - t0 < lim && n < 80)) {
      var w = sampleWorld(G, seat, vo, true); if (!w) break;
      for (var i = 0; i < L.length; i++) sum[i] += rollout(G, seat, L[i], w); n++;
    }
    if (!n) return h; var hi = -1, b = 0; for (var q = 0; q < L.length; q++) { if (L[q].s === h.s && L[q].r === h.r) hi = q; if (sum[q] > sum[b]) b = q }
    if (hi >= 0 && sum[hi] >= sum[b] - 1e-9) return h; return L[b];
  }
  
  root.MarkEngine = { aiPlayMC: aiPlayMC, setMcMs: function (v) { mcMs = v }, settle: settle, need: need, NAMES: NAMES, SYM: SYM, BIDS: BIDS, pts: pts, bidLabel: bidLabel, newHand: newHand, bidActions: bidActions, bidAct: bidAct,
    discard: discard, legal: legal, play: play, trickWinner: trickWinner, score: score, aiBid: aiBid, aiDiscard: aiDiscard, aiPlay: aiPlay };
  if (typeof module !== "undefined") module.exports = root.MarkEngine;
})(typeof window !== "undefined" ? window : globalThis);
