import type { ApiUser, AuthResult, OTPSentResult } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export interface RegisterRequestPayload {
  name: string;
  fullname?: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    http
      .post<ApiEnvelope<AuthResult>>("/auth/login", { email, password }, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),

  guestLogin: (name: string) =>
    http
      .post<ApiEnvelope<AuthResult>>("/auth/guest-login", { name }, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),

  codeLogin: (code: string) =>
    http
      .post<ApiEnvelope<AuthResult>>("/auth/admin/code-login", { code }, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),

  logout: () =>
    http.post<ApiEnvelope<unknown>>("/auth/logout", {}, { _skipAuthRefresh: true }).then(() => undefined),

  me: () => http.get<ApiEnvelope<ApiUser>>("/users/me").then((r) => unwrap(r.data)),

  registerRequest: (payload: RegisterRequestPayload) =>
    http
      .post<ApiEnvelope<OTPSentResult>>("/auth/register/request", payload, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),

  registerVerify: (email: string, otp: string) =>
    http
      .post<ApiEnvelope<AuthResult>>("/auth/register/verify", { email, otp }, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),

  registerResend: (email: string) =>
    http
      .post<ApiEnvelope<OTPSentResult>>("/auth/register/resend", { email }, { _skipAuthRefresh: true })
      .then((r) => unwrap(r.data)),
};
