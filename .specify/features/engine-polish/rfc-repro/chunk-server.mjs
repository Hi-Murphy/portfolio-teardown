import http from 'node:http';
const upstream = 'http://127.0.0.1:4614';
const [, , port, marker, stallMs] = process.argv;
http.createServer(async (req, res) => {
  const r = await fetch(upstream + req.url);
  const buf = Buffer.from(await r.arrayBuffer());
  const headers = Object.fromEntries([...r.headers].filter(([k]) => !['content-length', 'content-encoding', 'transfer-encoding'].includes(k)));
  res.writeHead(r.status, headers);
  if (req.url === '/' && marker) {
    const html = buf.toString('utf8'); const i = html.indexOf(marker);
    res.write(html.slice(0, i)); setTimeout(() => res.end(html.slice(i)), Number(stallMs));
  } else res.end(buf);
}).listen(Number(port));
