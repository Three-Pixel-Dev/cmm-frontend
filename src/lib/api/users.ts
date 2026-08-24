import type { ApiUser } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export interface UpdateMePayload {
  name?: string;
  fullname?: string;
  email?: string;
}

export const usersApi = {
  updateMe: (payload: UpdateMePayload) =>
    http.patch<ApiEnvelope<ApiUser>>("/users/me", payload).then((r) => unwrap(r.data)),
};
