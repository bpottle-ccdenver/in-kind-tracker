import UserAccountAPI from "./userAccount";
import RoleAPI from "./role";
import PermissionAPI from "./permission";
import AuthAPI from "./auth";
import MinistryAPI from "./ministry";
import OrganizationAPI from "./organization";
import IndividualAPI from "./individual";
import DonationAPI from "./donation";
import WishListAPI from "./wishList";

export const UserAccount = UserAccountAPI;
export const Role = RoleAPI;
export const Permission = PermissionAPI;
export const Ministry = MinistryAPI;
export const Organization = OrganizationAPI;
export const Individual = IndividualAPI;
export const Donation = DonationAPI;
export const WishList = WishListAPI;

// auth sdk:
export const User = AuthAPI;
