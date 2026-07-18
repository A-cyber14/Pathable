from services.firebase import db

COLLECTION = "businesses"


def find_duplicate_business_id(name: str, address: str, place_id: str | None = None) -> str | None:
    """
    Returns the id of an existing business that looks like the same real-world
    location, or None if no match is found. Same matching rules used by
    create_from_external: exact Google place_id match first, then a fuzzy
    substring match on both name and address.
    """
    name_lower = (name or "").strip().lower()
    addr_lower = (address or "").strip().lower()

    if place_id:
        for doc in db.collection(COLLECTION).stream():
            data = doc.to_dict()
            gid = data.get("googlePlaceId") or data.get("place_id")
            if gid == place_id:
                return doc.id

    for doc in db.collection(COLLECTION).stream():
        data   = doc.to_dict()
        s_name = data.get("name", "").lower()
        s_addr = data.get("address", "").lower()
        name_hit = name_lower in s_name or s_name in name_lower
        addr_hit = addr_lower in s_addr or s_addr in addr_lower
        if name_hit and addr_hit:
            return doc.id

    return None
