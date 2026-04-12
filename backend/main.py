from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import businesses, reviews, users, admin, dashboard

app = FastAPI(
    title="Pathable API",
    description="Accessibility location finder for the Tampa Bay Area",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # fallback
        "https://pathable-eta.vercel.app",
        "https://pathable-idd8kjktq-heysuss1s-projects.vercel.app",
        "https://pathable-git-main-heysuss1s-projects.vercel.app",
        "https://pathable-heysuss1s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(businesses.router, prefix="/api/businesses", tags=["businesses"])
app.include_router(reviews.router,   prefix="/api/reviews",    tags=["reviews"])
app.include_router(users.router,     prefix="/api/users",      tags=["users"])
app.include_router(admin.router,     prefix="/api/admin",      tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard",  tags=["dashboard"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Pathable API is running"}
