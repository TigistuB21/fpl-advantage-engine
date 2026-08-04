"""
FPL Advantage Engine - Director of Football (LLM Integration Phase 8)
Generates natural language tactical & mathematical explanations for ILP transfer recommendations using Gemini API.
"""

import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# System Prompt for FPL Director of Football
DIRECTOR_SYSTEM_PROMPT = """You are an elite, highly analytical FPL (Fantasy Premier League) "Director of Football".
Your goal is to evaluate Integer Linear Programming (PuLP) transfer recommendations and chip deployment strategies (Wildcard, Free Hit, Triple Captain, Bench Boost) and present a clear, data-driven briefing to the manager.

You MUST follow these strict guidelines in your response:
1. Direct Rationale: Explain clearly why SELL -> BUY moves and chip deployments are mathematically sound based on model v3.0 Expected Points (xP) over a 5-Gameweek horizon.
2. Player Comparisons: Explicitly reference player names, team shortcodes, prices (£m), and predicted 5-GW xP values.
3. Chip Activation Thresholds:
   - Free Hit: Recommend playing ONLY if net 1-GW xP gain > +15.0 xP over baseline.
   - Triple Captain / Bench Boost: Recommend playing ONLY if net 1-GW xP gain > +10.0 xP over baseline (e.g. during major Double Gameweeks).
   - Gameweek 19 Expiration Rule: Remind the manager that set #1 chips expire at Gameweek 19 deadline, so unused chips must be deployed before GW19.
4. Financial & Penalty Rationale: Discuss remaining bank flexibility and hit penalty impacts if applicable.
5. Tone: Professional, authoritative, tactical, and encouraging — like a Premier League Director of Football briefing the club board.
6. Structure: Organize your response with clear headings/bullet points (Markdown format). Keep it concise, focused, and under 350 words.
"""


def generate_transfer_explanation(squad_context: Dict[str, Any], transfer_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a Director of Football explanation using Gemini API (or rule-based fallback).
    
    :param squad_context: Info about user's manager name, team name, bank balance, free transfers.
    :param transfer_context: Result of PuLP optimizer (transfers, hit_penalty, net_xp_gain, total_expected_points, etc.)
    :return: Dict with explanation, director_name, model_version, and status.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Extract key metrics for prompt context
    manager_name = squad_context.get("player_name", "FPL Manager")
    team_name = squad_context.get("team_name", "My Team")
    bank_m = squad_context.get("bank_m", 0.0)
    free_transfers = squad_context.get("free_transfers", 1)
    
    transfers = transfer_context.get("transfers", [])
    transfers_made = transfer_context.get("transfers_made", 0)
    hits_taken = transfer_context.get("hits_taken", 0)
    hit_penalty = transfer_context.get("hit_penalty", 0.0)
    net_xp_gain = transfer_context.get("net_xp_gain", 0.0)
    total_xp = transfer_context.get("total_expected_points", 0.0)
    remaining_bank = transfer_context.get("remaining_bank", 0.0)
    formation = transfer_context.get("formation", "3-4-3")

    # Format transfers context string
    transfer_details_str = ""
    for idx, t in enumerate(transfers, 1):
        out_p = t.get("transferred_out", {})
        in_p = t.get("transferred_in", {})
        
        out_name = out_p.get("web_name", "Player Out")
        out_team = out_p.get("team_short", "UNK")
        out_cost = out_p.get("price_m", 0.0)
        out_xp = out_p.get("predicted_xp", 0.0)
        
        in_name = in_p.get("web_name", "Player In")
        in_team = in_p.get("team_short", "UNK")
        in_cost = in_p.get("price_m", 0.0)
        in_xp = in_p.get("predicted_xp", 0.0)
        
        xp_delta = round(in_xp - out_xp, 2)
        transfer_details_str += (
            f"  - Transfer #{idx}: SELL {out_name} ({out_team}, £{out_cost}m, {out_xp:.1f} xP) -> "
            f"BUY {in_name} ({in_team}, £{in_cost}m, {in_xp:.1f} xP) [xP Delta: +{xp_delta}]\n"
        )

    user_prompt = f"""
Manager: {manager_name} (Team: "{team_name}")
Initial Bank: £{bank_m:.1f}m | Free Transfers: {free_transfers}

PU-LP SOLVER OPTIMIZATION RESULT (5-Gameweek Horizon, Model v3.0):
- Transfers Recommended ({transfers_made}):
{transfer_details_str if transfer_details_str else "  - No transfers recommended."}
- Hits Taken: {hits_taken} (Penalty: -{hit_penalty:.1f} pts)
- Net Expected Points (xP) Gain (after hit penalty): +{net_xp_gain:.1f} xP
- Total Squad 5-GW Expected Points: {total_xp:.1f} xP
- Post-Transfer Formation: {formation}
- Remaining Bank: £{remaining_bank:.1f}m

Please provide your Director of Football briefing explaining why this transfer plan is optimal for the team's long-term success.
"""

    if api_key and api_key.strip():
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key.strip())
            
            # Try active Gemini model identifiers in order
            model_candidates = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
            model = None
            selected_model_name = "gemini-2.0-flash"
            
            for m_name in model_candidates:
                try:
                    model = genai.GenerativeModel(
                        model_name=m_name,
                        system_instruction=DIRECTOR_SYSTEM_PROMPT
                    )
                    selected_model_name = m_name
                    break
                except Exception:
                    continue

            if model:
                response = model.generate_content(user_prompt)
                explanation_text = response.text.strip()
                
                return {
                    "explanation": explanation_text,
                    "director_name": "Sir Alex Data - FPL Director of Football",
                    "model_version": f"Gemini ({selected_model_name}) + ILP Solver v3.0",
                    "is_fallback": False,
                }
        except Exception as e:
            logger.warning(f"Gemini API call failed, switching to rule-based explanation fallback: {e}")
        except Exception as e:
            logger.warning(f"Gemini API call failed, switching to rule-based explanation fallback: {e}")

    # Rule-based fallback explanation when GEMINI_API_KEY is not set or fails
    fallback_text = _generate_fallback_explanation(
        manager_name=manager_name,
        team_name=team_name,
        transfers=transfers,
        net_xp_gain=net_xp_gain,
        hits_taken=hits_taken,
        hit_penalty=hit_penalty,
        remaining_bank=remaining_bank,
        formation=formation
    )

    return {
        "explanation": fallback_text,
        "director_name": "Sir Alex Data - FPL Director of Football",
        "model_version": "Rule-Based Director Heuristic v3.0",
        "is_fallback": True,
    }


def _generate_fallback_explanation(
    manager_name: str,
    team_name: str,
    transfers: List[Dict[str, Any]],
    net_xp_gain: float,
    hits_taken: int,
    hit_penalty: float,
    remaining_bank: float,
    formation: str
) -> str:
    """Generates structured tactical explanation when Gemini API key is offline."""
    if not transfers:
        return f"### Director's Rationale for {team_name}\n\nOur optimization model recommends **HOLDING** your current squad this week. Your 15 players maintain strong expected returns over the next 5 Gameweeks, and saving your transfer maximizes flexibility for upcoming fixture shifts."

    lines = [f"### 📋 Executive Briefing for {manager_name} ({team_name})", ""]
    lines.append(f"**Strategic Rationale (5-GW Model v3.0)**")
    lines.append(f"The Integer Linear Programming solver has identified an opportunity to increase your team's total output by **+{net_xp_gain:.1f} net Expected Points (xP)** across the next 5 Gameweeks in a **{formation}** setup.")
    lines.append("")
    lines.append("**Key Transfer Moves:**")
    
    for idx, t in enumerate(transfers, 1):
        out_p = t.get("transferred_out", {})
        in_p = t.get("transferred_in", {})
        out_name = out_p.get("web_name", "Player Out")
        in_name = in_p.get("web_name", "Player In")
        out_xp = out_p.get("predicted_xp", 0.0)
        in_xp = in_p.get("predicted_xp", 0.0)
        delta = in_xp - out_xp
        
        lines.append(f"- **Transfer {idx}:** Sell **{out_name}** (£{out_p.get('price_m', 0.0)}m, {out_xp:.1f} xP) ➔ Buy **{in_name}** (£{in_p.get('price_m', 0.0)}m, {in_xp:.1f} xP) -> **+{delta:.1f} xP Gain**")

    lines.append("")
    lines.append("**Financial & Hit Analysis:**")
    if hits_taken > 0:
        lines.append(f"- Taken **{hits_taken} hit (-{hit_penalty:.1f} pts penalty)**. The model calculated that the incoming player's projected 5-GW score easily outweighs this upfront cost.")
    else:
        lines.append("- Executed cleanly within your **Free Transfers** allowance without incurring hit penalties.")
    lines.append(f"- Retaining **£{remaining_bank:.1f}m** remaining in the bank for future price changes.")

    lines.append("")
    lines.append("**Director's Verdict:** This transfer structure strictly optimizes risk-adjusted returns over the 5-Gameweek horizon. I strongly recommend executing this plan.")

    return "\n".join(lines)
