/** User-service auth DTOs (internal/response/*.go). */

export interface ApiUser {
  id: string;
  role_id: string;
  role_name?: string;
  name: string;
  fullname?: string;
  email: string;
  is_enable: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  user: ApiUser;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export interface OTPSentResult {
  message: string;
  expires_in_seconds: number;
  otp?: string;
}

export interface ApiProfile {
  id: string;
  user_id: string;
  age?: number;
  date_of_birth?: string;
  profile_url?: string;
  gender?: string;
  phone_number?: string;
  nrc?: string;
  passport?: string;
  address?: string;
  nationality?: string;
  is_enable: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  age?: number;
  date_of_birth?: string;
  profile_url?: string;
  gender?: string;
  phone_number?: string;
  nrc?: string;
  passport?: string;
  address?: string;
  nationality?: string;
}

export interface ApiWallet {
  id: string;
  user_id: string;
  amount: string;
  virtual_amount: string;
  is_enable: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiPaymentMethodType {
  id: string;
  name: string;
  photo_url?: string;
  is_enable: boolean;
  is_enable_for_p2p: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiPaymentMethod {
  id: string;
  common_id?: string;
  user_type?: string;
  name?: string;
  address: string;
  payment_method_type_id: string;
  chain_id?: number;
  type: Pick<ApiPaymentMethodType, "id" | "name" | "photo_url">;
  is_default: boolean;
  is_enable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodPayload {
  name?: string;
  address: string;
  payment_method_type_id: string;
  chain_id?: number;
  is_default?: boolean;
}

export type P2PApplicationStatus = "pending" | "approved" | "rejected";

export interface ApiP2PApplication {
  id: string;
  user_id: string;
  proposed_commission_rate: string;
  note?: string;
  nrc_front_url?: string;
  nrc_back_url?: string;
  platform_purchase_payment_methods?: string[];
  user_trade_payment_methods?: string[];
  working_capital?: string;
  previous_experience?: string;
  application_purpose?: string;
  income_preference?: string;
  status: P2PApplicationStatus;
  reject_reason?: string;
  reviewed_at?: string;
  p2p_id?: string;
  phone_number?: string;
  address?: string;
  nationality?: string;
  nrc?: string;
  passport?: string;
  created_at: string;
  updated_at: string;
}

export interface P2PApplicationMe {
  has_agent: boolean;
  application?: ApiP2PApplication;
}

export interface SubmitP2PApplicationPayload {
  proposed_commission_rate: string;
  note?: string;
  phone_number: string;
  address: string;
  nationality?: string;
  nrc?: string;
  passport?: string;
  nrc_front_url: string;
  nrc_back_url: string;
  platform_purchase_payment_methods: string[];
  user_trade_payment_methods: string[];
  working_capital: string;
  previous_experience: string;
  application_purpose: string;
  income_preference: string;
}

export interface ApiPagedMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiPaged<T> {
  items: T[];
  meta: ApiPagedMeta;
}

export interface ApiMarketplaceP2P {
  id: string;
  user_id: string;
  user_name?: string;
  from_range: string;
  to_range: string;
  commission_rate: string;
  complete_percentage: string;
  trade_count: number;
  last_seen_at?: string;
  is_online?: boolean;
  avg_processing_seconds?: number;
}

/** Agent payout methods exposed on the marketplace (read-only). */
export interface ApiAgentPaymentMethod {
  id: string;
  name?: string;
  address: string;
  payment_method_type_id: string;
  chain_id?: number;
  type: Pick<ApiPaymentMethodType, "id" | "name" | "photo_url">;
  is_default: boolean;
}

export type P2PTradeRequestStatus = "pending" | "processing" | "completed" | "cancelled";
export type P2PTradeRequestType = "buy" | "sell";

export interface ApiP2PTradeRequest {
  id: string;
  p2p_id: string;
  type: P2PTradeRequestType;
  amount: string;
  commission: string;
  status: P2PTradeRequestStatus;
  notes?: string;
  reject_reason?: string;
  slip_url?: string;
  meta_mask_trx_id?: string;
  usdt_amount?: string;
  chain_id?: number;
  agent_payment_method_id?: string;
  transaction_id?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  requester: {
    id: string;
    name?: string;
    email?: string;
  };
  payment_method: {
    id: string;
    type: Pick<ApiPaymentMethodType, "id" | "name" | "photo_url">;
  };
}

export interface CreateP2PTradeRequestPayload {
  p2p_id: string;
  type: P2PTradeRequestType;
  amount: string;
  payment_method_id: string;
  notes?: string;
  slip_url?: string;
  meta_mask_trx_id?: string;
  usdt_amount?: string;
  agent_payment_method_id?: string;
}

export type TransactionTranType = "credit" | "debit";
export type TransactionType = "deposit" | "withdraw" | "sell" | "transfer" | "refund";
export type TransactionStatus = "pending" | "success" | "fail";
export type TransactionSourceType =
  | "ADMIN"
  | "P2P"
  | "MARKET_RESOLVE"
  | "META_MASK"
  | "WALLET_FUNDING";

export interface ApiTransaction {
  id: string;
  ledger: string;
  user_id: string;
  source_id?: string;
  wallet_id: string;
  slip_url?: string;
  tran_type?: TransactionTranType;
  meta_mask_trx_id?: string;
  address?: string;
  source_type: TransactionSourceType;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  completed_at?: string;
  transferred_at?: string;
  commission_rate?: string;
  is_enable: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceBetPayload {
  market_item_id: string;
  side?: "yes" | "no";
  option_id?: string;
  shares: number;
  ledger: "real" | "virtual";
  referral_code?: string;
  idempotency_key: string;
}

export interface ApiBet {
  id: string;
  user_id: string;
  market_item_id: string;
  option_id?: string;
  side: "yes" | "no";
  shares: number;
  amount: number;
  order_type: string;
  status: string;
  ledger: string;
  created_at: string;
  updated_at: string;
}

export interface PlaceBetResult {
  bet: ApiBet;
  live?: Record<string, unknown>;
}

export type WalletFundingType = "deposit" | "withdraw";
export type WalletFundingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApiWalletFundingRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  type: WalletFundingType;
  amount: string;
  approved_amount?: string;
  slip_url?: string;
  payment_method_id?: string;
  status: WalletFundingStatus;
  reject_reason?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  payment_method?: ApiPaymentMethod;
}

export interface CreateWalletFundingPayload {
  type: WalletFundingType;
  amount: string;
  slip_url?: string;
  payment_method_id?: string;
  idempotency_key?: string;
}
