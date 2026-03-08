import re

input_file = r'c:\Users\HSG\Documents\iABS-main\iABS-main\300_ramadan_islam_varied_questions.txt'
output_file = r'c:\Users\HSG\Documents\iABS-main\iABS-main\fawazir.txt'

with open(input_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to find each question block
# Starts with "Number. Question text"
# Then options A, B, C, D
# Then "الإجابة: Letter) Answer text"
blocks = re.split(r'\n(?=\d+[\.-])', text)

output_lines = []
for block in blocks:
    lines = [l.strip() for l in block.split('\n') if l.strip()]
    if not lines: continue
    
    question_text = lines[0]
    options = {}
    answer_letter = ''
    
    for l in lines[1:]:
        opt_match = re.match(r'^([A-D])\)\s*(.*)', l)
        if opt_match:
            options[opt_match.group(1)] = opt_match.group(2).strip()
        elif 'الإجابة:' in l:
            ans_match = re.search(r'الإجابة:\s*([A-D])', l)
            if ans_match:
                answer_letter = ans_match.group(1).upper()

    if question_text and len(options) >= 2 and answer_letter:
        # Join options with |
        opts_str = " | ".join([f"{k}) {v}" for k, v in sorted(options.items())])
        output_lines.append(question_text)
        output_lines.append(opts_str)
        output_lines.append(f"الإجابة: {answer_letter}")
        output_lines.append("") # Empty line between questions

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(output_lines))

print(f"Processed {len(output_lines)//4} questions.")
