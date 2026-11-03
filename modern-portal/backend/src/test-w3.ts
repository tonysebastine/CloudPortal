// native fetch is available globally in Node 18+

async function testW3Login() {
  const loginUrl = 'https://w3infotech.com/reseller-login';

  console.log('1. Fetching login page...');
  const getRes = await fetch(loginUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });

  const getCookie = getRes.headers.get('set-cookie') || '';
  const html = await getRes.text();

  const vsMatch = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/);
  const vsgMatch = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/);
  const evMatch = html.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/);

  const viewState = vsMatch ? vsMatch[1] : '';
  const viewStateGenerator = vsgMatch ? vsgMatch[1] : '';
  const eventValidation = evMatch ? evMatch[1] : '';

  console.log('Found ViewState:', !!viewState);

  const params = new URLSearchParams();
  params.append('__EVENTTARGET', 'ctl00$ContentPlaceHolder1$LinkButton1');
  params.append('__EVENTARGUMENT', '');
  params.append('__VIEWSTATE', viewState);
  params.append('__VIEWSTATEGENERATOR', viewStateGenerator);
  if (eventValidation) {
    params.append('__EVENTVALIDATION', eventValidation);
  }
  params.append('ctl00$ContentPlaceHolder1$txtRegistrantEmail', 'thbz');
  params.append('ctl00$ContentPlaceHolder1$txtRegistrantPassword', 'Tz@124816');

  console.log('2. Submitting postback...');
  const postRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Cookie': getCookie,
    },
    body: params.toString(),
    redirect: 'manual',
  });

  console.log('POST status:', postRes.status);
  console.log('Location header:', postRes.headers.get('location'));
  console.log('Post set-cookie:', postRes.headers.get('set-cookie'));

  const postHtml = await postRes.text();
  const errorMatch = postHtml.match(/id="lblMessage"[^>]*>([^<]+)<\/span>/i);
  if (errorMatch) {
    console.log('W3 Error message on page:', errorMatch[1]);
  } else {
    console.log('Page response length:', postHtml.length);
  }
}

testW3Login().catch(console.error);
