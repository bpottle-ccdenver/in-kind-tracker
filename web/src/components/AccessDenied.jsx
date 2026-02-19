import React from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccessDenied({ title = "Access Restricted", message = "You do not have permission to view this page." }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full border-0 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-slate-600">{message}</CardContent>
      </Card>
    </div>
  );
}
