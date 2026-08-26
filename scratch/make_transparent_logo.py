import os
from PIL import Image

input_path = r"C:\Users\harsh parmar\.gemini\antigravity\brain\4b301477-2736-4430-93d9-8fb55110a9c9\instaauto_transparent_logo_1787761789566.png"
output_favicon = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\favicon.png"
output_logo = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\images\logo.png"
output_favicon_sub = r"c:\Users\harsh parmar\Desktop\instagram-automation\public\images\favicon.png"

img = Image.open(input_path).convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    # Change white (or near-white) background pixels to transparent
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Crop bounding box around non-transparent pixels to trim margins
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Save high quality transparent PNGs
img.save(output_favicon, "PNG")
img.save(output_logo, "PNG")
img.save(output_favicon_sub, "PNG")

print("Successfully generated transparent background logo & favicon PNGs!")
