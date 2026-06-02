import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserTable from "@/components/user/UserTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | PT TRSS",
  description: "User management",
};

export default function UserPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Users" />
      <UserTable />
    </div>
  );
}
