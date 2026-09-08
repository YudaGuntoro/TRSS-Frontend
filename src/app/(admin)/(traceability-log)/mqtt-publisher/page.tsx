import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MqttPublisherPage from "@/components/mqtt-publisher/MqttPublisherPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MQTT Publisher | PT TRSS",
  description: "MQTT payload publisher for process testing",
};

export default function MqttPublisherRoutePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="MQTT Publisher" />
      <MqttPublisherPage />
    </div>
  );
}
