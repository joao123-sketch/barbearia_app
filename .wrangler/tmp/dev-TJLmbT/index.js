var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var SUPABASE_URL = "https://jkahsamhmaijhfgjijfg.supabase.co";
var SUPABASE_KEY = "sb_publishable_Pp50y6WaFzFqr0yVUKSx3g_qi5nZQOi";
var PRESET_COLORS = {
  elegante: "#090a0f",
  sofisticado: "#0d0a14",
  moderno: "#060b12",
  minimalista: "#0a0a0a",
  azul: "#070b16",
  simples: "#f4f8f6",
  rosa: "#fff1f6",
  neutro: "#f6f1ea"
};
async function loadShop(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/public_barbershops?slug=eq.${encodeURIComponent(slug)}&select=name,slug,logo_url,style_preset&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}
__name(loadShop, "loadShop");
function parseDataUrl(value) {
  const match = value.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { type: match[1], bytes };
}
__name(parseDataUrl, "parseDataUrl");
async function manifestResponse(slug, app) {
  const shop = await loadShop(slug);
  if (!shop) return new Response("Not found", { status: 404 });
  const logo = shop.logo_url ? parseDataUrl(shop.logo_url) : null;
  const color = PRESET_COLORS[shop.style_preset ?? "neutro"] ?? "#090a0f";
  const isAdmin = app === "admin";
  const icons = logo ? [
    { src: `/icon/${shop.slug}`, sizes: "192x192 512x512", type: logo.type, purpose: "any" }
  ] : [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
  ];
  const manifest = {
    // Cliente abre direto no agendamento; dono abre no painel do negócio
    id: isAdmin ? "/admin" : `/b/${shop.slug}`,
    name: isAdmin ? `${shop.name} \xB7 Painel` : shop.name,
    short_name: shop.name.length > 12 ? shop.name.slice(0, 12).trim() : shop.name,
    description: isAdmin ? `Painel de gest\xE3o de ${shop.name}` : `Agende seu hor\xE1rio em ${shop.name}`,
    lang: "pt-BR",
    start_url: isAdmin ? "/admin" : `/b/${shop.slug}`,
    scope: isAdmin ? "/admin" : `/b/${shop.slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: color,
    theme_color: color,
    icons
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}
__name(manifestResponse, "manifestResponse");
async function iconResponse(slug, request, env) {
  const shop = await loadShop(slug);
  const logo = shop?.logo_url ? parseDataUrl(shop.logo_url) : null;
  if (logo) {
    return new Response(logo.bytes, {
      headers: { "content-type": logo.type, "cache-control": "public, max-age=300" }
    });
  }
  if (shop?.logo_url && /^https?:\/\//.test(shop.logo_url)) return Response.redirect(shop.logo_url, 302);
  return env.ASSETS.fetch(new Request(new URL("/icon-512.png", request.url)));
}
__name(iconResponse, "iconResponse");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const manifest = url.pathname.match(/^\/manifest\/([a-z0-9-]+)\.webmanifest$/);
    if (manifest) return manifestResponse(manifest[1], url.searchParams.get("app") === "admin" ? "admin" : "client");
    const icon = url.pathname.match(/^\/icon\/([a-z0-9-]+)$/);
    if (icon) return iconResponse(icon[1], request, env);
    return env.ASSETS.fetch(request);
  }
};

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-K9qXv2/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-K9qXv2/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
