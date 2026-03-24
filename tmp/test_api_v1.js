const http = require('http');

async function test(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    };
    const req = http.request(url, options, (res) => {
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
  console.log('--- Health Check ---');
  const health = await test('http://localhost:3000/health');
  console.log(JSON.stringify(health, null, 2));

  console.log('--- Auth: Send Code (Mock) ---');
  const sendCode = await test('http://localhost:3000/api/auth/send-code', 'POST', { phone: '13812345678' });
  console.log(JSON.stringify(sendCode, null, 2));

  console.log('--- Auth: Login with Code 123456 ---');
  const login = await test('http://localhost:3000/api/auth/login-code', 'POST', { phone: '13812345678', code: '123456' });
  console.log(JSON.stringify(login, null, 2));

  console.log('--- AI: Generate Content ---');
  const ai = await test('http://localhost:3000/api/ai/generate', 'POST', { type: 'chat' });
  console.log(JSON.stringify(ai, null, 2));
}

run();
