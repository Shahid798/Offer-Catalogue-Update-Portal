import { createBrowserRouter } from "react-router";
import Root from "./Root";
import Home from "./pages/Home";
import CSVEditor from "./pages/CSVEditor";
import AddRowForm from "./pages/AddRowForm";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "csv-editor", Component: CSVEditor },
      { path: "add-row", Component: AddRowForm },
    ],
  },
]);