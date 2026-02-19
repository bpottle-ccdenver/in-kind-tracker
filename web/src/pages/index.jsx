import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";
import UserManagement from "./UserManagement";
import RoleManagement from "./RoleManagement";
import MinistryManagement from "./MinistryManagement";
import OrganizationManagement from "./OrganizationManagement";
import IndividualManagement from "./IndividualManagement";
import DonationManagement from "./DonationManagement";
import WishListManagement from "./WishListManagement";
import Login from "./Login";
import NoAccess from "./NoAccess";

import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";

const PAGES = {
  Dashboard: Dashboard,
  UserManagement: UserManagement,
  RoleManagement: RoleManagement,
  MinistryManagement: MinistryManagement,
  IndividualManagement: IndividualManagement,
  DonationManagement: DonationManagement,
  WishListManagement: WishListManagement,
  OrganizationManagement: OrganizationManagement,
  NoAccess: NoAccess,
  Login: Login,
};

function getCurrentPage(url) {
  let normalizedUrl = url;
  if (normalizedUrl.endsWith("/")) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }
  let urlLastPart = normalizedUrl.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase(),
  );
  return pageName || Object.keys(PAGES)[0];
}

function LayoutRoutes() {
  const location = useLocation();
  const currentPage = getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<UserManagement />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usermanagement" element={<UserManagement />} />
        <Route path="/rolemanagement" element={<RoleManagement />} />
        <Route path="/ministrymanagement" element={<MinistryManagement />} />
        <Route path="/donationmanagement" element={<DonationManagement />} />
        <Route path="/individualmanagement" element={<IndividualManagement />} />
        <Route path="/organizationmanagement" element={<OrganizationManagement />} />
        <Route path="/wishlistmanagement" element={<WishListManagement />} />
        <Route path="/noaccess" element={<NoAccess />} />
      </Routes>
    </Layout>
  );
}

function PagesContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<LayoutRoutes />} />
    </Routes>
  );
}

export default function Pages() {
  const rawBase = import.meta.env?.BASE_URL ?? '/';
  const sanitized = rawBase.replace(/\/+$/, '');
  const routerBase = sanitized === '' ? '/' : sanitized;

  return (
    <Router basename={routerBase === '/' ? undefined : routerBase}>
      <PagesContent />
    </Router>
  );
}
