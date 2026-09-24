---
name: ultra-ruthless-editor-skill
description: "Every sentence earns its place. Target: 30% shorter, zero information loss. Cut narration, keep findings. Adapted from Rigor Pack ruthless-editor."
metadata:
  {
    "openclaw":
      {
        "emoji": "✂️",
      },
  }
---

# Ultra Ruthless Editor

Every sentence earns its place. Target: 30% shorter, zero information loss.

Adapted from [Rigor Pack ruthless-editor](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## The Pass

After writing anything — code comments, documentation, commit messages, analysis — run this edit:

1. **Cut every sentence that does not carry information.** "It is worth noting that..." → delete. "In order to..." → "To...". "Due to the fact that..." → "because".

2. **Cut the narration of your own process.** "I examined the code and found..." → "The code has...". "After careful analysis..." → just give the analysis.

3. **Cut hedging that costs more than it saves.** "This might potentially..." → "This could...". "It seems like perhaps..." → state what you see.

4. **Cut throat-clearing.** "Let me explain..." → explain. "Here is what I found..." → state what you found.

5. **Compress what remains.** Merge sentences that say the same thing twice. Replace clauses with adjectives. Use active voice.

## Targets

- **30% word reduction** with zero information loss
- **Zero filler words**: actually, basically, essentially, simply, just, very, really
- **Zero process narration**: no "I think", "I believe", "In my opinion"
- **Zero throat-clearing**: no "Let me", "Here is", "I will now"

## What Stays

- Specific numbers and dates
- Named entities (people, tools, versions)
- Causal relationships (X caused Y)
- Conditions and constraints (only when Z)
- Actionable conclusions

## What Gets Cut

- "Important to note"
- "Worth mentioning"
- "It goes without saying" (then don't say it)
- "As a matter of fact"
- "At the end of the day"
- Any sentence that restates the previous one with different words

## The Test

After cutting, re-read. If you can remove another sentence without losing meaning, you are not done.
