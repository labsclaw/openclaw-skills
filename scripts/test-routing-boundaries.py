"""Negative fixtures for the routing-audit gate, isolated from the real repo."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("routing", Path(__file__).with_name("validate-routing-boundaries.py"))
routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routing)


class RoutingGateTests(unittest.TestCase):
    def test_description_is_a_real_yaml_string(self):
        with self.assertRaises(Exception):
            routing.manifest('---\nname: example\ndescription: Trigger: value\n---\n')
        self.assertEqual(routing.manifest('---\nname: example\ndescription: "Trigger: value"\n---\n')["description"], "Trigger: value")

    def fixture(self, mutate=None):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            desc = "Use to build an ebook. Not for one-off definitions."
            folder = root / "example"
            folder.mkdir()
            (folder / "SKILL.md").write_text(f'---\nname: example\ndescription: "{desc}"\n---\n', encoding="utf-8")
            row = dict(path="example/SKILL.md", name="example", decision="corrected", rationale="Near miss", before="Build an ebook for any study topic.", description=desc, descriptionDigest="sha256:"+hashlib.sha256(desc.encode()).hexdigest(), positive="Build an ebook.", negative="Define duration.")
            audit = {"skills": [row]}
            if mutate:
                mutate(audit, root)
            target = root / "audit.json"
            target.write_text(json.dumps(audit), encoding="utf-8")
            return routing.validate(root, target)[0]

    def test_valid_inventory(self):
        self.assertEqual(self.fixture(), [])

    def test_missing_case_is_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"][0].pop("negative")))

    def test_stale_description_is_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"][0].update(description="Wrong")))

    def test_missing_inventory_entry_is_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"].clear()))

    def test_duplicate_path_is_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"].append(copy.deepcopy(a["skills"][0]))))

    def test_false_retained_decision_is_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"][0].update(decision="retained")))

    def test_nonstring_cases_are_rejected(self):
        self.assertTrue(self.fixture(lambda a, r: a["skills"][0].update(positive=42, negative={"query": "wrong type"})))


if __name__ == "__main__":
    unittest.main()
