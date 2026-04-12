import os
import json
import asyncio
from openai import AsyncOpenAI
import traceback
from dotenv import load_dotenv

load_dotenv()

async def test():
    client = AsyncOpenAI(
        api_key=os.environ.get("GROK_API_KEY", "your_grok_key_here"),
        base_url="https://api.xai.com/v1",
    )
    
    prompt = f"""
    User disease: Asthma
    
    Simulate voice biomarker analysis.
    
    Rules:
    - If Asthma -> high breath_score
    - Include slight randomness
    - Compare with previous day if provided
    
    Return ONLY valid JSON (no markdown formatting, no code blocks):
    {{
        "pitch_variation": 0.18,
        "breath_score": 0.82,
        "pause_score": 0.75,
        "speech_rate": 2.3,
        "health_score": 58,
        "status": "Warning"
    }}
    """
    
    print("Calling Grok...")
    response = await client.chat.completions.create(
        model="grok-beta",
        messages=[
            {"role": "system", "content": "You are an AI simulating vocal biomarker health scores. Always output raw JSON, with no markdown code block tags like ```json or ```."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )
    
    try:
        content = response.choices[0].message.content.strip()
    except Exception as e:
        print("Exception reading content:", e)
        print("Response dict:", json.dumps(response.model_dump() if hasattr(response, 'model_dump') else {}, indent=2, ensure_ascii=True))
        return


    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    
    result_json = json.loads(content.strip())
    
    print(result_json)
    
    print(float(result_json.get("pitch_variation", 0.0)))
    print(float(result_json.get("breath_score", 0.0)))
    print(float(result_json.get("pause_score", 0.0)))
    print(float(result_json.get("speech_rate", 0.0)))
    print(int(result_json.get("health_score", 0)))
    print(str(result_json.get("status", "Unknown")))

asyncio.run(test())

