#!/usr/bin/env python3

import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET


def _strip_html(text: str) -> str:
    """Remove HTML from a string."""
    text = re.sub(r"<script[\s\S]*?</script>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _text(el, tag: str) -> str:  # sourcery skip: assign-if-exp, reintroduce-else
    """Get the text of a child element."""
    child = el.find(tag)
    if child is None or child.text is None:
        return ""
    return child.text.strip()


def main() -> None:
    """Generate a JSON file containing the latest Medium posts."""
    feed_url = "https://medium.com/feed/@timmyb824"
    items = []
    error_msg = None

    try:
        req = urllib.request.Request(
            feed_url,
            headers={
                "User-Agent": "timothybryantjr-site-medium/1.0",
                "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            method="GET",
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_bytes = resp.read()

        root = ET.fromstring(xml_bytes)

        channel = root.find("channel")
        if channel is None:
            raise RuntimeError("Invalid Medium RSS: missing channel")

        for item in channel.findall("item"):
            title = _text(item, "title")
            link = _text(item, "link")
            pub_date = _text(item, "pubDate")
            description = _strip_html(_text(item, "description"))

            if not title or not link:
                continue

            items.append(
                {
                    "title": title,
                    "url": link,
                    "published": pub_date,
                    "summary": description[:240] + ("…" if len(description) > 240 else ""),
                }
            )

        items = items[:10]

    except urllib.error.HTTPError as e:
        error_msg = f"HTTP error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        error_msg = f"Network error: {e.reason}"
    except ET.ParseError as e:
        error_msg = f"XML parse error: {e}"
    except Exception as e:
        error_msg = f"Unexpected error: {e}"

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "profile_url": "https://medium.com/@timmyb824",
        "items": items,
    }

    if error_msg:
        out["error"] = error_msg

    with open("site/medium.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
