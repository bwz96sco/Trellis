# C8 Shared Source Bundle: Interface, Context, Staging, and Execution Records

- **Date**: 2026-08-25
- **Cases**: `ideation-01`, `ideation-02`, `evaluation-01`
- **Purpose**: Small shared evidence set for tool-disabled one-turn runs. It supplies exact paper text relevant to compact feedback, guardrails, context pressure, fixed-stage execution, observed agent trajectories, and execution records without pretending these papers define Trellis authority or replay semantics.
- **Authentication rule**: SHA-256 values identify the exact supplied source files. Excerpt bodies preserve source line text verbatim, excluding original line terminators.

## Source identities

| Source file | Paper identity | Canonical URL | Source-file SHA-256 |
|---|---|---|---|
| `/tmp/c8-swe-agent.md` | Yang et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering* (arXiv:2405.15793) | <https://arxiv.org/abs/2405.15793> | `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63` |
| `/tmp/c8-agentless.md` | Xia et al., *Agentless: Demystifying LLM-based Software Engineering Agents* (arXiv:2407.01489) | <https://arxiv.org/abs/2407.01489> | `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e` |
| `/tmp/c8-lost-middle.md` | Liu et al., *Lost in the Middle: How Language Models Use Long Contexts* (arXiv:2307.03172) | <https://arxiv.org/abs/2307.03172> | `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740` |

## Exact excerpts

### ACI scope, state communication, and history management

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

### Simple actions, compactness, concise feedback, and guardrails

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

### Concrete context-management behavior

- **Provenance**: `/tmp/c8-swe-agent.md:136-144`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="136" end="144" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
Context management.
The SWE-agent system uses informative prompts, error messages, and history processors to keep agent context concise and informative.
Agents receive instructions, documentation, and demonstrations on the correct use of bash and ACI commands.
At each step, the system instructs them to generate both a *thought* and an *action* [[62](#bib.bib62)].
Malformed generations trigger an error response, shown in Figure [32](#A3.F32 "Figure 32 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), asking the agent to try again, which is repeated until a valid generation is received.
Once received, all past error messages except the first are omitted.

The agent’s environment responses display computer output using the template shown in Figure [30](#A3.F30 "Figure 30 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"); however, if no output is generated, a specific message (“Your command ran successfully and did not produce any output”) is included to enhance clarity. To further improve context relevance, observations preceding the last 55 are each collapsed into a single line, shown in Figure [31](#A3.F31 "Figure 31 ‣ Appendix C Prompts ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
By removing most content from prior observations, we maintain essential information about the plan and action history while reducing unnecessary context, which allows for more interaction cycles and avoids showing outdated file information. §[A](#A1 "Appendix A SWE-agent Design ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") provides further implementation details.
```

### Interface-result and ablation evidence

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

### Observed trajectory patterns, recovery, and budget behavior

- **Provenance**: `/tmp/c8-swe-agent.md:296-325`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="296" end="325" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
Reproduction and/or localization is the first step.
SWE-agent usually begins with either writing reproduction code and/or localizing the issue’s cause to specific lines of code.
As shown in Figure [8](#S5.F8 "Figure 8 ‣ 5.2 Analysis of Agent Behavior ‣ 5 Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), all trajectories begin with either create (reproduction) or find\_file/search\_dir (localization).
To reproduce, models will create a new file, add reproduction code to it with an edit, then run with python; this is the most popular triple of actions in Table [8](#A2.T8 "Table 8 ‣ B.3.1 Turns to Resolution ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
Using this feedback along with file names and symbols in the issue description, an agent will start with a broad, directory-level keyword search, before then zooming into specific files and lines.
This is reflected in Figure [22](#A2.F22 "Figure 22 ‣ B.3.3 Breakdowns of Action Sequences ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), where the most likely actions following localization sequences like (python, find\_file) and (search\_dir, open) are search\_file and goto, indicative of how an agent “zooms in" on a bug.
Extensive analysis on correlations between different groups of actions are discussed in §[B.3.3](#A2.SS3.SSS3 "B.3.3 Breakdowns of Action Sequences ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering")

Remaining turns are mostly “edit, then execute" loops.
As exhibited in Figure [8](#S5.F8 "Figure 8 ‣ 5.2 Analysis of Agent Behavior ‣ 5 Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), from turn 55 onwards, the most frequent two actions for all turns are edit and python.
Captured as high probability next actions following (edit, python) in Figure [22](#A2.F22 "Figure 22 ‣ B.3.3 Breakdowns of Action Sequences ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), additional localization operations are often interspersed across these later turns, where agents might look at more in-file code with search\_file, scroll\_up/down, or other files altogether with search\_dir, find\_file.
This behavior usually arises in response to new information from re-running the reproduction script.
Submissions are distributed normally from turn 1010 onwards, although resolved task instances correlate more with earlier submits (see §[B.3.1](#A2.SS3.SSS1 "B.3.1 Turns to Resolution ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering")).
A walk-through of common trajectory phases is in §[B.3.2](#A2.SS3.SSS2 "B.3.2 Walkthrough of Trajectory Phases ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").

Editing remains challenging for agents.
A non-trivial minority of edit actions raise a linting error; out of 2​t​r​u​e​2942true294 task instances, 1​t​r​u​e​1851true185 (51.751.7%) of SWE-agent w/ GPT-4 Turbo trajectories have 11+ failed edits.
While agents generally recover more often than not from failed edits, the odds of recovery decrease as the agent accumulates more failed edits.
Recovery refers to a sequence of consecutive failed edits followed immediately by a successful edit.
Any attempt at editing has a 90.590.5% chance of eventually being successful.
This probability drops off to 57.257.2% after a single failed edit.
More editing phenomena are discussed in §[B.3.3](#A2.SS3.SSS3 "B.3.3 Breakdowns of Action Sequences ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"), and data about agents’ generated fixes are in §[B.6](#A2.SS6 "B.6 Patch Generations ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").

Agents succeed quickly and fail slowly.
We find that runs submitted relatively early are much more likely to be successful compared to those submitted after a larger number of steps or cost.
We show in Table [15](#A2.F15 "Figure 15 ‣ B.3 Trajectory Analysis ‣ Appendix B Extended Results ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering") the distribution of resolved and unresolved instances, including only instances that did not exhaust their budget.
We observe that successful runs complete earlier and at a cheaper cost than unsuccessful ones.
In general, successful instances solved by SWE-agent w/ GPT 4 finish with a median cost of $1.211.21 and 1212 steps compared to a mean of $2.522.52 and 2121 steps for unsuccessful ones.
Furthermore, we find that 93.093.0% of resolved instances are submitted before exhausting their cost budget, compared to 69.069.0% of instances overall.
For these reasons, we suspect that increasing the maximum budget or token limit are unlikely to substantially increase performance.
```

### Environment, agent, and logging artifacts

- **Provenance**: `/tmp/c8-swe-agent.md:527-545`
- **Source SHA-256**: `d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63`

<!-- C8-EXCERPT source="/tmp/c8-swe-agent.md" start="527" end="545" sha256="d5c73827ab93b99bbda49c2e26eb2c70750a33471bd3fbbb1c0cccaa0af8ef63" -->
```text
The SWE-agent codebase is generally composed of three modules: the environment, the agent, and the logging mechanism for saving task episodes into trajectories and patch generations.

Environment.
The SWE-agent environment is heavily influenced by the InterCode library [[59](#bib.bib59)].
For the general pipeline of agent interactions with the environment, our work directly adopts InterCode’s interactive coding task formulation.
The environment integrates large parts of the interaction handling logic from the InterCode-Bash environment, which is essentially the Shell-only setting referenced in the paper.
As a part of this adoption, SWE-agent also uses Docker containers to ensure reproducible and safe execution.
Because of this, SWE-agent’s infrastructure makes it easy for a user to swap out the Dockerfile (a domain specific language for defining a container) to support other codebases and programming languages beyond the scope of SWE-bench task instances.
One difference is that SWE-agent makes minor adjustments to the underlying communication logic that transfers actions and observations between the Docker container and agent entity.

Agent.
Beyond serving as an agentic wrapper for facilitating multi-turn queries from an LM, the agent module defines the functions that render the ACI (e.g., context management, commands, interface logic, input/output format) and supports inference for closed/open, API-based/local language models.
The main workflow is to define an interface as a class and/or set of commands, which can then be specified via a configuration file, discussed more thoroughly in Section [A.3](#A1.SS3 "A.3 Configuration ‣ Appendix A SWE-agent Design ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").
The commands for the top performing SWE-agent with GPT 4 configuration are shown in Table [4](#A1.T4 "Table 4 ‣ File viewer. ‣ A.1 ACI Design ‣ Appendix A SWE-agent Design ‣ SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering").

Logging.
For each task episode, the main artifacts produced are the trajectory, which contains a history of the interactions between the agent and environment, and the final patch generation, which can represents a summary of the changes proposed by the agent during the interaction.
The patch generation can be used directly for SWE-bench [[20](#bib.bib20)] evaluation.

```

### Risks of autonomous tool/planning loops and fixed-stage alternative

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

### Explicit staged execution flow

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

### Agentless boundary: staged procedure without autonomous decision-making

- **Provenance**: `/tmp/c8-agentless.md:318-324`
- **Source SHA-256**: `128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e`

<!-- C8-EXCERPT source="/tmp/c8-agentless.md" start="318" end="324" sha256="128772df83ad3157c6cd68558ecd7a304178602b72e9b15292b2928ad393ee1e" -->
```text
Agentless solves repository-level issues using a simple step-by-step procedure.
We note here that none of the techniques used by Agentless in isolation are revolutionary,
but instead Agentless smartly combines existing techniques to construct an easy-to-understand approach.
Different from prior autonomous agent-based tools that involve complex interactions with the environment, Agentless uses a simplistic three-phase approach to localize, repair, and validate without relying on any agents for decision-making.
By conducting localization in a hierarchical manner, Agentless can efficiently and effectively compute the fine-grained locations for editing.
Agentless then performs repair by sampling multiple patches using a simple diff format.
Agentless’s patch validation approach can further aid the patch selection process by producing reproduction tests that can help verify if the issue is fixed.
```

### Long-context trade-off and evaluation criterion

- **Provenance**: `/tmp/c8-lost-middle.md:52-56`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="52" end="56" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
Our results indicate that prompting language models with longer input contexts is a trade-off—providing the language model with more information may help it perform the downstream task, but it also increases the amount of content that the model must reason over, potentially decreasing accuracy.
To better understand this trade-off in practice, we perform a case study with retriever-reader models on open-domain question answering (§[5](#S5 "5 Is More Context Is Always Better? A Case Study With Open-Domain QA ‣ Lost in the Middle: How Language Models Use Long Contexts")). In contrast to our controlled multi-document QA task, where the context always contains exactly *one* document that answers the question, none or many of the top kk documents may contain the answer in the open-domain QA setting.
When retrieving from Wikipedia to answer queries from NaturalQuestions-Open, we find that model performance saturates long before retriever recall saturates, indicating that current models fail to effectively use additional retrieved documents—using 50 documents instead of 20 retrieved documents only marginally improves performance (∼\sim1.5% for GPT-3.5-Turbo and ∼\sim1% for claude-1.3).

Our analysis provides a better understanding of how language models use their input context and introduces new evaluation protocols for future long-context models; to claim that a language model can robustly use information within long input contexts, it is necessary to show that its performance is minimally affected by the position of the relevant information in the input context (e.g., minimal difference in best- and worst-case performance).
```

### Position sensitivity and extended-context limitation

- **Provenance**: `/tmp/c8-lost-middle.md:131-139`
- **Source SHA-256**: `8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740`

<!-- C8-EXCERPT source="/tmp/c8-lost-middle.md" start="131" end="139" sha256="8cdbbd8205d9d79ee6f15d2fbe7de8cc1af0a8dcdb4af1636cc6e61b50fe5740" -->
```text
#### Model performance is highest when relevant information occurs at the beginning or end of its input context.

As illustrated in Figure [5](#S2.F5 "Figure 5 ‣ 2.1 Experimental Setup ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts"), changing the position of relevant information in the input context leads to substantial decreases in model performance. In particular, we see a distinctive U-shaped performance curve—models are often much better at using relevant information that occurs at the very beginning (primacy bias) and very end of contexts (recency bias), and suffer degraded performance when forced to use information within the middle of its input context. For example, GPT-3.5-Turbo’s multi-document QA performance can drop by more than 20%—in the worst case, performance in 20- and 30-document settings is lower than performance without *any* input documents (i.e., closed-book performance; 56.1%).
These results indicate that current models cannot effectively reason over their entire context window when prompted for downstream tasks.

#### Extended-context models are not necessarily better at using input context.

When the input context fits in the context window of both a model and its extended-context counterpart, we see that performance between them is nearly identical. For example, the 10- and 20-document settings both fit in the context window of GPT-3.5-Turbo and GPT-3.5-Turbo (16K), and we observe that their performance as a function of position of relative information is nearly superimposed (solid purple and dashed brown series in Figure [5](#S2.F5 "Figure 5 ‣ 2.1 Experimental Setup ‣ 2 Multi-Document Question Answering ‣ Lost in the Middle: How Language Models Use Long Contexts")). These results indicate that extended-context models are not necessarily better than their non-extended counterparts at using their input context.

```

## Case-specific use and explicit claim limits

### `ideation-01`

- **Supported use**: Ground candidate mechanisms in evidence that simple actions, compact output, informative feedback, bounded views/history, and edit guardrails affected agent behavior or reported performance.
- **Unsupported inference**: These papers do not test Trellis deterministic refusal messages, exact JSON failures, fail-closed command semantics, provider neutrality, or the requested stop boundary. They cannot establish which candidate should be generated, ranked, or selected.

### `ideation-02`

- **Supported use**: Ground candidate mechanisms involving explicit stage boundaries, concise state/context presentation, trajectory records, and avoidance of open-ended autonomous action selection.
- **Unsupported inference**: The papers do not establish exact package identity, workflow-node identity, Activation/Approval identity, one canonical writer, replay equivalence, human H1/H2 scientific authority, or cross-arm contamination controls. A fixed three-phase paper pipeline is not evidence that a Trellis gate may be inferred or advanced.

### `evaluation-01`

- **Supported use**: Attack the general plausibility and failure modes of interaction-heavy execution, inferred process state, fixed staged workflows, context retention, and trajectory/log artifacts.
- **Unsupported inference**: SWE-agent trajectories and patch artifacts are not shown to be append-only, canonical, sufficient for interruption recovery, or authoritative. Agentless’s fixed stages do not validate Trellis event kinds. Neither paper supports inferring gates or completion from provider telemetry.
- **Decision boundary**: These sources cannot select or block C1, C2, or C3 and cannot replace the archived case’s approved project evidence. They are contextual literature only; candidate closure and authority remain with the root/operator described by the case.

## Shared limits

- The papers study repository-level software engineering and long-context language-model behavior, not Trellis Research governance.
- No excerpt establishes append-only semantics, canonical-event schemas, provider-neutral telemetry, package digests, replay-safe corrections, or human scientific gate ownership.
- Reported correlations and ablations can motivate assumptions and cheap tests, but cannot be promoted into project-contract claims.
- The supplied arXiv HTML-derived text contains duplicated numerals and flattened tokens; excerpts preserve the supplied text exactly.
