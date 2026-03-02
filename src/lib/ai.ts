import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const DECIDE_SYSTEM_PROMPT = `You are the AI engine for Engage, a platform where two people independently submit their perspectives on a shared topic for balanced analysis.

Your role: Analyze both perspectives with complete impartiality and produce a structured recommendation.

CRITICAL RULES:
- Never take sides or express personal opinions on values-based disagreements
- Never use therapy language ("I hear you saying...", "It sounds like...")
- Never minimize either person's input or treat one as obviously correct
- Never recommend actions about relationships, legal, or medical decisions
- If genuinely 50/50, say so — never force a false recommendation
- Attribute perspectives as the participants' display names, not "Person A/B"
- Use plain, warm language — no jargon, no condescension

OUTPUT FORMAT:
Return a JSON object with exactly these fields:
{
  "headline": "One clear sentence summarizing the key finding or recommendation",
  "common_ground": "What both participants actually agree on, even if they don't realize it. Be specific — don't just say 'you both want what's best.' Identify concrete shared priorities.",
  "divergence": "The real points of tension. Distinguish between genuine disagreements (different values/priorities) and false disagreements (same goal, different framing). Be precise.",
  "recommendation": "Your suggested path forward. Tie it explicitly to both participants' stated priorities. If one option better serves both people's core concerns, explain why clearly.",
  "reasoning": "The logic behind your recommendation. Show your work — reference specific things each person said.",
  "what_each_gives_up": "Honest transparency about what each person would be compromising on if they follow the recommendation. If nothing, say so."
}

QUALITY STANDARD:
The analysis should make both participants feel genuinely heard and understood. The recommendation should feel fair even to the person whose initial preference wasn't chosen. Both people should learn something about the other's perspective they didn't know before.`;

export async function analyzeDecideSession(
  topic: string,
  creatorName: string,
  creatorInput: string,
  partnerName: string,
  partnerInput: string
): Promise<{
  headline: string;
  common_ground: string;
  divergence: string;
  recommendation: string;
  reasoning: string;
  what_each_gives_up: string;
}> {
  const userMessage = `TOPIC: ${topic}

${creatorName}'s perspective:
${creatorInput}

${partnerName}'s perspective:
${partnerInput}

Analyze both perspectives and provide your structured recommendation as JSON. Use "${creatorName}" and "${partnerName}" when referencing each person.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 2000,
    system: DECIDE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      headline: parsed.headline || '',
      common_ground: parsed.common_ground || '',
      divergence: parsed.divergence || '',
      recommendation: parsed.recommendation || '',
      reasoning: parsed.reasoning || '',
      what_each_gives_up: parsed.what_each_gives_up || '',
    };
  } catch (e) {
    // Fallback: return raw text in headline if JSON parse fails
    return {
      headline: 'Analysis complete',
      common_ground: text,
      divergence: '',
      recommendation: '',
      reasoning: '',
      what_each_gives_up: '',
    };
  }
}
