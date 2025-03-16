export const pricingPlans = [
  {
    name: "Basic",
    price: "9.00",
    points: 100,
    priceId: "price_1R35BuIKDonpeEVvjZvdF1Vm",
    features: [
      "100 AI-generated posts per month",
      "Twitter thread generation",
      "Basic analytics",
    ],
  },
  {
    name: "Pro",
    price: "29.00",
    points: 500,
    priceId: "price_1R35EdIKDonpeEVvfVwSwyEc",
    features: [
      "500 AI-generated posts per month",
      "Twitter, Instagram, and LinkedIn content",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceId: null,
    features: [
      "Unlimited AI-generated posts",
      "All social media platforms",
      "Custom AI model training",
      "Dedicated account manager",
    ],
  },
];

export const findPriceById = (priceId: string) => {
  return pricingPlans.find((plan) => plan.priceId === priceId);
};
