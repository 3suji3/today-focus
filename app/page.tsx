import { getChatGPTUser } from "./chatgpt-auth";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <Dashboard
      initialName={user?.fullName?.split(" ").at(-1) ?? "민지"}
      signedIn={Boolean(user)}
    />
  );
}
