/** Stored in Application.customerUpdateReason (customer portal landing). */
export type CustomerApplicationReasonKey =
  | "simple_correction"
  | "change_owner_purchase"
  | "change_owner_inheritance";

export function getCustomerApplicationCategoryDisplay(key: string | null | undefined): {
  title: string;
  subtitle: string;
} | null {
  if (!key || typeof key !== "string") return null;
  switch (key) {
    case "simple_correction":
      return {
        title: "Correct my information (same owner)",
        subtitle: "Small fixes like typos or missing middle name.",
      };
    case "change_owner_purchase":
      return {
        title: "Change owner – I bought this house / moved in",
        subtitle: "Transfer service to a new owner or occupant.",
      };
    case "change_owner_inheritance":
      return {
        title: "Change owner – inheritance / legal transfer",
        subtitle: "Ownership changed due to inheritance or legal decision.",
      };
    default:
      return { title: key, subtitle: "" };
  }
}
