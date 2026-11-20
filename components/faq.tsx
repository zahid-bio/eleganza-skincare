export const questions = [
  {
    q: "How do I track an order?",
    a: "Open Track Order and enter the order number and email used at checkout. If a carrier link has been added to your order, it will appear there.",
    link: "/track-order",
    label: "Track an order",
  },
  {
    q: "Where can I find ingredient and shade information?",
    a: "Check the Ingredients and Size & shades sections on each product page. The preview uses concept imagery. Confirmed formulas and shade names will be added after approval.",
    link: "/ingredients-and-safety",
    label: "Ingredients & safety",
  },
  {
    q: "What are your shipping and return policies?",
    a: "The store is in preview. The store team will publish delivery destinations, processing times and return eligibility before opening live checkout.",
    link: "/shipping-policy",
    label: "Shipping & delivery",
  },
  {
    q: "Can I change or cancel an order?",
    a: "Send a support request with your order number and the change you have in mind. Available options depend on the order’s fulfillment status.",
    link: "/contact",
    label: "Contact support",
  },
  {
    q: "Where does face oil fit in my routine?",
    a: "In our three-step edit, face oil comes before complexion makeup. Follow the final directions on the product label when available.",
    link: "/products/radiance-renewal-face-oil",
    label: "Explore face oil",
  },
];

export function FAQ({ limit = questions.length }: { limit?: number }) {
  return (
    <div className="faq-list">
      {questions.slice(0, limit).map(({ q, a, link, label }) => (
        <details key={q}>
          <summary>
            {q}
            <span aria-hidden="true"></span>
          </summary>
          <div>
            <p>{a}</p>
            <a href={link} className="underline-link">
              {label}
            </a>
          </div>
        </details>
      ))}
    </div>
  );
}
