import urllib.request
import json

API_KEY = "3560bd8d-89b7-479e-b4c5-da5fc3aef542"
LIBRARY_ID = "581761"

req = urllib.request.Request(
    f"https://api.bunny.net/videolibrary/{LIBRARY_ID}",
    headers={"AccessKey": API_KEY, "accept": "application/json"}
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read())
        print("✅ API KEY HỢP LỆ")
        print(f"Library Name: {data.get('Name')}")
        print(f"Library ID: {data.get('Id')}")
except urllib.error.HTTPError as e:
    print(f"❌ THẤT BẠI - HTTP {e.code}")
    if e.code == 401:
        print("API key không hợp lệ hoặc không có quyền truy cập library này")
    else:
        print(e.read().decode())
