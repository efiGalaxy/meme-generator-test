import urllib.request
import ssl
import os

# Create templates directory if it doesn't exist
os.makedirs('templates', exist_ok=True)

# Bypass SSL certificate verification
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Meme template URLs (using different sources)
templates = {
    'drake.jpg': 'https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg',
    'distracted.jpg': 'https://imgflip.com/s/meme/Distracted-Boyfriend.jpg',
    'buttons.jpg': 'https://imgflip.com/s/meme/Two-Buttons.jpg',
    'mind.jpg': 'https://imgflip.com/s/meme/Change-My-Mind.jpg'
}

print("Downloading meme templates...\n")

for filename, url in templates.items():
    try:
        filepath = os.path.join('templates', filename)
        print(f"Downloading {filename}...")
        
        # Create request with user agent
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        
        # Create opener with SSL context
        opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=ssl_context)
        )
        
        # Download file
        with opener.open(req) as response:
            with open(filepath, 'wb') as out_file:
                out_file.write(response.read())
        
        print(f"[OK] Saved to {filepath}")
    except Exception as e:
        print(f"[FAIL] Failed to download {filename}: {e}")

print("\nDone! Templates saved to 'templates/' folder.")
print("Refresh your browser to see them in the meme generator!")
