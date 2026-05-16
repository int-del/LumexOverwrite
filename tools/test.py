import urllib.request, json, sys
try:
    req = urllib.request.Request('https://api.github.com/repos/Lumex-party-org/Lumex-party/releases', headers={'User-Agent': 'Mozilla/5.0'})
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    for r in data[:3]:
        print(r['tag_name'])
except Exception as e:
    print(e)
