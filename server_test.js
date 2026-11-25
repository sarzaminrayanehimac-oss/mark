/* three fake players: lobby list, invite, accept, 3rd player joins, start, forwarding, leave */
const {spawn}=require('child_process');const srv=spawn('node',['/home/claude/merge/site/server.js','8101']);let out='';srv.stdout.on('data',d=>out+=d);
const R=x=>x.last.room?x.last.room.room:undefined;const wait=ms=>new Promise(r=>setTimeout(r,ms));let bad=0;const ck=(c,m)=>{if(!c)bad++;console.log(c?'OK  ':'FAIL',m)};
function cl(id,name){return new Promise(res=>{const ws=new WebSocket('ws://localhost:8101/ws'),c={ws,id,log:[],last:{}};ws.onopen=()=>{ws.send(JSON.stringify({t:'hello',id,name,av:'🦁'}));res(c)};ws.onmessage=e=>{const m=JSON.parse(e.data);c.log.push(m);c.last[m.t]=m};c.send=o=>ws.send(JSON.stringify(o))})}
(async()=>{await wait(500);
 const a=await cl('A','علی'),b=await cl('B','رضا'),c=await cl('C','سارا');await wait(200);
 ck(a.last.users.list.length===3,'everyone sees 3 online players');
 a.send({t:'invite',to:'B'});await wait(150);ck(b.last.invited&&b.last.invited.from.name==='علی','B gets an invitation from A');
 b.send({t:'reply',to:'A',ok:true});await wait(150);ck(R(a)&&R(a).members.length===2&&R(b).host==='A','room with A and B');
 a.send({t:'invite',to:'C'});await wait(100);c.send({t:'reply',to:'A',ok:false});await wait(100);ck(a.last.declined,'C declined');
 a.send({t:'invite',to:'C'});await wait(100);c.send({t:'reply',to:'A',ok:true});await wait(150);ck(R(c).members.length===3,'C joined: 3 players');
 b.send({t:'invite',to:'C'});await wait(100);ck(b.last.busy,'a non-host cannot invite');
 a.send({t:'start'});await wait(100);ck(R(b).started&&R(c).started,'game started for everybody');
 a.send({t:'fwd',to:'B',d:{t:'view',x:1}});await wait(100);ck(b.last.msg&&b.last.msg.d.x===1&&b.last.msg.from==='A'&&!c.last.msg,'forward goes only to the chosen player');
 b.send({t:'fwd',to:'A',d:{t:'bid'}});await wait(100);ck(a.last.msg&&a.last.msg.d.t==='bid','guest to host works');
 c.ws.close();await wait(200);ck(R(a).members.length===2,'leaving player removed from the room');
 a.ws.close();await wait(200);ck(R(b)===null,'host leaves: room closes');
 const r=await fetch('http://localhost:8101/index.html');ck(r.status===200,'static files are served');
 const r2=await fetch('http://localhost:8101/server.js');ck(r2.status===404,'server.js is not downloadable');
 console.log(bad?'FAILED':'SERVER TEST PASSED');srv.kill();process.exit(0)})()
