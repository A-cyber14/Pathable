from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import businesses, reviews, users

app = FastAPI(
    title="Pathable API",
    description="Accessibility location finder for Pinellas County, FL",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(businesses.router, prefix="/api/businesses", tags=["businesses"])
app.include_router(reviews.router,   prefix="/api/reviews",    tags=["reviews"])
app.include_router(users.router,     prefix="/api/users",      tags=["users"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Pathable API is running"}
