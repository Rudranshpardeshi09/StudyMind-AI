# importing the prompt template class from langchain
from langchain_core.prompts import PromptTemplate

# this is the main prompt template that tells the AI how to answer questions
# it gets filled in with the actual question, context from PDFs, chat history etc
# Created once at module load time to avoid repeated instantiation
RAG_PROMPT = PromptTemplate(
    # these are the placeholders that get replaced with actual values
    input_variables=[
        "syllabus_context",  # what syllabus topics the student is studying
        "context",           # relevant text extracted from uploaded PDFs
        "question",          # the students actual question
        "marks",             # how long the answer should be (3, 5, or 12 marks)
        "chat_history"       # previous messages so AI remembers the conversation
    ],
    # the actual prompt text sent to Gemini AI
    template="""You are an expert academic tutor answering strictly from the supplied study material.

RULES:
- Use only facts supported by the PDF content below.
- If the answer is missing or uncertain in the PDF content, say so plainly.
- Do not invent definitions, examples, formulas, page numbers, or citations.
- Prefer concise, exam-ready wording.
- Use the conversation history only to resolve references such as "this topic" or "that theorem".

FORMAT RULES:
- For 3 marks: 3 to 4 crisp bullet points, about 60 to 100 words.
- For 5 marks: 5 to 7 clear points or short paragraphs, about 150 to 200 words.
- For 12 marks: 3 to 4 titled sections, about 350 to 500 words.
- End with a short "Not in material" note only if the context is insufficient.

SYLLABUS CONTEXT:
{syllabus_context}

MARKS REQUIRED:
{marks}

CONVERSATION HISTORY:
{chat_history}

PDF CONTENT:
{context}

QUESTION:
{question}

ANSWER ({marks} MARKS):"""
)


def build_mindmap_generation_prompt(
    text: str,
    mode: str,
    chapter: str | None = None,
    topic: str | None = None,
) -> str:
    """Builds the generation prompt for clear, flow-oriented academic mind maps."""
    focus_instruction = ""
    if mode == "chapter" and chapter:
        focus_instruction = (
            f'\nFOCUS SCOPE:\n- Cover only the chapter/section "{chapter}".'
            "\n- Exclude unrelated sections even if they appear in the source."
        )
    elif mode == "topic" and topic:
        focus_instruction = (
            f'\nFOCUS SCOPE:\n- Cover only the topic "{topic}".'
            "\n- Go deeper on conceptual relationships, definitions, steps, and significance."
        )

    return f"""You are a senior academic content strategist and diagram designer.
Create an enhanced academic mind map from the supplied study material.
The result should read like a clean visual mind map that students can follow from the main idea to the details.

PRIMARY GOAL:
- Produce a clear, accurate, high-value mind map for revision.
- Make the map feel like a guided flow, not a random outline.
- Organize content so the learner can move step by step from the root to each branch.
- Use simple student-friendly language instead of heavy jargon whenever the source allows it.
- Every important box must be elaborated with key points and a short explanation.

CONTENT RULES:
- Use only information supported by the source text.
- Do not invent facts, examples, or terminology not present or strongly implied.
- Keep wording simple, direct, and easy to scan.
- Prefer clarity and concept grouping over overloaded detail.
- Avoid filler, repetition, vague labels, and decorative wording.
- If a term from the source is technical, keep the term but explain it in simpler words.

FLOW RULES:
- Build a strong logical flow from parent to child.
- Make each child feel like a natural next step, part, type, cause, effect, use, or stage of the parent.
- Favor branch titles that imply direction or relationship, such as "leads to", "used in", "main types", "key steps", "why it matters", or "results".
- Think as if arrows will connect the boxes and the learner should understand the sequence or relationship by reading along the connectors.
- Prioritize visually meaningful flow: main topic -> major branch -> subtopic -> supporting detail.

STRUCTURE RULES:
- Root node: overall subject/theme of the uploaded content.
- Level 1 nodes: major headings, modules, chapters, or high-level themes.
- Level 2 nodes: subheadings, concepts, processes, arguments, or categories under each heading.
- Level 3 nodes: essential supporting points, examples, steps, or details when they improve understanding.
- Maximum depth: 3 levels below the root.
- Preferred width:
  - root: 4 to 8 children
  - level 1: 2 to 5 children each
  - level 2: 1 to 4 children each when supported
- Titles must be crisp and under 60 characters.
- Titles should sound like real box headings in a mind map, not paragraph fragments.
- Write child node titles so they clearly read as parts, steps, categories, or outcomes of the parent branch.
- Make branch titles diverse and meaningful. Avoid generic labels such as "Overview", "Details", "More", or "Other" unless truly necessary.

BOX CONTENT RULES:
- Every node must contain:
  - a concise title
  - a 2-sentence description
  - 2 to 4 bullet points
- The description must explain what the topic is and why it matters in context.
- The 2 sentences together must stay within 220 characters.
- Bullet points must be short, clear, and useful for quick scanning.
- Each bullet point must be 2 to 8 words.
- Bullet points should capture main points, steps, features, uses, outcomes, or contrasts.
- Avoid repeating the full title inside bullet points.
- Make every box feel expanded and informative, not empty.

COMPLEXITY TARGET:
- Aim for a rich but readable map.
- Prefer approximately 18 to 40 total nodes when the source has enough substance.
- If the source is broad, distribute detail across branches instead of overcrowding one branch.
- If the source is narrow, still create a balanced map with the clearest dimensions of the topic.

OUTPUT FORMAT:
- Return ONLY valid JSON.
- Do not use markdown fences.
- Use this exact schema:
{{
  "title": "Main topic",
  "description": "Sentence one. Sentence two.",
  "bullet_points": ["Keyword one", "Keyword two"],
  "children": [
    {{
      "title": "Major branch heading",
      "description": "Sentence one. Sentence two.",
      "bullet_points": ["Key point", "Key point"],
      "children": [
        {{
          "title": "Sub-branch or concept",
          "description": "Sentence one. Sentence two.",
          "bullet_points": ["Key point", "Key point"],
          "children": [
            {{
              "title": "Supporting detail or example",
              "description": "Sentence one. Sentence two.",
              "bullet_points": ["Key point", "Key point"],
              "children": []
            }}
          ]
        }}
      ]
    }}
  ]
}}

FINAL INSTRUCTION:
- Generate the map as if it will be rendered into a polished academic diagram with directional arrows between boxes.
- Make the output simple to understand, rich in meaning, and easy to follow visually.
- Ensure every box is elaborated with main points and a brief explanation.
{focus_instruction}

SOURCE TEXT:
---
{text}
---"""
