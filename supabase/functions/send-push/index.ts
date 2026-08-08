// supabase/functions/send-push/index.ts
// schedules INSERT → Edge Function → FCM push notification

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '*';

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      }
    });
  }

  try {
    const body = await req.json();
    const record = body.record;
    if (!record) return new Response(JSON.stringify({ error: 'no record' }), { status: 400, headers: { 'Access-Control-Allow-Origin': origin } });

    if (record.target_user_id === record.created_by) {
      return new Response(JSON.stringify({ skipped: 'same user' }), { status: 200, headers: { 'Access-Control-Allow-Origin': origin } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY')!;

    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${encodeURIComponent(record.target_user_id)}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const tokens = await tokenRes.json();
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: 'no fcm token' }), { status: 200, headers: { 'Access-Control-Allow-Origin': origin } });
    }

    const fcmToken = tokens[0].fcm_token;
    const saKey = Deno.env.get('FCM_SERVICE_ACCOUNT_KEY')!;
    let sa;
    try {
      sa = JSON.parse(saKey);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'sa_key parse failed', msg: e.message, keyStart: saKey.substring(0, 50) }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
    }

    const jwtHeader = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jwtClaim = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: sa.token_uri,
      exp: now + 3600,
      iat: now,
    };

    const encoder = new TextEncoder();
    const toBase64 = (obj: any) => {
      if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
        const bytes = new Uint8Array(obj instanceof ArrayBuffer ? obj : obj.buffer || obj);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      }
      return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
    const signData = toBase64(jwtHeader) + '.' + toBase64(jwtClaim);

    const pem = sa.private_key;
    if (!pem || !pem.startsWith('-----BEGIN PRIVATE KEY-----')) {
      return new Response(JSON.stringify({ error: 'invalid private_key', pemStart: pem ? pem.substring(0, 50) : 'undefined' }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
    }
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContent = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signData)
    );

    const jwt = signData + '.' + toBase64(new Uint8Array(signature));

    const tokenResp = await fetch(sa.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'oauth failed', oauthResponse: tokenData }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: record.created_by + '님 일정',
          body: record.title,
        },
        android: {
          notification: {
            channel_id: 'familyplan',
            sound: 'default',
          },
        },
      },
    };

    const fcmRes = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });
    const fcmBody = await fcmRes.json();

    return new Response(JSON.stringify({ sent: true, to: record.target_user_id, title: record.title, fcmStatus: fcmRes.status, fcmName: fcmBody.name }), { status: 200, headers: { 'Access-Control-Allow-Origin': origin } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack, name: e.name }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
  }
});
