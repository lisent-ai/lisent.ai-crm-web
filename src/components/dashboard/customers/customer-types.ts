export type CustomerFormState = {
  name: string;
  email: string;
  phone: string;
  status: string;
};

export const emptyCustomerForm: CustomerFormState = {
  name: "",
  email: "",
  phone: "",
  status: "Active",
};

export const customerStatusOptions = ["Active", "Prospect", "Needs review"];
