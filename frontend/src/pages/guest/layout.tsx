import { Outlet } from "react-router";

import { Footer } from "@/components/common/footer";
import { Header } from "@/components/common/header";

export default function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

