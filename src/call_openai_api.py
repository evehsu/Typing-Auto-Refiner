import yaml
from openai import OpenAI
import logging
import functools
import os
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
load_dotenv()
# Set the OpenAI API key
client = OpenAI(
    # This will now use the API key from the .env file
    api_key=os.getenv("OPENAI_API_KEY"),
)


def load_prompt(prompt_path, version_name):
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct the absolute path to the prompt file
    absolute_prompt_path = os.path.join(current_dir, prompt_path)
    
    with open(absolute_prompt_path, "r") as f:
        prompts = yaml.safe_load(f)
    
    if version_name not in prompts:
        raise ValueError(f"Prompt version '{version_name}' not found in the YAML file.")
    
    return prompts[version_name]

def error_handler(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logging.error(f"Error in {func.__name__}: {e}")
            return ""
    return wrapper

@error_handler
def get_auto_corrected_text(text):
    prompt = load_prompt("prompt/auto_correction_prompt.yaml", "base_prompt")
    api_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": text}
        ],
        max_tokens=1000
    )
    auto_corrected_text_response = api_response.choices[0].message.content.strip()
    return auto_corrected_text_response

@error_handler
def get_tuned_text(text, tone):
    system_prompt = load_prompt("prompt/tone_tuning.yaml", "system_prompt")
    user_prompt = load_prompt("prompt/tone_tuning.yaml", "user_prompt")
    user_prompt_formatted = f"{user_prompt}".format(text=text, tone=tone)
    print(user_prompt_formatted)
    toned_text_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages = [            
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_formatted}
            ],
        max_tokens=1000
    )
    return toned_text_response.choices[0].message.content.strip()