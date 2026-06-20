#!/usr/bin/env python3
"""Generate Homestead Hill branded maintenance QR cards.

Usage:
  python3 scripts/generate-maintenance-qr-codes.py --form-url https://tally.so/r/ABC123

If --form-url is omitted, the script creates clearly watermarked DRAFT cards with
https://tally.so/r/REPLACE_ME targets so design/print layout can be reviewed.
"""
from __future__ import annotations

import argparse
import os
import re
import zipfile
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

import qrcode
import qrcode.constants
from PIL import Image, ImageDraw, ImageFont

UNITS = [f"Unit {i}" for i in range(1, 12)] + ["Unit 13", "Unit 14"]
BRAND = {
    "navy": "#071222",
    "navy_deep": "#040b15",
    "gold": "#cda360",
    "cream": "#FCFBF8",
    "slate": "#293b56",
}
DEFAULT_FORM_URL = "https://tally.so/r/REPLACE_ME"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def target_url(form_url: str, unit: str) -> str:
    parsed = urlparse(form_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["unit"] = unit
    return urlunparse(parsed._replace(query=urlencode(query)))


def safe_name(unit: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", unit.lower()).strip("-")


def center_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt, fill: str) -> None:
    x, y = xy
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x - (bbox[2] - bbox[0]) / 2, y), text, font=fnt, fill=fill)


def make_qr(url: str, size: int = 620) -> Image.Image:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    raw_img = qr.make_image(fill_color=BRAND["navy"], back_color=BRAND["cream"])
    img = cast(Any, raw_img).convert("RGB")
    return img.resize((size, size), Image.Resampling.NEAREST)


def make_card(unit: str, form_url: str, draft: bool) -> Image.Image:
    w, h = 1200, 1800
    card = Image.new("RGB", (w, h), BRAND["navy"])
    draw = ImageDraw.Draw(card)

    # Subtle Homestead Hill dot pattern.
    for x in range(36, w, 48):
        for y in range(36, h, 48):
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill="#12243f")

    margin = 80
    draw.rounded_rectangle((margin, margin, w - margin, h - margin), radius=44, fill=BRAND["cream"], outline=BRAND["gold"], width=8)

    # Header: keep all three lines safely inside the navy panel with clear vertical breathing room.
    header_top = margin + 28
    header_bottom = 390
    draw.rounded_rectangle((margin + 28, header_top, w - margin - 28, header_bottom), radius=28, fill=BRAND["navy"])

    center_text(draw, (w // 2, 136), "HOMESTEAD HILL", font(50, True), BRAND["gold"])
    center_text(draw, (w // 2, 215), "Maintenance Issue?", font(74, True), BRAND["cream"])
    center_text(draw, (w // 2, 315), "Scan to report it fast", font(40), "#e2c28d")

    qr = make_qr(target_url(form_url, unit))
    qr_x, qr_y = (w - qr.width) // 2, 485
    draw.rounded_rectangle((qr_x - 28, qr_y - 28, qr_x + qr.width + 28, qr_y + qr.height + 28), radius=38, fill=BRAND["gold"])
    draw.rounded_rectangle((qr_x - 12, qr_y - 12, qr_x + qr.width + 12, qr_y + qr.height + 12), radius=24, fill=BRAND["cream"])
    card.paste(qr, (qr_x, qr_y))

    draw.rounded_rectangle((250, 1150, w - 250, 1295), radius=32, fill=BRAND["navy"])
    center_text(draw, (w // 2, 1185), unit, font(76, True), BRAND["gold"])

    help_text = [
        "Open camera • Scan code • Add photos",
        "For emergency safety issues, call management too.",
    ]
    center_text(draw, (w // 2, 1360), help_text[0], font(40, True), BRAND["navy"])
    center_text(draw, (w // 2, 1425), help_text[1], font(32), BRAND["slate"])

    center_text(draw, (w // 2, 1570), "homestead-hill.com", font(36, True), BRAND["navy"])

    if draft:
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        odraw.rectangle((0, 760, w, 950), fill=(205, 163, 96, 178))
        center_text(odraw, (w // 2, 800), "DRAFT — NEED FINAL TALLY URL", font(54, True), BRAND["navy"])
        card = Image.alpha_composite(card.convert("RGBA"), overlay).convert("RGB")

    return card


def make_contact_sheet(paths: list[Path], out_path: Path) -> None:
    thumbs = []
    for path in paths:
        img = Image.open(path).resize((300, 450), Image.Resampling.LANCZOS)
        thumbs.append(img)
    cols, rows = 4, ((len(thumbs) + 3) // 4)
    sheet = Image.new("RGB", (cols * 340 + 40, rows * 500 + 40), BRAND["cream"])
    for i, thumb in enumerate(thumbs):
        x = 40 + (i % cols) * 340
        y = 40 + (i // cols) * 500
        sheet.paste(thumb, (x, y))
    sheet.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--form-url", default=os.environ.get("TALLY_FORM_URL", DEFAULT_FORM_URL))
    parser.add_argument("--out-dir", default="artifacts/maintenance-qr-codes")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    draft = "REPLACE_ME" in args.form_url or "ABC123" in args.form_url

    created: list[Path] = []
    for unit in UNITS:
        card = make_card(unit, args.form_url, draft)
        path = out_dir / f"homestead-hill-maintenance-{safe_name(unit)}.png"
        card.save(path, optimize=True)
        created.append(path)

    manifest = out_dir / "qr-target-urls.txt"
    manifest.write_text("\n".join(f"{unit}: {target_url(args.form_url, unit)}" for unit in UNITS) + "\n")
    make_contact_sheet(created, out_dir / "contact-sheet.png")

    zip_path = out_dir / "homestead-hill-maintenance-qr-codes.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in created + [manifest, out_dir / "contact-sheet.png"]:
            zf.write(path, arcname=path.name)

    print(f"Generated {len(created)} QR cards in {out_dir}")
    print(f"Contact sheet: {out_dir / 'contact-sheet.png'}")
    print(f"Zip: {zip_path}")
    if draft:
        print("WARNING: Draft targets use placeholder form URL. Re-run with --form-url once the Tally form is published.")


if __name__ == "__main__":
    main()
