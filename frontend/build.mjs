import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const api=(process.env.PUBLIC_API_BASE||'https://knecbackendat2020.onrender.com').replace(/\/$/,'');
const demo=process.env.DEMO_MODE==='true';
if(!demo){let u;try{u=new URL(api);}catch{throw new Error('Set PUBLIC_API_BASE to the real Render HTTPS service URL, or use DEMO_MODE=true for a local static preview.');}
 if(u.username||u.password)throw new Error('PUBLIC_API_BASE cannot contain @ credentials. Copy the actual Render service URL.');
 if(u.pathname!=='/'||u.search||u.hash)throw new Error('PUBLIC_API_BASE must be an origin, without an /api suffix, query or fragment.');
 if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw new Error('Production API must use HTTPS.');}
const dist=path.join(here,'dist');fs.rmSync(dist,{recursive:true,force:true});fs.cpSync(path.join(here,'public'),dist,{recursive:true});
if(fs.existsSync(path.join(dist,'papers')))throw new Error('Public PDFs would bypass paid downloads. Remove frontend/public/papers.');
fs.writeFileSync(path.join(dist,'config.js'),'window.KNECK_CONFIG = '+JSON.stringify({apiBase:api,demo})+';\n');
console.log('Frontend build verified:',demo?'static preview':'connected API '+api);
