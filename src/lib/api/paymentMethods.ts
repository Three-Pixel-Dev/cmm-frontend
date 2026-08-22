import type { ApiPaymentMethod, CreatePaymentMethodPayload } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export const paymentMethodsApi = {
  listMine: () =>
    http
      .get<ApiEnvelope<ApiPaymentMethod[]>>("/payment-methods/me")
      .then((r) => unwrap(r.data) ?? []),

  create: (payload: CreatePaymentMethodPayload) =>
    http
      .post<ApiEnvelope<ApiPaymentMethod>>("/payment-methods/", payload)
      .then((r) => unwrap(r.data)),

  update: (id: string, payload: Partial<CreatePaymentMethodPayload>) =>
    http
      .patch<ApiEnvelope<ApiPaymentMethod>>(`/payment-methods/${id}`, payload)
      .then((r) => unwrap(r.data)),

  remove: (id: string) =>
    http.delete<ApiEnvelope<null>>(`/payment-methods/${id}`).then((r) => r.data),
};
