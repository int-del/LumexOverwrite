import re

with open('Lumex_Override.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove unified-delay from proxy-groups
content = re.sub(r'      "unified-delay": true, // ����ͳһ�ӳ٣���׼ȷ\r?\n', r'', content)
content = re.sub(r'      "unified-delay": true,\r?\n', r'', content)

with open('Lumex_Override.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
