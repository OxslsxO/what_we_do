const http = require('http');

async function test(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json' },
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
  // 1. 获取三个用户 (A, B, C)
  const loginA = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13812345678', code: '123456' });
  const loginB = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13987654321', code: '123456' });
  const loginC = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13700001111', code: '123456' });
  
  const userA = loginA.data.user;
  const userB = loginB.data.user;
  const userC = loginC.data.user;

  // 2. A 创建圈子 "快乐四人组"
  console.log('--- A creates circle ---');
  const createCircle = await test('http://localhost:3000/api/circle/create', 'POST', {
    name: '快乐四人组',
    userId: userA._id
  });
  const circle = createCircle.data.data;
  console.log(JSON.stringify(createCircle, null, 2));

  // 3. B 加入圈子
  console.log('--- B joins circle ---');
  const joinB = await test('http://localhost:3000/api/circle/join', 'POST', {
    circleId: circle._id,
    userId: userB._id
  });
  console.log(JSON.stringify(joinB, null, 2));

  // 4. 扭蛋机测试: C 往池子里扔愿望, A 来抽
  console.log('--- Gacha: Add wish ---');
  await test('http://localhost:3000/api/circle/gacha/add', 'POST', { circleId: circle._id, wish: '吃火锅' });
  await test('http://localhost:3000/api/circle/gacha/add', 'POST', { circleId: circle._id, wish: '看电影' });
  await test('http://localhost:3000/api/circle/gacha/add', 'POST', { circleId: circle._id, wish: '去露营' });

  console.log('--- Gacha: Spin ---');
  const spin = await test('http://localhost:3000/api/circle/gacha/spin', 'POST', { 
    circleId: circle._id, 
    userId: userA._id 
  });
  console.log('Result:', spin.data.data);
  
  // 5. 验证互动记录
  console.log('--- Check circle interactions ---');
  const interactions = await test(`http://localhost:3000/api/circle/interactions?circleId=${circle._id}`, 'GET');
  console.log(JSON.stringify(interactions, null, 2));
}

run();
