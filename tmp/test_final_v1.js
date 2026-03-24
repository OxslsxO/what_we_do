const http = require('http');

async function request(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch (e) { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on('error', (err) => {
        console.error(`Request Error (${url}):`, err.message);
        resolve({ error: err.message });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    } catch (e) {
      console.error('URL/Request Setup Error:', e.message);
      resolve({ error: e.message });
    }
  });
}

async function run() {
  console.log('>>> STARTING ROBUST VERIFICATION <<<');

  // 1. Auth Verification
  console.log('\n[1] Testing Auth...');
  const login = await request('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13812345678', code: '123456' });
  console.log('Login Response Status:', login.status);
  
  if (login.data?.success) {
    console.log('✅ Auth success: true detected.');
  } else {
    console.warn('⚠️ Auth check failed or success flag missing:', JSON.stringify(login.data).substring(0, 100));
  }

  const userId = login.data?.user?._id;
  if (!userId) {
    console.error('❌ Could not get userId, stopping.');
    return;
  }

  // 2. Relation Verification
  console.log('\n[2] Testing Relation...');
  const invite = await request('http://localhost:3000/api/relation/invite', 'POST', {
    userId: userId,
    phone: '13987654321',
    relationType: 'lover'
  });
  console.log('Invite Result:', invite.status, invite.data?.success || invite.data?.message || 'Error');

  // 3. Circle & Gacha Verification
  console.log('\n[3] Testing Circle & Gacha...');
  const createCircle = await request('http://localhost:3000/api/circle/create', 'POST', {
    name: '终极验证圈',
    userId: userId
  });
  
  const circleId = createCircle.data?.data?._id;
  if (circleId) {
    await request('http://localhost:3000/api/circle/gacha/add', 'POST', { circleId, wish: '代码不出Bug' });
    const spin = await request('http://localhost:3000/api/circle/gacha/spin', 'POST', { circleId, userId: userId });
    console.log('Spin Result:', spin.data?.data || 'Failed');
    
    const interactions = await request(`http://localhost:3000/api/circle/interactions?circleId=${circleId}`, 'GET');
    const hasGachaRecord = interactions.data?.data?.some(i => i.actionType === 'gacha_spin');
    console.log(`✅ Interaction record created: ${!!hasGachaRecord}`);
  } else {
    console.warn('⚠️ Circle creation failed, skipping Gacha test.');
  }

  // 4. AI Verification
  console.log('\n[4] Testing AI Context...');
  const aiLover = await request('http://localhost:3000/api/ai/generate', 'POST', { type: 'chat', relationType: 'lover' });
  const aiBuddy = await request('http://localhost:3000/api/ai/generate', 'POST', { type: 'chat', relationType: 'buddy' });
  console.log('Lover Suggestion:', aiLover.data?.content || 'N/A');
  console.log('Buddy Suggestion:', aiBuddy.data?.content || 'N/A');

  console.log('\n>>> VERIFICATION COMPLETE <<<');
}

run().catch(err => console.error('FATAL RUN ERROR:', err));
