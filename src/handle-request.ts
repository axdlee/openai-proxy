const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

export default async function handleRequest(req: Request & { nextUrl?: URL }) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);

  // 根据当前访问的域名的二级域名名称代理到不同的域名
  // 获取二级域名名称
  const hostHeader = req.headers.get("host");
  const subdomain = hostHeader.split('.')[0];

  let targetDomain;

  // 根据不同的二级域名设置目标域名
  switch (subdomain) {
      case "groq-proxy":
          targetDomain = "https://api.groq.com";
          break;
      case "openai-proxy":
          targetDomain = "https://api.openai.com";
          break;
      default:
          targetDomain = "https://api.openai.com"; // 默认目标域名
          break;
  }

  const url = new URL(pathname + search, targetDomain).href;
  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  const res = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

  const resHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(res.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

  return new Response(res.body, {
    headers: resHeaders,
    status: res.status
  });
}
