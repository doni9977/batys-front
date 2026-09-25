import urllib.request
import urllib.parse
import json

address = "Казахстан, Уральск, Шолохова 36"
url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(address)}&format=json"

req = urllib.request.Request(url, headers={'User-Agent': 'batys-monitor-geocode/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if data:
            print(f"Lat: {data[0]['lat']}, Lng: {data[0]['lon']}")
        else:
            print("Not found")
except Exception as e:
    print(f"Error: {e}")
