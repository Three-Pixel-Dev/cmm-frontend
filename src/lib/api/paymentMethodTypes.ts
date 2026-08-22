import type { ApiPaymentMethodType } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export const paymentMethodTypesApi = {
  list: (params?: { for_p2p?: boolean }) =>
    http
      .get<ApiEnvelope<ApiPaymentMethodType[]>>("/payment-method-types", { params })
      .then((r) => unwrap(r.data) ?? []),
};
