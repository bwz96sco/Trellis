# Academic Phrasebank

Constructive phrasing resource for drafting, polish, and synthesis prose. This is NOT a detection wordlist: local AI-style auditing stays cluster-level and zero-verdict per `ai-style-impressions.md`. Chinese equivalents are kept because this bank also serves Chinese-to-English rewriting.

## Core Law

Claim strength never exceeds evidence strength. Overclaiming is spotted instantly by expert readers; underclaiming drains the text of judgment. Match the verb to the evidence before polishing anything else.

## Verbs By Evidence Strength

- **Strong** (solid design and data; multiple independent studies; large-scale validation): show, demonstrate, establish, reveal, identify, confirm; 表明、证实、确立、揭示
- **Medium** (reasonable but not certain; two or three studies; bounded conditions): suggest, indicate, support the view that, be consistent with, point to; 提示、说明、支持……的看法、与……一致、指向
- **Weak** (one study or mechanism-only argument; beyond direct observation): may, might, could, appears to, seems likely, may reflect, could arise from; 可能、或许、似乎、看来、或可解释为
- **No evidence**: to our knowledge, no study has examined ...; it remains an open question; 据检索结果，尚无研究考察过……；仍是一个开放问题

Describing the evidence itself: weak = limited, scant, insufficient; accumulating = growing, emerging; strong = robust, reliable, convincing.

## Calibration Failure Catalog

- Overclaim: "X proves Y" (prove belongs to mathematics); unqualified superlatives; "the first / the only / the optimal" without verification. Fix by bounding: "among methods evaluated on dataset D, highest on metric M". "To our knowledge, the first" only after an actual search.
- Underclaim: stacked hedges ("may possibly suggest that there could perhaps be"). One calibrated hedge carries the uncertainty.
- Correlation written as causation: without causal-inference evidence, "X is associated with Y", never "X causes Y".
- Jargon stacking for authority: authority comes from precise judgment matched to evidence, not term density.

## Gap Statements (precise, not dramatic)

Use: remains poorly understood / has not been examined in ... / has received limited attention / few studies have addressed ... / evidence remains sparse for ...; 仍不甚清楚 / 尚未在……情形下被检验 / 鲜有研究处理……
Avoid: "no one has ever studied", "completely unknown", "ignored by all previous work" — these rarely survive review.

## Comparing With Prior Work

- Alignment: These results are consistent with ... / This finding accords with ...; 这些结果与……一致
- Difference, fairly: In contrast to earlier reports ... / One possible reason for this discrepancy is ...; 与早先的报道不同……
- Gap without straw-manning: "Although previous studies showed ..., their performance in ... remains unclear." / "Earlier work established ..., but did not address ..."; 早先的工作确立了……，但没有处理……

## Limitations, Implications, Future Work

- Limitations tied to a real uncertainty source, never courtesy: A limitation of this study is that ... / We cannot exclude the possibility that ...; 本研究的一个局限是……
- Implications that stay inside the evidence: An implication of this is that ... / These findings may help to explain ...; 由此引出的一个含义是……
- Future work growing from a real limitation: Further work is needed to determine whether ... / A useful next step would be to ...; 还需进一步工作来确定是否……

## Transitions

Use the smallest connective that works; logic drives language. Contrast: however, by contrast, whereas. Addition: furthermore, in addition. Cause: therefore, thus, as a result. Qualification: notably, approximately, at least in this setting. Do not open consecutive paragraphs with "This suggests..." — repeat the noun, use a definite noun phrase, a participial summary, or nothing.

## Post-Strip Lifelessness Remedy

After de-AI cleanup, prose can turn clean but lifeless: uniform sentence length, no acknowledged complexity. The remedy — still without inventing facts or inflating claims — is to vary sentence length, carry weight with exact facts instead of stacked adjectives, and state real trade-offs and limitations plainly. Voice comes from precision and honesty.

## Chinese-to-English Residue Catalog

When rewriting Chinese drafts or heavy zh-en residue, extract the meaning first and compose idiomatic English; never translate line by line. Restore logic Chinese leaves implicit (contrast, causation, concession). Keep terminology stable — one rendering per term. Fix the recurring residues: redundant category words ("carry out research on" -> "study"), topic-prominent openings -> subject-verb sentences, missing articles/plurals/tense, stacked nominalizations unpacked into verbs ("the realization of the improvement of" -> "to improve"). A cautious Chinese draft never licenses a stronger English one.
