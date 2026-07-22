import os
import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def transparent_green(img_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        r, g, b, a = item
        # Chroma key green (#00ff00) matching color range to filter out
        if g > 130 and r < 100 and b < 100:
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(img_path, "PNG")
    print(f"Processed: {img_path}")

target_files = [
    "public/menu/small_mission.png",
    "public/menu/small_inbox.png",
    "public/menu/small_settings.png"
]

for f in target_files:
    if os.path.exists(f):
        transparent_green(f)
