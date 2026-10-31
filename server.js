/* VidMark Studio server: serves the website + admin panel, saves changes instantly. No npm install needed. Node 16+ */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const ROOT=__dirname,PORT=process.env.PORT||3000,DATA=path.join(ROOT,'data'),MEDIA=path.join(ROOT,'media'),BK=path.join(DATA,'backups');
[DATA,MEDIA,BK].forEach(d=>fs.mkdirSync(d,{recursive:true}));
const CF=path.join(DATA,'content.json'),PF=path.join(DATA,'password.json'),MAX=1024*1024*1024;
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
let pw;
if(process.env.ADMIN_PASSWORD){const s=crypto.randomBytes(8).toString('hex');pw={s,h:hash(process.env.ADMIN_PASSWORD,s)}}
else if(fs.existsSync(PF))pw=JSON.parse(fs.readFileSync(PF,'utf8'));
else{const p=crypto.randomBytes(5).toString('hex'),s=crypto.randomBytes(8).toString('hex');pw={s,h:hash(p,s)};fs.writeFileSync(PF,JSON.stringify(pw));
 console.log('\n  ==========================================\n  ADMIN PASSWORD: '+p+'\n  (saved hashed. To reset: delete data/password.json or set ADMIN_PASSWORD)\n  ==========================================\n')}
function load(){if(fs.existsSync(CF))return JSON.parse(fs.readFileSync(CF,'utf8'));const w={};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'content.js'),'utf8'),{window:w});fs.writeFileSync(CF,JSON.stringify(w.VM_CONTENT));return w.VM_CONTENT}
let C=load();const T=new Map();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
const OK=new Set(['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mov']);
const json=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const authed=req=>{const t=req.headers['x-token'],e=T.get(t);return !!e&&e>Date.now()};
const body=(req,lim=8e6)=>new Promise((ok,no)=>{let b='',n=0;req.on('data',c=>{n+=c.length;if(n>lim){no(new Error('too big'));req.destroy()}else b+=c});req.on('end',()=>ok(b));req.on('error',no)});
function sendFile(req,res,fp){fs.stat(fp,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end('Not found')}
 const ext=path.extname(fp).toLowerCase(),h={'Content-Type':MIME[ext]||'application/octet-stream','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'},r=req.headers.range;
 if(r){const m=/bytes=(\d*)-(\d*)/.exec(r)||[];let s=m[1]?+m[1]:0,en=m[2]?+m[2]:st.size-1;if(en>=st.size)en=st.size-1;if(s>en){res.writeHead(416);return res.end()}
  h['Content-Range']=`bytes ${s}-${en}/${st.size}`;h['Content-Length']=en-s+1;res.writeHead(206,h);fs.createReadStream(fp,{start:s,end:en}).pipe(res)}
 else{h['Content-Length']=st.size;res.writeHead(200,h);fs.createReadStream(fp).pipe(res)}})}
const inside=(base,p)=>{const f=path.join(base,p);return f.startsWith(base+path.sep)?f:null};
const clean=n=>String(n).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^[.-]+/,'').slice(-80);
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://x'),p=decodeURIComponent(u.pathname);
 if(p==='/api/ping')return json(res,200,{ok:1});
 if(p==='/api/login'&&req.method==='POST'){const {password=''}=JSON.parse(await body(req,1e4)||'{}');
  const a=Buffer.from(hash(String(password),pw.s)),b=Buffer.from(pw.h);
  if(a.length===b.length&&crypto.timingSafeEqual(a,b)){const t=crypto.randomBytes(24).toString('hex');T.set(t,Date.now()+30*864e5);return json(res,200,{token:t})}
  await new Promise(r=>setTimeout(r,900));return json(res,401,{error:'Wrong password'})}
 if(p==='/api/me')return authed(req)?json(res,200,{ok:1}):json(res,401,{});
 if(p==='/api/media'){if(!authed(req))return json(res,401,{});return json(res,200,{files:fs.readdirSync(MEDIA).filter(f=>OK.has(path.extname(f).toLowerCase())).sort().map(f=>'media/'+f)})}
 if(p==='/api/content'&&req.method==='POST'){if(!authed(req))return json(res,401,{});
  const d=JSON.parse(await body(req,2e7));if(!d||typeof d!=='object'||!Array.isArray(d.SERVICES)||!d.VIDEOS)return json(res,400,{error:'Invalid content'});
  if(fs.existsSync(CF)){fs.copyFileSync(CF,path.join(BK,'content-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'));fs.readdirSync(BK).sort().slice(0,-30).forEach(f=>fs.unlinkSync(path.join(BK,f)))}
  fs.writeFileSync(CF+'.tmp',JSON.stringify(d));fs.renameSync(CF+'.tmp',CF);C=d;return json(res,200,{ok:1})}
 if(p==='/api/upload'&&req.method==='POST'){if(!authed(req))return json(res,401,{});
  const name=clean(u.searchParams.get('name')||'file'),ext=path.extname(name);if(!OK.has(ext))return json(res,400,{error:'Only jpg, png, webp, gif, mp4, webm, mov allowed'});
  const base=name.slice(0,-ext.length)||'file';let fn=name,i=1;while(fs.existsSync(path.join(MEDIA,fn)))fn=base+'-'+(i++)+ext;
  const tmp=path.join(MEDIA,'.'+fn+'.part'),ws=fs.createWriteStream(tmp);let n=0,dead=0;
  const fail=(c,m)=>{if(dead)return;dead=1;ws.destroy();fs.unlink(tmp,()=>{});json(res,c,{error:m})};
  req.on('data',c=>{n+=c.length;if(n>MAX)fail(413,'File too large (max 1GB)')});req.on('aborted',()=>fail(400,'aborted'));
  req.pipe(ws);ws.on('finish',()=>{if(dead)return;fs.renameSync(tmp,path.join(MEDIA,fn));json(res,200,{path:'media/'+fn})});ws.on('error',()=>fail(500,'Write error'));return}
 if(p==='/content.js'){res.writeHead(200,{'Content-Type':MIME['.js'],'Cache-Control':'no-store'});return res.end('window.VM_CONTENT='+JSON.stringify(C)+';')}
 if(p==='/admin'){res.writeHead(301,{Location:'/admin/'});return res.end()}
 if(p==='/'||p==='/index.html')return sendFile(req,res,path.join(ROOT,'index.html'));
 if(p==='/admin/'||p==='/admin/index.html')return sendFile(req,res,path.join(ROOT,'admin','index.html'));
 if(p.startsWith('/media/')){const f=inside(MEDIA,p.slice(7));return f?sendFile(req,res,f):(res.writeHead(404),res.end())}
 res.writeHead(404);res.end('Not found');
}catch(e){json(res,500,{error:String(e.message||e)})}}).listen(PORT,()=>console.log('  Website: http://localhost:'+PORT+'\n  Admin:   http://localhost:'+PORT+'/admin/\n'));
