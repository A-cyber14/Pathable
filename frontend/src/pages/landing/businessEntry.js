import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { setAccountIntent, setPlanIntent } from "../../utils/signupIntent";

// ---------------------------------------------------------------------------
// useBusinessEntry — where "List Your Business" / a pricing CTA should take
// someone, based on who they are. Always lands in the existing onboarding:
//   signed out        → sign-up, then /account-type (Business highlighted)
//   no account type   → /account-type
//   business owner    → their dashboard (ProfileGate resumes any unfinished
//                       onboarding step); a plan CTA opens "Manage plan"
//   admin             → /admin
//   individual        → can't list from this account — `blocked` is true so
//                       the page can explain instead of dead-ending
// ---------------------------------------------------------------------------

export function useBusinessEntry() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const type = userProfile?.accountType;
  const blocked = !!currentUser && type === "user";

  const start = (planId = null) => {
    if (!currentUser) {
      setAccountIntent("business");
      setPlanIntent(planId);
      navigate("/login?mode=signup");
      return;
    }
    if (type == null) {
      setAccountIntent("business");
      setPlanIntent(planId);
      navigate("/account-type");
      return;
    }
    if (type === "business") {
      const done = userProfile?.onboardingStep === "complete";
      navigate(planId && done ? "/business-setup/plan" : "/business-profile");
      return;
    }
    if (type === "admin") navigate("/admin");
  };

  return { start, blocked, isBusiness: type === "business" };
}
