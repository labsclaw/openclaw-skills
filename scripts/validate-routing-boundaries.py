"""Validate the frozen routing audit, not semantic model accuracy.

Run: python scripts/validate-routing-boundaries.py
Requires PyYAML. Inventory decisions may retain a precise description without
adding a cosmetic exclusion. Changed descriptions need positive/near-miss cases.
"""
from pathlib import Path
import hashlib
import json
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / "evals/routing-boundaries/inventory.json"


def manifest(text):
    match = re.match(r"\A---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)", text)
    if not match:
        raise ValueError("missing YAML frontmatter")
    data = yaml.safe_load(match.group(1))
    if not isinstance(data, dict):
        raise ValueError("frontmatter must be a mapping")
    for field in ("name", "description"):
        if not isinstance(data.get(field), str) or not data[field].strip():
            raise ValueError(f"{field} must be a nonempty string")
    if len(data["description"]) > 1024:
        raise ValueError("description exceeds 1024 characters")
    return data


def validate(root=ROOT, audit_path=AUDIT):
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    errors, seen, names = [], set(), {}
    actual = {
        p.relative_to(root).as_posix()
        for p in root.rglob("SKILL.md")
        if ".git" not in p.relative_to(root).parts
    }
    for entry in audit["skills"]:
        rel = entry["path"]
        if rel in seen:
            errors.append(f"{rel}: duplicate inventory path")
        seen.add(rel)
        target = (root / rel).resolve()
        if not target.is_relative_to(root.resolve()):
            errors.append(f"{rel}: path escapes repository")
            continue
        try:
            data = manifest(target.read_text(encoding="utf-8-sig"))
        except (OSError, ValueError, yaml.YAMLError) as error:
            errors.append(f"{rel}: {error}")
            continue
        if data["name"] != entry["name"] or data["description"] != entry["description"]:
            errors.append(f"{rel}: audited name/description is stale")
        previous = names.setdefault(data["name"], data["description"])
        if previous != data["description"]:
            errors.append(f"{rel}: duplicate skill name has divergent descriptions")
        if entry["decision"] not in ("corrected", "retained"):
            errors.append(f"{rel}: invalid audit decision")
        if not isinstance(entry.get("before"), str) or not entry["before"].strip():
            errors.append(f"{rel}: missing original description")
        elif (entry["before"] == entry["description"]) != (entry["decision"] == "retained"):
            errors.append(f"{rel}: decision does not match the description change")
        if not entry.get("rationale"):
            errors.append(f"{rel}: missing audit rationale")
        if entry["decision"] == "corrected":
            if any(not isinstance(entry.get(k), str) or not entry[k].strip() for k in ("positive", "negative")):
                errors.append(f"{rel}: changed routing needs positive and near-miss cases")
            if entry.get("positive") == entry.get("negative"):
                errors.append(f"{rel}: positive and negative are identical")
            if not re.search(r"\b(?:Not for|Not a|Not merely|Não usar|nao para)\b", data["description"], re.I):
                errors.append(f"{rel}: reviewed exclusion missing from description itself")
        digest = hashlib.sha256(data["description"].encode("utf-8")).hexdigest()
        if entry.get("descriptionDigest") != f"sha256:{digest}":
            errors.append(f"{rel}: description digest is stale")
    if seen != actual:
        errors.append(f"inventory differs: missing={sorted(actual-seen)}, extra={sorted(seen-actual)}")
    return errors, len(seen), len(names)


if __name__ == "__main__":
    findings, files, names = validate()
    for finding in findings:
        print("FAIL", finding, file=sys.stderr)
    print(f"Routing audit: {files} manifests, {names} unique names, {len(findings)} errors.")
    print("Structural/fixture validation only; not a model-routing benchmark.")
    sys.exit(bool(findings))
