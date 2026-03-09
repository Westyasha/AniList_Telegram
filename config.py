import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ANILIST_CLIENT_ID = os.getenv("ANILIST_CLIENT_ID")
ANILIST_CLIENT_SECRET = os.getenv("ANILIST_CLIENT_SECRET")
ANILIST_REDIRECT_URI = os.getenv("ANILIST_REDIRECT_URI", "https://anilist.co/api/v2/oauth/pin")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN is not set in environment")
if not ANILIST_CLIENT_ID:
    raise ValueError("ANILIST_CLIENT_ID is not set in environment")

ANILIST_API_URL = "https://graphql.anilist.co"
ANILIST_AUTH_URL = "https://anilist.co/api/v2/oauth/authorize"
ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token"
