import { Outlet } from "react-router";
import { CSVProvider } from "./context/CSVContext";
import { Toaster } from "./components/ui/sonner";

export default function Root() {
  return (
    <CSVProvider>
      <Outlet />
      <Toaster />
    </CSVProvider>
  );
}