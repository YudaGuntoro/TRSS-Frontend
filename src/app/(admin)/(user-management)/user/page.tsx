import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserTable from "@/components/user/UserTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users & Roles | PT TRSS",
  description: "User and role management",
};

export default function UserPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Users & Roles" />
      <UserTable />
    </div>
  );
}
