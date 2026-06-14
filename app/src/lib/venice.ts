import OpenAI from 'openai'
import type { ParsedRules, VeniceReasoning, HardConstraint } from './types'
import { VENICE_API_URL, VENICE_MODEL } from './constants'

function getClient() {
  return new OpenAI({
    baseURL: VENICE_API_URL,
    apiKey: process.env.VENICE_API_KEY || '',
  })
}

// Parse natural language rules into structured constraints
export async function parseRules(naturalLanguageRules: string): Promise<ParsedRules> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: VENICE_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a rule parser for an autonomous wallet agent. Given natural language rules from a user, parse them into structured constraints.

Output JSON with exactly this shape:
{
  "hardConstraints": [
    { "type": "budget", "description": "...", "value": <number in USD> },
    { "type": "perTxCap", "description": "...", "value": <number in USD> },
    { "type": "allowedTargets", "description": "...", "value": ["list of allowed contract categories"] },
    { "type": "timeWindow", "description": "...", "value": <seconds> },
    { "type": "blockedActions", "description": "...", "value": ["list of blocked action types"] }
  ],
  "softPreferences": [
    "Preference 1 as a clear instruction",
    "Preference 2 as a clear instruction"
  ]
}

Hard constraints become on-chain caveats (budget caps, time windows, target restrictions).
Soft preferences become reasoning guidance for the agent's AI.

Output ONLY valid JSON, no markdown fences.`,
      },
      {
        role: 'user',
        content: naturalLanguageRules,
      },
    ],
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content || '{}'

  try {
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''))
    return parsed as ParsedRules
  } catch {
    // Fallback: return sensible defaults
    return {
      hardConstraints: [
        { type: 'budget', description: 'Weekly budget limit', value: 2 },
        { type: 'timeWindow', description: '7-day delegation window', value: 604800 },
      ],
      softPreferences: [naturalLanguageRules],
    }
  }
}

// Governor reasoning: analyze task + rules + context -> decision
export async function governorReason(
  task: string,
  rules: ParsedRules,
  context: string,
): Promise<VeniceReasoning> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: VENICE_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are the Governor agent for an autonomous wallet. You reason about tasks in the context of user-defined rules.

Your rules (hard constraints - enforced on-chain):
${rules.hardConstraints.map((c: HardConstraint) => `- ${c.type}: ${c.description} (${JSON.stringify(c.value)})`).join('\n')}

Your preferences (soft guidance):
${rules.softPreferences.map((p: string) => `- ${p}`).join('\n')}

For each task:
1. Analyze the task against rules
2. Decide: approve (safe, within rules), reject (violates rules), or escalate (needs user ClearSign)
3. Explain your reasoning step by step

Think step by step inside <think> tags, then provide your decision.

Output JSON:
{
  "decision": "approve" | "reject" | "escalate",
  "reasoning": "Plain English summary of why",
  "thinkTrace": "Your step-by-step thinking process",
  "confidence": 0.0-1.0,
  "cost": <estimated cost in USD>,
  "rulesCited": ["which rules apply"]
}

Output ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Task: ${task}\n\nContext from research:\n${context}`,
      },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content || '{}'

  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '')) as VeniceReasoning
  } catch {
    return {
      decision: 'escalate',
      reasoning: 'Could not parse reasoning. Escalating to user for ClearSign.',
      thinkTrace: content,
      confidence: 0.5,
      cost: 0.001,
      rulesCited: [],
    }
  }
}

// Researcher: fetch and process data (simulated x402 call)
export async function researchData(query: string): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: VENICE_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a research agent. Given a research query, provide detailed, factual information. Focus on:
- On-chain data and metrics
- Protocol activity and trends
- Grant program details and funding
- Ecosystem growth indicators

Provide raw, detailed data that can be summarized later. Be specific with numbers and examples.`,
      },
      {
        role: 'user',
        content: query,
      },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  })

  return response.choices[0]?.message?.content || 'No data available.'
}

// Summarizer: compress research data into concise summary
export async function summarizeData(rawData: string): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: VENICE_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a summarization agent. Compress the provided research data into a concise, structured summary of 200 words or less. Include:
- Key findings (3-5 bullet points)
- Relevant metrics
- Risk assessment (low/medium/high)
- Recommended action

Be factual and precise. Do not add information not in the source data.`,
      },
      {
        role: 'user',
        content: rawData,
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
  })

  return response.choices[0]?.message?.content || 'Summary unavailable.'
}

// ClearSign: convert decision to plain English explanation
export async function explainForClearSign(
  task: string,
  reasoning: VeniceReasoning,
): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: VENICE_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are the ClearSign explanation engine. Convert an agent's decision into a clear, non-technical explanation for the wallet owner.

Format:
**What:** [1-sentence description of the action]
**Why:** [1-sentence reasoning]
**Cost:** [exact cost]
**Risk:** [low/medium/high with brief explanation]
**Rules applied:** [which user rules were considered]

Keep it under 100 words. Be honest about uncertainties.`,
      },
      {
        role: 'user',
        content: `Task: ${task}\nDecision: ${reasoning.decision}\nReasoning: ${reasoning.reasoning}\nCost: $${reasoning.cost}\nRules cited: ${reasoning.rulesCited.join(', ')}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || reasoning.reasoning
}
