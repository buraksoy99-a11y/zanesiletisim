// Private mailer for the site's feedback function. It has no public URL: the Pages project reaches it through
// its MAILER service binding, and the email binding can only send from and to the addresses in wrangler.jsonc.
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response(null, {status:405});
    try {
      const {to, from, subject, text, html} = await request.json();
      const result = await env.EMAIL.send({to, from, subject, text, html});
      return Response.json({ok:true, id:result?.messageId ?? null});
    } catch (error) {
      console.error('mailer: send failed', error.code ?? '', error.message);
      return Response.json({ok:false, code:error.code ?? null}, {status:500});
    }
  },
};
