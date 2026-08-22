export type ApiBettingHistory = {
  id: string;
  user_id: string;
  user?: {
    id: string;
    fullname: string;
    email: string;
  };
  market_item_id: string;
  market_item?: {
    id: string;
    title_en: string;
    close_time?: string;
  };
  side: "yes" | "no";
  option_id?: string;
  shares: number;
  amount: number;
  ledger: "real" | "virtual";
  status?: "active" | "settled" | "void";
  created_at: string;
};
