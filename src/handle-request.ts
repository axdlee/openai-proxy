const baseUrls = {
  "groq-proxy": "https://api.groq.com",
  "openai-proxy": "https://api.openai.com",
  // Add more domains as needed
};
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
  const host = req.nextUrl ? req.nextUrl.host : req.headers.get("host") || "";
  const secondLevelDomain = host.split(".")[0];
  const baseUrl = baseUrls[secondLevelDomain] || "https://api.openai.com"; // Default to api.openai.com if no match
  
  const url = new URL(pathname + search, baseUrl).href;
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
