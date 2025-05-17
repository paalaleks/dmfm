import { Disc3 } from "lucide-react";
import React from "react";

export default function RecordSpinLoader() {
  return (
    <Disc3
      className={`animate-spin relative z-50 h-6 w-6 text-muted-foreground`}
      size={20}
    />
  );
}
