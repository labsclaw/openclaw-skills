# Runbook: [Operation Name]

## Overview

Brief description of what this runbook covers and when to use it.

## Prerequisites

- [ ] Access to [system/service]
- [ ] Required permissions: [list roles]
- [ ] Tools installed: [list CLI tools, clients]
- [ ] Notifications sent: [who needs to know]

## Procedure

### Step 1: [Action Name]

```bash
# Command to execute
command --flag value
```

**Expected output:**
```
What you should see on success
```

**If error:** [What to do if this step fails]

---

### Step 2: [Action Name]

```bash
command --flag value
```

**Expected output:**
```
What you should see on success
```

**If error:** [What to do if this step fails]

---

### Step 3: [Action Name]

[Continue pattern for all steps]

---

## Verification

How to verify the operation completed successfully:

```bash
# Verification command
verification-command
```

**Expected result:** [What confirms success]

## Rollback

Steps to undo the operation if needed:

```bash
# Rollback command
rollback-command --flag value
```

**Rollback verification:**
```bash
# Confirm rollback worked
verification-command
```

**Rollback deadline:** [Time window in which rollback is safe]

## Troubleshooting

### Issue: [Common problem description]

**Symptoms:** What you see when this happens
**Cause:** Why it happens
**Solution:** How to fix it

---

### Issue: [Another common problem]

**Symptoms:** What you see
**Cause:** Why it happens
**Solution:** How to fix it

## Contacts

- **Primary:** [Name / Role / Handle]
- **Escalation:** [Name / Role / Handle]
- **On-call rotation:** [Link or description]

## Revision History

| Date       | Author   | Changes              |
|------------|----------|----------------------|
| YYYY-MM-DD | Name     | Initial version      |
