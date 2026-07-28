#!/usr/bin/env python3
"""Generate assets/data/catalog-data.js from data/Database_Katalog_mi.do.ri.xlsx.
Uses only Python's standard library.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "Database_Katalog_mi.do.ri.xlsx"
OUTPUT = ROOT / "assets" / "data" / "catalog-data.js"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}


def col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref).group(0)
    value = 0
    for char in letters:
        value = value * 26 + ord(char) - 64
    return value - 1


def text_of(si: ET.Element) -> str:
    return "".join(node.text or "" for node in si.findall(".//x:t", NS))


def read_workbook(path: Path) -> dict[str, list[dict[str, object]]]:
    with zipfile.ZipFile(path) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared = [text_of(si) for si in root.findall("x:si", NS)]

        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("r:Relationship", REL_NS)}
        result = {}

        for sheet in workbook.findall("x:sheets/x:sheet", NS):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{{{NS['r']}}}id"]
            target = targets[rel_id].lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            xml = ET.fromstring(zf.read(target))
            rows = []
            for row in xml.findall("x:sheetData/x:row", NS):
                values = {}
                for cell in row.findall("x:c", NS):
                    ref = cell.attrib.get("r", "A1")
                    idx = col_index(ref)
                    kind = cell.attrib.get("t")
                    value_node = cell.find("x:v", NS)
                    inline_node = cell.find("x:is", NS)
                    if kind == "inlineStr" and inline_node is not None:
                        value = text_of(inline_node)
                    elif value_node is None:
                        value = ""
                    else:
                        raw = value_node.text or ""
                        if kind == "s":
                            value = shared[int(raw)] if raw else ""
                        elif kind == "b":
                            value = raw == "1"
                        else:
                            try:
                                number = float(raw)
                                value = int(number) if number.is_integer() else number
                            except ValueError:
                                value = raw
                    values[idx] = value
                if values:
                    max_idx = max(values)
                    rows.append([values.get(i, "") for i in range(max_idx + 1)])

            if not rows:
                result[name] = []
                continue
            headers = [str(v).strip() for v in rows[0]]
            result[name] = [
                {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))}
                for row in rows[1:]
                if any(str(v).strip() for v in row)
            ]
        return result


def as_text(value) -> str:
    return "" if value is None else str(value).strip()


def as_int(value) -> int:
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def as_bool_ya(value) -> bool:
    return as_text(value).lower() in {"ya", "yes", "true", "1", "aktif"}


def split_list(value) -> list[str]:
    return [item.strip() for item in as_text(value).split(",") if item.strip()]


def iso_date(value) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, (int, float)):
        return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()
    text = as_text(value)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return text


def load_store() -> dict:
    if OUTPUT.exists():
        match = re.fullmatch(r"\s*window\.MIDORI_CATALOG\s*=\s*(\{.*\})\s*;\s*", OUTPUT.read_text(encoding="utf-8"), re.S)
        if match:
            return json.loads(match.group(1)).get("store", {})
    return {
        "name": "mi.do.ri",
        "subtitle": "Multibrand Muslim Fashion",
        "address": "Jl. Soekarno Hatta No.17, Girimaya, Kota Pangkalpinang",
        "whatsappDisplay": "0811.717.7667",
        "whatsapp": "628117177667",
        "instagram": "butikmidori",
        "tiktok": "butik.midori",
        "mapsQuery": "Jl. Soekarno Hatta No.17, Girimaya, Kota Pangkalpinang",
    }


def main() -> int:
    if not XLSX.exists():
        print(f"Database tidak ditemukan: {XLSX}", file=sys.stderr)
        return 1

    sheets = read_workbook(XLSX)
    masters = sheets.get("PRODUK_MASTER", [])
    variants = sheets.get("VARIAN_STOK", [])
    brands_rows = sheets.get("BRAND_MASTER", [])

    variants_by_product: dict[str, list[dict]] = {}
    for row in variants:
        product_id = as_text(row.get("ID_PRODUK"))
        variants_by_product.setdefault(product_id, []).append({
            "sku": as_text(row.get("SKU")),
            "brandCode": as_int(row.get("KODE_BRAND")),
            "brand": as_text(row.get("BRAND")),
            "originalName": as_text(row.get("NAMA_BARANG_ASLI")),
            "color": as_text(row.get("WARNA_MOTIF")),
            "size": as_text(row.get("UKURAN")),
            "price": as_int(row.get("HARGA")),
            "stock": as_int(row.get("STOK")),
            "stockStatus": as_text(row.get("STATUS_STOK")),
            "category": as_text(row.get("KATEGORI")),
            "status": as_text(row.get("STATUS_TAYANG")) or "Aktif",
        })

    products = []
    for row in masters:
        product_id = as_text(row.get("ID_PRODUK"))
        if not product_id:
            continue
        product_variants = variants_by_product.get(product_id, [])
        images = [as_text(row.get(key)) for key in ("FOTO_UTAMA", "FOTO_2", "FOTO_3")]
        products.append({
            "id": product_id,
            "slug": as_text(row.get("SLUG_PRODUK")),
            "brandCode": as_int(row.get("KODE_BRAND")),
            "brand": as_text(row.get("BRAND")),
            "name": as_text(row.get("NAMA_PRODUK")),
            "category": as_text(row.get("KATEGORI")),
            "segment": as_text(row.get("SEGMEN")),
            "condition": as_text(row.get("KONDISI")),
            "priceMin": as_int(row.get("HARGA_MIN")),
            "priceMax": as_int(row.get("HARGA_MAX")),
            "totalStock": sum(v["stock"] for v in product_variants),
            "variantCount": len(product_variants),
            "colors": split_list(row.get("WARNA_TERSEDIA")),
            "sizes": split_list(row.get("UKURAN_TERSEDIA")),
            "material": as_text(row.get("BAHAN")),
            "description": as_text(row.get("DESKRIPSI")),
            "images": [image for image in images if image],
            "video": as_text(row.get("URL_VIDEO")),
            "isNew": as_bool_ya(row.get("PRODUK_BARU")),
            "isFeatured": as_bool_ya(row.get("PRODUK_PILIHAN")),
            "status": as_text(row.get("STATUS_TAYANG")) or "Aktif",
            "promoActive": as_bool_ya(row.get("STATUS_PROMO")),
            "discountPercent": min(100, max(0, as_int(row.get("DISKON_PERSEN")))),
            "promoStart": iso_date(row.get("PROMO_MULAI")),
            "promoEnd": iso_date(row.get("PROMO_SELESAI")),
            "promoLabel": as_text(row.get("LABEL_PROMO")),
            "variants": product_variants,
        })

    brands = [{
        "code": as_int(row.get("KODE_BRAND")),
        "name": as_text(row.get("NAMA_BRAND")),
        "productCount": as_int(row.get("JUMLAH_PRODUK")),
        "skuCount": as_int(row.get("JUMLAH_SKU")),
        "stock": as_int(row.get("TOTAL_STOK")),
        "statusData": as_text(row.get("STATUS_DATA")),
        "logo": as_text(row.get("LOGO_BRAND")),
        "instagram": as_text(row.get("INSTAGRAM_BRAND")),
        "description": as_text(row.get("DESKRIPSI")),
        "status": as_text(row.get("STATUS_TAYANG")),
    } for row in brands_rows if as_text(row.get("NAMA_BRAND"))]

    data = {
        "store": load_store(),
        "generatedFrom": XLSX.name,
        "summary": {
            "products": len(products),
            "variants": sum(len(p["variants"]) for p in products),
            "brands": len(brands),
            "stock": sum(v["stock"] for p in products for v in p["variants"]),
        },
        "brands": brands,
        "products": products,
    }
    OUTPUT.write_text("window.MIDORI_CATALOG = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Berhasil: {OUTPUT}")
    print(f"Produk: {data['summary']['products']} | Varian: {data['summary']['variants']} | Stok: {data['summary']['stock']}")
    print(f"Promo bertanda Ya: {sum(1 for p in products if p['promoActive'] and p['discountPercent'] > 0)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
