#!/usr/bin/env python3
"""
Lax Jump - app icon generator
==============================
Draws the Lax Jump logo (green field, white oval lacrosse head with a yellow
ball, grey shaft with a red tape band + red butt, and the two accent "radar"
arcs the stick jumps out of) at a crisp 1024x1024 and writes it to
assets/icon.png.

This is a build-time TOOL only. It lives outside the web app (www/), so it is
NOT part of the game or the app bundle - it only produces the icon artwork.

HOW TO CHANGE THE LOGO
----------------------
1. Edit the CONFIG values below (arc size/position, the head/ball/shaft
   geometry, colors, etc.).
2. Regenerate the artwork:
       python3 tools/make-logo.py
   To also see a rounded home-screen mockup (writes assets/icon-preview.png):
       python3 tools/make-logo.py --preview
   To write somewhere else (e.g. to eyeball before overwriting the real icon):
       python3 tools/make-logo.py --out /tmp/test.png
3. Bake it into every iOS icon + splash size:
       npx capacitor-assets generate --ios \
           --iconBackgroundColor '#155f34' --splashBackgroundColor '#186639'
4. Copy it into the iOS project:
       npx cap sync ios
5. Open Xcode and press Run.

Requires Pillow:  pip install Pillow

Note: this script changes ONLY the app icon. It never touches the game files.
"""
import math
import sys
from PIL import Image, ImageDraw

# ----------------------------- CONFIG (tweak these) -----------------------------
S   = 1024                       # output size in px (square)
SS  = 4                          # supersample factor (drawn big, shrunk for crisp edges)
OUT = "assets/icon.png"          # default output path

BG_TOP = (0x15, 0x5f, 0x34)      # field gradient colour, top
BG_BOT = (0x2e, 0x95, 0x53)      # field gradient colour, bottom

# The two accent arcs. Bigger radii / a centre further down-left make the stick
# "jump" further out of the rings. Each entry is (radius, alpha 0-255).
ARC_CENTER = (-15, 1245)         # arc centre in 1024-space (off-frame, lower-left)
ARC_RADII  = ((650, 205), (890, 170))
ARC_COLOR  = (0x4e, 0xa5, 0x69)  # arc green
ARC_WIDTH  = 17                  # arc line thickness in 1024-space

BUTT = (296, 853)                # bottom of the shaft (centre of the red butt)
HEAD = (705, 267)                # centre of the lacrosse head
SHAFT_STOP = 150                 # shaft stops this many px short of the head centre
                                 #   (so the ball sits in clear net, no shaft through it)
TAPE_T = 0.26                    # red tape position along butt->head (0 = butt, 1 = head)

HEAD_A, HEAD_B, HEAD_RIM = 182, 150, 42   # head oval: semi-major, semi-minor, rim thickness
BALL_R = 76                      # yellow ball radius
# --------------------------------------------------------------------------------

B = S * SS
def s(v):
    return int(round(v * SS))

def build():
    img = Image.new("RGB", (B, B))
    d = ImageDraw.Draw(img, "RGBA")

    # green field gradient (top -> bottom)
    def lerp(a, b, t):
        return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))
    for y in range(B):
        d.line([(0, y), (B, y)], fill=lerp(BG_TOP, BG_BOT, y / B))

    # accent arcs
    acx, acy = ARC_CENTER
    for r, al in ARC_RADII:
        d.ellipse([s(acx - r), s(acy - r), s(acx + r), s(acy + r)],
                  outline=ARC_COLOR + (al,), width=s(ARC_WIDTH))

    # shaft direction + perpendicular
    ang = math.atan2(HEAD[1] - BUTT[1], HEAD[0] - BUTT[0])
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux

    # grey cylinder shaft, stopping short of the head; flat ends (capped by the
    # rim at the top and the red butt at the bottom)
    se = (HEAD[0] - ux * SHAFT_STOP, HEAD[1] - uy * SHAFT_STOP)
    for col, w in (((0x9a, 0x9a, 0x9a), 72), ((0xcb, 0xcb, 0xcb), 46), ((0xee, 0xee, 0xee), 18)):
        d.line([s(BUTT[0]), s(BUTT[1]), s(se[0]), s(se[1])], fill=col, width=s(w))

    # one clean red tape band
    tp = (BUTT[0] + (HEAD[0] - BUTT[0]) * TAPE_T, BUTT[1] + (HEAD[1] - BUTT[1]) * TAPE_T)
    half = 42
    d.line([s(tp[0] - vx * half), s(tp[1] - vy * half), s(tp[0] + vx * half), s(tp[1] + vy * half)],
           fill=(0xd8, 0x33, 0x2a), width=s(46))

    # red butt knob (with a subtle bottom shade)
    d.ellipse([s(BUTT[0] - 56), s(BUTT[1] - 56), s(BUTT[0] + 56), s(BUTT[1] + 56)], fill=(0xd8, 0x33, 0x2a))
    d.ellipse([s(BUTT[0] - 48), s(BUTT[1] - 44), s(BUTT[0] + 56), s(BUTT[1] + 56)], fill=(0xc0, 0x28, 0x20, 140))

    # oval metallic head on its own layer, then rotated to align with the shaft
    a, b, rim = HEAD_A, HEAD_B, HEAD_RIM
    L = s(2 * (a + 24))
    head = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    hd = ImageDraw.Draw(head)
    cx = cy = L // 2
    def el(a_, b_, fill, ox=0, oy=0):
        hd.ellipse([cx - s(a_) + s(ox), cy - s(b_) + s(oy), cx + s(a_) + s(ox), cy + s(b_) + s(oy)], fill=fill)
    el(a, b, (0x8c, 0x8c, 0x8c, 255))                 # dark metal edge
    el(a - 5, b - 5, (0xdd, 0xdd, 0xdd, 255))          # rim body (grey, not pure white)
    el(a - 7, b - 7, (0xf2, 0xf2, 0xf2, 255), ox=-8, oy=-10)  # upper-left highlight
    el(a - rim, b - rim, (0, 0, 0, 0))                 # cut the interior open
    ai, bi = a - rim, b - rim
    for k in range(12):                                 # mesh spokes
        aa = k / 12 * 2 * math.pi
        hd.line([cx, cy, cx + math.cos(aa) * s(ai), cy + math.sin(aa) * s(bi)],
                fill=(0xc6, 0xc6, 0xc6, 220), width=s(4))
    for rr in (0.45, 0.74):                             # two mesh rings
        hd.ellipse([cx - s(ai * rr), cy - s(bi * rr), cx + s(ai * rr), cy + s(bi * rr)],
                   outline=(0xc6, 0xc6, 0xc6, 140), width=s(3))
    head = head.rotate(-math.degrees(ang), resample=Image.BICUBIC, expand=False)
    img.paste(head, (s(HEAD[0]) - L // 2, s(HEAD[1]) - L // 2), head)

    # yellow ball in the net (shaded base, bright top, highlight)
    bx, by, br = HEAD[0], HEAD[1] + 6, BALL_R
    d.ellipse([s(bx - br), s(by - br), s(bx + br), s(by + br)], fill=(0xe7, 0xb4, 0x23))
    d.ellipse([s(bx - br), s(by - br), s(bx + br - 5), s(by + br - 11)], fill=(0xff, 0xe3, 0x4d))
    d.ellipse([s(bx - 28), s(by - 32), s(bx - 5), s(by - 10)], fill=(0xff, 0xfc, 0xe0, 235))

    return img.resize((S, S), Image.LANCZOS)

def main():
    args = sys.argv[1:]
    dest = OUT
    if "--out" in args:
        dest = args[args.index("--out") + 1]
    icon = build()
    icon.save(dest)
    print("wrote", dest)
    if "--preview" in args:
        rad = int(S * 0.225)
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=rad, fill=255)
        bg = Image.new("RGB", (S, S + 150), (54, 58, 66))
        pv = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        pv.paste(icon, (0, 0), mask)
        bg.paste(pv.resize((420, 420)), ((S - 420) // 2, 40), pv.resize((420, 420)))
        try:
            from PIL import ImageFont
            f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        except Exception:
            f = None
        ImageDraw.Draw(bg).text((S // 2, 40 + 420 + 34), "Lax Jump", fill=(255, 255, 255), anchor="mm", font=f)
        bg.save("assets/icon-preview.png")
        print("wrote assets/icon-preview.png")

if __name__ == "__main__":
    main()
