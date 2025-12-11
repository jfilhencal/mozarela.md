const http = require('node:http');
function post(path, body) {
  return new Promise((resolve,reject)=>{
    const data = JSON.stringify(body);
    const req = http.request({ host: 'localhost', port: 3001, path, method: 'POST', headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(data) } }, res=>{ let out=''; res.on('data', d=>out+=d); res.on('end', ()=>{ try{ resolve(JSON.parse(out)) }catch(e){ resolve(out) } });});
    req.on('error', reject);
    req.write(data); req.end();
  });
}
function get(path) {
  return new Promise((resolve,reject)=>{
    http.get({ host:'localhost', port:3001, path }, res=>{ let out=''; res.on('data', d=>out+=d); res.on('end', ()=>{ try{ resolve(JSON.parse(out)) }catch(e){ resolve(out) } }); }).on('error', reject);
  });
}
(async ()=>{
  try{
    const email = 'e2e+' + Date.now() + '@example.test';
    console.log('TEST EMAIL:', email);
    const reg = await post('/api/auth/register', { fullName: 'E2E Tester', email, password: 'secret123', clinicName: 'Test Clinic' });
    console.log('REGISTER:', reg);
    const login = await post('/api/auth/login', { email, password: 'secret123' });
    console.log('LOGIN:', login);
    const token = login.token;
    const sess = await get('/api/sessions/' + encodeURIComponent(token));
    console.log('SESSION:', sess);
    const user = await get('/api/users/' + encodeURIComponent(sess.userId));
    console.log('USER:', user);
  }catch(e){ console.error('E2E FAILED', e) }
})();
