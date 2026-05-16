import re

with open('Lumex_Override.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove auto-update from profile
content = re.sub(r'    "store-fake-ip": true,\r?\n    "auto-update": true', r'    "store-fake-ip": true // �Ż����־û� Fake-IP ���棬����������', content)

# 2. Remove route-exclude-address from tun
content = re.sub(r'    "dns-hijack": \["any:53"\],\r?\n    "route-exclude-address": \[.*?\] // �Ż��������鲥�͹㲥��ַ�ų������׽����������������\r?\n', r'    "dns-hijack": ["any:53"]\n', content)

# 3. Add unified-delay and keep-alive-interval to global config
content = re.sub(r'  config\["client-fingerprint"\] = "chrome"; // ����ָ���Ը��õ�֧�� HTTP/3\r?\n', r'  config["client-fingerprint"] = "chrome"; // ����ָ���Ը��õ�֧�� HTTP/3\n  config["unified-delay"] = true; // ����ͳһ�ӳ٣���׼ȷ\n  config["keep-alive-interval"] = 15; // �Ż�����������̽����\n', content)

# 4. Remove unified-delay from proxy-groups
content = re.sub(r'      "unified-delay": true, // ����ͳһ�ӳ٣���׼ȷ\r?\n', r'', content)
content = re.sub(r'      "unified-delay": true,\r?\n', r'', content)

with open('Lumex_Override.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
