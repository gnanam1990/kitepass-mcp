import { callKpass } from "../kpass-bridge.js";
import { GetUserInput, GetUserOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_get_user",
  description:
    "Returns information about the currently logged-in kpass user, including email, user ID, and login status. Useful for confirming identity before performing other operations.",
  inputSchema: zodToJsonSchema(GetUserInput),
};

export async function handler(input: unknown): Promise<unknown> {
  GetUserInput.parse(input);
  const raw = await callKpass<Record<string, unknown>>(["me"]);
  const result = {
    email: String(raw.email ?? ""),
    user_id: String(raw.user_id ?? ""),
    status: raw.status === "success" ? "logged_in" : "logged_out",
  };
  return GetUserOutput.parse(result);
}
