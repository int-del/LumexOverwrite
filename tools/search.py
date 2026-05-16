import urllib.request
import urllib.parse
import re

query = 'Lumex Party v1.9.1 release notes changelog override script'
url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(query)
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    results = re.findall(r'<a class=\"result__snippet[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
    for r in results[:5]:
        print(re.sub(r'<[^>]+>', '', r).strip())
except Exception as e:
    print(e)
