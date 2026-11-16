# MARK (مارک) — Full Project Spec / مشخصات کامل پروژه
Language of the product: Persian (fa), right-to-left. This file is written so that any AI or developer can build the game without asking the owner again.
**Golden rule:** if a rule is not written here, do NOT guess it. Ask the owner (Mohammad) first.

---

## 0. Project context (زمینه)
- Owner: Mohammad, developer, Dezful, Iran. Works in Persian; wants concise answers and working code.
- MARK is a traditional card game of Dezful, similar to Shelem/Hokm. He wants an app for his own phone (iPhone) and to share it with other people (iPhone and Android).
- NOT for the App Store. Reason: Apple's developer site (developer.apple.com) is not reachable from Iran, so Xcode / xtool / native iOS builds are impossible. Decision: **PWA** (Progressive Web App): runs in the phone browser, "Add to Home Screen" on iPhone (Safari) and Android (Chrome), works fully offline.
- Hosting: GitHub Pages. Repo: `sarzaminrayanehimac-oss/mark`, site `https://sarzaminrayanehimac-oss.github.io/mark/`. Local copy: `Desktop\mark-pwa\mark` (Windows).

## 1. App structure
Start screen with two options:
1. **بازی (Play)** — full MARK game: the player + 3 computer players (partner + two opponents). *Status: engine done, UI not built yet.*
2. **امتیازشمار (Score counter)** — notebook for a real card game played on a table. *Status: built and deployed (section 7).*

## 2. Game rules (قوانین)
**Players and goal.** 4 players, 2 teams of 2; partners sit opposite. Team = seat % 2. Target: **1100 points** (= 6 hands + 110). Standard 52-card deck, Hokm card order (A highest, then K, Q, J, 10 ... 2).

**Seats.** Counterclockwise. Seat 0 = the human (bottom), 1 = right, 2 = partner (top), 3 = left. Next player = (seat+1)%4.

**Card points.** 5 = 5, 10 = 10, Ace = 10, winner of each trick +5.
**A normal hand is worth 165:** card points 100 + 12 tricks x 5 = 60 + the 4 set-aside cards count as an extra "13th trick" (+5) for the declarer's team = 165. Points inside the 4 set-aside cards also count for the declarer's team.

**Dealer (ته‌ورق) and سربرگ.** The dealer deals. The player on the dealer's right (next counterclockwise) is the سربرگ and starts the bidding. In the next hand the old سربرگ becomes the dealer (dealer rotates +1 each hand).

**Deal.**
1. Dealer gives 4 cards to each player.
2. Bidding (see 3), based only on these 4 cards.
3. After the declarer is decided: 4 more cards, then 4 more, to each player (12 each), 4 cards remain.
4. The declarer takes the 4 remaining cards, sees 16, and secretly sets aside 4 (they stay in the final point count).
5. Play with 12 cards each.

## 3. Bidding (مزایده) — corrected by the owner
- Bid values: 85, 90, 95, 100, then 105..160 written as 5, 10, 15 ... 60 (the leading 100 is dropped), then **D**. Display: `<=100` as is; `105..160` -> value-100; `165` -> "D". Bidding may open at any value; a higher bid may be in any suit. A bid = value + suit (e.g. "85 گشنیز"); the highest bid = declarer (حاکم) and its suit = trump (حکم).
- **Only one player of each team speaks at a time.** The first speaker is the سربرگ (right of the dealer); his opponent is the next player counterclockwise. They bid against each other alternately (example: "I bid 85 clubs, the opponent 90 hearts, my turn again (NOT my partner), I bid 95 clubs ..."). A partner has no right to speak until his teammate passes to him.
- **Pass to partner (پاس به یار) — once per TURN (owner correction):** in every turn the speaker may pass to his partner once; the partner then speaks in that slot and may pass back once. After the pass back the first speaker can not pass again in that turn: he must raise, say ببرش (if a bid exists) or, with no bid, fold. The next turn starts fresh (passing is allowed again).
- **Signalling conventions (owner):** (1) a very weak hand passes to the partner every turn (maybe the partner wants to say ببرش); (2) a medium hand passes every 5-step turn before bidding (bids 95 hearts, opponent 100, he first passes to the partner, and if the partner passes back he bids); (3) a strong hand (e.g. ace, king, queen) bids TWICE without passing so the partner knows it is strong, then passes at every following turn (85 clubs, opp 90 hearts, 95 clubs, opp 100 hearts, then pass each turn).
- Real contested auctions usually reach 110-140 (written 10-40), not 85/90; it also depends on the hands.
- **ببرش (take it):** only if a bid exists; ends the bidding and the highest bidder is the declarer. It is normally said after looking at the first 4 cards and judging that the 12 cards might still defeat the contract; never given away for nothing.
- **Fold (رد):** only when no bid exists and the player can not pass any more. If both teams fold in a row with no bid -> the cards are dealt again.
- After a raise the turn goes to the other team's current speaker (the original speaker, not the partner).
- Implemented in the engine appendix: `G.act[team]` = current speaker of each team, `G.deleg` = the speaker is a partner who received a pass, `G.used[seat]` = pass already used.

## 4. Play (بازی)
- The declarer plays the first card. Order is counterclockwise. Winner of a trick leads the next.
- Standard Hokm: must follow suit if possible; otherwise any card. Highest card of the led suit wins unless a trump is played; highest trump wins.
- All 12 tricks must be played even if the result is already decided.
- Live point count during play should be available.
- The declarer is not forced to lead the bid suit.

## 5. Hand result and match scoring (owner's final rule)
Bid N (85..165). tpD / tpO = the real points of the declarer's / opponents' team in the hand (card points + 5 per trick; the declarer also gets the set-aside cards + 5); tpD + tpO = 165. The opponents need at least **170 - N** points to defeat the contract.
1. Opponents got **0** points (declarer took everything) -> declarer gets **330** (any bid).
2. Bid **165 (D)** and the opponents got anything (5 or more) -> opponents get **165**, declarer 0.
3. Declarer reached the bid (tpD >= N) -> the **real points of both teams are recorded** (not the bid value, not 165).
4. Otherwise -> opponents get **165**, declarer 0 (the real points of that hand are ignored).
Examples: bid 125, opp 20 -> 145 / 20; bid 120 hearts, declarer 110 (opp 55) -> 0 / 165; bid 120, declarer 140 (opp 25) -> 140 / 25; bid 85, declarer 85 (opp 80) -> 85 / 80; bid 165 and 165 / 0 -> 330 / 0; bid 165 and declarer 160 (opp 5) -> 0 / 165.
Match ends when a team reaches 1100 or more at the end of a hand; the team with more points wins. No negative scores. (`E.settle`, `E.need` and the scenario tests in `test.js` implement and check this.)

## 6. Computer players (AI) — current heuristics
Implemented in the engine appendix. Bidding: strength from the 4 cards (A=3, K=2, Q=1.2, 10=0.9, J=0.7 plus suit length bonus); max bid about 80 + 5 x strength capped at 130; best suit = longest/strongest; raises by 5 while within its limit; otherwise passes to its partner (asking) or says ببرش.
Declarer: discards non-trump point cards of short suits first (they stay safely counted), never trumps, keeps aces; **leads a small trump first card** to ask the partner to show his strength.
**Partner conventions (owner's request):** (1) when the declarer leads a small trump on the first trick, his partner plays his highest trump so the declarer knows how strong the partner is; (2) the partner watches the 10s and 5s and feeds them (never the ace) onto tricks his team is sure to win (declarer's lead or last to play), so the team collects the points at the end.
Play otherwise: follow suit, win cheaply, trump when void, give points to a winning partner. Self-play test: 3000 hands, total always 165, only legal moves; ~65% of declarers succeed, ~0.5% of hands are 330, a match lasts about 11 hands. Future work: card counting, difficulty levels.

## 7. Score counter app (already built)
- Single screen, mobile width (max 430 px), RTL.
- Columns in this order (right to left): **ما | امتیاز | شما**. History table: oldest hand at the top, newest at the bottom, auto-scroll to the newest.
- Top: two large 3D tiles (ما / شما) showing the number of hands (total / 165, e.g. 825 -> 5; when not divisible show "5 و 60"), the raw total below, a progress bar to 1100. Between them a plate: target 1100, per hand 165.
- Team names default "ما" and "شما", editable by tapping the name; saved; reset does not clear them; the win banner uses the name ("محمد برد").
- Entry: number field for each team (plus quick buttons D = 165 and 2D = 330) and a middle "امتیاز" bid picker with only 17 keys: 85 90 95 100 5 10 ... 60 D (middle value is only a note, no calculation).
- Game ends automatically when a team total reaches 1100 (banner: "ما بردیم" / "شما بردین" / "مساوی شدیم").
- Buttons: undo last hand; reset always enabled with confirmation "مطمئنی می‌خوای از اول بازی کنی؟"; share (navigator.share; on `file://` it must not call share because Chrome crashes the tab); install (Android, beforeinstallprompt).
- Data survives closing the app: localStorage keys `mark-v2` (rounds), `mark-names`.
- Screen stays awake while open (Screen Wake Lock, iOS 16.4+).
- Pending (the owner will explain later): the exact formula for how the numbers in the ما/شما columns are computed, to auto-fill them.
- The background music experiment was removed (it did not play on the owner's iPhone).

## 8. Game UI design (طراحی بازی)
Reference: the owner sent two screenshots of popular Persian Hokm apps; "build something like the best Shelem/Mark game graphically".
- **Screenshot 1 (portrait Hokm app):** dark maroon patterned background; a rounded-rectangle green felt table with a thin gold edge inside a black frame; the 4 played cards in a cross shape at the center; opponents' hands as fanned blue card backs along the left and right edges; the player's own hand fanned at the bottom, face up, cards overlapping; maroon player plates with gold border (avatar, name, coins) at the sides; the trump badge in the top-left corner (a red heart inside an ornate gold laurel frame, with the word "حکم").
- **Screenshot 2 (title "سلطان حکم", gold calligraphic title with a crown):** a dark-red dialog "اعلیحضرت حکم چیست؟" with four large suit icons in a 2x2 grid (club and spade black, diamond and heart red), over a green table, hand fanned at the bottom.
- **Our look (keep consistent with the score counter):** aubergine-black background, brass (#dcbd78 -> #9a783a) for "ما", steel (#c3d3de -> #6c8aa0) for "شما", 3D bevelled tiles and keys (layered box-shadows, perspective rotateX about 9 deg), felt-green table for the game screen (about #0e3a2c -> #071d15) with a thin brass edge, faint watermark "محمد" (brass, very low opacity) behind the content.
- Layout: you at the bottom, your partner on top, opponents left and right; played cards in the center in a cross; trump badge in a corner; score strip (ما / شما with hands count and total); bid bubbles near each player's seat; a bid dialog with number keys (85 ... D) and four suit icons; a "ببرش" button and a "پاس به یار" button; a card selection screen for the 4 discards (declarer).
- Cards: custom drawn (SVG or CSS), large readable indices, fan with rotation, lift on touch, grey out illegal cards; smooth deal/play/trick-collect animations (respect `prefers-reduced-motion`). Offer 2-3 card back and table color options later.
- **Typography (important, owner request: beautiful fonts, including the title):**
  - Body/UI: Vazirmatn (variable woff2 already in the project folder as `Vazirmatn.woff2`).
  - Title and big headings: a decorative Persian-capable display font, e.g. **Lalezar** (`@fontsource/lalezar`, has an Arabic subset), alternatives **Aref Ruqaa** (calligraphic), **Mirza**, **Reem Kufi**. Title style: gold gradient text, subtle 3D/emboss shadow, optional crown or spade ornament.
  - All fonts must be self-hosted (woff2 files in the project) so the app works offline and without Google (blocked or slow in Iran).
- Icon: 3D brass spade on a dark aubergine background (files `icon-180.png`, `icon-192.png`, `icon-512.png`).

## 9. Technical requirements
- Pure HTML + CSS + JavaScript, no build step, no framework needed. Files: `index.html`, `manifest.webmanifest`, `sw.js` (service worker, stale-while-revalidate cache, cache name `mark-v4`, bump it when files change), icons, fonts.
- No external CDN or network calls at runtime (offline first). Works over HTTPS (GitHub Pages) or localhost.
- Game logic in a separate engine file (appendix) usable in the browser and in Node for tests. Keep UI and logic separate.
- iOS Safari caveats learned: Web Audio was silent on the owner's iPhone even with media volume up; Wake Lock needs iOS 16.4+; `navigator.share` with a `file://` URL crashes Chrome on Windows; the icon is only taken from the real site (not from a preview frame).
- Mobile first, portrait, safe-area insets, 44 px+ touch targets, RTL. Test on iPhone Safari and Android Chrome.
- Deployment: push to the GitHub repo (main branch, root); GitHub Pages is enabled. Updating: new files -> commit/push -> installed apps update on the next launch (service worker).

## 9b. Planned: online play (owner request, after the rules are stable)
Play against a friend on the same Wi-Fi/LAN or over the Internet. Idea: WebRTC peer-to-peer between phones with a manual code exchange (no server), or a tiny relay server; the engine is already pure logic so one device can act as host. Not started.

## 10. Roadmap
Done: score counter PWA (offline, shareable, hosted); rules engine + AI + simulation tests.
Next (stage 2): start screen (Play / Score counter), game table UI, bidding UI, discard UI, trick play against 3 AIs, hand result screen, match score.
Later: stronger AI and difficulty levels, auto-fill of the score counter from a formula, saved game resume, card/table themes, sounds (only if verified on iPhone), possibly online multiplayer (needs a server).

## 11. Open questions for the owner
1. Exact bidding turn flow for opponents and pass behaviour (section 3 assumption).
2. The formula for the numbers written in the ما/شما columns of the counter.
3. Preferred difficulty and personality of the AI.

---

## Appendix A — Reference engine (JavaScript, tested)
Self-play tests (`test.js`) verify: total 165 in every hand, all moves legal, matches finish. Public API: `MarkEngine.newHand, bidActions, bidAct, discard, legal, play, trickWinner, score, aiBid, aiDiscard, aiPlay`. Game phases: `bid`, `redeal`, `discard`, `play`, `done`.

```javascript
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
      phase: "bid", decl: -1, trump: -1, disc: [], trick: [], seen: [], lead: -1, won: [0, 0], tricks: 0, last: null };
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
    G.won[w % 2] += p; G.tricks++; G.last = { trick: G.trick, winner: w };
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
    var h = G.hands[G.decl], T = G.trump;
    var sc = h.map(function (c) {
      var v = c.s === T ? 1000 : 0; /* never trump unless forced */
      v += c.r === 14 ? 200 : 0; /* keep aces */
      v += pts(c) ? -50 : 0;      /* point cards in side suits are safer set aside */
      return { c: c, v: v + c.r };
    }).sort(function (a, b) { return a.v - b.v });
    return sc.slice(0, 4).map(function (x) { return x.c });
  }
  function aiPlay(G, seat) {
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
      if (seat === D && G.tricks === 0 && tr.length) return low(tr); /* small trump first: asks the partner to show his strongest trump */
      var tops = L.filter(function (c) { return c.s !== T && top(c) });
      if (team === D % 2 && tr.length && Math.random() < .5) return high(tr);
      if (tops.length) return high(tops);
      var nt = L.filter(function (c) { return c.s !== T }); return low(nt.length ? nt : L);
    }
    var w = G.trick[0], i, f = G.trick[0]; for (i = 1; i < G.trick.length; i++) if (beats(G, G.trick[i].c, w.c)) w = G.trick[i];
    var last = G.trick.length === 3, lm = f.seat % 2 === team && f.seat !== seat, win = L.filter(function (c) { return beats(G, c, w.c) });
    if (mate && G.tricks === 0 && f.seat === D && f.c.s === T && f.c.r <= 10) { var tt = L.filter(function (c) { return c.s === T }); if (tt.length) return high(tt) }
    if (lm && w.seat === f.seat && L.every(function (c) { return c.s === f.c.s })) { /* my partner led and I follow suit */
      if (top(f.c)) { var p0 = feed(L); if (p0.length) return p0[0] } /* his card is the highest left: give him the 10s and 5s */
      else if (f.c.r <= 10) return high(L); /* he led low: show my highest card of the suit */
    }
    if (w.seat % 2 === team) { var sure = last || top(w.c) || (w.c.s === T && w.c.r >= 13); if (sure) { var p = feed(L); if (p.length) return p[0] } return low(L) }
    if (win.length) return win.sort(function (x, y) { return (x.s === T) - (y.s === T) || x.r - y.r })[0];
    return low(L);
  }
  root.MarkEngine = { settle: settle, need: need, NAMES: NAMES, SYM: SYM, BIDS: BIDS, pts: pts, bidLabel: bidLabel, newHand: newHand, bidActions: bidActions, bidAct: bidAct,
    discard: discard, legal: legal, play: play, trickWinner: trickWinner, score: score, aiBid: aiBid, aiDiscard: aiDiscard, aiPlay: aiPlay };
  if (typeof module !== "undefined") module.exports = root.MarkEngine;
})(typeof window !== "undefined" ? window : globalThis);
```

