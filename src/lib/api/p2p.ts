import type {
  ApiAgentPaymentMethod,
  ApiMarketplaceP2P,
  ApiPaged,
  ApiP2PTradeRequest,
  CreateP2PTradeRequestPayload,
  P2PApplicationMe,
  SubmitP2PApplicationPayload,
  ApiP2PApplication,
} from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export const p2pApi = {
  getMyApplication: () =>
    http.get<ApiEnvelope<P2PApplicationMe>>("/p2p/applications/me").then((r) => unwrap(r.data)),

  submitApplication: (body: SubmitP2PApplicationPayload) =>
    http
      .post<ApiEnvelope<ApiP2PApplication>>("/p2p/applications/me", body)
      .then((r) => unwrap(r.data)),

  listMarketplaceAgents: (params?: { page?: number; limit?: number }) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiMarketplaceP2P>>>("/p2p/agents/marketplace", { params })
      .then((r) => unwrap(r.data)),

  listAgentPaymentMethods: (p2pId: string) =>
    http
      .get<ApiEnvelope<ApiAgentPaymentMethod[]>>(`/p2p/agents/${p2pId}/payment-methods`)
      .then((r) => unwrap(r.data)),

  getAgentReceiveMethods: (p2pId: string) =>
    http
      .get<ApiEnvelope<ApiAgentPaymentMethod[]>>(`/p2p/agents/${p2pId}/receive-methods`)
      .then((r) => unwrap(r.data)),

  createTradeRequest: (body: CreateP2PTradeRequestPayload) =>
    http
      .post<ApiEnvelope<ApiP2PTradeRequest>>("/p2p/trade-requests", body)
      .then((r) => unwrap(r.data)),

  listMyTradeRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiP2PTradeRequest>>>("/p2p/trade-requests/me", { params })
      .then((r) => unwrap(r.data)),
};
