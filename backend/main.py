import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import businesses, reviews, users, admin, dashboard, billing

app = FastAPI(
    title="Pathable API",
    description="Accessibility location finder for the Tampa Bay Area",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS
# Base origins are always allowed. Set CORS_ORIGINS on Railway to add more
# (comma-separated). All *.vercel.app subdomains are covered by the regex so
# preview deployments never break.
# ---------------------------------------------------------------------------

_BASE_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://pathable-art.vercel.app",
]

# Allow extra origins injected at deploy time (e.g. a custom domain).
_extra = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
_ALLOW_ORIGINS = list(set(_BASE_ORIGINS + _extra))

# Regex covers every Vercel deployment URL for this project automatically.
_VERCEL_ORIGIN_REGEX = r"https://pathable[a-zA-Z0-9\-]*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOW_ORIGINS,
    allow_origin_regex=_VERCEL_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Unhandled-error safety net
# Starlette's default 500 response for an unhandled exception is generated
# outside CORSMiddleware, so it goes out with no Access-Control-Allow-Origin
# header. The browser can't read that response and reports it as a CORS
# failure, masking the real (non-CORS) error underneath. Catching it here
# turns it into a normal handled response that CORSMiddleware still adds its
# headers to, so the frontend gets a readable error instead of a fake CORS one.
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.include_router(businesses.router, prefix="/api/businesses", tags=["businesses"])
app.include_router(reviews.router,   prefix="/api/reviews",    tags=["reviews"])
app.include_router(users.router,     prefix="/api/users",      tags=["users"])
app.include_router(admin.router,     prefix="/api/admin",      tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(billing.router,   prefix="/api/billing",    tags=["billing"])


@app.on_event("startup")
def check_env():
    """Warn loudly on startup about any missing env vars so Railway logs show the problem."""
    required = {
        "GOOGLE_MAPS_API_KEY":        "external Places search (search-unified)",
        "GOOGLE_APPLICATION_CREDENTIALS": "Firestore / Firebase Admin",
        "STRIPE_SECRET_KEY":          "business plan checkout/billing (routers/billing.py)",
        "STRIPE_WEBHOOK_SECRET":      "verifying Stripe webhook events",
        "STRIPE_BETA_PRICE_ID":       "Beta plan checkout",
        "STRIPE_PREMIUM_PRICE_ID":    "Premium plan checkout",
    }
    for var, purpose in required.items():
        if not os.getenv(var):
            print(f"[Pathable] WARNING: {var} is not set — {purpose} will not work.")
    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if google_maps_key:
        print(f"[Pathable] GOOGLE_MAPS_API_KEY is set (length={len(google_maps_key)}) — Places search enabled.")


@app.get("/")
def root():
    return {"status": "ok", "message": "Pathable API is running"}
