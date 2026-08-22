import type { NrcData } from "@/data/nrc";
import { http, unwrap, type ApiEnvelope } from "./http";

export const nrcApi = {
  getAll: () => http.get<ApiEnvelope<NrcData>>("/nrc").then((r) => unwrap(r.data)),
};
