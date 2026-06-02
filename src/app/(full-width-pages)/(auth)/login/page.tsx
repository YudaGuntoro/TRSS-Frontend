import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | PT TRSS",
  description: "Login page for PT TRSS dashboard",
};

export default function Login() {
  return <SignInForm />;
}
