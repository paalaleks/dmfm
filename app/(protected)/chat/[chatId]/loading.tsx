import RecordSpinLoader from "@/components/record-spin-loader";
import React from "react";

export default function loading() {
  return (
    <div className="h-dvh flex justify-center items-center">
      <RecordSpinLoader />
    </div>
  );
}
