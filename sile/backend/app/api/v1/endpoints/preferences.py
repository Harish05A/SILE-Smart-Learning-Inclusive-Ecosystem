from fastapi import APIRouter

router = APIRouter()


@router.get("/learning", summary="Get learning preferences")
async def get_learning_preferences():
    return {"message": "Get learning preferences endpoint"}


@router.put("/learning", summary="Update learning preferences")
async def update_learning_preferences():
    return {"message": "Update learning preferences endpoint"}


@router.get("/accessibility", summary="Get accessibility preferences")
async def get_accessibility_preferences():
    return {"message": "Get accessibility preferences endpoint"}


@router.put("/accessibility", summary="Update accessibility preferences")
async def update_accessibility_preferences():
    return {"message": "Update accessibility preferences endpoint"}
