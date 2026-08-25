# C8 Source Bundle: SWE-agent and Agentless Comparison

- **Date**: 2026-08-25
- **Primary case**: `literature-02`
- **Purpose**: Exact paper text needed to separate evidence for an interactive agent-computer interface from evidence for explicit hierarchical localization, sampled patch generation, and staged patch validation.
- **Authentication rule**: SHA-256 values identify the exact supplied source files. Excerpt bodies preserve source line text verbatim, excluding original line terminators.

## Source identities

| Source file | Paper identity | Canonical URL | Source-file SHA-256 |
|---|---|---|---|
| `/tmp/c8-swe-agent.md` | Yang et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering* (arXiv:2405.15793) | <https://arxiv.org/abs/2405.15793> | `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63` |
| `/tmp/c8-agentless.md` | Xia et al., *Agentless: Demystifying LLM-based Software Engineering Agents* (arXiv:2407.01489) | <https://arxiv.org/abs/2407.01489> | `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e` |

## Exact excerpts

### SWE-agent identity, ACI claim, and headline results

- **Provenance**: `/tmp/c8-swe-agent.md:8-18`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="8" end="18" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
# SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering

###### Abstract

Language model (LM) agents are increasingly being used to automate complicated tasks in digital environments.
Just as humans benefit from powerful software applications, such as integrated development environments, for complex tasks like software engineering, we posit that LM agents represent a new category of end users with their own needs and abilities, and would benefit from specially-built interfaces to the software they use.
We investigate how interface design affects the performance of language model agents.
As a result of this exploration, we introduce SWE-agent: a system that facilitates LM agents to autonomously use computers to solve software engineering tasks.
SWE-agent’s custom agent-computer interface (ACI) significantly enhances an agent’s ability to create and edit code files, navigate entire repositories, and execute tests and other programs.
We evaluate SWE-agent on SWE-bench and HumanEvalFix, achieving state-of-the-art performance on both with a pass@11 rate of 12.512.5% and 87.787.7%, respectively, far exceeding the previous state-of-the-art achieved with non-interactive LMs.
Finally, we provide insight on how the design of the ACI can impact agents’ behavior and performance.
```

### Why an interactive ACI is proposed and what it changes

- **Provenance**: `/tmp/c8-swe-agent.md:30-49`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="30" end="49" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
Consider the simple setting of an agent interacting directly with a Linux shell [[59](#bib.bib59)].
In practice, we find that LM agents can struggle to reliably take actions in this environment.
For example, it fails to provide simple commands to edit a small file segment, and does not provide any feedback if the user makes an invalid edit.
These deficits substantially hamper performance, motivating the need for an agent-computer interface (ACI), i.e., an abstraction layer between the LM agent and computer, to enhance the LM agent’s abilities in computer environments (Figure [1](#S1.F1 "Figure 1 ‣ 1 Introduction ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering")).

From this effort, we introduce SWE-agent, an agent composed of an LM and ACI, that can interact with a computer to solve challenging real-world software engineering problems, such as those proposed in SWE-bench [[20](#bib.bib20)].
In contrast to the Linux Shell’s granular, highly configurable action space, SWE-agent’s ACI instead offers a small set of simple actions for viewing, searching through and editing files.
The ACI uses guardrails to prevent common mistakes, and an agent receives specific, concise feedback about a command’s effects at every turn.
We show that ACIs tailored specifically for LMs outperform existing user interfaces (UIs) designed for human users, such as the Linux shell.

Using GPT-4 Turbo as a base LM, SWE-agent solves 12.4712.47% of the 2​t​r​u​e​2942true294 SWE-bench test tasks, substantially outperforming the previous best resolve rate of 3.83.8% by a non-interactive, retrieval-augmented system [[20](#bib.bib20)].
We perform an ablation study on a subset of 300300 SWE-bench test instances (SWE-bench Lite) to analyze our ACI design choices.
The results show that SWE-agent solves 10.710.7 percentage points *more* instances than the baseline agent, which uses only the default Linux shell.
Although our ACI was developed for GPT-4 Turbo, we show that it is portable to a different LM; SWE-agent with Claude 3 Opus can solve 10.510.5% of the benchmark tasks.

Our contributions are twofold.
First, we introduce the concept of the agent-computer interface (ACI) and demonstrate how careful ACI design can substantially improve LM agent performance without modifying the underlying LM’s weights.
Second, we build, evaluate, and open-source SWE-agent, a system that provides LMs an ACI for solving real-world software engineering tasks.
Unlike prior works that independently explore the merits of tool use, prompting techniques, and code execution in interactive settings, our approach unifies these factors within the ACI framework.
We show that crafting LM-centric interactive components has meaningful effects on downstream task performance.
```

### ACI scope and fixed-model design method

- **Provenance**: `/tmp/c8-swe-agent.md:63-76`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="63" end="76" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
Disparities in humans’ and LMs’ abilities and limitations motivates different interface design guidelines.
For instance, the current generation of LMs lack the visual understanding abilities to directly operate GUI-based applications with rich visual components and signals.
However, many of the features provided by these applications, such as syntax checking and navigation tools, could be useful to LM agents if they were presented in a suitable manner.
Additionally, humans can flexibly ignore unnecessary information, whereas all content has a fixed cost in memory and computation for LMs and distracting context can harm performance [[27](#bib.bib27)].
Therefore, LM agents may be more effective at interacting with computers when provided an interface that was built informed by these differences.

Ultimately, a well-designed ACI should help the LM agent understand the state of the application given previous changes, manage history to avoid unnecessary context from prior observations, and provide actions that models can use efficiently and reliably.
The ACI specifies both the commands available to the LM and how the environment state is communicated back to the LM.
It also tracks the history of all previous commands and observations and, at each step, manages how these should be formatted and combined with high-level instructions into a single input for the LM.

In this paper, we assume a fixed LM and focus on designing the ACI to improve its performance.
This means that we shape the actions, their documentation, and environment feedback to complement an LM’s limitations and abilities.
We draw inspiration from the field of HCI, where user studies elicit insights about how compatible different interfaces are with respect to human intuition and performance [[7](#bib.bib7)].
We use two approaches to enhance performance on a development set: (1) manually inspect agent behavior to identify difficulties and propose improvements, and (2) run a grid search to select the best ACI configuration.
```

### ACI design principles: simple actions, compactness, feedback, and guardrails

- **Provenance**: `/tmp/c8-swe-agent.md:78-99`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="78" end="99" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
Taking these two actions resulted in several insights about design principles that seem especially important for building effective ACIs:

Actions should be simple and easy to understand for agents.
Many bash commands have documentation that includes dozens of options.
Simple commands with a few options and concise documentation are easier for agents to use, reducing the need for demonstrations or fine-tuning.
This is a defining principle for all SWE-agent commands that we describe in Section [3](#S3 "3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").

Actions should be compact and efficient.
Important operations (e.g., file navigation, editing) should be consolidated into as few actions as possible.
Efficient actions help agents make meaningful progress towards a goal in a single step.
A poor design would therefore have many simple actions that must be composed across multiple turns for a higher order operation to take effect.
We show this idea in action in the Editing and Search interface analyses in Section [5.1](#S5.SS1 "5.1 Analysis of ACI Design ‣ 5 Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").

Environment feedback should be informative but concise.
High quality feedback should provide the agent with substantive information about the current environment state (and the effect of the agent’s recent actions) without unnecessary details.
For instance, when editing a file, updating the agent about revised content is helpful.
Figures [3(a)](#S3.F3.sf1 "In Figure 3 ‣ 3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), [3(b)](#S3.F3.sf2 "In Figure 3 ‣ 3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") and Table [3](#S4.T3 "Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") show this.

Guardrails mitigate error propagation and hasten recovery.
Like humans, LMs make mistakes when editing or searching and can struggle to recover from these errors.
Building in guardrails, such as a code syntax checker that automatically detects mistakes, can help agents recognize and quickly correct errors.
We show the effect of editing guardrails in Table [3](#S4.T3 "Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
```

### Concrete search, viewing, editing, and context-management interface

- **Provenance**: `/tmp/c8-swe-agent.md:104-144`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="104" end="144" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
## 3 SWE-agent: Designing an ACI for Software Engineering

Here we describe how SWE-agent provides an ACI for LMs to act as software engineering agents, enabling them to effectively search, navigate, edit, and execute code commands.
The ACI comprises several principal components, including search/navigation, file viewer, file editor, and context management.
At each step, SWE-agent generates a thought and a command, then incorporates the feedback from the command’s execution in the environment (ReAct; [Yao et al. 2023b](#bib.bib62)).
Built atop the Linux shell, SWE-agent also allows access to common Linux commands and utilities when needed.

Search and navigation.
Navigating codebases requires finding the relevant file and content.
A common strategy to do this involves looking up terms that might be useful, e.g., files, functions, or class definitions mentioned in an issue.
We introduce the special commands find\_file, search\_file, and search\_dir, which output a summary of search results when searching for filenames and strings within files or directories.
Figure [10](#A1.F10 "Figure 10 ‣ File viewer. ‣ A.1 ACI Design ‣ Appendix A SWE-agent Design ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") shows examples of these search result formats.
The find\_file command searches for filenames in the repository, while the search\_file and search\_dir locates strings in a file(s) of a subdirectory. Our interface encourages efficient searches by suppressing verbose results. The search commands return at most 5050 results for each search query; if a search exceeds this number, we do not report the results and instead suggest that the agent write a more specific query.

File viewer.
After finding a file they want to view, agents use the interactive file viewer by calling the command open on the relevant file path.
The file viewer presents a window of at most 100100 lines of the file at a time.
The agent can move this window with the commands scroll\_down and scroll\_up or access a specific line with the goto command.
To facilitate in-file navigation and code localization, we display: the full path of the open file, the total number of lines in the file, the number of lines omitted before and after the current window, and the line number (prepended to each visible line).
Figure [3(a)](#S3.F3.sf1 "In Figure 3 ‣ 3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") shows an example of this interface.

File editor.
We provide a few commands that let LMs create and edit files.
The edit command works in conjunction with the file viewer, allowing agents to replace a specific range of lines in the open file.
This command takes 3 required arguments: the start line, end line, and replacement text.
In a single step, agents can replace all lines between the start and end lines with the replacement text, as shown in Figure [3(b)](#S3.F3.sf2 "In Figure 3 ‣ 3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
After edits are applied, the file viewer automatically displays the updated content, helping the agent observe the effects of its edit immediately without invoking additional commands. Figure [3(b)](#S3.F3.sf2 "In Figure 3 ‣ 3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") shows an example agent response, including a file edit.

Similar to how humans can use tools like syntax highlighting to help them notice format errors when editing files in an IDE, we integrate a code linter into the edit function to alert the agent of mistakes it may have introduced when editing a file.
Select errors from the linter are shown to the agent along with a snippet of the file contents before/after the error was introduced.
Invalid edits are discarded, and the agent is asked to try editing the file again.

Context management.
The SWE-agent system uses informative prompts, error messages, and history processors to keep agent context concise and informative.
Agents receive instructions, documentation, and demonstrations on the correct use of bash and ACI commands.
At each step, the system instructs them to generate both a *thought* and an *action* [[62](#bib.bib62)].
Malformed generations trigger an error response, shown in Figure [32](#A3.F32 "Figure 32 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), asking the agent to try again, which is repeated until a valid generation is received.
Once received, all past error messages except the first are omitted.

The agent’s environment responses display computer output using the template shown in Figure [30](#A3.F30 "Figure 30 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"); however, if no output is generated, a specific message (“Your command ran successfully and did not produce any output”) is included to enhance clarity. To further improve context relevance, observations preceding the last 55 are each collapsed into a single line, shown in Figure [31](#A3.F31 "Figure 31 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
By removing most content from prior observations, we maintain essential information about the plan and action history while reducing unnecessary context, which allows for more interaction cycles and avoids showing outdated file information. §[A](#A1 "Appendix A SWE-agent Design ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") provides further implementation details.
```

### SWE-agent benchmark, models, baselines, metric, and cost cap

- **Provenance**: `/tmp/c8-swe-agent.md:146-175`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="146" end="175" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
## 4 Experimental Setup

Datasets.
We primarily evaluate on the SWE-bench dataset, which includes 2​t​r​u​e​2942true294 task instances from 1212 different repositories of popular Python packages [[20](#bib.bib20)].
We report our main agent results on the full SWE-bench test set and ablations and analysis on the SWE-bench Lite test set, unless otherwise specified.
SWE-bench Lite is a canonical subset of 300300 instances from SWE-bench that focus on evaluating self-contained functional bug fixes.
We also test SWE-agent’s basic code editing abilities with HumanEvalFix, a short-form code debugging benchmark [[32](#bib.bib32)].

Models.
All results, ablations, and analyses are based on two leading LMs, GPT-4 Turbo (gpt-4-1106-preview) [[34](#bib.bib34)] and Claude 3 Opus (claude-3-opus-20240229) [[6](#bib.bib6)].
We experimented with a number of additional closed and open source models, including Llama 3††
https://github.com/meta-llama/llama3 and DeepSeek Coder [[14](#bib.bib14)], but found their performance in the agent setting to be subpar.
Many LMs’ context window is too small, such as Llama 3’s context window of 88k.
GPT-4 Turbo and Claude 3 Opus have 128128k and 200200k token context windows, respectively,††
Token counts for different models are not directly comparable since they use different tokenizers. which provides sufficient room for the LM to interact for several turns after being fed the system prompt, issue description, and optionally, a demonstration.

Baselines.
We compare SWE-agent to two baselines.
The first setting is the non-interactive, retrieval-augmented generation (RAG) baselines established in [Jimenez et al. 2024](#bib.bib20).
Here, a BM25 retrieval system retrieves the most relevant codebase files using the issue as the query; given these files, the model is asked to directly generate a patch file that resolves the issue.

The second setting, called Shell-only, is adapted from the interactive coding framework introduced in [Yang et al. 2023a](#bib.bib59).
Following the InterCode environment, this baseline system asks the LM to resolve the issue by interacting with a shell process on Linux.
Like SWE-agent, model prediction is generated automatically based on the final state of the codebase after interaction.

Metrics. We report % Resolved or pass@@11 as the main metric, which is the proportion of instances for which all tests pass successfully after the model generated patch is applied to the repository [[20](#bib.bib20)].
We also report the $ Avg. Cost metric, the API inference cost incurred by SWE-agent averaged over all successfully resolved instances.
Due to budget constraints, we set the per-instance budget to $4;
if a run exceeded this budget, existing edits were submitted automatically.

```

### SWE-agent and baseline results table

- **Provenance**: `/tmp/c8-swe-agent.md:180-192`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="180" end="192" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
|  |  |  |  |  |
| --- | --- | --- | --- | --- |
|  | SWE-bench | | SWE-bench Lite | |
| Model | % Resolved | $ Avg. Cost | % Resolved | $ Avg. Cost |
| RAG |  |  |  |  |
| w/ GPT-4 Turbo | 1.31 | 0.13 | 2.67 | 0.13 |
| w/ Claude 3 Opus | 3.79 | 0.25 | 4.33 | 0.25 |
| Shell-only agent |  |  |  |  |
| w/ GPT-4 Turbo | - | - | 11.00 | 1.46 |
| w/o Demonstration | - | - | 7.33 | 0.79 |
| SWE-agent |  |  |  |  |
| w/ GPT-4 Turbo | 12.47 | 1.59 | 18.00 | 1.67 |
| w/ Claude 3 Opus | 10.46 | 2.59 | 13.00 | 2.18 |
```

### SWE-agent reported results and interface ablations

- **Provenance**: `/tmp/c8-swe-agent.md:241-290`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="241" end="290" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
## 5 Results

Across all systems, SWE-agent w/ GPT-4 Turbo achieves the best performance all-around, successfully solving 12.4712.47% (286286/2​t​r​u​e​2942true294) of the full SWE-bench test set and 18.0018.00% (5454/300300) of the Lite split.
As shown in Table [3](#S4.T3 "Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), compared to RAG on Lite, SWE-agent is 88-1313x more costly but yields a 6.76.7-fold improved % Resolved rate.
An LM-friendly ACI’s value is confirmed by SWE-agent’s 6464% relative increase compared to Shell-only, both with GPT-4 Turbo.

In Table [3](#S4.T3 "Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), SWE-agent yields strong performance on HumanEvalFix with 88.388.3% pass@1 rate.
Figure [4](#S4.F4 "Figure 4 ‣ Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") reveals that average performance variance is relatively low, but per-instance resolution can change considerably.
More results are given in the appendix: §[B.2](#A2.SS2 "B.2 Model Performance ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") shows that the success rate is uncorrelated to the issue age (controlling for possible test pollution), [B.5](#A2.SS5 "B.5 Performance Variance and Pass@k Rate ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") presents more details on performance variance and pass@​k@k, and [B.7](#A2.SS7 "B.7 HumanEvalFix Evaluation ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") discusses extra evaluation details.

### 5.1 Analysis of ACI Design

We perform several ablations of the SWE-agent interface, specifically with respect to the SWE-agent w/ GPT-4 configuration, summarized in Table [3](#S4.T3 "Table 3 ‣ 4 Experimental Setup ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
Our case studies shed light on interesting agent behavior along with the impact of different ACI designs.

Human user interfaces are not always suitable as agent-computer interfaces.
Current LMs are vulnerable to a number of pitfalls when searching for relevant content in a Linux shell environment.
Some exploration patterns (e.g., chains of cd, ls, cat) are extremely inefficient.
grep or find look ups can perform better but occasionally produce many lines of irrelevant results.
We hypothesize that better localization is possible with faster navigation and a more informative search interface.

![Refer to caption](2405.15793v3/search_comparison.png)
![Refer to caption](2405.15793v3/edit_comparison.png)

Figure [6](#S5.F6 "Figure 6 ‣ 5.1 Analysis of ACI Design ‣ 5 Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") compares the Shell-only setting to two different search interfaces.
Iterative search, directly inspired by traditional user interfaces for search, e.g., Vim or VSCode, shows results one by one via the file viewer.
Agents can look through results using next and prev actions.
Each result displays the matching line along with n surrounding lines of context.
An advantage is that an agent can begin editing directly after seeing the relevant code in its search.
However, when given a large number of search results, agents tend to look through every match exhaustively, calling next until each result has been inspected.
This inefficient behavior can exhaust an agent’s cost budget or context window, leading to even worse performance than the not having additional search tools at all (15.715.7%↓\downarrow 2.3 for No search vs. 12.012.0%↓\downarrow 6.0 with Iterative search).

Compact, efficient file editing is critical to performance.
SWE-agent’s file editor and viewer are designed to consolidate the editing process into a single command that enables easy multi-line edits with consistent feedback and automatically updates the agent’s view of the file after editing.
In the No edit setting, editing options are restrictive and prone to errors; the primary methods available are either replacing entire files through redirection and overwriting or using utilities like sed for single-line or search-and-replace edits.
Both methods have significant drawbacks.
Redirection involves copying and rewriting entire files for even minor changes, which is both inefficient and error-prone.
Although sed can facilitate specific edits, executing multi-line edits is cumbersome and can lead to unintended consequences that are challenging to detect.
Moreover, both strategies lack immediate feedback about file updates, making these silent operations potentially confusing for models to interpret and increasing the risk of errors.
Without SWE-agent’s file editor interface, performance drops to (10.310.3% ↓\downarrow 7.7).
We also find that agents are sensitive to the number of lines the file viewer displays.
Either too little content (30 lines, 14.314.3% ↓\downarrow 3.7) or too much (entire file, 12.712.7% ↓\downarrow 5.3) lowers performance.

Guardrails can improve error recovery.
A prominent failure mode occurs when models repeatedly edit the same code snippet.
The usual suspect for this behavior is an agent introducing a syntax error (e.g., incorrect indentation, extra parenthesis) via an errant edit.
As discussed in Section [3](#S3 "3 SWE-agent: Designing an ACI for Software Engineering ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), we add an intervention to the edit logic that lets a modification apply only if it does not produce major errors.
We compare this interface with the No edit and edit w/o linting alternatives in Figure [6](#S5.F6 "Figure 6 ‣ 5.1 Analysis of ACI Design ‣ 5 Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
This intervention improves performance considerably (without linting, 15.015.0% ↓\downarrow 3.0).

```

### SWE-agent limitations and transfer boundary

- **Provenance**: `/tmp/c8-swe-agent.md:1283-1304`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="1283" end="1304" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
### E.3 Limitations & Future Work

The final SWE-agent configuration has a small toolkit, albeit highly effective.
With SWE-agent’s highly extensible design, we’re excited by the prospect of adding more tools, such as web browsing or static analysis, that can leverage more signals from an issue description and codebase to improve the % Resolved performance.
Many tools trialed by prior works from software engineering and language model agents, such as static/dynamic analysis, spectrum based fault localization, or test generation via fuzzing could prove useful.

Second, in this work, the ACI development process and case studies are done manually.
Many components of SWE-agent were crafted from observations of recurring behavior within a single trajectory or across multiple trajectories.
Automating part or all of this process could not only accelerate work built on top of SWE-agent, but also provide greater insights into developing ACI principles for agentic software engineering.
Contemporary works have explored automated prompting to improve performance on traditional sequence to sequence tasks, supplanting the need for manual prompt design.
Thinking about automating ACI design raises immediately interesting questions around how such systems can scrutinize and iterate upon their own designs. Ensuring such horizon leads to incremental performance improvements across a longer horizon is also a challenging question.

Finally, the scope of SWE-agent is exclusively focused on programmatic tasks like software engineering and code generation.
We’re curious to see whether the same principles of ACI and our observations of agent behavior are transferable to different domains.
Recent work around applying LM agents to a variety of digital work applications have proliferated, such as use cases in education technology, data analysis, and enterprise workflows.
We hope that thinking about improving performance of agentic workflows on these domains through the lens of ACI design can be a symbiotic process.
For instance, for a task such a shopping on the web, in place of a typical Google-style search tool, could agents benefit from additional information beyond a list of each page’s title and snippet?
Would the design vary if the nature of the downstream task were to change slightly?
For a completely different task, such as navigating an internal company knowledge base to help a recently on-boarded employee, how might the search interface be best adjusted to the agent?

Similar to the progression of the field of User Experience (UX) and Human Computer Interaction (HCI) research, applying ACI to other domains could not only yield improvements in downstream task performance, but also further expand the list of ACI principles.
We believe that the fundamental motivations for ACI, the foundational principles we put forth, and our case study of SWE-agent as an instantiation of implementing and improving an ACI can motivate such work.
```

### Agentless identity, fixed-pipeline claim, and headline result

- **Provenance**: `/tmp/c8-agentless.md:12-32`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="12" end="32" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
# Agentless [Uncaptioned image] : Demystifying LLM-based Software Engineering Agents

![[Uncaptioned image]](2407.01489v2/resources/grinning-cat_1f63a.png)
![[Uncaptioned image]](2407.01489v2/resources/uiuc.png)

###### Abstract

Recent advancements in large language models (LLMs) have significantly advanced the automation of software development tasks, including code synthesis, program repair, and test generation.
More recently, researchers and industry practitioners have developed various autonomous *LLM agents* to perform end-to-end software development tasks.
These agents are equipped with the ability to use tools, run commands, observe feedback from the environment, and plan for future actions.
However, the complexity of these agent-based approaches, together with the limited abilities of current LLMs, raises the following question:
*Do we really have to employ complex autonomous software agents?*
To attempt to answer this question, we build Agentless – an *agentless* approach to automatically resolve software development issues.
Compared to the verbose and complex setup of agent-based approaches, Agentless employs a simplistic three-phase process of localization, repair, and patch validation, without letting the LLM decide future actions or operate with complex tools.
Our results on the popular SWE-bench Lite benchmark show that surprisingly the simplistic Agentless is able to achieve both the highest performance (32.00%, 96 correct fixes) and low cost ($0.70) compared with all existing open-source software agents!
In fact, *Agentless has already been adopted by OpenAI as the go-to approach to showcase the real-world coding performance of both GPT-4o and the new OpenAI o1 models*.
Furthermore, we manually classified the problems in SWE-bench Lite and found problems with exact ground truth patches or insufficient/misleading issue descriptions.
As such, we construct SWE-bench Lite-SS by excluding such problematic issues to perform more rigorous evaluation and comparison.
Our work highlights the currently overlooked potential of a simplistic, cost-effective technique in autonomous software development.
We hope Agentless will help reset the baseline, starting point, and horizon for autonomous software agents, and inspire future work along this crucial direction.
We have open-sourced Agentless at: <https://github.com/OpenAutoCoder/Agentless>
```

### Agent-based limitations and Agentless three-phase alternative

- **Provenance**: `/tmp/c8-agentless.md:46-84`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="46" end="84" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
To solve the challenging real-world software development problems from SWE-bench, inspired by the Devin AI Software Engineer [dev 2024](#bib.bib8), there has been a significant body of work from both academia and industry focusing on developing *agent-based* approaches [Zhang et al. 2024c](#bib.bib109); [Gauthier 2024](#bib.bib38); [Yang et al. 2024a](#bib.bib102); [Chen et al. 2024](#bib.bib31); [Ma et al. 2024](#bib.bib65); [Bouzenia et al. 2024](#bib.bib30).
While there is not a fixed definition for agent-based approaches, they generally equip LLMs with a set of tools and allow agents to iteratively and autonomously perform actions, observe feedback, and plan future steps [Liu et al. 2024c](#bib.bib57).
Example tools can include the ability to open/write/create files, search for code lines, run tests, and execute shell commands.
In each attempt to solve a problem, agent-based approaches will have multiple turns, where each turn consists of performing an action.
Subsequent turns depend on previous actions and the feedback information the agent receives from the environment.

At first glance, agent-based approaches appear to be a natural and straightforward way to tackle software development tasks.
After all, human developers also perform similar actions and use feedback to plan future steps.
However, the disparity between human and current LLM abilities leads to the following limitations of agent-based approaches:

Complex tool usage/design.
To utilize tools, current agent-based approaches apply an abstraction layer between the agent and the environment.
Examples are mapping real actions to API calls so that agents can use tools by outputting an API call instruction.
However, such abstractions and API call specifications require careful design of input/output formats and can easily lead to incorrect or imprecise tool design/usage,
especially for more complex action spaces.
Given the iterative nature of agent-based approaches, where current action/plan depends on previous turns, incorrectly or imprecisely defining/using a tool can both reduce performance and incur additional cost in wasted LLM queries.

Lack of control in decision planning.
In addition to using tools, current agent-based approaches also delegate the decision-making process to the agents, allowing them to decide when and what action to perform.
The agents decide the current action to take based on previous actions taken and the feedback provided by the environment, often with minimal checks to ensure the action taken make sense.
Due to the large possible action space and feedback response, it can be extremely easy for autonomous agents to become confused and perform sub-optimal explorations.
Furthermore, to solve an issue, an agent can take upwards of 30 or 40 turns, which makes it extremely difficult to both understand the decisions made by the agents and also debug the exact turns where an incorrect decision is made.

Limited ability to self-reflect.
Existing agents struggle with the capability to perform self-reflection [Olausson et al. 2023](#bib.bib70); [Huang et al. 2024](#bib.bib42).
That is to say they tend to take all information/feedback and do not know how to filter out or correct irrelevant, incorrect, or misleading information [Shi et al. 2023](#bib.bib85); [Zhang et al. 2023](#bib.bib108).
The limited ability to self-reflect means that an incorrect step can be easily amplified and negatively affect all future decisions made by the agent.

In this paper, we advocate that instead of rushing to develop increasingly complex LLM agent-based approaches and tools for software development (which can also be non-trivial to use or replicate due to the fully autonomous setup), we should first take a step back and ask the following introspective question: *Do we really have to employ complex autonomous software agents?*

Our work. We set out to answer this important question by building Agentless – an *agentless* approach to automatically resolve software development issues.
To solve each issue, Agentless follows a simple three phase process: localization, repair, and patch validation.
In the localization process, Agentless employs a hierarchical process to first localize the fault to specific files, then to relevant classes or functions, and finally to fine-grained edit locations.
Agentless’s localization process make uses of both LLM-based localization as well classic information-retrieval-based localization idea [Zhou et al. 2012](#bib.bib110).
To perform repair, Agentless takes the localized edit locations and generates multiple candidate patches in a simple diff format.
At the same time, Agentless generates reproduction tests that can reproduce the original error and help with candidate patch selection.
Finally, Agentless re-ranks all remaining patches and selects one to submit in order to fix the issue.
While Agentless leverages LLMs to perform each detailed task, unlike prior complex agent-based tools, Agentless does not allow LLMs to *autonomously* decide future actions or operate with any complex tools.
Our deliberate choice to avoid using agents not only allows Agentless to have a simplistic and straightforward design that is easy to understand, but also helps avoid the above-mentioned limitations of LLM agents in software development.
```

### Agentless end-to-end localization, repair, and validation flow

- **Provenance**: `/tmp/c8-agentless.md:162-203`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="162" end="203" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
## 3 Agentless [Uncaptioned image] Approach

![[Uncaptioned image]](2407.01489v2/resources/grinning-cat_1f63a.png)

Figure [1](#S3.F1 "Figure 1 ‣ 3 Agentless 
          
         Approach ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the overview of Agentless, consisting of three phases: localization, repair, and patch validation.
We first take in the issue description and the existing project codebase as input.
Then, we begin our hierarchical localization process by turning the project codebase into a tree-like structure that illustrates the relative location of each file in the project
1
.
Next, using this repository structure along with the original issue description, we prompt the LLM to localize and rank the top N most suspicious files that likely require editing to solve the issue
2
.
Since our repository structure format does not contain detailed source code information, we additionally retrieve files with most relevant code snippets with the issue description using embedding-based retrieval
3
.
We then combine the retrieved files with the LLM-localized files to obtain the final list of suspicious files.
However, not all contents in each file need to be modified.
As such, we provide a skeleton for each file (i.e., a list of declaration headers of the classes and functions) and ask the LLM to output a specific list of classes and functions that we should examine more closely to fix the bug
4
.
We then provide the complete code content of the previous locations and ask the LLM to finalize a smaller set of edit locations (i.e., classes, functions, or even specific lines)
5
.
For the repair phase, we provide the code snippets at these edit locations together with the issue description and prompt the LLM to sample multiple patches to solve the issue
6
.
Next, we enter the patch validation phase, where we first ask the LLM to sample multiple reproduction tests that aim to replicate the original issue
7
, and then select the optimal one based on actual execution results on the original codebase
8
.
Agentless uses the reproduction test along with existing regression tests for patch ranking/selection
9
.
Finally, Agentless selects the top-ranked patch as the final patch for submission
10
.
We now describe the steps in each of Agentless’s phases in more detail.
```

### Agentless implementation details and sampling scale

- **Provenance**: `/tmp/c8-agentless.md:326-361`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="326" end="361" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
## 4 Experimental Setup

Datasets.
We evaluate Agentless and baselines using the popular SWE-bench dataset [Jimenez et al. 2024a](#bib.bib45) to test the ability to solve real-world software engineering issues.
Each problem in SWE-bench requires submitting a patch to solve the underlying issue described in the input issue description.
In particular, we focus on the widely used SWE-bench Lite version [swe 2024](#bib.bib24), containing 300 self-contained problems with better quality.
Furthermore, we also conduct a detailed study (Section [6.1](#S6.SS1 "6.1 Problem Classification ‣ 6 Additional Analysis on SWE-bench Lite ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents")) on the SWE-bench Lite benchmark to not only demonstrate potential issues and biases, but also produce a more rigorous filtered set of problems for better evaluation.

Implementation.
We implement Agentless using GPT-4o (gpt-4o-2024-05-13) [OpenAI 2024a](#bib.bib73).
By default, we query the LLM with greedy decoding.
During sampling, we use a sampling temperature of 0.80.8.
For the embedding-based retrieval method, we implement our approach using LlamaIndex [LlamaIndex 2024](#bib.bib61).
We use OpenAI’s text-embedding-3-small [OpenAI 2024b](#bib.bib74) model to compute the embedding with chunk size of 512 and chunk overlap of 0.
For each issue, we first localize to the top three suspicious files, and then localize to an unrestricted number of suspicious classes and functions within these files, all using greedy decoding.
Next, to maximize the chances of finding the correct edit locations, we draw four samples of edit locations per issue (i.e., the third step in the localization phase).
This gives us 4 separate sets of edit locations per issue.
For each set, we adopt a context window of ±\pm 10 lines around each edit location, and generate 10 patches (1 greedy and 9 samples).
This results in a total of 40 patches per bug.
We adopt the same Search/Replace edit format from prior work [Gauthier 2024](#bib.bib38), and use the built-in Python ast library [ast 2024](#bib.bib19) to perform parsing in our normalization step.
To generate the reproduction tests, we also generate 40 samples (1 greedy and 39 samples) in total prior to patch selection (described in Section [3.3.1](#S3.SS3.SSS1 "3.3.1 Reproduction test generation. ‣ 3.3 Patch Validation ‣ 3 Agentless 
          
         Approach ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents")).
The regression tests are obtained by first running all the tests to obtain a set of passing tests that successfully pass in the original repository and then use the LLM to identify any non-regression tests (described in Section [3.3.2](#S3.SS3.SSS2 "3.3.2 Patch selection. ‣ 3.3 Patch Validation ‣ 3 Agentless 
          
         Approach ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents")).
We do not directly use the provided list of regression tests already identified in the PASS\_TO\_PASS field of SWE-bench as requested by the SWE-bench maintainers11
1
If we directly use the PASS\_TO\_PASS tests the performance on SWE-bench Lite will be 98..
We modify the official SWE-bench evaluation setup to be able to freely execute arbitrary regression and reproduction tests.
```

### Agentless metrics and baseline provenance

- **Provenance**: `/tmp/c8-agentless.md:376-381`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="376" end="381" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
Metrics.
Following prior work [Zhang et al. 2024c](#bib.bib109), we report 1) % Resolved: the percentage of resolved problems in the benchmark, 2) Avg. $ Cost: average inference cost of running the tool, and 3) Avg. # Tokens: average number of input and output tokens used to query to LLM.
Additionally, we also report the % Correct Location: the percent of problems where the patch produced by the tool covers the edit location(s) of the ground truth developer patch.
We compute this metric over three granularities: file, function, and line.
We report that a patch contains the correct location if it edits a superset of all locations in the ground truth patch.
For baseline tools, we directly use the reported results either from the official leaderboard [Jimenez et al. 2024b](#bib.bib46) or from the tool’s official paper/repository.
```

### Agentless main SWE-bench Lite comparison table

- **Provenance**: `/tmp/c8-agentless.md:389-427`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="389" end="427" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
|  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tool | LLM | % Resolved | Avg.  $ Cost | Avg.  # Tokens | % Correct Location | | |
| Line | Function | File |
| CodeStory Aide [cod 2024](#bib.bib3)   [Uncaptioned image] | [Uncaptioned image]  GPT-4o+  [Uncaptioned image]  Claude 3.5 S | 129 (43.00%) | - | - | 41.7% | 58.7% | 72.0% |
| Bytedance MarsCode [Liu et al. 2024b](#bib.bib59)   [Uncaptioned image] | NA | 118 (39.33%) | - | - | 42.7% | 58.0% | 79.7% |
| Honeycomb [hon 2024](#bib.bib11)   [Uncaptioned image] | NA | 115 (38.33%) | - | - | 44.3% | 57.0% | 69.3% |
| MentatBot [men 2024](#bib.bib15)   [Uncaptioned image] | [Uncaptioned image]  GPT-4o | 114 (38.00%) | - | - | 37.3% | 53.3% | 69.3% |
| Gru [gru 2024](#bib.bib21)   [Uncaptioned image] | NA | 107 (35.67%) | - | - | 38.3% | 54.3% | 75.0% |
| Isoform [iso 2024](#bib.bib13)   [Uncaptioned image] | NA | 105 (35.00%) | - | 41,963 | 38.7% | 55.3% | 72.0% |
| SuperCoder2.0 [sup 2024](#bib.bib23)   [Uncaptioned image] | NA | 102 (34.00%) | - | - | 41.7% | 63.7% | 65.7% |
| Alibaba Lingma Agent [lin 2024](#bib.bib14)   [Uncaptioned image] | [Uncaptioned image]  GPT-4o+  [Uncaptioned image]  Claude 3.5 S | 99 (33.00%) | - | - | 40.0% | 58.7% | 75.0% |
| Factory Code Droid [fac 2024](#bib.bib10)   [Uncaptioned image] | NA | 94 (31.33%) | - | - | 36.7% | 55.7% | 72.7% |
| Amazon Q Developer-v2 [ama 2024](#bib.bib5)   [Uncaptioned image] | NA | 89 (29.67%) | - | - | 40.3% | 52.0% | 74.3% |
| SpecRover [Ruan et al. 2024](#bib.bib82)   [Uncaptioned image] | [Uncaptioned image]  GPT-4o+  [Uncaptioned image]  Claude 3.5 S | 93 (31.00%) | $0.65 | - | - | - | - |
| CodeR [Chen et al. 2024](#bib.bib31)   [Uncaptioned image] | [Uncaptioned image]  GPT-4 | 85 (28.33%) | $3.34 | 323,802 | 35.7% | 52.3% | 67.0% |
| MASAI [Arora et al. 2024](#bib.bib28)   [Uncaptioned image] | NA | 84 (28.00%) | - | - | 38.7% | 56.3% | 75.0% |
| SIMA [sim 2024](#bib.bib4)   [Uncaptioned image] | [Uncaptioned image]  GPT-4o | 83 (27.67%) | $0.82 | - | 37.0% | 54.0% | 79.0% |
| IBM Research Agent-101 [ibm 2024](#bib.bib2)   [Uncaptioned image] | NA | 80 (26.67%) | - | - | 39.7% | 56.7% | 73.3% |
| OpenCSG StarShip [ope 2024a](#bib.bib17)   [Uncaptioned image] | [Uncaptioned image]  GPT-4 | 71 (23.67%) | - | - | 39.0% | 61.7% | 90.7% |
| Amazon Q Developer [ama 2024](#bib.bib5)   [Uncaptioned image] | NA | 61 (20.33%) | - | - | 34.0% | 43.7% | 71.7% |
| RepoUnderstander [Ma et al. 2024](#bib.bib65)   [Uncaptioned image] | [Uncaptioned image]  GPT-4 | 64 (21.33%) | - | - | - | - | - |
| AutoCodeRover-v2 [aut 2024](#bib.bib7) | [Uncaptioned image]  GPT-4o | 92 (30.67%) | - | - | 35.0% | 52.3% | 69.3% |
| RepoGraph [rep 2024](#bib.bib20) | [Uncaptioned image]  GPT-4o | 89 (29.67%) | - | - | 36.7% | 51.3% | 71.0% |
| Moatless [moa 2024](#bib.bib16) | [Uncaptioned image]  Claude 3.5 S | 80 (26.67%) | $0.17 | - | 38.7% | 54.7% | 78.7% |
|  | [Uncaptioned image]  GPT-4o | 74 (24.67%) | $0.14 | - | 36.0% | 52.0% | 73.0% |
| OpenDevin+CodeAct v1.8 [ope 2024b](#bib.bib18) | [Uncaptioned image] Claude 3.5 S | 80 (26.67%) | $1.14 | - | 38.0% | 49.7% | 67.3% |
| Aider [Gauthier 2024](#bib.bib38) | [Uncaptioned image]  GPT-4o+  [Uncaptioned image]  Claude 3.5 S | 79 (26.33%) | - | - | 35.3% | 50.0% | 69.7% |
| SWE-agent [Yang et al. 2024a](#bib.bib102) | [Uncaptioned image] Claude 3.5 S | 69 (23.00%) | $1.62 | 521,208 | 40.7% | 54.3% | 72.0% |
|  | [Uncaptioned image]  GPT-4o | 55 (18.33%) | $2.53 | 498,346 | 29.3% | 42.3% | 58.3% |
|  | [Uncaptioned image]  GPT-4 | 54 (18.00%) | $2.51 | 245,008 | 30.7% | 45.3% | 61.0% |
| AppMap Navie [app 2024](#bib.bib6) | [Uncaptioned image]  GPT-4o | 65 (21.67%) | - | - | 29.7% | 44.7% | 59.7% |
| AutoCodeRover [Zhang et al. 2024c](#bib.bib109) | [Uncaptioned image]  GPT-4 | 57 (19.00%) | $0.45 | 38,663 | 29.0% | 42.3% | 62.3% |
| RAG [Yang et al. 2024a](#bib.bib102) | [Uncaptioned image]  Claude 3 Opus | 13 (4.33%) | $0.25 | - | 22.0% | 30.0% | 57.0% |
|  | [Uncaptioned image]  GPT-4 | 8 (2.67%) | $0.13 | - | 12.7% | 23.3% | 47.3% |
|  | [Uncaptioned image]  Claude-2 | 9 (3.00%) | - | - | 16.7% | 24.3% | 46.7% |
|  | [Uncaptioned image]  GPT-3.5 | 1 (0.33%) | - | - | 6.3% | 11.3% | 27.3% |
| Agentless | [Uncaptioned image]  GPT-4o | 96 (32.00%) | $0.70 | 78,166 | 35.3% | 52.0% | 69.7% |

```

### Agentless interpretation of SWE-bench Lite result and cost

- **Provenance**: `/tmp/c8-agentless.md:490-500`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="490" end="500" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
### 5.1 Performance on SWE-bench Lite

Table [1](#S5.T1 "Table 1 ‣ 5 Evaluation ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the main evaluation result of Agentless and prior agent-based approaches on SWE-bench Lite.
We observe that Agentless is able to solve 96 out of 300 problems (32.00%).
While this is not the highest percentage of problems solved on SWE-bench Lite, Agentless is extremely competitive compared with prior agent-based approaches while using a much simpler design and overall technique.
It is important to note here that many of the top techniques are closed-source/commercial and did not release any source code to reproduce experiments or even trajectories for further verification.
Compared with all open-source approaches, Agentless is able to achieve the highest performance of 32.00% (96 / 300) on SWE-bench Lite.
Additionally, Agentless only costs on average $0.70, which is less than most prior agent-based approaches.
Comparing against the RAG agentless baselines, we see that while Agentless costs slightly more, Agentless is also able to fix way more issues.
```

### Agentless localization ablations

- **Provenance**: `/tmp/c8-agentless.md:589-630`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="589" end="630" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
#### 5.2.1 Localization ablation.

Table [2](#S5.T2 "Table 2 ‣ 5.1.3 Reproduction test results. ‣ 5.1 Performance on SWE-bench Lite ‣ 5 Evaluation ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the performance and cost for each of the 3 steps in Agentless’s localization phase.
We show after each localization step the percentage of problems whose ground truth edit locations remain in the location set (“Contains GT”), the average lines of code of each location set (“LoC”), and the average dollar cost of each step (“Avg.$”).
The bold method indicates the default setting of Agentless.
First, we examine the different configurations of file level localization.
To start with, for the retrieval method based on embeddings, we see that without including the irrelevant folder filtering to remove irrelevant folders for embedding (described in Section [3.1.1](#S3.SS1.SSS1 "3.1.1 Localize to suspicious files. ‣ 3.1 Localization ‣ 3 Agentless 
          
         Approach ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents")), both the performance and cost become worse.
This demonstrates the importance of limiting the number of files to consider during embedding and focusing on essential parts of the repository for more cost-efficient and effective localization.
We see that using the prompting-based or the embedding-based retrieval method alone can locate the ground truth file in 78.7% and 67.7% of cases respectively.
This can be further improved by combining them to obtain 81.7% correct file localization, showing that prompting-based and embedding-based retrieval methods can complement each other in identifying different sets of relevant files.

|  |  |  |
| --- | --- | --- |
| Method | Performance | Avg. $ |
| Greedy location  (40 samples) | 88 (29.33%) | $0.22 |
| Multi-samples merged  (40 samples) | 85 (28.33%) | $0.24 |
| Multi-samples  (4 x 10 samples) | 96 (32.00%) | $0.29 |

Using all of the localized files leads to a large context window (>>3000).
As such, in our second localization step, we localize to the relevant classes and functions, and are able to drastically reduce the context window (<<800).
We compare our input of using skeleton format (described in Section [3.1.2](#S3.SS1.SSS2 "3.1.2 Localize to related elements. ‣ 3.1 Localization ‣ 3 Agentless 
          
         Approach ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents")) to provide a more concise representation with the baseline of using the complete file content.
We observe that by using the complete file content, not only is the cost much higher but also the number of localized groundtruth issues is reduced.
The reason is most likely that LLMs cannot handle long context very well, so providing the entire file contents can confuse the model.
Conversely, by using a more concise representation as the input, we can effectively localize the correct related locations that are needed for inspection and editing.

Next, Agentless localizes to the exact edit locations needed to achieve even more context reduction without losing much of the localization accuracy.
We compare the different ways we can perform the edit location localization: 1) “Greedy”: using greedy decoding to obtain one set of edit locations, 2) “Direct from file-level”: directly go from file-level localization to the edit locations (instead the default of localizing from file-level to related elements and then to edit locations), 3) “Multi-samples merged”: sample multiple sets of edit locations and merging them into one set, and 4) “Multi-samples”: sample multiple sets of edit locations.
We first observe that by directly going from file-level to the edit locations, both the cost and performance are worse.
The reason is that the model can become confused when providing a large context, demonstrating the importance of our hierarchical localization design.
We also find that when merging multiple samples together, the amount of ground truth localized is higher but at the expense of having to add more context as the input during the repair phase.
Our default settings also sample the edit locations multiple times, however instead of merging, we perform repair on them separately to make use of the fact each sampled location set can provide similar localization performance while also limiting the input context.
In short, by using hierarchical localization steps, Agentless can successfully minimize the cost while performing effective localization.
```

### Agentless repair and patch-validation ablations

- **Provenance**: `/tmp/c8-agentless.md:632-670`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="632" end="670" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
#### 5.2.2 Repair ablation.

We now look at the impact of our different repair setups on the final performance. Table [3](#S5.T3 "Table 3 ‣ 5.2.1 Localization ablation. ‣ 5.2 Ablation study on components of Agentless ‣ 5 Evaluation ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the different settings and inputs for our repair phase with their performance and cost.Starting with using the greedy location set generated in the edit location generation stage, we observe that we can already achieve very high performance of more than 88 issues fixed.
Similarly, for the “Multi-samples merged” where we merged multiple location sets into one, we can also achieve comparable performance.
The performance can be further improved by considering each sampled locations separately (to generate 10 candidate patches each) when performing repair to achieve 96 fixes.
The reason is that each different location sets may localize different ground truth locations and provide different context that can be helpful to fix specific issues.
By using different edit locations and combining with our extensive test filtering and selection stage, Agentless can drastically improve the repair performance.

Next, we examine the impact of using different numbers of sampled candidate patches on the performance of Agentless.
Figure [6](#S5.F6 "Figure 6 ‣ 5.2.2 Repair ablation. ‣ 5.2 Ablation study on components of Agentless ‣ 5 Evaluation ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the number of issues fixed as we increase the number of samples.
Note that the sample interval increases by 4 since we use 4 different sets of locations as input.
First, we see that by just using 1 greedy sample for each location set, Agentless can already achieve a significant number of correct fixes of 80.
We can continue to improve repair performance by adding more samples.
However, we observe that the performance plateaus at around 40 samples where adding additional candidate patches does not improve performance.
This is because we perform majority voting after test filtering to select the final submission patch, which means that later samples may be ignored since it is difficult for them to offset the majoritively voted patch.
Interestingly, we can also see from the figure that *if we consider all patch samples (instead of only selecting one patch) for each issue, the total number of possible issues that Agentless can solve is 126 (42.0%).*
This shows a high upper bound for the potential of Agentless with future work being even better patch re-ranking and selection techniques to further improve the overall performance.

#### 5.2.3 Patch validation ablation.

|  |  |  |
| --- | --- | --- |
| Method | Performance | Avg. $ |
| Majority voting | 77 (25.67%) | $0.00 |
| +Regression test | 81 (27.00%) | $0.01 |
| +Reproduction test | 96 (32.00%) | $0.25 |

Finally, we examine the impact of our different test generation and patch selection configurations has on performance.
Table [4](#S5.T4 "Table 4 ‣ 5.2.3 Patch validation ablation. ‣ 5.2 Ablation study on components of Agentless ‣ 5 Evaluation ‣ Agentless 
        
      :Demystifying LLM-based Software Engineering Agents") shows the result and additional cost of different approaches.
We see that by only using majority voting, we can already achieve 77 correct fixes.
By adding the existing regression tests, and filter for candidate patches with the lowest amount of regression errors, we can improve performance to 81 issues resolved.
Furthermore, the most significant performance improvement was achieved by incorporating additional filtering based on the generated reproduction tests, resulting in the final Agentless performance of 96 fixes.
This demonstrates the impact of our patch selection approach, specifically our reproduction test generation, which is able to make use of the high number of candidate patches generated and filter for the correct patch for final submission.
```

### Agentless validity threats and conclusion boundary

- **Provenance**: `/tmp/c8-agentless.md:940-960`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="940" end="960" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
## 7 Threats to Validity

Internal.
One threat to validity comes from the data leakage of ground truth developer patches in SWE-bench Lite being part of the training data for GPT-4o.
Since GPT-4o is a closed-source model, we do not have access to the training data.
Meanwhile, we note here that prior work almost exclusively used similar closed-source LLMs (e.g., GPT-4o, GPT-4, Claude-3.5, etc), and our approach can outperform all existing open-source solutions with same models.
Furthermore, the authors of SWE-bench [Jimenez et al. 2024a](#bib.bib45) compared the resolve rate of issues collected before and after the knowledge cutoff date of GPT-4, and did not find any significant difference.
To completely address this threat, we would need to retrain GPT-4o from scratch which would be infeasible for an academic project.

External.
One main external threat comes from our evaluation dataset of SWE-bench Lite.
While the performance of Agentless might not generalize to other datasets, SWE-bench Lite is by far the most popular evaluation dataset which contains a diverse range of problems.
In addition, *OpenAI has independently performed an extensive evaluation of Agentless*  and other open-source solutions on SWE-bench Lite, SWE-bench, and their new SWE-bench Verified benchmark, further confirming that Agentless outperforms all other open-source agents [Chowdhury et al. 2024](#bib.bib35). Moreover, on Sept. 12th 2024, OpenAI just released the new o1 model family and also adopted Agentless as the top approach to showcase their performance on SWE-bench [OpenAI 2024c](#bib.bib75).
In the future, we plan to further address this threat by evaluating Agentless on other benchmarks.

## 8 Conclusion

We propose Agentless– an *agentless* approach to automatically tackle software development problems.
Agentless uses a simple three phase approach of localization, repair, and patch validation.
Compared to prior agent-based approaches, Agentless deliberately disallows the LLM for autonomous tool usage or planning.
Our evaluation on the popular SWE-bench Lite benchmark demonstrates that Agentless can achieve the highest performance compared with other open-source techniques while at the same time minimizing the cost.
```

## Comparison boundaries and claim limits

- **What SWE-agent directly supports**: Within its reported setup, a tailored interactive ACI is associated with higher resolution than its Shell-only and non-interactive RAG baselines. Its ablations report sensitivity to search presentation, edit tooling, linting guardrails, viewer window size, and retained observation history.
- **What Agentless directly supports**: A fixed localization → repair → validation pipeline can be competitive without allowing the LLM to choose future actions or operate complex tools. Its ablations attribute gains to hierarchical localization choices, multiple location/patch samples, regression filtering, and generated reproduction-test filtering.
- **Not a controlled head-to-head causal comparison**: The papers use different systems, model versions, inference procedures, costs, and evaluation snapshots. SWE-agent’s principal reported setup uses GPT-4 Turbo and Claude 3 Opus; Agentless uses GPT-4o and extensive sampling. Total resolve-rate differences cannot be attributed solely to “interaction” versus “localization.”
- **Benchmark/setup differences must remain explicit**: SWE-agent reports full SWE-bench plus SWE-bench Lite and ACI ablations; Agentless centers on SWE-bench Lite, adds later leaderboard rows, and constructs additional filtered evaluations. Table rows from different dates and disclosure levels are not interchangeable replications.
- **Agentless is not a one-shot baseline**: It performs multiple LLM calls, embedding retrieval, sampled edit locations, 40 candidate patches, generated reproduction tests, regression execution, and reranking. “Agentless” means no autonomous future-action/tool planning, not no orchestration or execution.
- **SWE-agent does not isolate every ACI component independently**: Some design choices were manually developed on selected development examples, and the paper’s own limitations describe manual ACI development and a programmatic-task scope.
- **Register-state limit**: The archived case’s pre-existing SWE-agent register identity is evaluation state supplied by the case, not a claim established by either paper.
- **Bounded analyst inference**: The sources support comparing two different routes to repository-level issue resolution. They do not establish that either interactivity or explicit localization is universally necessary or sufficient.
- **Rendering caveat**: The supplied arXiv HTML-derived text contains duplicated numerals and flattened table tokens. Excerpts preserve the supplied text exactly.
