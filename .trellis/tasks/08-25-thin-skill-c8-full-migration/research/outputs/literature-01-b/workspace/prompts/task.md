# Frozen case input

## `input/evidence.md`

# C8 Source Bundle: Attention Positional-Encoding Comparison

- **Date**: 2026-08-25
- **Primary case**: `literature-01`
- **Purpose**: Exact paper text needed to assess whether sinusoidal positional encodings and learned positional embeddings were interchangeable in the reported translation setting.
- **Authentication rule**: The SHA-256 below identifies the exact supplied source file. Excerpt bodies preserve source line text verbatim, excluding original line terminators.

## Source identity

| Source file | Paper identity | Canonical URL | Source-file SHA-256 |
|---|---|---|---|
| `/tmp/c8-attention.md` | Vaswani et al., *Attention Is All You Need* (arXiv:1706.03762) | <https://arxiv.org/abs/1706.03762> | `c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701` |

## Exact excerpts

### Paper title and reported task-level result

- **Provenance**: `/tmp/c8-attention.md:10-14`
- **Source SHA-256**: `c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701`

<!-- C8-EXCERPT source="/tmp/c8-attention.md" start="10" end="14" sha256="c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701" -->
```text
# Attention Is All You Need

###### Abstract

The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.
```

### Positional encoding definition, learned comparison, and extrapolation rationale

- **Provenance**: `/tmp/c8-attention.md:127-143`
- **Source SHA-256**: `c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701`

<!-- C8-EXCERPT source="/tmp/c8-attention.md" start="127" end="143" sha256="c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701" -->
```text
### 3.5 Positional Encoding

Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add "positional encodings" to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension dmodeld\_{\text{model}} as the embeddings, so that the two can be summed. There are many choices of positional encodings, learned and fixed [[9](#bib.bib9)].

In this work, we use sine and cosine functions of different frequencies:

|  |  |  |
| --- | --- | --- |
|  | P​E(p​o​s,2​i)=s​i​n​(p​o​s/100002​i/dmodel)\displaystyle PE\_{(pos,2i)}=sin(pos/10000^{2i/d\_{\text{model}}}) |  |
|  |  |  |
| --- | --- | --- |
|  | P​E(p​o​s,2​i+1)=c​o​s​(p​o​s/100002​i/dmodel)\displaystyle PE\_{(pos,2i+1)}=cos(pos/10000^{2i/d\_{\text{model}}}) |  |

where p​o​spos is the position and ii is the dimension. That is, each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric progression from 2​π2\pi to 10000⋅2​π10000\cdot 2\pi. We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset kk, P​Ep​o​s+kPE\_{pos+k} can be represented as a linear function of P​Ep​o​sPE\_{pos}.

We also experimented with using learned positional embeddings [[9](#bib.bib9)] instead, and found that the two versions produced nearly identical results (see Table [3](#S6.T3 "Table 3 ‣ 6.2 Model Variations ‣ 6 Results ‣ Attention Is All You Need") row (E)). We chose the sinusoidal version because it may allow the model to extrapolate to sequence lengths longer than the ones encountered during training.

```

### Translation training data and base/big training setup

- **Provenance**: `/tmp/c8-attention.md:174-180`
- **Source SHA-256**: `c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701`

<!-- C8-EXCERPT source="/tmp/c8-attention.md" start="174" end="180" sha256="c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701" -->
```text
### 5.1 Training Data and Batching

We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. Sentences were encoded using byte-pair encoding [[3](#bib.bib3)], which has a shared source-target vocabulary of about 37000 tokens. For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences and split tokens into a 32000 word-piece vocabulary [[38](#bib.bib38)]. Sentence pairs were batched together by approximate sequence length. Each training batch contained a set of sentence pairs containing approximately 25000 source tokens and 25000 target tokens.

### 5.2 Hardware and Schedule

We trained our models on one machine with 8 NVIDIA P100 GPUs. For our base models using the hyperparameters described throughout the paper, each training step took about 0.4 seconds. We trained the base models for a total of 100,000 steps or 12 hours. For our big models,(described on the bottom line of table [3](#S6.T3 "Table 3 ‣ 6.2 Model Variations ‣ 6 Results ‣ Attention Is All You Need")), step time was 1.0 seconds. The big models were trained for 300,000 steps (3.5 days).
```

### Model-variation table and positional-encoding ablation interpretation

- **Provenance**: `/tmp/c8-attention.md:233-264`
- **Source SHA-256**: `c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701`

<!-- C8-EXCERPT source="/tmp/c8-attention.md" start="233" end="264" sha256="c3124876d277e2156d6fe0e2af8efc991ea7fcc1c9caedc8ae536e81835ad701" -->
```text
### 6.2 Model Variations

|  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | NN | dmodeld\_{\text{model}} | dffd\_{\text{ff}} | hh | dkd\_{k} | dvd\_{v} | Pd​r​o​pP\_{drop} | ϵl​s\epsilon\_{ls} | train | PPL | BLEU | params |
|  | steps | (dev) | (dev) | ×106\times 10^{6} |
| base | 6 | 512 | 2048 | 8 | 64 | 64 | 0.1 | 0.1 | 100K | 4.92 | 25.8 | 65 |
| (A) |  |  |  | 1 | 512 | 512 |  |  |  | 5.29 | 24.9 |  |
|  |  |  | 4 | 128 | 128 |  |  |  | 5.00 | 25.5 |  |
|  |  |  | 16 | 32 | 32 |  |  |  | 4.91 | 25.8 |  |
|  |  |  | 32 | 16 | 16 |  |  |  | 5.01 | 25.4 |  |
| (B) |  |  |  |  | 16 |  |  |  |  | 5.16 | 25.1 | 58 |
|  |  |  |  | 32 |  |  |  |  | 5.01 | 25.4 | 60 |
| (C) | 2 |  |  |  |  |  |  |  |  | 6.11 | 23.7 | 36 |
| 4 |  |  |  |  |  |  |  |  | 5.19 | 25.3 | 50 |
| 8 |  |  |  |  |  |  |  |  | 4.88 | 25.5 | 80 |
|  | 256 |  |  | 32 | 32 |  |  |  | 5.75 | 24.5 | 28 |
|  | 1024 |  |  | 128 | 128 |  |  |  | 4.66 | 26.0 | 168 |
|  |  | 1024 |  |  |  |  |  |  | 5.12 | 25.4 | 53 |
|  |  | 4096 |  |  |  |  |  |  | 4.75 | 26.2 | 90 |
| (D) |  |  |  |  |  |  | 0.0 |  |  | 5.77 | 24.6 |  |
|  |  |  |  |  |  | 0.2 |  |  | 4.95 | 25.5 |  |
|  |  |  |  |  |  |  | 0.0 |  | 4.67 | 25.3 |  |
|  |  |  |  |  |  |  | 0.2 |  | 5.47 | 25.7 |  |
| (E) |  | positional embedding instead of sinusoids | | | | | | |  | 4.92 | 25.7 |  |
| big | 6 | 1024 | 4096 | 16 |  |  | 0.3 |  | 300K | 4.33 | 26.4 | 213 |

To evaluate the importance of different components of the Transformer, we varied our base model in different ways, measuring the change in performance on English-to-German translation on the development set, newstest2013. We used beam search as described in the previous section, but no checkpoint averaging. We present these results in Table [3](#S6.T3 "Table 3 ‣ 6.2 Model Variations ‣ 6 Results ‣ Attention Is All You Need").

In Table [3](#S6.T3 "Table 3 ‣ 6.2 Model Variations ‣ 6 Results ‣ Attention Is All You Need") rows (A), we vary the number of attention heads and the attention key and value dimensions, keeping the amount of computation constant, as described in Section [3.2.2](#S3.SS2.SSS2 "3.2.2 Multi-Head Attention ‣ 3.2 Attention ‣ 3 Model Architecture ‣ Attention Is All You Need"). While single-head attention is 0.9 BLEU worse than the best setting, quality also drops off with too many heads.

In Table [3](#S6.T3 "Table 3 ‣ 6.2 Model Variations ‣ 6 Results ‣ Attention Is All You Need") rows (B), we observe that reducing the attention key size dkd\_{k} hurts model quality. This suggests that determining compatibility is not easy and that a more sophisticated compatibility function than dot product may be beneficial. We further observe in rows (C) and (D) that, as expected, bigger models are better, and dropout is very helpful in avoiding over-fitting. In row (E) we replace our sinusoidal positional encoding with learned positional embeddings [[9](#bib.bib9)], and observe nearly identical results to the base model.
```

## Claim limits

- **Author-reported result**: The paper describes learned positional embeddings and sinusoidal encodings as producing “nearly identical results”; Table 3 reports base-model dev PPL/BLEU of 4.92/25.8 and row (E) learned positional embeddings of 4.92/25.7.
- **Reported setup boundary**: The ablation is reported for English-to-German development performance on newstest2013, using the model-variation procedure described in the excerpt and no checkpoint averaging.
- **Author rationale, not demonstrated result**: The sinusoidal form was selected because it “may” extrapolate to sequence lengths beyond training. The supplied paper text does not report a learned-versus-sinusoidal length-extrapolation experiment.
- **Observed omissions**: The supplied paper text gives no repeated-seed distribution, uncertainty interval, formal equivalence margin, or positional-encoding ablation across other tasks or model families.
- **Bounded analyst inference**: The evidence supports practical near-equivalence for the reported metric and ablation setting. It does not establish architecture-general interchangeability, statistical equivalence, or equal extrapolation behavior.
- **Rendering caveat**: The supplied arXiv HTML-derived text contains duplicated or flattened mathematical/table tokens. Excerpts intentionally preserve those source bytes rather than silently correcting them.


## `input/task.md`

# Literature case 01: bounded one-paper review

## Research question

For Vaswani et al., *Attention Is All You Need* (arXiv:1706.03762), what evidence in the paper supports or limits the claim that sinusoidal positional encodings are interchangeable with learned positional embeddings for the reported translation setting?

## Fixed target

- Primary paper: https://arxiv.org/abs/1706.03762
- Review only this paper and references needed to interpret the stated comparison.
- Distinguish author-reported result, author limitation, observed omission, and analyst inference.

## Required output

Produce one compact paper note and a register entry suitable for later reuse. Record bibliographic identity, the exact comparison, evidence location, limitations, and unresolved questions. Stop after the bounded review. Do not generate replacement architectures or start ideation.
