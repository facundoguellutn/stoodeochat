import { redirect } from "next/navigation";
import { checkAdminExists } from "@/actions/auth/setup";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const adminExists = await checkAdminExists();

  if (adminExists) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <SetupForm />
    </div>
  );
}
