import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MqttLogTable from "@/components/tables/MqttLogTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MQTT Logs | PT TRSS",
  description: "MQTT activity logs",
};

export default function MqttLogsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="MQTT Logs" />
      <MqttLogTable />
    </div>
  );
}
