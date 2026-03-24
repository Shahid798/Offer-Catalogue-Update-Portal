import { createBrowserRouter } from "react-router";
import Root from "./Root";
import Home from "./pages/Home";
import CSVEditor from "./pages/CSVEditor";
import AddRowForm from "./pages/AddRowForm";
import OfferWorkflow from "./pages/OfferWorkflow";
import ChannelsSelect from "./pages/ChannelsSelect";
import OfferVariationsSelect from "./pages/OfferVariationsSelect";
import TreatmentVariationsSelect from "./pages/TreatmentVariationsSelect";
import TreatmentCombinationsSelect from "./pages/TreatmentCombinationsSelect";
import ReviewDashboard from "./pages/ReviewDashboard";
import ReviewEditor from "./pages/ReviewEditor";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "csv-editor", Component: CSVEditor },
      { path: "add-row", Component: AddRowForm },
      // Entry point for multi-CSV folder uploads (Offer-only workflow)
      { path: "offer-workflow", Component: OfferWorkflow },
      // OfferVariations selection step
      { path: "offer-variations", Component: OfferVariationsSelect },
      // TreatmentVariations selection step
      { path: "treatment-variations", Component: TreatmentVariationsSelect },
      // TreatmentCombinations row filtering step (conditional)
      { path: "treatment-combinations", Component: TreatmentCombinationsSelect },
      // Channels selection step (folder workflow only)
      { path: "channels", Component: ChannelsSelect },
      // Review Dashboard
      { path: "review-dashboard", Component: ReviewDashboard },
      // Inline Editing
      { path: "review-editor/:fileName", Component: ReviewEditor },
    ],
  },
]);