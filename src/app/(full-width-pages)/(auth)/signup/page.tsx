import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | PT TRSS",
  description: "Login page for PT TRSS dashboard",
};

export default function SignUp() {
  redirect("/login");
}
