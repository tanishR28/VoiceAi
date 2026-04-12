import os
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

async def test_grok():
    client = AsyncOpenAI(
        api_key=os.environ.get("GROK_API_KEY", "your_grok_key_here"),
        base_url="https://api.xai.com/v1",
    )
    print(f"Key loaded: {bool(os.environ.get('GROK_API_KEY'))}")
    try:
        response = await client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "user", "content": "hello"}
            ],
            temperature=0.7,
        )
        print("Success!")
        print(type(response))
        print(response)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_grok())
