import os
from PIL import Image

input_path = r"C:\Users\harsh parmar\.gemini\antigravity\brain\4b301477-2736-4430-93d9-8fb55110a9c9\instaauto_transparent_logo_1787761789566.png"
output_favicon = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\favicon.png"
output_favicon_ico = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\favicon.ico"
output_logo = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\images\logo.png"
output_favicon_sub = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\images\favicon.png"

img = Image.open(input_path).convert("RGBA")
width, height = img.size

# 1. Remove white background
datas = list(img.getdata())
newData = []
for item in datas:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)
img.putdata(newData)

# 2. Crop top 78% of the image to discard small text at the bottom
img = img.crop((0, 0, width, int(height * 0.78)))

# 3. Crop tight bounding box around the vector mark
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# 4. Save high-resolution transparent images
img.save(output_favicon, "PNG")
img.save(output_logo, "PNG")
img.save(output_favicon_sub, "PNG")
img.save(output_favicon_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])

print("Successfully cropped logo text and generated large standalone vector mark!")
