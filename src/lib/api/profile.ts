import type { ApiProfile, UpdateProfilePayload } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export const profileApi = {
  getMine: () => http.get<ApiEnvelope<ApiProfile>>("/profiles/me").then((r) => unwrap(r.data)),

  upsertMine: (payload: UpdateProfilePayload) =>
    http.put<ApiEnvelope<ApiProfile>>("/profiles/me", payload).then((r) => unwrap(r.data)),
};
