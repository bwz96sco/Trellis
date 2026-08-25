# C8 Source Bundle: Lost in the Middle Position-Dependent Performance

- **Date**: 2026-08-25
- **Primary case**: `literature-03`
- **Purpose**: Exact paper text needed to identify experimental support for position-dependent long-context performance and to bound generalization to the tested tasks, model versions, and protocols.
- **Authentication rule**: The SHA-256 below identifies the exact supplied source file. Excerpt bodies preserve source line text verbatim, excluding original line terminators.

## Source identity

| Source file | Paper identity | Canonical URL | Source-file SHA-256 |
|---|---|---|---|
| `/tmp/c8-lost-middle.md` | Liu et al., *Lost in the Middle: How Language Models Use Long Contexts* (arXiv:2307.03172) | <https://arxiv.org/abs/2307.03172> | `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740` |

## Exact excerpts

### Paper identity and abstract position-dependent claim

- **Provenance**: `/tmp/c8-lost-middle.md:8-16`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="8" end="16" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
# Lost in the Middle: How Language Models Use Long Contexts

###### Abstract

While recent language models have the ability to take long contexts as input, relatively little is known about how well they use longer context.
We analyze the performance of language models on two tasks that require identifying relevant information in their input contexts: multi-document question answering and key-value retrieval.
We find that performance can degrade significantly when changing the position of relevant information, indicating that current language models do not robustly make use of information in long input contexts.
In particular, we observe that performance is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle of long contexts, even for explicitly long-context models.
Our analysis provides a better understanding of how language models use their input context and provides new evaluation protocols for future long-context language models.
```

### Controlled variables, tested models, main findings, and practical scope

- **Provenance**: `/tmp/c8-lost-middle.md:29-56`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="29" end="56" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
We empirically investigate this question via controlled experiments with a variety of state-of-the-art open (MPT-30B-Instruct, LongChat-13B (16K)) and closed (OpenAI’s GPT-3.5-Turbo and Anthropic’s Claude-1.3) language models in settings that require accessing and using information within an input context.
In particular, our experiments make controlled changes to the input context size and the position of the relevant information within the input context and study their effects on language model performance.
If language models can robustly use information within long input contexts, then their performance should be *minimally affected* by the position of the relevant information in the input context.

We first experiment with multi-document question answering, which requires models to reason over provided documents to find relevant information and use it to answer a given question; this task mimics the retrieval-augmented generation setup underlying many commercial generative search and question answering applications (e.g., Bing Chat).
In this setting, we control (i) the input context length by changing the number of documents in the input context (akin to retrieving more or less documents in retrieval-augmented generation), and (ii) control the position of the relevant information within the input context by changing the order of the documents to place the relevant document at the beginning, middle or end of the context.

We find that changing the position of relevant information in the input context can substantially affect model performance, indicating that current language models do not robustly access and use information in long input contexts.
Furthermore, we observe a distinctive U-shaped performance curve (Figure [1](#S1.F1 "Figure 1 ‣ 1 Introduction ‣ Lost in the Middle: How Language Models Use Long Contexts")); language model performance is highest when relevant information occurs at the very beginning (primacy bias) or end of its input context (recency bias), and performance significantly degrades when models must access and use information in the middle of their input context (§[2.3](#S2.SS3 "2.3 Results and Discussion ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts")).
For example, when relevant information is placed in the middle of its input context, GPT-3.5-Turbo’s performance on the multi-document question task is lower than its performance when predicting *without any documents* (i.e., the closed-book setting; 56.1%).
Furthermore, we find that models often have identical performance to their extended-context counterparts, indicating that extended-context models are not necessarily better at using their input context (§[2.3](#S2.SS3 "2.3 Results and Discussion ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts")).

Given that language models struggle to retrieve and use relevant information in the multi-document question answering task, to what extent can language models even *retrieve* from their input contexts? We study this question with a synthetic key-value retrieval task, which is designed to be a minimal testbed for the basic ability to retrieve matching tokens from the input context. In this task, models are given a collection of JSON-formatted key-value pairs and must return the value associated with a specific key. Similar to the multi-document QA task, the key-value retrieval task admits controlled changes to the input context length (adding more key-value pairs) and the position of relevant information.
Although some models perform the synthetic key-value retrieval task perfectly, other models struggle to simply retrieve matching tokens that occur in the middle of their input context and continue to exhibit a U-shaped performance curve.

To better understand why language models struggle to robustly access and use information in their input contexts, we study the role of model architecture (decoder-only vs. encoder-decoder), query-aware contextualization, and instruction fine-tuning (§[4](#S4 "4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts")). We find that:

Encoder-decoder models are relatively robust to changes in the position of relevant information within their input context, but only when evaluated on sequences within its training-time sequence length. When evaluated on sequences longer than those seen during training, we observe a U-shaped performance curve (§[4.1](#S4.SS1 "4.1 Effect of Model Architecture ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts")).

Query-aware contextualization (placing the query before *and* after the documents or key-value pairs) enables near-perfect performance on the synthetic key-value task, but minimally changes trends in multi-document QA (§[4.2](#S4.SS2 "4.2 Effect of Query-Aware Contextualization ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts")).

Even base language models (i.e., without instruction fine-tuning) show a U-shaped performance curve as we vary the position of relevant information in the input context.

Our results indicate that prompting language models with longer input contexts is a trade-off—providing the language model with more information may help it perform the downstream task, but it also increases the amount of content that the model must reason over, potentially decreasing accuracy.
To better understand this trade-off in practice, we perform a case study with retriever-reader models on open-domain question answering (§[5](#S5 "5 Is More Context Is Always Better? A Case Study With Open-Domain QA ‣ Lost in the Middle: How Language Models Use Long Contexts")). In contrast to our controlled multi-document QA task, where the context always contains exactly *one* document that answers the question, none or many of the top kk documents may contain the answer in the open-domain QA setting.
When retrieving from Wikipedia to answer queries from NaturalQuestions-Open, we find that model performance saturates long before retriever recall saturates, indicating that current models fail to effectively use additional retrieved documents—using 50 documents instead of 20 retrieved documents only marginally improves performance (∼\sim1.5% for GPT-3.5-Turbo and ∼\sim1% for claude-1.3).

Our analysis provides a better understanding of how language models use their input context and introduces new evaluation protocols for future long-context models; to claim that a language model can robustly use information within long input contexts, it is necessary to show that its performance is minimally affected by the position of the relevant information in the input context (e.g., minimal difference in best- and worst-case performance).
```

### Multi-document QA construction and position/length manipulation

- **Provenance**: `/tmp/c8-lost-middle.md:67-90`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="67" end="90" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
### 2.1 Experimental Setup

In the multi-document question answering task, the model inputs are (i) a question to answer and (ii) kk documents (e.g., passages from Wikipedia), where *exactly one* of the documents contains the answer to the question and k−1k-1 “distractor” documents do not. This task requires the model to access the document that contains the answer within its input context and use it to answer the question.
Figure [2](#S1.F2 "Figure 2 ‣ 1 Introduction ‣ Lost in the Middle: How Language Models Use Long Contexts") presents an example.

We instantiate this task with data from NaturalQuestions-Open ([Lee et al. 2019](#bib.bib16); [Kwiatkowski et al. 2019](#bib.bib15)), which contains historical queries issued to the Google search engine, coupled with human-annotated answers extracted from Wikipedia.
In particular, we take the 2655 queries where the annotated long answer is a paragraph (as opposed to a list or a table).
We use passages (chunks of at most 100 tokens) from Wikipedia as documents within our input contexts.
For each of the queries, we need a document that contains the answer and k−1k-1 distractor documents that do not contain the answer.
To obtain a document that answers the question, we use the Wikipedia paragraph that contains the answer from the NaturalQuestions annotations.

To collect k−1k-1 distractor documents that do not contain the answer, we use a retrieval system (Contriever, fine-tuned on MS-MARCO; [Izacard et al. 2021](#bib.bib10)) to retrieve the k−1k-1 Wikipedia chunks that are most relevant to the query and do not contain any of the NaturalQuestions-annotated answers.22
2
Ambiguity in NaturalQuestions-Open means that a small number of distractor passages may contain a reasonable answer. We additionally run experiments on subset of unambiguous questions, finding similar results and conclusions; see Appendix [A](#A1 "Appendix A Ambiguity in Multi-Document QA Distractor Documents ‣ Lost in the Middle: How Language Models Use Long Contexts").33
3
We also explored using random documents as distractors, see Appendix [B](#A2 "Appendix B Random Distractors in Multi-Document QA ‣ Lost in the Middle: How Language Models Use Long Contexts") for more details.
In the input context, the distractor documents are presented in order of decreasing relevance.44
4
Since there might be a prior over “search results” appearing in ranked order, we explored randomly ordering the k−1k-1 distractor documents and mentioning that the documents are randomly ordered in the task description, but found the same trends. See Appendix [C](#A3 "Appendix C Randomizing Distractor Order in Multi-Document QA ‣ Lost in the Middle: How Language Models Use Long Contexts") for more details.

To modulate the position of relevant information within the input context, we adjust the order of the documents to change the position of the document that contains the answer (Figure [3](#S1.F3 "Figure 3 ‣ 1 Introduction ‣ Lost in the Middle: How Language Models Use Long Contexts")).
To modulate the input context length in this task, we increase or decrease the number of retrieved documents that do not contain the answer (Figure [4](#S1.F4 "Figure 4 ‣ 1 Introduction ‣ Lost in the Middle: How Language Models Use Long Contexts")).

Following [Kandpal et al. 2022](#bib.bib12) and [Mallen et al. 2023](#bib.bib19), we use accuracy as our primary evaluation metric, judging whether any of the correct answers (as taken from the NaturalQuestions annotations) appear in the predicted output.
```

### Model versions, decoding choice, baselines, and QA results

- **Provenance**: `/tmp/c8-lost-middle.md:94-139`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="94" end="139" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
### 2.2 Models

We analyze several state-of-the-art open and closed language models. We use greedy decoding when generating outputs and leave exploration of other decoding methods to future work. We use a standard set of prompts for each model (Figure [2](#S1.F2 "Figure 2 ‣ 1 Introduction ‣ Lost in the Middle: How Language Models Use Long Contexts")).

#### Open models.

We experiment with MPT-30B-Instruct, which has a maximum context length of 8192 tokens. The model was initially pre-trained on 1 trillion tokens using 2048-token sequences, followed by an additional sequence length adaptation pre-training phase on 50 billion tokens using 8192-token sequences. MPT-30B-Instruct uses ALiBi ([Press et al. 2022](#bib.bib29)) to represent positional information.
We also evaluate LongChat-13B (16K) ([Li et al. 2023](#bib.bib18)), which extends the LLaMA-13B ([Touvron et al. 2023a](#bib.bib43)) context window from 2048 to 16384 tokens by using condensed rotary positional embeddings before fine-tuning with 16384-token sequences.

#### Closed models.

We use the OpenAI API to experiment with GPT-3.5-Turbo and GPT-3.5-Turbo (16K).55
5
We use the 0613 OpenAI model versions.
GPT-3.5-Turbo has a maximum context length of 4K tokens, and GPT-3.5-Turbo (16K) is a version with an extended maximum context length of 16K tokens.
We evaluate Claude-1.3 and Claude-1.3 (100K) with the Anthropic API; Claude-1.3 has a maximum context length of 8K tokens, and Claude-1.3 (100K) has an extended context length of 100K tokens.
66
6
We also evaluate GPT-4 (8K) on a subset of multi-document QA experiments, finding similar results and trends as other models (though GPT-4 has higher absolute performance). Evaluating GPT-4 on the full multi-document QA and key-value retrieval experiments would cost upwards of $6000. See Appendix [D](#A4 "Appendix D GPT-4 Performance ‣ Lost in the Middle: How Language Models Use Long Contexts") for GPT-4 results and discussion.

### 2.3 Results and Discussion

We experiment with input contexts containing 10, 20, and 30 total documents.
Figure [5](#S2.F5 "Figure 5 ‣ 2.1 Experimental Setup ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts") presents multi-document question answering performance when varying the position of relevant information within the input context.
To contextualize model performance, we also evaluate on the closed-book and oracle settings (Table [1](#S2.T1 "Table 1 ‣ 2.3 Results and Discussion ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts")).
In the closed-book setting, models are not given any documents in their input context, and must rely on their parametric memory to generate the correct answer.
On the other hand, in the oracle setting, language models are given the single document that contains the answer and must use it to answer the question.

| Model | Closed-Book | Oracle |
| --- | --- | --- |
| LongChat-13B (16K) | 35.0% | 83.4% |
| MPT-30B-Instruct | 31.5% | 81.9% |
| GPT-3.5-Turbo | 56.1% | 88.3% |
| GPT-3.5-Turbo (16K) | 56.0% | 88.6% |
| Claude-1.3 | 48.3% | 76.1% |
| Claude-1.3 (100K) | 48.2% | 76.4% |

#### Model performance is highest when relevant information occurs at the beginning or end of its input context.

As illustrated in Figure [5](#S2.F5 "Figure 5 ‣ 2.1 Experimental Setup ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts"), changing the position of relevant information in the input context leads to substantial decreases in model performance. In particular, we see a distinctive U-shaped performance curve—models are often much better at using relevant information that occurs at the very beginning (primacy bias) and very end of contexts (recency bias), and suffer degraded performance when forced to use information within the middle of its input context. For example, GPT-3.5-Turbo’s multi-document QA performance can drop by more than 20%—in the worst case, performance in 20- and 30-document settings is lower than performance without *any* input documents (i.e., closed-book performance; 56.1%).
These results indicate that current models cannot effectively reason over their entire context window when prompted for downstream tasks.

#### Extended-context models are not necessarily better at using input context.

When the input context fits in the context window of both a model and its extended-context counterpart, we see that performance between them is nearly identical. For example, the 10- and 20-document settings both fit in the context window of GPT-3.5-Turbo and GPT-3.5-Turbo (16K), and we observe that their performance as a function of position of relative information is nearly superimposed (solid purple and dashed brown series in Figure [5](#S2.F5 "Figure 5 ‣ 2.1 Experimental Setup ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts")). These results indicate that extended-context models are not necessarily better than their non-extended counterparts at using their input context.

```

### Synthetic key-value task and position-dependent results

- **Provenance**: `/tmp/c8-lost-middle.md:145-166`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="145" end="166" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
### 3.1 Experimental Setup

In our synthetic key-value retrieval task, the inputs are (i) a string-serialized JSON object with kk key-value pairs, where each of the keys and values are unique, randomly-generated UUIDs and (ii) a key within the aforementioned JSON object.
The goal is to return the value associated with the specified key.
Thus, each JSON object contains one relevant key-value pair (where the value is to be returned), and k−1k-1 irrelevant “distractor” key-value pairs.
Figure [6](#S2.F6 "Figure 6 ‣ Model performance is highest when relevant information occurs at the beginning or end of its input context. ‣ 2.3 Results and Discussion ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts") provides an example input context and its corresponding desired output.
We again measure accuracy by evaluating whether the correct value appears in the predicted output.

Our synthetic key-value retrieval task shares similar goals with the Little Retrieval Test of [Papailiopoulos et al. 2023](#bib.bib23) and the fine-grained line retrieval task of [Li et al. 2023](#bib.bib18), but we explicitly seek to distill and simplify the task by removing as much natural language semantics as possible (using random UUIDs instead), since language features may present potential confounders.
For example, Transformer language models may have varying sensitivity to different linguistic features in their input ([O’Connor and Andreas 2021](#bib.bib22)).

To modulate the position of relevant information within the input context, we change the position of the key to retrieve within the serialized JSON object.
To modulate the input context length, we change the number of input JSON key-value pairs kk by adding or removing random keys, changing the number of distractor key-value pairs.

### 3.2 Results and Discussion

We experiment with input contexts containing 75, 140, and 300 key-value pairs (500 examples each). We use the same set of models as the multi-document question answering experiments, see §[2.2](#S2.SS2 "2.2 Models ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts") for more details.

Figure [7](#S3.F7 "Figure 7 ‣ 3 How Well Can Language Models Retrieve From Input Contexts? ‣ Lost in the Middle: How Language Models Use Long Contexts") presents key-value retrieval performance. Claude-1.3 and Claude-1.3 (100K) do nearly perfectly on all evaluated input context lengths, but other models struggle, especially when contexts have 140 or 300 key-value pairs—although the synthetic key-value retrieval task only requires identifying exact match within the input context, not all models achieve high performance.

Similar to our multi-document QA results, GPT-3.5-Turbo, GPT-3.5-Turbo (16K), and MPT-30B-Instruct have the lowest performance when they must access key-value pairs in the middle of their input context.
LongChat-13B (16K) exhibits a different trend in the 140 key-value setting; we qualitatively observe that when relevant information is placed at the start of the input context, LongChat-13B (16K) tends to generate code to retrieve the key, rather than outputting the value directly.
```

### Architecture, query placement, and instruction-tuning investigations

- **Provenance**: `/tmp/c8-lost-middle.md:172-205`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="172" end="205" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
### 4.1 Effect of Model Architecture

The open models we evaluated are all decoder-only models—at each timestep, they may only attend to prior tokens.
To better understand the potential effects of model architecture on how language model use context, we compare decoder-only and encoder-decoder language models.

We experiment with Flan-T5-XXL ([Raffel et al. 2020](#bib.bib31); [Chung et al. 2022](#bib.bib3)) and Flan-UL2 ([Tay et al. 2023](#bib.bib41)). Flan-T5-XXL is trained with a sequences of 512 tokens (encoder and decoder). Flan-UL2 is initially trained with sequences of 512 tokens (encoder and decoder), but is then pre-trained for an extra 100K steps with 1024 tokens (encoder and decoder) before instruction fine-tuning on sequences with 2048 tokens in the encoder and 512 tokens in the decoder.
However, since these models use relative positional embeddings, they can (in principle) extrapolate beyond these maximum context lengths; [Shaham et al. 2023](#bib.bib36) find that both models can perform well with sequences of up to 8K tokens.

Figure [8](#S4.F8 "Figure 8 ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts") compares the performance of decoder-only and encoder-decoder models. When Flan-UL2 is evaluated on sequences within its 2048-token training-time context window (Figure [8](#S4.F8 "Figure 8 ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts"); left subplot), its performance is relatively robust to changes in the position of relevant information within the input context (1.9% absolute difference between best- and worst-case performance). When evaluated on settings with sequences longer than 2048 tokens (Figure [8](#S4.F8 "Figure 8 ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts"); center and right), Flan-UL2 performance begins to degrade when relevant information is placed in the middle.
Flan-T5-XXL shows a similar trend, where longer input contexts result in a greater performance degradation when placing relevant information in the middle of the input context.
We hypothesize that encoder-decoder models may make better use of their context windows because their bidirectional encoder allows processing each document in the context of future documents, potentially improving relative importance estimation between documents.

### 4.2 Effect of Query-Aware Contextualization

Our multi-document QA and key-value retrieval experiments place the query (i.e., question to answer or key to retrieve) after the data to process (i.e., the documents or the key-value pairs). As a result, decoder-only models cannot attend to query tokens when contextualizing documents or key-value pairs, since the query only appears at the end of the prompt and decoder-only models can only attend to prior tokens at each timestep. In contrast, encoder-decoder models (which seem more robust to changes in the position of relevant information; §[4.1](#S4.SS1 "4.1 Effect of Model Architecture ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts")) use a bidirectional encoder to contextualize input contexts—can we use this observation to improve decoder-only models by placing the query before *and* after the data, enabling query-aware contextualization of documents (or key-value pairs)?

We find that query-aware contextualization dramatically improves performance on the key-value retrieval task—all models achieve near-perfect performance on the 75, 140, and 300 key-value pair settings. For example, GPT-3.5-Turbo (16K) with query-aware contextualization achieves perfect performance when evaluated with 300 key-value pairs.

In contrast, without query-aware contextualization, the worst-case performance is 45.6% (Figure [7](#S3.F7 "Figure 7 ‣ 3 How Well Can Language Models Retrieve From Input Contexts? ‣ Lost in the Middle: How Language Models Use Long Contexts")).
Despite the significant impact on key-value retrieval performance, query-aware contextualization minimally affects performance trends in the multi-document question answering task (Figure [9](#S4.F9 "Figure 9 ‣ 4.1 Effect of Model Architecture ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts")); it slightly improves performance when the relevant information is located at the very beginning of the input context, but slightly decreases performance in other settings.

### 4.3 Effect of Instruction Fine-Tuning

The models we evaluated are all instruction fine-tuned—after their initial pre-training, they undergo supervised fine-tuning on a dataset of instructions and responses.
The task specification and/or instruction is commonly placed at the beginning of the input context in supervised instruction fine-tuning data, which might lead instruction fine-tuned language models to place more weight on the start of the input context.
To better understand the potential effects of instruction fine-tuning on how language models use long input contexts, we compare the multi-document question answering performance of MPT-30B-Instruct against its base model (i.e., before instruction fine-tuning) MPT-30B. We use the same experimental setup as §[2](#S2 "2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts").

Figure [10](#S4.F10 "Figure 10 ‣ 4.3 Effect of Instruction Fine-Tuning ‣ 4 Why Are Language Models Not Robust to Changes in the Position of Relevant Information? ‣ Lost in the Middle: How Language Models Use Long Contexts") compares the multi-document QA performance of MPT-30B and MPT-30B-Instruct as a function of the position of the relevant information in the input context. Surprisingly, we see that both MPT-30B and MPT-30B-Instruct exhibit a U-shaped performance curve, where performance is highest when relevant information occurs at the very beginning or very end of the context. Although the absolute performance of MPT-30B-Instruct is uniformly higher than that of MPT-30B, their overall performance trends are similar. We also observe that instruction fine-tuning slightly reduces the worst-case performance disparity from nearly 10% between the base model best- and worst-case performance to around 4%.

These observations complement prior work, which found that non-instruction fine-tuned language models are biased towards recent tokens (i.e., the end of the input context; [Khandelwal et al. 2018](#bib.bib13); [Press et al. 2021](#bib.bib28)).
This recency bias has been observed in past work when evaluating models on next-word prediction of contiguous text, a setting where language models minimally benefit from long-range information ([Sun et al. 2021](#bib.bib40)).
In contrast, our results show that language models are capable of using longer-range information (i.e., the beginning of the input context) when prompted with instruction-formatted data. We hypothesize that non-instruction fine-tuned language models learn to use these long contexts from similarly-formatted data that may occur in Internet text seen during pre-training, e.g., StackOverflow questions and answers.

To better understand the effect of additional fine-tuning and model scale, we also experimented with Llama-2 models of varying sizes (7B, 13B, and 70B) with and without additional supervised fine-tuning and reinforcement learning from human feedback (Appendix [E](#A5 "Appendix E Llama-2 Performance ‣ Lost in the Middle: How Language Models Use Long Contexts")). We find that the U-shaped performance curve only appears in sufficiently large language models (with or without additional fine-tuning)—the 7B Llama-2 models are solely recency biased, while the 13B and 70B models exhibit a U-shaped performance curve. In addition, we see that the Llama-2 supervised fine-tuning and reinforcement learning from human feedback procedure slightly mitigates the positional bias in smaller models (13B, akin to trends shown when comparing MPT-30B and MPT-30B-Instruct), but minimally affects trends on larger models (70B).
```

### Open-domain QA context-length case study

- **Provenance**: `/tmp/c8-lost-middle.md:207-214`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="207" end="214" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
## 5 Is More Context Is Always Better? A Case Study With Open-Domain QA

Our results indicate that prompting language models with longer input contexts is a trade-off—providing the language model with more information may help it perform the downstream task, but it also increases the amount of content that the model must reason over, potentially decreasing accuracy. Even if a language model can take in 16K tokens, is it actually beneficial to provide 16K tokens of context? The answer to this question is ultimately downstream task-specific since it depends on the marginal value of the added context and the model’s ability to effectively use long input contexts, but we perform a case study with open-domain question answering on NaturalQuestions-Open to better understand this trade-off in existing language models.

We use language models in a standard retriever-reader setup. A retrieval system (Contriever, fine-tuned on MS-MARCO) takes an input query from NaturalQuestions-Open and returns the kk documents from Wikipedia with the highest relevance score. To condition language models on these retrieved documents, we simply include them in the prompt. We evaluate retriever recall and reader accuracy (whether any of the annotated answers appear in the predicted output) as a function of the number of retrieved documents kk. We use a subset of NaturalQuestions-Open where the long answer is a paragraph (as opposed to a table or a list).

Figure [11](#S5.F11 "Figure 11 ‣ 5 Is More Context Is Always Better? A Case Study With Open-Domain QA ‣ Lost in the Middle: How Language Models Use Long Contexts") presents retriever recall and open-domain QA results. We see that reader model performance saturates long before retriever performance saturates, indicating that readers are not effectively using the extra context. Using more than 20 retrieved documents only marginally improves reader performance (∼\sim1.5% for GPT-3.5-Turbo and ∼\sim1% for Claude-1.3), while significantly increasing the input context length (and thus latency and cost).
These results, coupled with the observation that models are often better at retrieving and using information at the start or end of the input contexts, suggest that effective reranking of retrieved documents (pushing relevant information closer to the start of the input context) or ranked list truncation (retrieving fewer documents when appropriate; [Arampatzis et al. 2009](#bib.bib1)) may be promising directions for improving how language-model-based readers use retrieved context.
```

### Ambiguity and distractor robustness checks

- **Provenance**: `/tmp/c8-lost-middle.md:260-284`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="260" end="284" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
## Appendix A Ambiguity in Multi-Document QA Distractor Documents

Following past work on NaturalQuestions-Open ([Izacard et al. 2021](#bib.bib10); [Izacard and Grave 2021](#bib.bib11), *inter alia*), we use a Wikipedia dump from late 2018 as our retrieval corpus. However, this standard Wikipedia dump has a small amount of temporal mismatch with the NaturalQuestions annotations.

For example, consider the question “what nfl team does robert griffin iii play for”. The NaturalQuestions annotated answer is “currently a free agent”. However, the Wikipedia retrieval corpus contains the information that he plays for the “Baltimore Ravens”, since he was released from the team between the Wikipedia dump’s timestamp and the NaturalQuestions annotation process.

We use the ambiguity annotations of [Min et al. 2020](#bib.bib20) to create a subset unambiguous questions. Experiments on this unambiguous subset of the data show similar results and conclusions as the experiments on the full questions collection (Figure [12](#A1.F12 "Figure 12 ‣ Appendix A Ambiguity in Multi-Document QA Distractor Documents ‣ Lost in the Middle: How Language Models Use Long Contexts")).

## Appendix B Random Distractors in Multi-Document QA

We also run multi-document question answering experiments with random Wikipedia documents as distractors, which allows us to ablate the impact of retrieved distractors (hard negatives).
Note that in this setting, the the document containing the answer can often be identified with simple heuristics
(e.g., lexical overlap with the query).
Figure [13](#A2.F13 "Figure 13 ‣ Appendix B Random Distractors in Multi-Document QA ‣ Lost in the Middle: How Language Models Use Long Contexts") presents the results of this experiment.
Although all models have higher absolute accuracy in this setting, they
surprisingly still struggle to reason over their entire input context, indicating that their performance degradation is not solely due to an inability to identify relevant documents.

## Appendix C Randomizing Distractor Order in Multi-Document QA

Our prompt instructs the language model to use the provided search results to answer the question. There may be a prior in the pre-training or instruction fine-tuning data to treat search results as sorted by decreasing relevance (i.e., the documents near the beginning of the input context are more likely to be useful than those at the end). To validate that our conclusions are not simply a byproduct of this bias, we run experiments with the modified instruction “Write a high-quality answer for the given question using only the provided search results (some of which might be irrelevant). The search results are ordered randomly.”
In addition, we randomly shuffle the k−1k-1 distractor documents.

Figure [14](#A3.F14 "Figure 14 ‣ Appendix C Randomizing Distractor Order in Multi-Document QA ‣ Lost in the Middle: How Language Models Use Long Contexts") presents the results of this experiment.
We continue to see a U-shaped performance curve, with performance degrading when language models must use information in the middle of their input contexts.
Comparing the results in §[2.3](#S2.SS3 "2.3 Results and Discussion ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts") with those when randomizing the distractor order and mentioning such in the prompt, we see that randomization slightly decreases performance when the relevant information is at the very beginning of the context, and slightly increases performance when using information in the middle and end of the context.
```

### GPT-4 subset and Llama-2 scale/fine-tuning boundaries

- **Provenance**: `/tmp/c8-lost-middle.md:286-302`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="286" end="302" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
## Appendix D GPT-4 Performance

We evaluate GPT-4 (8K) on a subset of 500 random multi-document QA examples with 20 total documents in each input context (Figure [15](#A4.F15 "Figure 15 ‣ Appendix D GPT-4 Performance ‣ Lost in the Middle: How Language Models Use Long Contexts")). GPT-4 achieves higher absolute performance than any other language model, but still shows a U-shaped performance curve—its performance is highest when relevant information occurs at the very start or end of the context, and performance degrades when it must use information in the middle of its input context.

## Appendix E Llama-2 Performance

We evaluate Llama-2 ([Touvron et al. 2023b](#bib.bib44)) on multi-document QA with 20 total documents in each input context.
The Llama tokenizer produces longer sequences than the tokenizers for our previously-studied models, so we discard 20 examples (out of 2655) that exceed Llama-2’s maximum context length of 4096 tokens.
We experiment with models of varying sizes (7B, 13B, and 70B parameters), with and without additional supervised fine-tuning and reinforcement learning from human feedback (“-chat-” models). The results are presented in Figure [16](#A5.F16 "Figure 16 ‣ Appendix E Llama-2 Performance ‣ Lost in the Middle: How Language Models Use Long Contexts").

Comparing Llama-2 models of varying sizes, we find that only the larger models (13B and 70B) exhibit the U-shaped performance curve (i.e., both primacy and recency bias)—the smallest Llama-2 models (7B) are solely recency-biased. Given these results, we hypothesize that prior work (e.g., [Khandelwal et al. 2018](#bib.bib13); [Sun et al. 2021](#bib.bib40)) did not previously observe any primacy bias in language models because the models they studied were too small (less than 1B parameters).

Comparing between Llama-2 models with and without additional supervised fine-tuning and reinforcement learning from human feedback, we see that additional fine-tuning dramatically improves performance on the multi-document QA task.
The 7B models with and without additional fine-tuning show minimal primacy bias, and are largely recency-biased.
The 13B base model has a dramatic primacy and recency bias—there is a 20-point accuracy disparity between the best- and worst-case performance.
Applying additional fine-tuning to the 13B seems to slightly reduce this bias (10-point worst-case degradation), but the bias remains significant.
However, the 70B models with and without additional fine-tuning have largely similar trends (showing both primacy and recency bias), and additional fine-tuning minimally changes the positional bias severity.
```

### Exact 20- and 30-document QA result tables

- **Provenance**: `/tmp/c8-lost-middle.md:347-366`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="347" end="366" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
### G.2 20 Total Retrieved Documents

| Model | Index 0 | Index 4 | Index 9 | Index 14 | Index 19 |
| --- | --- | --- | --- | --- | --- |
| Claude-1.3 | 59.9% | 55.9% | 56.8% | 57.2% | 60.1% |
| Claude-1.3 (100K) | 59.8% | 55.9% | 57.0% | 57.4% | 60.0% |
| GPT-3.5-Turbo | 75.8% | 57.2% | 53.8% | 55.4% | 63.2% |
| GPT-3.5-Turbo (16K) | 75.7% | 57.3% | 54.1% | 55.4% | 63.1% |
| MPT-30B-Instruct | 53.7% | 51.8% | 52.2% | 52.7% | 56.3% |
| LongChat-13B (16K) | 68.6% | 57.4% | 55.3% | 52.5% | 55.0% |

### G.3 30 Total Retrieved Documents

| Model | Index 0 | Index 4 | Index 9 | Index 14 | Index 19 | Index 24 | Index 29 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude-1.3 | 59.1% | 55.1% | 54.8% | 55.7% | 56.4% | 56.2% | 59.9% |
| Claude-1.3 (100K) | 59.1% | 55.1% | 54.9% | 55.7% | 56.6% | 56.1% | 60.0% |
| GPT-3.5-Turbo (16K) | 73.4% | 55.1% | 50.5% | 50.9% | 51.8% | 54.9% | 63.7% |
| MPT-30B-Instruct | 51.6% | 51.3% | 51.2% | 49.0% | 49.6% | 51.3% | 54.1% |
| LongChat-13B (16K) | 66.9% | 54.8% | 52.5% | 52.9% | 52.2% | 51.3% | 55.1% |
```

## Claim limits

- **Direct experimental scope**: The central controlled tasks are NaturalQuestions-Open multi-document QA with exactly one answer-containing document and a synthetic UUID key-value retrieval task. A separate retriever-reader case study uses NaturalQuestions-Open.
- **Directly tested model scope**: The main study reports MPT-30B-Instruct, LongChat-13B (16K), GPT-3.5-Turbo 0613 variants, and Claude-1.3 variants, with additional Flan, base/instruction-tuned, GPT-4 subset, and Llama-2 analyses described in the excerpts.
- **Metric/decoding boundary**: The primary QA and retrieval measurements use answer-string accuracy and greedy decoding. Other decoding procedures and many downstream task metrics are not tested.
- **Position claim is empirical, not universal**: The data support substantial position sensitivity and frequent U-shaped curves in the evaluated settings. Some evaluated model/task combinations are more robust, including near-perfect Claude-1.3 key-value retrieval and encoder-decoder behavior within training-time sequence lengths.
- **Mechanism claims are preliminary**: Explanations involving architecture, query-aware contextualization, instruction tuning, and model size are investigations and hypotheses, not a single established causal mechanism.
- **Robustness evidence is bounded**: Random distractors, randomized order, ambiguity filtering, a limited GPT-4 subset, and Llama-2 variants support persistence of the trend under those checks; they do not cover all long-context models or tasks.
- **No workflow-recovery evidence**: This paper does not test interruption recovery, package identity, replay, canonical writers, gates, or staged Research execution. Those requirements come from the archived case, not the paper.
- **Rendering caveat**: The supplied arXiv HTML-derived text contains flattened mathematics and duplicated tokens. Excerpts preserve the supplied text exactly.
