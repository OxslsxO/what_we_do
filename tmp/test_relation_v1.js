const http = require('http');

async function test(url, method = 'GET', body = null, token = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      timeout: 5000
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // 1. 登录用户 A (13812345678)
  const loginA = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13812345678', code: '123456' });
  const userA = loginA.data.user;
  const tokenA = loginA.data.token;
  console.log('User A logged in:', userA._id);

  // 2. 登录用户 B (13987654321)
  const loginB = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13987654321', code: '123456' });
  const userB = loginB.data.user;
  const tokenB = loginB.data.token;
  console.log('User B logged in:', userB._id);

  // 3. A 邀请 B
  console.log('--- A invites B ---');
  const invite = await test('http://localhost:3000/api/relation/invite', 'POST', { 
    userId: userA._id, 
    phone: '13987654321',
    relationType: 'lover'
  }, tokenA);
  console.log(JSON.stringify(invite, null, 2));

  if (invite.status === 409) {
     console.log('Relation already exists, proceeding to check current.');
  }

  // 4. B 查看待处理邀请
  console.log('--- B checks current relation (pending) ---');
  const currentB = await test(`http://localhost:3000/api/relation/current?userId=${userB._id}`, 'GET', null, tokenB);
  console.log(JSON.stringify(currentB, null, 2));

  const pendingRelation = currentB.data.data.pendingInvites[0];
  if (pendingRelation) {
    console.log('--- B responds (Accept) ---');
    const respond = await test('http://localhost:3000/api/relation/respond', 'POST', {
      relationId: pendingRelation._id,
      userId: userB._id,
      decision: 'accept'
    }, tokenB);
    console.log(JSON.stringify(respond, null, 2));
  } else {
    console.log('No pending invite found for B.');
  }

  // 5. A 查看今日面板
  console.log('--- A checks dashboard ---');
  const dashboard = await test(`http://localhost:3000/api/relation/dashboard?userId=${userA._id}`, 'GET', null, tokenA);
  console.log(JSON.stringify(dashboard, null, 2));
}

run();
