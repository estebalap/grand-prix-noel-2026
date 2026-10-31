#!/usr/bin/env python3
"""Assemble les PNG d'un dossier d'aperçu en planche (légende = nom + stats UI) : python3 planche.py <dossier> [colonnes] [largeur_vignette]"""
import glob, json, os, sys
from PIL import Image, ImageDraw
d = sys.argv[1]; col = int(sys.argv[2]) if len(sys.argv) > 2 else 4; lv = int(sys.argv[3]) if len(sys.argv) > 3 else 480
hv = lv * 9 // 16; stats = {}
if os.path.exists(os.path.join(d, 'stats.json')):
    stats = {s['image']: s for s in json.load(open(os.path.join(d, 'stats.json')))}
fic = sorted(f for f in glob.glob(os.path.join(d, 't_*.png')))
lig = (len(fic) + col - 1) // col; W = col * (lv + 6) + 6; H = lig * (hv + 26) + 6
img = Image.new('RGB', (W, H), (12, 12, 18)); dr = ImageDraw.Draw(img)
for k, f in enumerate(fic):
    x = 6 + (k % col) * (lv + 6); y = 6 + (k // col) * (hv + 26)
    img.paste(Image.open(f).convert('RGB').resize((lv, hv)), (x, y))
    s = stats.get(os.path.basename(f), {})
    dr.text((x + 4, y + hv + 5), f"{os.path.basename(f)[2:-4]} s  UI {100*s.get('surface',0):.1f}%  centre {100*s.get('zone_sacree',0):.1f}%  textes {s.get('nb_textes','?')}", fill=(255, 220, 130))
img.save(os.path.join(d, 'planche.png')); print(os.path.join(d, 'planche.png'))
