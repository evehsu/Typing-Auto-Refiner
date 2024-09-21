from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from call_openai_api import get_auto_corrected_text, get_tuned_text

app = FastAPI()

# Add this new route
@app.get("/")
async def root():
    return {"message": "Welcome to the Text Processing API"}

class TextInput(BaseModel):
    text: str

class TuneInput(BaseModel):
    text: str
    tone: str

@app.post("/auto-correct")
async def auto_correct(input: TextInput):
    print(f"Received text: {input.text}")  # Add this line
    corrected_text = get_auto_corrected_text(input.text)
    print(f"Corrected text: {corrected_text}")  # Add this line
    if not corrected_text:
        print("Error: corrected_text is None or empty")  # Add this line
        raise HTTPException(status_code=500, detail="Error in auto-correction")
    return {"corrected_text": corrected_text}

@app.post("/tune-text")
async def tune_text(input: TuneInput):
    tuned_text = get_tuned_text(input.text, input.tone)
    if not tuned_text:
        raise HTTPException(status_code=500, detail="Error in text tuning")
    return {"tuned_text": tuned_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)