const sellerScript = `deploy seller.agent
{
  "goal": "sell_vehicle",
  "vehicle": "BMW 320d / 2019 / 87000km",
  "asking_price_eur": 24500,
  "private_rules": {
    "floor_price_eur": 23900,
    "max_discount_per_round_eur": 100,
    "never_reveal_floor": true
  }
}

connect intention.exchange
publish sell.intent
receive buyer.intent match_score=0.91

offer.round_01 price=24300
offer.round_02 price=24200
accept conditional_basis=24100
request human_approval`;

const buyerScript = `deploy buyer.agent
{
  "goal": "buy_vehicle",
  "accepted_models": ["3 Series", "A4", "C Class"],
  "max_mileage_km": 100000,
  "private_rules": {
    "hard_max_price_eur": 24200,
    "target_price_eur": 24000,
    "never_reveal_max": true
  }
}

connect intention.exchange
subscribe compatible.sell_intents

bid.round_01 price=24000
validate seller_floor protected
bid.round_02 price=24100
return qualified_match briefing`;

const sellerCode = document.querySelector("#sellerCode");
const buyerCode = document.querySelector("#buyerCode");
const filmClock = document.querySelector("#filmClock");
const visualStatus = document.querySelector("#visualStatus");
const visualPrice = document.querySelector("#visualPrice");
const visualNarrative = document.querySelector("#visualNarrative");
const offerNodes = [...document.querySelectorAll("[data-offer-step]")];

const stageMs = 1150;
const holdMs = 1050;
const loopMs = stageMs * 5 + holdMs;
let startedAt = performance.now() - 450;

const negotiationStages = [
  {
    at: 0,
    step: 0,
    status: "seller intent published",
    price: "EUR 24,500",
    narrative: "The seller agent enters the exchange with an asking price and a protected private floor of EUR 23,900."
  },
  {
    at: 0.28,
    step: 1,
    status: "round 01 / seller concession",
    price: "EUR 24,300",
    narrative: "Seller agent reduces by EUR 200 while staying above the private floor."
  },
  {
    at: 0.46,
    step: 2,
    status: "round 02 / buyer counter",
    price: "EUR 24,000",
    narrative: "Buyer agent counters below its hard maximum of EUR 24,200."
  },
  {
    at: 0.64,
    step: 3,
    status: "round 03 / seller moves again",
    price: "EUR 24,200",
    narrative: "Seller agent meets the buyer's protected maximum without exposing private rules."
  },
  {
    at: 0.78,
    step: 4,
    status: "conditional agreement",
    price: "EUR 24,100",
    narrative: "Agents converge at EUR 24,100. Inspection and final approval remain human."
  }
];

function reveal(script, progress) {
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  return script.slice(0, Math.floor(script.length * eased));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function mix(from, to, amount) {
  return from + (to - from) * amount;
}

function renderFilm(now) {
  const elapsed = (now - startedAt) % loopMs;
  const progress = Math.min(1, elapsed / (loopMs - holdMs));
  const stageIndex = Math.min(negotiationStages.length - 1, Math.floor(elapsed / stageMs));
  const stageLocal = Math.min(1, (elapsed - stageIndex * stageMs) / stageMs);
  const moveAmount = easeOutCubic(Math.min(1, stageLocal / 0.42));
  sellerCode.textContent = reveal(sellerScript, progress);
  buyerCode.textContent = reveal(buyerScript, Math.max(0, progress - 0.03));

  const stage = negotiationStages[stageIndex];
  visualStatus.textContent = stage.status;
  visualPrice.textContent = stage.price;
  visualNarrative.textContent = stage.narrative;
  offerNodes.forEach((node) => {
    const nodeStep = Number(node.dataset.offerStep);
    const isActive = nodeStep === stage.step;
    const homeX = Number(node.dataset.homeX);
    const homeY = Number(node.dataset.homeY);
    const restingX = homeX + 21;
    const restingY = homeY + 10;
    const scale = isActive ? mix(0.72, 1.75, moveAmount) : 0.72;
    const x = isActive ? mix(restingX, 249, moveAmount) : restingX;
    const y = isActive ? mix(restingY, 18, moveAmount) : restingY;

    node.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`);
    node.classList.toggle("is-active", isActive);
    node.classList.toggle("is-complete", nodeStep < stage.step);
  });

  const seconds = Math.floor(elapsed / 1000);
  filmClock.textContent = `00:${String(seconds).padStart(2, "0")}`;
}

renderFilm(performance.now());
setInterval(() => renderFilm(performance.now()), 45);
