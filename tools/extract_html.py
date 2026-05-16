import re
with open(r'c:\Users\70708\AppData\Roaming\Code\User\workspaceStorage\685f25e789c1b752d393a45cfceac02c\GitHub.copilot-chat\chat-session-resources\78f98722-279f-47f0-8692-74f4f173c962\call_MHxodG9ZMFRCVFRPeUlRYVNZVFg__vscode-1771850223279\content.txt', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()
text = re.sub(r'<[^>]+>', ' ', html)
text = re.sub(r'\s+', ' ', text)
with open(r'G:\Git\Lumex\tools\extracted.txt', 'w', encoding='utf-8') as f:
    f.write(text)
