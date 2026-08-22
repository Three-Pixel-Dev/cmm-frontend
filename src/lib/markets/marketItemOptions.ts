import type { Bilingual } from "@/data/markets";
import type { ApiMarketItemOption, ApiMarketPool } from "@/types/market-api";
import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import type { LedgerKind } from "@/lib/format";

export type ItemAnswerOption = {
  id: string;
  title: Bilingual;
  sortOrder: number;
  seedCount: number;
  realCount: number;
};

function poolForLedger(
  opt: ApiMarketItemOption,
  ledger: LedgerKind,
): { seed_count: number; real_count: number } {
  const p = ledger === "virtual" ? opt.virtual_pool : opt.real_pool;
  return { seed_count: p?.seed_count ?? 0, real_count: p?.real_count ?? 0 };
}

/** When option pools are empty but item-level yes/no counts exist (legacy seed path). */
function applyLegacyPoolFallbackToOptions(
  options: ItemAnswerOption[],
  pool: ApiMarketPool | null | undefined,
): ItemAnswerOption[] {
  if (options.length !== 2 || !pool) {
    return options;
  }
  const optionPoolsEmpty = options.every((o) => o.seedCount === 0 && o.realCount === 0);
  const itemHasLiquidity =
    (pool.seed_yes_count ?? 0) +
      (pool.seed_no_count ?? 0) +
      (pool.real_yes_count ?? 0) +
      (pool.real_no_count ?? 0) >
    0;
  if (!optionPoolsEmpty || !itemHasLiquidity) {
    return options;
  }
  return options.map((o, index) => ({
    ...o,
    seedCount: index === 0 ? (pool.seed_yes_count ?? 0) : (pool.seed_no_count ?? 0),
    realCount: index === 0 ? (pool.real_yes_count ?? 0) : (pool.real_no_count ?? 0),
  }));
}

/** Normalized answer choices for one market item (API options or legacy yes/no fallback). */
export function getItemAnswerOptions(
  item: Pick<MarketItem, "id" | "options" | "real_pool" | "virtual_pool">,
  ledger: LedgerKind,
  lang: "en" | "my",
): ItemAnswerOption[] {
  if (item.options && item.options.length > 0) {
    const pool = ledger === "virtual" ? item.virtual_pool : item.real_pool;
    const mapped = [...item.options]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => {
        const counts = poolForLedger(o, ledger);
        return {
          id: o.id,
          title: { en: o.title_en, my: o.title_my || o.title_en },
          sortOrder: o.sort_order,
          seedCount: counts.seed_count,
          realCount: counts.real_count,
        };
      });
    return applyLegacyPoolFallbackToOptions(mapped, pool);
  }

  const pool = ledger === "virtual" ? item.virtual_pool : item.real_pool;
  return legacyBinaryOptions(pool, lang);
}

function legacyBinaryOptions(
  pool: ApiMarketPool | null | undefined,
  _lang: "en" | "my",
): ItemAnswerOption[] {
  return [
    {
      id: "legacy-yes",
      title: { en: "Yes", my: "ဟုတ်ကဲ့" },
      sortOrder: 0,
      seedCount: pool?.seed_yes_count ?? 0,
      realCount: pool?.real_yes_count ?? 0,
    },
    {
      id: "legacy-no",
      title: { en: "No", my: "မဟုတ်ပါ" },
      sortOrder: 1,
      seedCount: pool?.seed_no_count ?? 0,
      realCount: pool?.real_no_count ?? 0,
    },
  ];
}

export function optionTitle(
  option: ItemAnswerOption | undefined,
  lang: "en" | "my",
): string {
  if (!option) return "";
  return option.title[lang] || option.title.en;
}

export function resolveInitialOptionId(
  options: ItemAnswerOption[],
  initialSide?: "yes" | "no",
  initialOptionId?: string,
): string {
  if (options.length === 0) return "";
  if (initialOptionId && options.some((o) => o.id === initialOptionId)) {
    return initialOptionId;
  }
  if (initialSide === "no" && options.length > 1) return options[1].id;
  if (initialSide === "yes" || options.length === 1) return options[0].id;
  return options[0].id;
}

export function findOptionById(
  options: ItemAnswerOption[],
  optionId: string | undefined,
): ItemAnswerOption | undefined {
  if (!optionId) return undefined;
  return options.find((o) => o.id === optionId);
}

export function winningOptionLabel(
  item: Pick<MarketItem, "options" | "winning_option_id" | "outcome">,
  lang: "en" | "my",
): string | null {
  if (item.winning_option_id && item.options?.length) {
    const opt = item.options.find((o) => o.id === item.winning_option_id);
    if (opt) return lang === "my" ? opt.title_my || opt.title_en : opt.title_en;
  }
  if (item.outcome === "yes") return lang === "my" ? "ဟုတ်ကဲ့" : "Yes";
  if (item.outcome === "no") return lang === "my" ? "မဟုတ်ပါ" : "No";
  if (item.outcome === "void") return lang === "my" ? "ပယ်ဖျက်" : "Void";
  return null;
}

export function isLegacyOptionId(optionId: string): boolean {
  return optionId.startsWith("legacy-");
}

export function legacySideFromOptionId(optionId: string): "yes" | "no" {
  return optionId === "legacy-no" ? "no" : "yes";
}

export function buildPlaceBetPayload(
  marketItemId: string,
  optionId: string,
  shares: number,
  ledger: "real" | "virtual",
): { market_item_id: string; shares: number; ledger: "real" | "virtual"; option_id?: string; side?: "yes" | "no" } {
  if (isLegacyOptionId(optionId)) {
    return {
      market_item_id: marketItemId,
      side: legacySideFromOptionId(optionId),
      shares,
      ledger,
    };
  }
  return {
    market_item_id: marketItemId,
    option_id: optionId,
    shares,
    ledger,
  };
}
