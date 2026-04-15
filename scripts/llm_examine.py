import json
import time
import openai
from collections import Counter
from tqdm import tqdm

API_KEY = "sk-yourapikey"
BASE_URL = "https://api.deepseek.com"
client = openai.OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

SAVE_EVERY_N_ITEMS = 10

SYSTEM_PROMPT = """You are an editorial assistant specialized in the history of Chinese science and technology. Your task is to rewrite a given description of an invention into a standard encyclopedic summary.

【Input Content】
The user will provide a text containing:
1. The name of an invention.
2. A description of that invention (which may include non-Chinese historical content or formatting symbols such as HTML, Markdown, or LaTeX).

【Processing Rules】
1. **Content Filtering**: Extract and retain only information directly related to China (e.g., Chinese origins, Chinese improvements, ancient Chinese applications, Chinese historical records). Strictly exclude all content pertaining exclusively to foreign invention histories.
2. **Plain Text**: Output must be plain text only. Remove all HTML tags, Markdown syntax, LaTeX symbols, extraneous line breaks, and indentations.
3. **Word Count**: The final description (the value of the `describe` field) must be strictly between **100 and 200 characters** in English (spaces and punctuation excluded from the count). For Chinese text output, the count should be based on Chinese characters.
4. **Irrelevant Invention Warning**: If the provided text is entirely unrelated to Chinese historical facts regarding this invention (e.g., only describes European or Arabic history), prepend `[WARNING]` to the beginning of the description text.

【Output Format】
You must return **only** a valid JSON object. Do **not** include any explanatory prefixes, suffixes, or Markdown code block markers (such as ```json).
Format example:
{"name": "指南针", "describe": "中国古代四大发明之一。战国时期已有'司南'记载，宋代出现用于航海的磁针。利用磁铁指极性辨别方向，对人类航海事业与地理大发现具有划时代的推动意义。"}

【Additional Requirements】
- Maintain an objective, factual, and neutral tone consistent with a general encyclopedia entry.
- If the provided information is insufficient to reach 100 characters, concisely summarize the invention's historical significance in China without fabricating details.
- Avoid using double quotation marks within the JSON string values; if quoting source text is necessary, use single quotation marks instead.
- Ensure the JSON structure is intact, with the exact keys `name` and `describe`."""

def classify_single(reply):
    user_prompt = f"Process the following input:\n\n{reply}"

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={'type': 'json_object'},
            temperature=1.0,
            max_tokens=500
        )

        model_reply = response.choices[0].message.content.strip()

        import re
        json_match = re.search(r'\{[\s\S]*\}', model_reply)
        if json_match:
            json_str = json_match.group()
            classifications = json.loads(json_str)

        result = {
            "name": classifications.get("name", ""),
            "describe": classifications.get("describe", "")
        }

        return result

    except Exception as e:
        print(f"API调用失败: {e}")
        return {"name": "", "describe": "ERROR"}

def save_progress(data, output_file, suffix=""):
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"已保存进度到 {output_file}")
    return output_file

def process_replies(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"加载了 {len(data)} 条记录")

    w_target = []
    items_to_process = []
    items_to_process = [(p_data['name'], p_data['desc']) for p_data in data]

    for idx, (name, desc) in enumerate(tqdm(items_to_process)):
        classification = classify_single({"name": name, "desc": desc})
        w_target.append(classification)

        # 每N条保存一次进度
        if idx % SAVE_EVERY_N_ITEMS == 0:
            save_progress(w_target, output_file, "item")

        time.sleep(1)

    # 保存最终结果
    save_progress(w_target, output_file)

    print(f"\n最终结果已保存到 {output_file}")



if __name__ == "__main__":
    INPUT_FILE = "/Users/bo_yu/Documents/bupt/l_ds_design/huaxia-tech-tree/scripts/output/final_nodes.json"
    OUTPUT_FILE = "/Users/bo_yu/Documents/bupt/l_ds_design/huaxia-tech-tree/scripts/output/final_nodes_examined.json"

    process_replies(INPUT_FILE, OUTPUT_FILE)