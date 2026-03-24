import { Outlet, useBlocker, useNavigate, useLocation } from "react-router";
import { CSVProvider, useCSV } from "./context/CSVContext";
import { Toaster } from "./components/ui/sonner";
import { useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";

function AppContent() {
  const { workflowMode, workflowStep, resetWorkflowContext } = useCSV();
  const navigate = useNavigate();
  const location = useLocation();

  const workflowRoutes = [
    '/add-row',
    '/offer-variations',
    '/treatment-variations',
    '/treatment-combinations',
    '/channels',
    '/review-dashboard'
  ];

  // Intercept Browser Refresh / Close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (workflowMode === 'folder') {
        const message = "All changes will be discarded. Do you want to continue?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workflowMode]);

  // Trap state wipes post-refresh landing on protected loops
  useEffect(() => {
    if (workflowMode === 'single') {
      const exclusiveWorkflowRoutes = [
        '/offer-variations',
        '/treatment-variations',
        '/treatment-combinations',
        '/channels',
        '/review-dashboard'
      ];
      const isProtected = exclusiveWorkflowRoutes.includes(location.pathname) || location.pathname.startsWith('/review-editor');
      if (isProtected) {
        navigate('/offer-workflow', { replace: true });
      }
    }
  }, [workflowMode, location.pathname, navigate]);

  const blocker = useBlocker(
    ({ nextLocation, historyAction }) => {
      if (workflowMode !== 'folder') return false;
      
      // No restrictions if still on the initial Offer page navigating out
      if (workflowStep === 'offer' && (nextLocation.pathname === '/offer-workflow' || historyAction === 'POP')) {
        return false;
      }

      const isExiting = !workflowRoutes.includes(nextLocation.pathname) && !nextLocation.pathname.startsWith('/review-editor');
      const isBrowserNav = historyAction === 'POP';
      return isExiting || isBrowserNav;
    }
  );

  const confirmExit = () => {
    // Unconditionally abort the attempted navigation maneuver maintaining DOM stability immediately
    if (blocker.reset) {
      blocker.reset();
    }
    
    // Explicitly force route back to root Offer dash decoupled from the React Router transition event queue cleanly
    // State clearing is deferred until the exact moment of route push to ensure blocker condition doesn't drop prematurely!
    setTimeout(() => {
      resetWorkflowContext();
      navigate('/offer-workflow', { replace: true });
    }, 10);
  };

  return (
    <>
      <Outlet />
      <Toaster />
      
      {blocker.state === "blocked" && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) blocker.reset(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Progress</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-slate-700">
                  <p>
                    You have ongoing changes in the Add Offer workflow.
                  </p>
                  <div>
                    <p className="font-semibold">If you go back:</p>
                    <ul className="list-disc pl-5">
                      <li>All progress for this offer will be lost</li>
                      <li>Uploaded files will remain محفوظ</li>
                      <li>You will return to the Offer Workflow page</li>
                    </ul>
                  </div>
                  <p>
                    You can review and edit final data later in the Review section.
                  </p>
                  <p className="font-semibold">
                    Do you want to continue?
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset && blocker.reset()}>Stay (Recommended)</AlertDialogCancel>
              <AlertDialogAction onClick={confirmExit}>Go Back</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export default function Root() {
  return (
    <CSVProvider>
      <AppContent />
    </CSVProvider>
  );
}